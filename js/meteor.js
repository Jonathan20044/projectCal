// ═══════════════════════════════════════════════════════
//  METEOR DASH  –  Full Game Logic
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Stars (parallax background) ──────────────────────────
const STAR_COUNT = 180;
let stars = [];
function initStars() {
  stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    speed: Math.random() * 0.6 + 0.1,
    alpha: Math.random() * 0.6 + 0.3,
  }));
}
initStars();

function drawStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fill();
  });
}

// ── Ship ──────────────────────────────────────────────────
const SHIP_W  = 44;
const SHIP_H  = 54;
const SHIP_SPEED = 7;

let ship = { x: 0, y: 0 };
let shipTrail = []; // exhaust particles

function initShip() {
  ship.x = W / 2;
  ship.y = H - SHIP_H - 30;
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Engine glow
  const engGlow = ctx.createRadialGradient(0, SHIP_H * 0.5, 2, 0, SHIP_H * 0.5, SHIP_H * 0.7);
  engGlow.addColorStop(0, 'rgba(0,200,255,0.4)');
  engGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = engGlow;
  ctx.beginPath();
  ctx.arc(0, SHIP_H * 0.5, SHIP_H * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Ship body
  ctx.fillStyle = '#c8e6ff';
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_H / 2);               // nose
  ctx.lineTo(SHIP_W / 2, SHIP_H / 2);       // bottom-right
  ctx.lineTo(0, SHIP_H / 3);                // inner-bottom
  ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);      // bottom-left
  ctx.closePath();
  ctx.fill();

  // Cockpit
  const cg = ctx.createRadialGradient(0, -SHIP_H * 0.12, 1, 0, -SHIP_H * 0.12, SHIP_W * 0.22);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(1, '#00E5FF');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, -SHIP_H * 0.12, SHIP_W * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Wings accent
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(-SHIP_W * 0.15, SHIP_H * 0.1);
  ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);
  ctx.lineTo(-SHIP_W * 0.05, SHIP_H * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(SHIP_W * 0.15, SHIP_H * 0.1);
  ctx.lineTo(SHIP_W / 2, SHIP_H / 2);
  ctx.lineTo(SHIP_W * 0.05, SHIP_H * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Exhaust Trail ─────────────────────────────────────────
function spawnExhaust() {
  shipTrail.push({
    x: ship.x + (Math.random() - 0.5) * 10,
    y: ship.y + SHIP_H / 2,
    r: Math.random() * 6 + 4,
    life: 1,
    color: Math.random() > 0.5 ? '#00E5FF' : '#0077FF',
  });
}

function drawExhaust() {
  shipTrail.forEach((p, i) => {
    p.y += 3;
    p.life -= 0.07;
    p.r *= 0.94;
    if (p.life <= 0) { shipTrail.splice(i, 1); return; }
    ctx.globalAlpha = p.life * 0.7;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Meteors ───────────────────────────────────────────────
let meteors = [];
let meteorTimer  = 0;
let meteorInterval = 60;   // frames between spawns (decreases over time)
let meteorSpeed    = 3.5;

const METEOR_MIN_R = 14;
const METEOR_MAX_R = 32;

function spawnMeteor() {
  const r = METEOR_MIN_R + Math.random() * (METEOR_MAX_R - METEOR_MIN_R);
  meteors.push({
    x: r + Math.random() * (W - r * 2),
    y: -r,
    r,
    speed: meteorSpeed + Math.random() * 2,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.08,
    color: `hsl(${20 + Math.random() * 30}, 70%, ${35 + Math.random() * 20}%)`,
    craters: Array.from({ length: 3 }, () => ({
      ax: (Math.random() - 0.5) * 1.4,
      ay: (Math.random() - 0.5) * 1.4,
      r: Math.random() * 0.3 + 0.1,
    })),
  });
}

function drawMeteors() {
  meteors.forEach(m => {
    m.y += m.speed;
    m.rot += m.rotSpeed;

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);

    // Glow
    const mg = ctx.createRadialGradient(0, 0, m.r * 0.2, 0, 0, m.r * 1.6);
    mg.addColorStop(0, 'rgba(255,120,30,0.25)');
    mg.addColorStop(1, 'transparent');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(0, 0, m.r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Rock body – irregular polygon
    ctx.fillStyle = m.color;
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const angle = (i / pts) * Math.PI * 2;
      const dist  = m.r * (0.78 + Math.sin(i * 3.7) * 0.22);
      i === 0
        ? ctx.moveTo(Math.cos(angle) * dist, Math.sin(angle) * dist)
        : ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }
    ctx.closePath();
    ctx.fill();

    // Craters
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    m.craters.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.ax * m.r, c.ay * m.r, c.r * m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fire trail
    ctx.fillStyle = 'rgba(255,160,30,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, -m.r * 1.1, m.r * 0.45, m.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

// ── Collision ─────────────────────────────────────────────
function checkCollision() {
  for (const m of meteors) {
    const dx = m.x - ship.x;
    const dy = m.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < m.r + SHIP_W * 0.35) return true;
  }
  return false;
}

// ── Input ─────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

let touchX = null;
window.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchmove',  e => {
  if (touchX === null) return;
  const dx = e.touches[0].clientX - touchX;
  ship.x = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, ship.x + dx));
  touchX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', () => { touchX = null; }, { passive: true });

// ── HUD ───────────────────────────────────────────────────
let survivalTime = 0;
let levelDisplay = 1;
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

// ── Game State ────────────────────────────────────────────
let running    = false;
let gameStarted = false;
let frameId    = null;
let frameCount = 0;
let exitingToMenu = false;
let startCountdownActive = false;
let startCountdownTimer = null;

window.addEventListener('arcade:menu-exit', () => {
  exitingToMenu = true;
  running = false;
  gameStarted = false;
  if (startCountdownTimer) {
    clearInterval(startCountdownTimer);
    startCountdownTimer = null;
  }
  startCountdownActive = false;
  cancelAnimationFrame(frameId);
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
  if (running) {
    isMenuPaused = true;
    running = false;
    cancelAnimationFrame(frameId);
    frameId = null;
  } else if (wasCountdownWhenMenuOpened) {
    isMenuPaused = true;
  }
});

window.addEventListener("arcade:menu-close", () => {
  if (!isMenuPaused) return;
  isMenuPaused = false;
  if (wasCountdownWhenMenuOpened && !gameStarted) {
    wasCountdownWhenMenuOpened = false;
    // They hadn't started yet - show the start overlay again
    startOverlay.classList.add('is-visible');
  } else {
    wasCountdownWhenMenuOpened = false;
    runStartCountdown(() => {
      if (exitingToMenu) return;
      running = true;
      frameId = requestAnimationFrame(loop);
    });
  }
});

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

function startGame() {
  resize();
  initStars();
  initShip();
  meteors    = [];
  shipTrail  = [];
  frameCount = 0;
  survivalTime = 0;
  meteorInterval = 60;
  meteorSpeed    = 3.5;
  levelDisplay   = 1;
  scoreEl.textContent = survivalTime;
  levelEl.textContent = levelDisplay;
  running = true;
  cancelAnimationFrame(frameId);
  loop();
}

// ── Resume Game ───────────────────────────────────────────
function resumeGame(state) {
  resize();
  initStars();
  initShip();
  meteors    = [];
  shipTrail  = [];
  frameCount = state.frameCount || 0;
  survivalTime = state.survivalTime || 0;
  meteorInterval = state.meteorInterval || 60;
  meteorSpeed    = state.meteorSpeed || 3.5;
  levelDisplay   = state.levelDisplay || 1;
  scoreEl.textContent = survivalTime;
  levelEl.textContent = levelDisplay;
  running = true;
  cancelAnimationFrame(frameId);
  loop();
}

// ── Main Loop ─────────────────────────────────────────────
function loop() {
  if (!running || exitingToMenu) return;
  frameId = requestAnimationFrame(loop);
  frameCount++;

  // Background
  ctx.fillStyle = '#000010';
  ctx.fillRect(0, 0, W, H);

  // Subtle nebula
  const neb = ctx.createRadialGradient(W * 0.3, H * 0.4, 50, W * 0.3, H * 0.4, W * 0.6);
  neb.addColorStop(0, 'rgba(30,0,80,0.18)');
  neb.addColorStop(1, 'transparent');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, W, H);

  drawStars();
  drawExhaust();

  // Meteor logic
  meteorTimer++;
  if (meteorTimer >= meteorInterval) {
    meteorTimer = 0;
    spawnMeteor();
  }

  // Increase difficulty every 10 seconds (600 frames at 60fps)
  if (frameCount % 600 === 0) {
    meteorSpeed    = Math.min(meteorSpeed + 0.8, 14);
    meteorInterval = Math.max(meteorInterval - 5, 18);
    levelDisplay++;
    levelEl.textContent = levelDisplay;
  }

  // Update survival time every 60 frames
  if (frameCount % 60 === 0) {
    survivalTime++;
    scoreEl.textContent = survivalTime;
  }

  // Remove off-screen meteors
  meteors = meteors.filter(m => m.y - m.r < H + 20);

  drawMeteors();

  // Move ship (keyboard)
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    ship.x = Math.max(SHIP_W / 2, ship.x - SHIP_SPEED);
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    ship.x = Math.min(W - SHIP_W / 2, ship.x + SHIP_SPEED);
  }

  spawnExhaust();
  drawShip(ship.x, ship.y);

  // Collision check
  if (checkCollision()) {
    running = false;
    explode();
  }
}

// ── Explosion ─────────────────────────────────────────────
let particles = [];

function explode() {
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    particles.push({
      x: ship.x, y: ship.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 6 + 2,
      life: 1,
      color: ['#00E5FF','#FFD700','#FF4444','#ffffff'][Math.floor(Math.random() * 4)],
    });
  }
  explodeLoop();
}

function explodeLoop() {
  if (exitingToMenu) return;

  ctx.fillStyle = '#000010';
  ctx.fillRect(0, 0, W, H);
  drawStars();

  let alive = false;
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.025;
    if (p.life > 0) {
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  if (alive) {
    requestAnimationFrame(explodeLoop);
  } else {
    particles = [];
    saveResumeState();
    showQuestionModal();
  }
}

function saveResumeState() {
  const state = {
    survivalTime: survivalTime,
    levelDisplay: levelDisplay,
    meteorSpeed: meteorSpeed,
    meteorInterval: meteorInterval,
    frameCount: frameCount
  };
  localStorage.setItem('meteorResume', JSON.stringify(state));
}

// ── Modals ────────────────────────────────────────────────
function showQuestionModal() {
  const m = document.getElementById('question-modal');
  m.classList.add('is-visible');
  m.setAttribute('aria-hidden', 'false');
}

// ── Start Initiation ───────────────────────
const startOverlay = document.getElementById('start-overlay');

function beginGame(e) {
  if (e && (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A")) return;
  var m = document.getElementById("menu-confirm-modal");
  if (m && m.classList.contains("is-visible")) return;

  exitingToMenu = false;
  if (gameStarted || startCountdownActive) return;

  runStartCountdown(() => {
    if (gameStarted || exitingToMenu) return;
    gameStarted = true;
    startOverlay.classList.remove('is-visible');
    startGame();
  });
}

startOverlay.addEventListener('click', beginGame);
startOverlay.addEventListener('touchstart', (e) => {
  if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A") return;
  var m = document.getElementById("menu-confirm-modal");
  if (m && m.classList.contains("is-visible")) return;
  if (e.cancelable) e.preventDefault();
  beginGame(e);
}, { passive: false });

// Handle returning from questions
const resumeOk = localStorage.getItem('meteorResumeOk') === 'true';
const restart = localStorage.getItem('meteorRestart') === 'true';

localStorage.removeItem('meteorResumeOk');
localStorage.removeItem('meteorRestart');

if (restart) { localStorage.removeItem('meteorResume'); } else if (resumeOk) {
  const resumeRaw = localStorage.getItem('meteorResume');
  if (resumeRaw) {
    const state = JSON.parse(resumeRaw);
    localStorage.removeItem('meteorResume');
    if (!gameStarted) {
      gameStarted = true;
      startOverlay.classList.remove('is-visible');
      resumeGame(state);
    }
  }
}

// Initial draw while waiting
initShip();
(function idleDraw() {
  if (exitingToMenu) return;
  ctx.fillStyle = '#000010';
  ctx.fillRect(0, 0, W, H);
  drawStars();
  drawShip(ship.x, ship.y); 
  if (!running) requestAnimationFrame(idleDraw);
})();


