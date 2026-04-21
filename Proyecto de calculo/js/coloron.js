const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("start-overlay");
const questionModal = document.getElementById("question-modal");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");

let W = 0;
let H = 0;
let cx = 0;
let cy = 0;

let stars = [];
let obstacles = [];
let particles = [];

let running = false;
let gameStarted = false;
let exitingToMenu = false;
let frameId = null;
let lastTs = 0;

let score = 0;
let level = 1;
let lives = 3;
let elapsedMs = 0;
let bonusScore = 0;

let spawnTimer = 0;
let spawnEveryMs = 1150;
let currentSpawnDelay = 1150;
let obstacleBaseSpeed = 0.9;
let nextObstacleId = 1;

let countdownActive = false;
let countdownTimer = null;

const keys = {
  left: false,
  right: false,
};

const player = {
  angle: -Math.PI / 2,
  angularVel: 0,
  lane: 1, // 0 inner, 1 outer
  innerR: 0,
  outerR: 0,
  radius: 11,
};

const TAU = Math.PI * 2;

function normalizeAngle(angle) {
  let out = angle % TAU;
  if (out < 0) out += TAU;
  return out;
}

function angularDistance(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, TAU - diff);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function playerOrbitRadius() {
  return player.lane === 0 ? player.innerR : player.outerR;
}

function resizeCanvas() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  cx = W / 2;
  cy = H / 2;

  const base = Math.min(W, H);
  player.innerR = Math.max(72, base * 0.2);
  player.outerR = Math.max(128, base * 0.31);

  if (!stars.length) {
    initStars();
  }

  if (!running) {
    drawScene(16);
  }
}

function initStars() {
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 1.6 + 0.2,
    speed: Math.random() * 0.45 + 0.1,
    alpha: Math.random() * 0.6 + 0.18,
  }));
}

function loadLives() {
  const stored = parseInt(localStorage.getItem("coloronLives"), 10);
  lives = Number.isFinite(stored) && stored > 0 ? stored : 3;
  localStorage.setItem("coloronLives", String(lives));
}

function updateHud() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  livesEl.textContent = String(lives);
}

function showStartOverlay() {
  startOverlay.classList.add("is-visible");
  startOverlay.setAttribute("aria-hidden", "false");
}

function hideStartOverlay() {
  startOverlay.classList.remove("is-visible");
  startOverlay.setAttribute("aria-hidden", "true");
}

function showQuestionModal() {
  questionModal.classList.add("is-visible");
  questionModal.setAttribute("aria-hidden", "false");
}

function hideQuestionModal() {
  questionModal.classList.remove("is-visible");
  questionModal.setAttribute("aria-hidden", "true");
}

function resetRun() {
  score = 0;
  level = 1;
  elapsedMs = 0;
  bonusScore = 0;

  obstacles = [];
  particles = [];

  spawnTimer = 0;
  spawnEveryMs = 1150;
  currentSpawnDelay = 1150;
  obstacleBaseSpeed = 0.9;
  nextObstacleId = 1;

  player.angle = -Math.PI / 2;
  player.angularVel = 0;
  player.lane = 1;

  updateHud();
}

function spawnObstacle() {
  const lane = Math.random() < 0.5 ? 0 : 1;
  const tries = 8;

  let angle = Math.random() * TAU;
  for (let i = 0; i < tries; i += 1) {
    let isValid = angularDistance(angle, player.angle) > 0.85;
    if (isValid) {
      for (const obs of obstacles) {
        if (obs.lane === lane && angularDistance(angle, obs.angle) < 0.5) {
          isValid = false;
          break;
        }
      }
    }
    if (isValid) {
      break;
    }
    angle = Math.random() * TAU;
  }

  const width = 0.32 + Math.random() * 0.24;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const speed = dir * (obstacleBaseSpeed + Math.random() * 0.65);

  obstacles.push({
    id: nextObstacleId++,
    lane,
    angle,
    width,
    speed,
    age: 0,
    ttl: 8.2 + Math.random() * 1.6,
    passed: false,
    hue: 175 + Math.random() * 140,
  });
}

function toggleLane() {
  player.lane = player.lane === 0 ? 1 : 0;
}

function spawnCrashParticles() {
  const pr = playerOrbitRadius();
  const px = cx + Math.cos(player.angle) * pr;
  const py = cy + Math.sin(player.angle) * pr;

  for (let i = 0; i < 24; i += 1) {
    const angle = Math.random() * TAU;
    const speed = Math.random() * 4.5 + 1;

    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      life: 1,
      color: ["#00E5FF", "#FF4D86", "#FFD145", "#FFFFFF"][
        Math.floor(Math.random() * 4)
      ],
    });
  }
}

function saveCheckpoint() {
  const state = {
    score,
    level,
    elapsedMs,
    bonusScore,
    spawnEveryMs,
    currentSpawnDelay,
    obstacleBaseSpeed,
    playerAngle: player.angle,
    playerLane: player.lane,
    playerAngularVel: 0,
    obstacles: [],
  };

  localStorage.setItem("coloronPaused", "true");
  localStorage.setItem("coloronCheckpointState", JSON.stringify(state));
  localStorage.setItem("coloronLives", String(lives));
}

function handleCrash() {
  if (!running) return;

  running = false;
  cancelAnimationFrame(frameId);
  frameId = null;

  spawnCrashParticles();
  saveCheckpoint();

  window.setTimeout(() => {
    if (!exitingToMenu) {
      showQuestionModal();
    }
  }, 280);
}

function updatePlayer(deltaSec) {
  const accel = 5.4;
  const friction = 0.86;
  const maxVel = 2.8;

  if (keys.left) {
    player.angularVel -= accel * deltaSec;
  }
  if (keys.right) {
    player.angularVel += accel * deltaSec;
  }

  player.angularVel *= friction;
  player.angularVel = clamp(player.angularVel, -maxVel, maxVel);
  player.angle = normalizeAngle(player.angle + player.angularVel * deltaSec);
}

function updateObstacles(deltaSec) {
  const hitPadding = 0.12;

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obs = obstacles[i];
    obs.age += deltaSec;
    obs.angle = normalizeAngle(obs.angle + obs.speed * deltaSec);

    if (!obs.passed && obs.age > 1.35) {
      obs.passed = true;
      bonusScore += 2;
    }

    if (obs.lane === player.lane) {
      const dist = angularDistance(player.angle, obs.angle);
      if (dist <= obs.width / 2 + hitPadding) {
        handleCrash();
        return;
      }
    }

    if (obs.age > obs.ttl) {
      obstacles.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 0.03;
    p.size *= 0.96;

    if (p.life <= 0 || p.size < 0.45) {
      particles.splice(i, 1);
    }
  }
}

function updateGame(deltaMs) {
  const deltaSec = deltaMs / 1000;

  elapsedMs += deltaMs;
  score = Math.floor(elapsedMs / 900) + bonusScore;
  level = 1 + Math.floor(score / 14);

  spawnEveryMs = Math.max(420, 1150 - (level - 1) * 58);
  obstacleBaseSpeed = 0.9 + (level - 1) * 0.08;

  updateHud();
  updatePlayer(deltaSec);

  spawnTimer += deltaMs;
  while (spawnTimer >= currentSpawnDelay) {
    spawnTimer -= currentSpawnDelay;
    spawnObstacle();
    currentSpawnDelay = spawnEveryMs * (0.6 + Math.random() * 0.8);
  }

  updateObstacles(deltaSec);
  updateParticles();
}

function drawBackground(deltaMs) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#060816");
  bg.addColorStop(1, "#0a0e22");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(W, H) * 0.55);
  nebula.addColorStop(0, "rgba(0,229,255,0.08)");
  nebula.addColorStop(1, "transparent");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  const speedFactor = running ? deltaMs * 0.038 : 0.25;
  stars.forEach((star) => {
    star.y += star.speed * speedFactor;
    if (star.y > H) {
      star.y = 0;
      star.x = Math.random() * W;
    }

    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, TAU);
    ctx.fill();
  });
}

function drawCoreAndOrbits() {
  const pulse = 1 + Math.sin(elapsedMs * 0.0045) * 0.05;

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, player.innerR, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,229,255,0.28)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, player.outerR, 0, TAU);
  ctx.stroke();

  const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48 * pulse);
  coreGlow.addColorStop(0, "rgba(255,255,255,0.9)");
  coreGlow.addColorStop(0.4, "rgba(0,229,255,0.55)");
  coreGlow.addColorStop(1, "rgba(0,229,255,0)");

  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 48 * pulse, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#00E5FF";
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, TAU);
  ctx.fill();
}

function drawObstacleArc(obs) {
  const r = obs.lane === 0 ? player.innerR : player.outerR;
  const start = normalizeAngle(obs.angle - obs.width / 2);
  const end = normalizeAngle(obs.angle + obs.width / 2);

  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.strokeStyle = `hsla(${obs.hue}, 95%, 60%, 0.95)`;
  ctx.shadowColor = `hsla(${obs.hue}, 95%, 58%, 0.7)`;
  ctx.shadowBlur = 16;

  ctx.beginPath();
  if (end < start) {
    ctx.arc(cx, cy, r, start, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, end);
    ctx.stroke();
  } else {
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function drawObstacles() {
  obstacles.forEach((obs) => drawObstacleArc(obs));
}

function drawPlayer() {
  const r = playerOrbitRadius();
  const px = cx + Math.cos(player.angle) * r;
  const py = cy + Math.sin(player.angle) * r;

  const tangent = player.angle + Math.PI / 2;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(tangent);

  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, player.radius * 2.2);
  glow.addColorStop(0, "rgba(255,255,255,0.92)");
  glow.addColorStop(0.35, "rgba(0,229,255,0.95)");
  glow.addColorStop(1, "rgba(0,229,255,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -player.radius - 2);
  ctx.lineTo(player.radius * 0.72, player.radius * 0.82);
  ctx.lineTo(-player.radius * 0.72, player.radius * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#00E5FF";
  ctx.beginPath();
  ctx.moveTo(0, -player.radius * 0.6);
  ctx.lineTo(player.radius * 0.4, player.radius * 0.4);
  ctx.lineTo(-player.radius * 0.4, player.radius * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawScene(deltaMs) {
  drawBackground(deltaMs);
  drawCoreAndOrbits();
  drawObstacles();
  drawPlayer();
  drawParticles();
}

function loop(ts) {
  if (!running || exitingToMenu) {
    return;
  }

  if (!lastTs) {
    lastTs = ts;
  }

  const deltaMs = Math.min(36, ts - lastTs);
  lastTs = ts;

  updateGame(deltaMs);
  drawScene(deltaMs);

  frameId = requestAnimationFrame(loop);
}

function startFreshRun() {
  exitingToMenu = false;
  gameStarted = true;

  hideStartOverlay();
  hideQuestionModal();

  resetRun();

  running = true;
  lastTs = 0;

  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(loop);
}

function resumeRun(state) {
  exitingToMenu = false;
  gameStarted = true;

  hideStartOverlay();
  hideQuestionModal();

  score = Number.isFinite(state.score) ? state.score : 0;
  level = Number.isFinite(state.level) ? state.level : 1;
  elapsedMs = Number.isFinite(state.elapsedMs) ? state.elapsedMs : score * 900;
  bonusScore = Number.isFinite(state.bonusScore) ? state.bonusScore : 0;

  spawnEveryMs = Number.isFinite(state.spawnEveryMs) ? state.spawnEveryMs : 1150;
  currentSpawnDelay = Number.isFinite(state.currentSpawnDelay) ? state.currentSpawnDelay : spawnEveryMs;
  obstacleBaseSpeed = Number.isFinite(state.obstacleBaseSpeed)
    ? state.obstacleBaseSpeed
    : 0.9;

  obstacles = Array.isArray(state.obstacles)
    ? state.obstacles.filter(
        (obs) =>
          Number.isFinite(obs.lane) &&
          Number.isFinite(obs.angle) &&
          Number.isFinite(obs.width) &&
          Number.isFinite(obs.speed) &&
          Number.isFinite(obs.age) &&
          Number.isFinite(obs.ttl),
      )
    : [];

  player.angle = Number.isFinite(state.playerAngle)
    ? normalizeAngle(state.playerAngle)
    : -Math.PI / 2;
  player.angularVel = Number.isFinite(state.playerAngularVel)
    ? state.playerAngularVel
    : 0;
  player.lane = state.playerLane === 0 ? 0 : 1;

  particles = [];
  spawnTimer = 0;

  updateHud();

  running = true;
  lastTs = 0;

  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(loop);
}

function runStartCountdown(onDone) {
  if (!startOverlay || countdownActive) {
    return;
  }

  const icon = startOverlay.querySelector(".start-message i");
  const message = startOverlay.querySelector(".start-message p");
  const baseText = "Toca o haz clic para iniciar";
  let count = 3;

  countdownActive = true;

  if (icon) {
    icon.style.display = "none";
  }
  if (message) {
    message.textContent = `Inicia en ${count}`;
  }

  countdownTimer = setInterval(() => {
    count -= 1;

    if (count > 0) {
      if (message) {
        message.textContent = `Inicia en ${count}`;
      }
      return;
    }

    clearInterval(countdownTimer);
    countdownTimer = null;
    countdownActive = false;

    if (icon) {
      icon.style.display = "";
    }
    if (message) {
      message.textContent = baseText;
    }

    if (typeof overlay !== "undefined" && overlay) overlay.classList.remove("is-visible");
    if (typeof startOverlay !== "undefined" && startOverlay) startOverlay.classList.remove("is-visible");

    onDone();
  }, 1000);
}

function beginGameFromTap(event) {
  event.preventDefault();
  event.stopPropagation();

  if (running || gameStarted || countdownActive) {
    return;
  }

  runStartCountdown(() => {
    if (exitingToMenu) {
      return;
    }
    startFreshRun();
  });
}

function stopGame() {
  running = false;
  gameStarted = false;

  cancelAnimationFrame(frameId);
  frameId = null;

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  countdownActive = false;
}

window.game = {
  stop: stopGame,
};

window.addEventListener("arcade:menu-exit", () => {
  exitingToMenu = true;
  stopGame();
  hideQuestionModal();
});

let isMenuPaused = false;

window.addEventListener("arcade:menu-open", () => {
  if (!running || countdownActive) return;
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
    lastTs = 0; // Reset time so we don't get huge jumps
    frameId = requestAnimationFrame(loop);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keys.left = true;
    event.preventDefault();
  }

  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keys.right = true;
    event.preventDefault();
  }

  if (event.key === " " || event.code === "Space") {
    toggleLane();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keys.left = false;
  }

  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keys.right = false;
  }
});

let touchStartX = null;
let touchMoved = false;

window.addEventListener(
  "touchstart",
  (event) => {
    if (startOverlay.classList.contains("is-visible")) {
      return;
    }
    touchStartX = event.touches[0].clientX;
    touchMoved = false;
  },
  { passive: true },
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (startOverlay.classList.contains("is-visible") || touchStartX === null) {
      return;
    }

    const x = event.touches[0].clientX;
    const dx = x - touchStartX;

    if (Math.abs(dx) > 3) {
      touchMoved = true;
    }

    player.angle = normalizeAngle(player.angle + dx * 0.0048);
    touchStartX = x;
  },
  { passive: true },
);

window.addEventListener(
  "touchend",
  () => {
    if (startOverlay.classList.contains("is-visible")) {
      touchStartX = null;
      touchMoved = false;
      return;
    }

    if (!touchMoved) {
      toggleLane();
    }

    touchStartX = null;
    touchMoved = false;
  },
  { passive: true },
);

startOverlay.addEventListener("click", beginGameFromTap);
startOverlay.addEventListener("touchstart", beginGameFromTap, { passive: false });

function bootFromStorage() {
  loadLives();

  const restart = localStorage.getItem("coloronRestart") === "true";
  const paused = localStorage.getItem("coloronPaused") === "true";
  const checkpointRaw = localStorage.getItem("coloronCheckpointState");

  if (restart) {
    localStorage.removeItem("coloronRestart");
    localStorage.removeItem("coloronPaused");
    localStorage.removeItem("coloronCheckpointState");

    lives = 3;
    localStorage.setItem("coloronLives", "3");

    startFreshRun();
    return;
  }

  if (paused && checkpointRaw) {
    try {
      const state = JSON.parse(checkpointRaw);
      localStorage.removeItem("coloronPaused");
      localStorage.removeItem("coloronCheckpointState");
      resumeRun(state);
      return;
    } catch (error) {
      localStorage.removeItem("coloronPaused");
      localStorage.removeItem("coloronCheckpointState");
    }
  }

  localStorage.removeItem("coloronPaused");
  localStorage.removeItem("coloronCheckpointState");

  showStartOverlay();
  hideQuestionModal();
  resetRun();
  drawScene(16);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
bootFromStorage();


