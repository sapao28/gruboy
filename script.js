const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы интерфейса
const startScreen = document.getElementById('start-screen');
const gameUi = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const finalScoreEl = document.getElementById('final-score-val');
const endReasonEl = document.getElementById('end-reason');
const endTitleEl = document.getElementById('end-title');
const successMsg = document.getElementById('success-msg');

// Настройки игры
let gameRunning = false;
let score = 0;
let timeLeft = 45;
let targets = [];
let spawnRate = 1000; // мс
let lastSpawn = 0;
let difficultyMultiplier = 1;

// Типы целей (Эмодзи)
// type: 'enemy' (стрелять) или 'friendly' (не стрелять)
const targetTypes = [
    { emoji: '💂', type: 'enemy', speed: 1 },    // Диверсант
    { emoji: '💣', type: 'enemy', speed: 0 },    // Мина
    { emoji: '🚁', type: 'enemy', speed: 2 },    // Дрон
    { emoji: '🎅', type: 'friendly', speed: 1.5 }, // Дед мороз
    { emoji: '🦌', type: 'friendly', speed: 2 }    // Олень
];

// Настройка Canvas под размер экрана
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- КЛАСС ЦЕЛИ ---
class Target {
    constructor() {
        const template = targetTypes[Math.floor(Math.random() * targetTypes.length)];
        this.emoji = template.emoji;
        this.type = template.type;
        this.radius = 40; // Размер зоны клика
        
        // Позиция (не слишком близко к краям)
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 100) + 50;
        
        // Время жизни цели (исчезнет сама)
        this.maxLife = 2000 / difficultyMultiplier; 
        this.life = this.maxLife; 
        
        // Анимация появления
        this.scale = 0;
    }

    update(dt) {
        this.life -= dt;
        // Эффект появления (pop-up)
        if (this.scale < 1) this.scale += 0.1;
    }

    draw() {
        ctx.font = `${this.radius * 2 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Прозрачность зависит от времени жизни
        ctx.globalAlpha = this.life / this.maxLife;
        
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// --- ЛОГИКА ИГРЫ ---

function startGame() {
    score = 0;
    timeLeft = 45;
    targets = [];
    difficultyMultiplier = 1;
    spawnRate = 1000;
    gameRunning = true;

    scoreEl.innerText = score;
    timerEl.innerText = timeLeft;

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameUi.style.display = 'block'; // Показываем HUD
    successMsg.classList.add('hidden');

    requestAnimationFrame(gameLoop);
    
    // Таймер обратного отсчета
    const timerInterval = setInterval(() => {
        if (!gameRunning) {
            clearInterval(timerInterval);
            return;
        }
        timeLeft--;
        timerEl.innerText = timeLeft;
        
        // Усложнение со временем
        if (timeLeft % 10 === 0) {
            spawnRate = Math.max(400, spawnRate - 100);
            difficultyMultiplier += 0.1;
        }

        if (timeLeft <= 0) {
            endGame(true);
        }
    }, 1000);
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    // Очистка экрана
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Спавн новых целей
    if (timestamp - lastSpawn > spawnRate) {
        targets.push(new Target());
        lastSpawn = timestamp;
    }

    // Обновление и отрисовка целей
    // Идем с конца, чтобы безопасно удалять из массива
    for (let i = targets.length - 1; i >= 0; i--) {
        let t = targets[i];
        t.update(16); // примерный dt
        t.draw();

        // Удаляем, если время истекло
        if (t.life <= 0) {
            targets.splice(i, 1);
        }
    }

    // Имитация помех ГРУ (случайные линии)
    if (Math.random() > 0.9) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 2);
    }

    requestAnimationFrame(gameLoop);
}

// Обработка клика/тапа
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', (e) => {
    handleInput(e.touches[0]);
    e.preventDefault(); // чтобы не зумило экран
}, {passive: false});

function handleInput(e) {
    if (!gameRunning) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;

    // Проверяем, попали ли в кого-то
    for (let i = targets.length - 1; i >= 0; i--) {
        let t = targets[i];
        let dist = Math.sqrt((clickX - t.x) ** 2 + (clickY - t.y) ** 2);

        if (dist < t.radius) {
            // ПОПАДАНИЕ!
            if (t.type === 'enemy') {
                score += 10;
                // Звуковой эффект (визуальный) - вспышка
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(t.x, t.y, 50, 0, Math.PI*2);
                ctx.fill();
            } else {
                // Огонь по своим!
                score -= 20;
                timeLeft -= 5; // Штраф временем
                timerEl.innerText = timeLeft;
                
                // Красная вспышка
                const flash = document.createElement('div');
                flash.style.position = 'absolute';
                flash.style.top = '0'; flash.style.left = '0';
                flash.style.width = '100%'; flash.style.height = '100%';
                flash.style.backgroundColor = 'red';
                flash.style.opacity = '0.3';
                flash.style.pointerEvents = 'none';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 100);
            }
            
            targets.splice(i, 1); // Убрать цель
            hit = true;
            scoreEl.innerText = score;
            break; // Один клик - одна цель
        }
    }
}

function endGame(timeOut) {
    gameRunning = false;
    gameUi.style.display = 'none';
    gameOverScreen.classList.add('active');
    finalScoreEl.innerText = score;

    if (score >= 100) {
        endTitleEl.innerText = "МИССИЯ ВЫПОЛНЕНА";
        endTitleEl.style.color = "#0f0";
        endReasonEl.innerText = "ПЕРИМЕТР ЗАЧИЩЕН. ОЖИДАЙТЕ ИНСТРУКЦИЙ.";
        successMsg.classList.remove('hidden');
    } else {
        endTitleEl.innerText = "МИССИЯ ПРОВАЛЕНА";
        endTitleEl.style.color = "red";
        endReasonEl.innerText = "НЕДОСТАТОЧНО ТОЧНОСТИ ДЛЯ ВЫХОДА НА АРЕНУ.";
    }
}

// Кнопки
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
