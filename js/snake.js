// ── CONFIG ──────────────────────────────────────────────
const CELL = 20; // grid cell size in px
let COLS, ROWS;

// ── CANVAS SETUP ────────────────────────────────────────
const canvas = document.getElementById('snake-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  COLS = Math.floor(w / CELL);
  ROWS = Math.floor(h / CELL);
  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;
}
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  if (!gameRunning) drawGrid();
});

// ── GAME STATE ───────────────────────────────────────────
let snake       = [];
let direction   = { x: 1, y: 0 };
let nextDir     = { x: 1, y: 0 };
let food        = {};
let score       = 0;
let gameRunning = false;
let loopId      = null;

const scoreEl = document.getElementById('score');

// ── INIT / RESET ─────────────────────────────────────────
function initGame() {
  resizeCanvas();
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  snake = [
    { x: startX,     y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  direction = { x: 1, y: 0 };
  nextDir   = { x: 1, y: 0 };
  score     = 0;
  scoreEl.textContent = 0;
  placeFood();
  gameRunning = true;
  clearInterval(loopId);
  loopId = setInterval(gameLoop, 120);
}

// ── FOOD ─────────────────────────────────────────────────
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

// ── GAME LOOP ────────────────────────────────────────────
function gameLoop() {
  direction = { ...nextDir };

  const head = {
    x: (snake[0].x + direction.x + COLS) % COLS,
    y: (snake[0].y + direction.y + ROWS) % ROWS,
  };

  // Self-collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

// ── DRAW ─────────────────────────────────────────────────
function drawGrid() {
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }
}

function draw() {
  drawGrid();

  // Food – glowing dot
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, CELL * 0.7);
  glow.addColorStop(0, '#FF4466');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FF4466';
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Snake body
  snake.forEach((seg, i) => {
    const ratio = 1 - i / snake.length;  // head is brightest
    const r = Math.round(seg.x * CELL);
    const c = Math.round(seg.y * CELL);
    const pad = 2;

    if (i === 0) {
      // Head – neon green with glow
      const hx = r + CELL / 2;
      const hy = c + CELL / 2;
      const headGlow = ctx.createRadialGradient(hx, hy, 1, hx, hy, CELL);
      headGlow.addColorStop(0, 'rgba(0,255,153,0.35)');
      headGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(hx, hy, CELL, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00FF99';
    } else {
      // Body gradient from bright to dim
      const g = Math.floor(200 * ratio + 55);
      ctx.fillStyle = `rgb(0, ${g}, 80)`;
    }

    roundRect(ctx, r + pad, c + pad, CELL - pad * 2, CELL - pad * 2, 5);
    ctx.fill();

    // Eyes on head
    if (i === 0) {
      ctx.fillStyle = '#0b0c10';
      const eyeOff = CELL * 0.22;
      let ex1, ey1, ex2, ey2;
      if (direction.x === 1)  { ex1 = r + CELL*0.7; ey1 = c + CELL*0.3; ex2 = r + CELL*0.7; ey2 = c + CELL*0.7; }
      else if (direction.x === -1) { ex1 = r + CELL*0.3; ey1 = c + CELL*0.3; ex2 = r + CELL*0.3; ey2 = c + CELL*0.7; }
      else if (direction.y === 1)  { ex1 = r + CELL*0.3; ey1 = c + CELL*0.7; ex2 = r + CELL*0.7; ey2 = c + CELL*0.7; }
      else                         { ex1 = r + CELL*0.3; ey1 = c + CELL*0.3; ex2 = r + CELL*0.7; ey2 = c + CELL*0.3; }

      ctx.beginPath(); ctx.arc(ex1, ey1, CELL * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, CELL * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── GAME OVER ────────────────────────────────────────────
function endGame() {
  clearInterval(loopId);
  gameRunning = false;

  // Flash effect
  let flashes = 0;
  const flashId = setInterval(() => {
    ctx.fillStyle = `rgba(255, 68, 102, ${0.15})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (++flashes >= 5) {
      clearInterval(flashId);
      showQuestionModal();
    }
  }, 80);
}

function showQuestionModal() {
  const modal = document.getElementById('question-modal');
  modal.classList.add('is-visible');
  modal.setAttribute('aria-hidden', 'false');
}

// ── Start Initiation ───────────────────────
const startOverlay = document.getElementById('start-overlay');
let gameStarted = false;
let startCountdownActive = false;
let startCountdownTimer = null;

function runStartCountdown(onDone) {
  if (!startOverlay || startCountdownActive) return;

  const icon = startOverlay.querySelector('.start-message i');
  const message = startOverlay.querySelector('.start-message p');
  const baseText = 'Toca o haz clic para iniciar';
  let count = 3;

  startCountdownActive = true;

  if (startOverlay) startOverlay.classList.add("is-visible");
  if (icon) icon.style.display = 'none';
  if (message) message.textContent = `Inicia en ${count}`;

  startCountdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      if (message) message.textContent = `Inicia en ${count}`;
      return;
    }

    clearInterval(startCountdownTimer);
    startCountdownTimer = null;
    startCountdownActive = false;

    if (icon) icon.style.display = '';
    if (message) message.textContent = baseText;

    if (typeof overlay !== "undefined" && overlay) overlay.classList.remove("is-visible");
    if (typeof startOverlay !== "undefined" && startOverlay) startOverlay.classList.remove("is-visible");

    onDone();
  }, 1000);
}

function beginGame(e, skipCountdown = false) {
  if (e && (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A")) return;
  var m = document.getElementById("menu-confirm-modal");
  if (m && m.classList.contains("is-visible")) return;

  if (gameStarted || startCountdownActive) return;

  const startNow = () => {
    if (gameStarted) return;
    gameStarted = true;
    startOverlay.classList.remove('is-visible');
    initGame();
  };

  if (skipCountdown) {
    startNow();
    return;
  }

  runStartCountdown(startNow);
}

startOverlay.addEventListener('click', (e) => beginGame(e));
startOverlay.addEventListener('touchstart', (e) => {
  if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A") return;
  var m = document.getElementById("menu-confirm-modal");
  if (m && m.classList.contains("is-visible")) return;
  if (e.cancelable) e.preventDefault();
  beginGame(e);
}, { passive: false });

// Resume from questions
if (localStorage.getItem('snakeRestart') === 'true') { 
  localStorage.removeItem('snakeRestart');
  // Show question modal was closed, start fresh game
}

if (localStorage.getItem('snakeResumeOk') === 'true') {
  localStorage.removeItem('snakeResumeOk');
  // Hide question modal when resuming after correct answer
  setTimeout(function() {
    const m = document.getElementById('question-modal');
    if (m) {
      m.classList.remove('is-visible');
      m.setAttribute('aria-hidden', 'true');
    }
  }, 100);
}

// Menu handling
window.addEventListener('arcade:menu-exit', () => {
  if (loopId) clearInterval(loopId);
  gameRunning = false;
  gameStarted = false;
  if (startCountdownTimer) {
    clearInterval(startCountdownTimer);
    startCountdownTimer = null;
  }
  startCountdownActive = false;
});

let isMenuPaused = false;
let wasCountdownWhenMenuOpened = false;

function killCountdown() {
  if (startCountdownTimer) {
    clearInterval(startCountdownTimer);
    startCountdownTimer = null;
  }
  startCountdownActive = false;
  if (startOverlay) {
    startOverlay.classList.remove("is-visible");
    var icon = startOverlay.querySelector('.start-message i');
    var message = startOverlay.querySelector('.start-message p');
    if (icon) icon.style.display = '';
    if (message) message.textContent = 'Toca o haz clic para iniciar';
  }
}

window.addEventListener("arcade:menu-open", () => {
  wasCountdownWhenMenuOpened = startCountdownActive;
  if (startCountdownActive) {
    killCountdown();
  }
  if (gameRunning) {
    isMenuPaused = true;
    gameRunning = false;
    if (loopId) clearInterval(loopId);
  } else if (wasCountdownWhenMenuOpened) {
    isMenuPaused = true;
  }
});

window.addEventListener("arcade:menu-close", () => {
  if (!isMenuPaused) return;
  isMenuPaused = false;
  if (wasCountdownWhenMenuOpened && !gameStarted) {
    wasCountdownWhenMenuOpened = false;
    startOverlay.classList.add('is-visible');
  } else {
    wasCountdownWhenMenuOpened = false;
    runStartCountdown(() => {
      gameRunning = true;
      loopId = setInterval(gameLoop, 120);
    });
  }
});

// Initial state for display
initGame();
gameRunning = false;
clearInterval(loopId); // Stop the movement

function idle() {
  if (gameRunning) return;
  drawGrid();
  drawSnake();
  drawFood();
  requestAnimationFrame(idle);
}
idle();

// ── KEYBOARD ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (!gameRunning) return;
  const map = {
    ArrowUp:    { x:  0, y: -1 },
    ArrowDown:  { x:  0, y:  1 },
    ArrowLeft:  { x: -1, y:  0 },
    ArrowRight: { x:  1, y:  0 },
  };
  const d = map[e.key];
  if (!d) return;
  e.preventDefault();
  // Prevent reversing
  if (d.x !== -direction.x || d.y !== -direction.y) {
    nextDir = d;
  }
});

// ── TOUCH / SWIPE ────────────────────────────────────────
let touchStart = null;

window.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

window.addEventListener('touchend', e => {
  if (!touchStart || !gameRunning) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    const d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    if (d.x !== -direction.x) nextDir = d;
  } else {
    const d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    if (d.y !== -direction.y) nextDir = d;
  }
  touchStart = null;
}, { passive: true });




