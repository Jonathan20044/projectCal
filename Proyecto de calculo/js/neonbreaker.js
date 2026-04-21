// ═══════════════════════════════════════════════════════
//  NEON BREAKER  –  Dual Ball Edition
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); if (!running) idle(); });

// ── Palette ────────────────────────────────────────────
const BRICK_COLORS = [
  ['#FF66CC','#FF99DD'],
  ['#FF4466','#FF7799'],
  ['#FF9900','#FFCC44'],
  ['#FFD700','#FFEE88'],
  ['#44FFAA','#88FFCC'],
  ['#00E5FF','#88F4FF'],
  ['#AA66FF','#CC99FF'],
];

// Ball visual themes — one per ball
const BALL_THEMES = [
  { core: '#ffffff', mid: '#FF99DD', outer: '#FF66CC', glow: '#FF66CC', trail: 'rgba(255,102,204,' },
  { core: '#ffffff', mid: '#88F4FF', outer: '#00E5FF', glow: '#00E5FF', trail: 'rgba(0,229,255,'  },
];

// ── Game Config (scales with screen) ──────────────────
function cfg() {
  const isMobile = window.innerWidth < 768;
  const cols    = 10;
  const brickW  = Math.floor(W * 0.88 / cols);
  const brickH  = Math.max(18, Math.floor(H * 0.035));
  const brickPad = Math.floor(brickW * 0.08);
  // More rows on mobile to fill the screen better
  const maxRows = isMobile ? 10 : 7;
  const rows    = Math.min(maxRows, Math.floor(H * (isMobile ? 0.45 : 0.30) / (brickH + brickPad)));
  const padW    = Math.max(80, W * 0.14);
  const padH    = Math.max(10, H * 0.018);
  const padY    = H - padH - Math.max(20, H * 0.04);
  const ballR   = Math.max(7, W * 0.011);
  return { cols, rows, brickW, brickH, brickPad, padW, padH, padY, ballR, isMobile };
}

// ── Game State ───────────────────────────────────────────────
let running       = false;
let gameStarted   = false; // true once user clicks start-overlay
let frameId       = null;
let score         = 0;
let levelNum      = 1;
let bricks        = [];
let balls         = [];
let paddle        = {};
let particles     = [];
let baseSpeed;
let gameOverPending    = false;
let ball2LaunchTimer   = 0;    // frames until 2nd ball launches
let ball2LaunchFrames  = 150;  // ~2.5 seconds at 60fps
let ball2Launched      = false;
let exitingToMenu      = false;
let flashIntervalId    = null;
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
  if (flashIntervalId) {
    clearInterval(flashIntervalId);
    flashIntervalId = null;
  }
});

let isMenuPaused = false;

window.addEventListener("arcade:menu-open", () => {
  if (!running || startCountdownActive) return;
  isMenuPaused = true;
  running = false;
  cancelAnimationFrame(frameId);
  frameId = null;
});

window.addEventListener("arcade:menu-close", () => {
  if (!isMenuPaused) return;
  isMenuPaused = false;
  runStartCountdown(() => {
    if (exitingToMenu) return;
    running = true;
    frameId = requestAnimationFrame(loop);
  });
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

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

// ── Create a single ball object ───────────────────────
function makeBall(x, y, angle, speed, r, themeIndex) {
  return {
    x, y, r,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    trail: [],
    theme: BALL_THEMES[themeIndex % BALL_THEMES.length],
  };
}

// ── Init ───────────────────────────────────────────────
function initGame(lvl = 1) {
  resize();
  const c = cfg();
  levelNum            = lvl;
  levelEl.textContent = lvl;
  score               = lvl === 1 ? 0 : score;
  scoreEl.textContent = score;
  particles           = [];
  gameOverPending     = false;
  ball2Launched       = false;
  ball2LaunchTimer    = 0;

  // Paddle
  paddle = { x: W / 2, y: c.padY, w: c.padW, h: c.padH };

  // Speed: mobile gets +40% faster to compensate for smaller touch area
  const mobileBoost = c.isMobile ? 1.4 : 1.0;
  baseSpeed = Math.max(5, W * 0.007) * (1 + (lvl - 1) * 0.18) * mobileBoost;

  // Ball 1 launches immediately from center, going slightly left
  const angle1 = -Math.PI / 2 + 0.3;
  balls = [
    makeBall(W / 2, c.padY - c.ballR - 2, angle1, baseSpeed, c.ballR, 0),
  ];
  // Ball 2 is created but marked pending — launched after delay
  balls.push(Object.assign(
    makeBall(W / 2, c.padY - c.ballR - 2, -Math.PI / 2 - 0.3, baseSpeed, c.ballR, 1),
    { pending: true }
  ));

  // Bricks
  bricks = [];
  const totalBrickW = c.cols * c.brickW + (c.cols - 1) * c.brickPad;
  const offsetX = (W - totalBrickW) / 2;
  const offsetY = Math.max(60, H * 0.10);

  for (let r = 0; r < c.rows; r++) {
    const colorPair = BRICK_COLORS[(r + lvl - 1) % BRICK_COLORS.length];
    for (let col = 0; col < c.cols; col++) {
      const hp = Math.ceil(c.rows / 2) - Math.floor(r / 2);
      bricks.push({
        x: offsetX + col * (c.brickW + c.brickPad),
        y: offsetY + r * (c.brickH + c.brickPad),
        w: c.brickW, h: c.brickH,
        hp, maxHp: hp,
        color: colorPair[0],
        colorHi: colorPair[1],
        alive: true,
      });
    }
  }
}

// ── Drawing Helpers ────────────────────────────────────
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
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

// ── Draw Background ────────────────────────────────────
function drawBg() {
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 0.5;
  const step = 40;
  for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

// ── Draw Bricks ────────────────────────────────────────
function drawBricks() {
  bricks.forEach(b => {
    if (!b.alive) return;
    const ratio = b.hp / b.maxHp;
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 10 * ratio;

    roundRect(b.x, b.y, b.w, b.h, 5);
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, b.colorHi);
    grad.addColorStop(1, b.color);
    ctx.fillStyle  = grad;
    ctx.globalAlpha = 0.4 + 0.6 * ratio;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (b.hp < b.maxHp) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth   = 1.5;
      const cracks = b.maxHp - b.hp;
      for (let i = 1; i <= cracks; i++) {
        const cx = b.x + (b.w / (cracks + 1)) * i;
        ctx.beginPath(); ctx.moveTo(cx, b.y); ctx.lineTo(cx + 3, b.y + b.h); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  });
}

// ── Draw Paddle ────────────────────────────────────────
function drawPaddle() {
  const x = paddle.x - paddle.w / 2;
  ctx.shadowColor = '#FF66CC';
  ctx.shadowBlur  = 20;
  roundRect(x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
  const grad = ctx.createLinearGradient(x, paddle.y, x + paddle.w, paddle.y);
  grad.addColorStop(0, '#6644FF');
  grad.addColorStop(0.5, '#FF66CC');
  grad.addColorStop(1, '#6644FF');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(x + paddle.w * 0.25, paddle.y + 1, paddle.w * 0.5, paddle.h * 0.4, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ── Draw a single ball with its trail ──────────────────
function drawOneBall(b) {
  // Trail
  b.trail.forEach((t, i) => {
    const alpha = (i / b.trail.length) * 0.45;
    ctx.beginPath();
    ctx.arc(t.x, t.y, b.r * (i / b.trail.length) * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `${b.theme.trail}${alpha})`;
    ctx.fill();
  });

  ctx.shadowColor = b.theme.glow;
  ctx.shadowBlur  = 22;

  const bg = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r);
  bg.addColorStop(0,   b.theme.core);
  bg.addColorStop(0.4, b.theme.mid);
  bg.addColorStop(1,   b.theme.outer);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ── Draw Particles ─────────────────────────────────────
function drawParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.12;
    p.life -= 0.03;
    p.r  *= 0.95;
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: Math.random() * 5 + 2,
      life: 1, color,
    });
  }
}

// ── Physics for one ball ───────────────────────────────
function updateOneBall(b) {
  // Trail
  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 12) b.trail.shift();

  b.x += b.vx;
  b.y += b.vy;

  // Wall bounces
  if (b.x - b.r < 0) { b.x = b.r;      b.vx =  Math.abs(b.vx); }
  if (b.x + b.r > W) { b.x = W - b.r;  b.vx = -Math.abs(b.vx); }
  if (b.y - b.r < 0) { b.y = b.r;      b.vy =  Math.abs(b.vy); }

  // Fell below paddle — mark as dead
  if (b.y - b.r > H + 20) {
    b.dead = true;
    return;
  }

  // Paddle collision
  if (
    b.vy > 0 &&
    b.y + b.r >= paddle.y &&
    b.y - b.r <= paddle.y + paddle.h &&
    b.x >= paddle.x - paddle.w / 2 &&
    b.x <= paddle.x + paddle.w / 2
  ) {
    const hit   = (b.x - paddle.x) / (paddle.w / 2);
    const angle = hit * (Math.PI / 3);
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    b.vx = Math.sin(angle) * speed;
    b.vy = -Math.abs(Math.cos(angle) * speed);
    b.y  = paddle.y - b.r - 1;
    spawnParticles(b.x, paddle.y, b.theme.outer, 6);
  }

  // Brick collision
  const alive = bricks.filter(br => br.alive);
  for (const br of alive) {
    if (
      b.x + b.r > br.x &&
      b.x - b.r < br.x + br.w &&
      b.y + b.r > br.y &&
      b.y - b.r < br.y + br.h
    ) {
      const overlapL = (b.x + b.r) - br.x;
      const overlapR = (br.x + br.w) - (b.x - b.r);
      const overlapT = (b.y + b.r) - br.y;
      const overlapB = (br.y + br.h) - (b.y - b.r);
      const minH = Math.min(overlapL, overlapR);
      const minV = Math.min(overlapT, overlapB);
      if (minH < minV) b.vx *= -1;
      else             b.vy *= -1;

      br.hp--;
      spawnParticles(b.x, b.y, br.color, 7);
      if (br.hp <= 0) {
        br.alive = false;
        score += 10 * levelNum;
        scoreEl.textContent = score;
        spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.colorHi, 14);
      }
      break;
    }
  }
}

// ── Main game update ───────────────────────────────────
function updateGame() {
  // Delayed launch: count up and release balls when ready
  if (!ball2Launched && !gameOverPending) {
    ball2LaunchTimer++;
    if (ball2LaunchTimer >= ball2LaunchFrames) {
      ball2Launched = true;
      // Launch any pending ball from current paddle center
      balls.forEach((b, i) => {
        if (b.pending) {
          b.x = paddle.x;
          b.y = paddle.y - b.r - 2;
          // Reiniciamos su velocidad hacia arriba para asegurarnos de que salga bien
          const angle = -Math.PI / 2 + (i === 1 ? -0.3 : 0.3);
          b.vx = Math.cos(angle) * baseSpeed;
          b.vy = Math.sin(angle) * baseSpeed;
          b.pending = false;
          spawnParticles(b.x, b.y, b.theme.outer, 12);
        }
      });
    }
  }

  balls.forEach(b => { if (!b.dead && !b.pending) updateOneBall(b); });

  // Game over when ALL active balls fall
  const allDead = balls.every(b => b.dead || b.pending);
  if (allDead && !gameOverPending) {
    gameOverPending = true;
    endGame();
    return;
  }

  // Reload dead balls back to pending state to respawn them
  balls.forEach(b => {
    if (b.dead) {
      b.dead = false;
      b.pending = true;
      ball2Launched = false;
      ball2LaunchTimer = 0; // Reinicia el tiempo para que vuelva a salir
    }
  });

  // Level cleared
  if (bricks.every(b => !b.alive) && !gameOverPending) {
    running = false;
    setTimeout(() => {
      initGame(levelNum + 1);
      running = true;
      loop();
    }, 800);
  }
}

// ── Main Loop ──────────────────────────────────────────
function loop() {
  if (!running || exitingToMenu) return;
  frameId = requestAnimationFrame(loop);

  drawBg();
  drawBricks();
  drawParticles();
  updateGame();
  balls.forEach(b => { if (!b.dead && !b.pending) drawOneBall(b); });
  drawPaddle();
}

// ── Input ──────────────────────────────────────────────
window.addEventListener('mousemove', e => {
  paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, e.clientX));
});

let touchLastX = null;
window.addEventListener('touchstart', e => { touchLastX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchmove', e => {
  if (touchLastX === null) return;
  const dx = e.touches[0].clientX - touchLastX;
  paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x + dx));
  touchLastX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', () => { touchLastX = null; }, { passive: true });

// ── Game Over ──────────────────────────────────────────
function saveResumeState() {
  const state = {
    score: score,
    levelNum: levelNum,
    bricks: bricks,
  };
  localStorage.setItem('neonbreakerResume', JSON.stringify(state));
}

function resumeGame(state) {
  resize();
  const c = cfg();
  levelNum            = state.levelNum || 1;
  levelEl.textContent = levelNum;
  score               = state.score || 0;
  scoreEl.textContent = score;
  particles           = [];
  gameOverPending     = false;
  ball2Launched       = false;
  ball2LaunchTimer    = 0;

  // Paddle
  paddle = { x: W / 2, y: c.padY, w: c.padW, h: c.padH };

  const mobileBoost = c.isMobile ? 1.4 : 1.0;
  baseSpeed = Math.max(5, W * 0.007) * (1 + (levelNum - 1) * 0.18) * mobileBoost;

  const angle1 = -Math.PI / 2 + 0.3;
  balls = [
    makeBall(W / 2, c.padY - c.ballR - 2, angle1, baseSpeed, c.ballR, 0),
  ];
  balls.push(Object.assign(
    makeBall(W / 2, c.padY - c.ballR - 2, -Math.PI / 2 - 0.3, baseSpeed, c.ballR, 1),
    { pending: true }
  ));

  bricks = state.bricks || [];

  running = true;
  cancelAnimationFrame(frameId);
  loop();
}

function endGame() {
  if (exitingToMenu) return;

  running = false;
  cancelAnimationFrame(frameId);
  saveResumeState();
  let f = 0;
  flashIntervalId = setInterval(() => {
    ctx.fillStyle = `rgba(255, 20, 60, 0.2)`;
    ctx.fillRect(0, 0, W, H);
    if (++f >= 6) {
      clearInterval(flashIntervalId);
      flashIntervalId = null;
      showQuestionModal();
    }
  }, 80);
}

function showQuestionModal() {
  const m = document.getElementById('question-modal');
  m.classList.add('is-visible');
  m.setAttribute('aria-hidden', 'false');
}

// ── Start Initiation ───────────────────────
const startOverlay = document.getElementById('start-overlay');

function beginGame() {
  exitingToMenu = false;
  if (gameStarted || startCountdownActive) return;

  runStartCountdown(() => {
    if (gameStarted || exitingToMenu) return;
    gameStarted = true;
    startOverlay.classList.remove('is-visible');
    initGame(1);
    running = true;
    loop();
  });
}

startOverlay.addEventListener('click', beginGame);
startOverlay.addEventListener('touchstart', (e) => {
  e.preventDefault();
  beginGame();
}, { passive: false });

const resumeOk = localStorage.getItem('neonbreakerResumeOk') === 'true';
const restart = localStorage.getItem('neonbreakerRestart') === 'true';

localStorage.removeItem('neonbreakerResumeOk');
localStorage.removeItem('neonbreakerRestart');

if (restart) { localStorage.removeItem('neonbreakerResume'); } else if (resumeOk) {
  const resumeRaw = localStorage.getItem('neonbreakerResume');
  if (resumeRaw) {
    const state = JSON.parse(resumeRaw);
    localStorage.removeItem('neonbreakerResume');
    if (!gameStarted) {
      gameStarted = true;
      startOverlay.classList.remove('is-visible');
      resumeGame(state);
    }
  }
}

function idle() {
  if (running || exitingToMenu) return;
  requestAnimationFrame(idle);
  drawBg();
  drawBricks();
  drawPaddle();
}

idle();


