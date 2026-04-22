/*jslint browser: true, undef: true, eqeqeq: true, nomen: true, white: true */
/*global window: false, document: false */

/*
 * fix looped audio
 * add fruits + levels
 * fix what happens when a ghost is eaten (should go back to base)
 * do proper ghost mechanics (blinky/wimpy etc)
 */

var NONE = 4,
  UP = 3,
  LEFT = 2,
  DOWN = 1,
  RIGHT = 11,
  WAITING = 5,
  PAUSE = 6,
  PLAYING = 7,
  COUNTDOWN = 8,
  EATEN_PAUSE = 9,
  DYING = 10,
  Pacman = {};

function hasCanvasSupport() {
  var canvas = document.createElement("canvas");
  return !!(canvas && typeof canvas.getContext === "function");
}

function getAudioExtension() {
  var audio = document.createElement("audio");

  if (!audio || typeof audio.canPlayType !== "function") {
    return null;
  }

  var canOgg = audio.canPlayType('audio/ogg; codecs="vorbis"');
  if (canOgg && canOgg !== "no") {
    return "ogg";
  }

  var canMp3 = audio.canPlayType("audio/mpeg;");
  if (canMp3 && canMp3 !== "no") {
    return "mp3";
  }

  return null;
}

Pacman.FPS = 30;

Pacman.Ghost = function (game, map, colour) {
  var position = null,
    direction = null,
    eatable = null,
    eaten = null,
    due = null;

  function getNewCoord(dir, current) {
    var speed = isVunerable() ? 1 : isHidden() ? 4 : 2,
      xSpeed = (dir === LEFT && -speed) || (dir === RIGHT && speed) || 0,
      ySpeed = (dir === DOWN && speed) || (dir === UP && -speed) || 0;

    return {
      x: addBounded(current.x, xSpeed),
      y: addBounded(current.y, ySpeed),
    };
  }

  /* Collision detection(walls) is done when a ghost lands on an
   * exact block, make sure they dont skip over it
   */
  function addBounded(x1, x2) {
    var rem = x1 % 10,
      result = rem + x2;
    if (rem !== 0 && result > 10) {
      return x1 + (10 - rem);
    } else if (rem > 0 && result < 0) {
      return x1 - rem;
    }
    return x1 + x2;
  }

  function isVunerable() {
    return eatable !== null;
  }

  function isDangerous() {
    return eaten === null;
  }

  function isHidden() {
    return eatable === null && eaten !== null;
  }

  function getRandomDirection() {
    var moves =
      direction === LEFT || direction === RIGHT ? [UP, DOWN] : [LEFT, RIGHT];
    return moves[Math.floor(Math.random() * 2)];
  }

  function reset() {
    eaten = null;
    eatable = null;
    position = { x: 90, y: 80 };
    direction = getRandomDirection();
    due = getRandomDirection();
  }

  function onWholeSquare(x) {
    return x % 10 === 0;
  }

  function oppositeDirection(dir) {
    return (
      (dir === LEFT && RIGHT) ||
      (dir === RIGHT && LEFT) ||
      (dir === UP && DOWN) ||
      UP
    );
  }

  function makeEatable() {
    direction = oppositeDirection(direction);
    eatable = game.getTick();
  }

  function eat() {
    eatable = null;
    eaten = game.getTick();
  }

  function pointToCoord(x) {
    return Math.round(x / 10);
  }

  function nextSquare(x, dir) {
    var rem = x % 10;
    if (rem === 0) {
      return x;
    } else if (dir === RIGHT || dir === DOWN) {
      return x + (10 - rem);
    } else {
      return x - rem;
    }
  }

  function onGridSquare(pos) {
    return onWholeSquare(pos.y) && onWholeSquare(pos.x);
  }

  function secondsAgo(tick) {
    return (game.getTick() - tick) / Pacman.FPS;
  }

  function getColour() {
    if (eatable) {
      if (secondsAgo(eatable) > 5) {
        return game.getTick() % 20 > 10 ? "#FFFFFF" : "#0000BB";
      } else {
        return "#0000BB";
      }
    } else if (eaten) {
      return "#222";
    }
    return colour;
  }

  function draw(ctx) {
    var s = map.blockSize,
      top = (position.y / 10) * s,
      left = (position.x / 10) * s;

    if (eatable && secondsAgo(eatable) > 8) {
      eatable = null;
    }

    if (eaten && secondsAgo(eaten) > 3) {
      eaten = null;
    }

    var tl = left + s;
    var base = top + s - 3;
    var inc = s / 10;

    var high = game.getTick() % 10 > 5 ? 3 : -3;
    var low = game.getTick() % 10 > 5 ? -3 : 3;

    ctx.fillStyle = getColour();
    ctx.beginPath();

    ctx.moveTo(left, base);

    ctx.quadraticCurveTo(left, top, left + s / 2, top);
    ctx.quadraticCurveTo(left + s, top, left + s, base);

    // Wavy things at the bottom
    ctx.quadraticCurveTo(tl - inc * 1, base + high, tl - inc * 2, base);
    ctx.quadraticCurveTo(tl - inc * 3, base + low, tl - inc * 4, base);
    ctx.quadraticCurveTo(tl - inc * 5, base + high, tl - inc * 6, base);
    ctx.quadraticCurveTo(tl - inc * 7, base + low, tl - inc * 8, base);
    ctx.quadraticCurveTo(tl - inc * 9, base + high, tl - inc * 10, base);

    ctx.closePath();
    ctx.fill();

    var eyeRadius = s / 6; // scales with block size
    var pupilRadius = s / 15;
    var eyeOffsetX = s * 0.25;
    var eyeOffsetY = s * 0.3;

    // White of eyes
    ctx.beginPath();
    ctx.fillStyle = "#FFF";
    ctx.arc(
      left + eyeOffsetX,
      top + eyeOffsetY,
      eyeRadius,
      0,
      Math.PI * 2,
      false,
    );
    ctx.arc(
      left + s - eyeOffsetX,
      top + eyeOffsetY,
      eyeRadius,
      0,
      Math.PI * 2,
      false,
    );
    ctx.closePath();
    ctx.fill();

    // Pupils - shift based on direction
    var f = s / 12;
    var off = {};
    off[RIGHT] = [f, 0];
    off[LEFT] = [-f, 0];
    off[UP] = [0, -f];
    off[DOWN] = [0, f];

    ctx.beginPath();
    ctx.fillStyle = "#00F";
    ctx.arc(
      left + eyeOffsetX + off[direction][0],
      top + eyeOffsetY + off[direction][1],
      pupilRadius,
      0,
      Math.PI * 2,
      false,
    );
    ctx.arc(
      left + s - eyeOffsetX + off[direction][0],
      top + eyeOffsetY + off[direction][1],
      pupilRadius,
      0,
      Math.PI * 2,
      false,
    );
    ctx.closePath();
    ctx.fill();
  }

  function pane(pos) {
    if (pos.y === 100 && pos.x >= 190 && direction === RIGHT) {
      return { y: 100, x: -10 };
    }

    if (pos.y === 100 && pos.x <= -10 && direction === LEFT) {
      return (position = { y: 100, x: 190 });
    }

    return false;
  }

  function move(ctx) {
    var oldPos = position,
      onGrid = onGridSquare(position),
      npos = null;

    if (due !== direction) {
      npos = getNewCoord(due, position);

      if (
        onGrid &&
        map.isFloorSpace({
          y: pointToCoord(nextSquare(npos.y, due)),
          x: pointToCoord(nextSquare(npos.x, due)),
        })
      ) {
        direction = due;
      } else {
        npos = null;
      }
    }

    if (npos === null) {
      npos = getNewCoord(direction, position);
    }

    if (
      onGrid &&
      map.isWallSpace({
        y: pointToCoord(nextSquare(npos.y, direction)),
        x: pointToCoord(nextSquare(npos.x, direction)),
      })
    ) {
      due = getRandomDirection();
      return move(ctx);
    }

    position = npos;

    var tmp = pane(position);
    if (tmp) {
      position = tmp;
    }

    due = getRandomDirection();

    return {
      new: position,
      old: oldPos,
    };
  }

  return {
    eat: eat,
    isVunerable: isVunerable,
    isDangerous: isDangerous,
    makeEatable: makeEatable,
    reset: reset,
    move: move,
    draw: draw,
  };
};

Pacman.User = function (game, map) {
  var position = null,
    direction = null,
    eaten = null,
    due = null,
    lives = null,
    score = 5,
    keyMap = {};

  keyMap[KEY.ARROW_LEFT] = LEFT;
  keyMap[KEY.ARROW_UP] = UP;
  keyMap[KEY.ARROW_RIGHT] = RIGHT;
  keyMap[KEY.ARROW_DOWN] = DOWN;

  function addScore(nScore) {
    score += nScore;
    if (score >= 10000 && score - nScore < 10000) {
      lives += 1;
    }
  }

  function theScore() {
    return score;
  }

  function loseLife() {
    lives -= 1;
  }

  function getLives() {
    return lives;
  }

  function initUser() {
    score = 0;
    lives = 3;
    newLevel();
  }

  function setLives(newLives) {
    lives = newLives;
  }

  function setScore(newScore) {
    score = newScore;
  }

  function newLevel() {
    resetPosition();
    eaten = 0;
  }

  function resetPosition() {
    position = { x: 90, y: 120 };
    direction = LEFT;
    due = LEFT;
  }

  function reset() {
    initUser();
    resetPosition();
  }

  function keyDown(e) {
    if (typeof keyMap[e.keyCode] !== "undefined") {
      due = keyMap[e.keyCode];
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    return true;
  }

  function getNewCoord(dir, current) {
    return {
      x: current.x + ((dir === LEFT && -2) || (dir === RIGHT && 2) || 0),
      y: current.y + ((dir === DOWN && 2) || (dir === UP && -2) || 0),
    };
  }

  function onWholeSquare(x) {
    return x % 10 === 0;
  }

  function pointToCoord(x) {
    return Math.round(x / 10);
  }

  function nextSquare(x, dir) {
    var rem = x % 10;
    if (rem === 0) {
      return x;
    } else if (dir === RIGHT || dir === DOWN) {
      return x + (10 - rem);
    } else {
      return x - rem;
    }
  }

  function next(pos, dir) {
    return {
      y: pointToCoord(nextSquare(pos.y, dir)),
      x: pointToCoord(nextSquare(pos.x, dir)),
    };
  }

  function onGridSquare(pos) {
    return onWholeSquare(pos.y) && onWholeSquare(pos.x);
  }

  function isOnSamePlane(due, dir) {
    return (
      ((due === LEFT || due === RIGHT) && (dir === LEFT || dir === RIGHT)) ||
      ((due === UP || due === DOWN) && (dir === UP || dir === DOWN))
    );
  }

  function move(ctx) {
    var npos = null,
      nextWhole = null,
      oldPosition = position,
      block = null;

    if (due !== direction) {
      npos = getNewCoord(due, position);

      if (
        isOnSamePlane(due, direction) ||
        (onGridSquare(position) && map.isFloorSpace(next(npos, due)))
      ) {
        direction = due;
      } else {
        npos = null;
      }
    }

    if (npos === null) {
      npos = getNewCoord(direction, position);
    }

    if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) {
      direction = NONE;
    }

    if (direction === NONE) {
      return { new: position, old: position };
    }

    if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) {
      npos = { y: 100, x: -10 };
    }

    if (npos.y === 100 && npos.x <= -12 && direction === LEFT) {
      npos = { y: 100, x: 190 };
    }

    position = npos;
    nextWhole = next(position, direction);

    block = map.block(nextWhole);

    if (
      ((isMidSquare(position.y) || isMidSquare(position.x)) &&
        block === Pacman.BISCUIT) ||
      block === Pacman.PILL
    ) {
      map.setBlock(nextWhole, Pacman.EMPTY);
      addScore(block === Pacman.BISCUIT ? 10 : 50);
      eaten += 1;

      if (eaten === 182) {
        game.completedLevel();
      }

      if (block === Pacman.PILL) {
        game.eatenPill();
      }
    }

    return {
      new: position,
      old: oldPosition,
    };
  }

  function isMidSquare(x) {
    var rem = x % 10;
    return rem > 3 || rem < 7;
  }

  function calcAngle(dir, pos) {
    if (dir == RIGHT && pos.x % 10 < 5) {
      return { start: 0.25, end: 1.75, direction: false };
    } else if (dir === DOWN && pos.y % 10 < 5) {
      return { start: 0.75, end: 2.25, direction: false };
    } else if (dir === UP && pos.y % 10 < 5) {
      return { start: 1.25, end: 1.75, direction: true };
    } else if (dir === LEFT && pos.x % 10 < 5) {
      return { start: 0.75, end: 1.25, direction: true };
    }
    return { start: 0, end: 2, direction: false };
  }

  function drawDead(ctx, amount) {
    var size = map.blockSize,
      half = size / 2;

    if (amount >= 1) {
      return;
    }

    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.moveTo(
      (position.x / 10) * size + half,
      (position.y / 10) * size + half,
    );

    ctx.arc(
      (position.x / 10) * size + half,
      (position.y / 10) * size + half,
      half,
      0,
      Math.PI * 2 * amount,
      true,
    );

    ctx.fill();
  }

  function draw(ctx) {
    var s = map.blockSize,
      angle = calcAngle(direction, position);

    ctx.fillStyle = "#FFFF00";

    ctx.beginPath();

    ctx.moveTo((position.x / 10) * s + s / 2, (position.y / 10) * s + s / 2);

    ctx.arc(
      (position.x / 10) * s + s / 2,
      (position.y / 10) * s + s / 2,
      s / 2,
      Math.PI * angle.start,
      Math.PI * angle.end,
      angle.direction,
    );

    ctx.fill();
  }

  initUser();

  return {
    draw: draw,
    drawDead: drawDead,
    loseLife: loseLife,
    getLives: getLives,
    score: score,
    addScore: addScore,
    theScore: theScore,
    setLives: setLives,
    setScore: setScore,
    keyDown: keyDown,
    move: move,
    newLevel: newLevel,
    reset: reset,
    resetPosition: resetPosition,
  };
};

Pacman.Map = function (size) {
  var height = null,
    width = null,
    blockSize = size,
    pillSize = 0,
    map = null;

  function withinBounds(y, x) {
    return y >= 0 && y < height && x >= 0 && x < width;
  }

  function isWall(pos) {
    return withinBounds(pos.y, pos.x) && map[pos.y][pos.x] === Pacman.WALL;
  }

  function isFloorSpace(pos) {
    if (!withinBounds(pos.y, pos.x)) {
      return false;
    }
    var peice = map[pos.y][pos.x];
    return (
      peice === Pacman.EMPTY ||
      peice === Pacman.BISCUIT ||
      peice === Pacman.PILL
    );
  }

  function drawWall(ctx) {
    var i, j, p, line;

    ctx.strokeStyle = "#0000FF";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    for (i = 0; i < Pacman.WALLS.length; i += 1) {
      line = Pacman.WALLS[i];
      ctx.beginPath();

      for (j = 0; j < line.length; j += 1) {
        p = line[j];

        if (p.move) {
          ctx.moveTo(p.move[0] * blockSize, p.move[1] * blockSize);
        } else if (p.line) {
          ctx.lineTo(p.line[0] * blockSize, p.line[1] * blockSize);
        } else if (p.curve) {
          ctx.quadraticCurveTo(
            p.curve[0] * blockSize,
            p.curve[1] * blockSize,
            p.curve[2] * blockSize,
            p.curve[3] * blockSize,
          );
        }
      }
      ctx.stroke();
    }
  }

  function reset() {
    map = Pacman.MAP.clone();
    height = map.length;
    width = map[0].length;
  }

  function block(pos) {
    return map[pos.y][pos.x];
  }

  function setBlock(pos, type) {
    map[pos.y][pos.x] = type;
  }

  function getMapData() {
    return map;
  }

  function loadState(savedMap) {
    map = savedMap;
    height = map.length;
    width = map[0].length;
  }

  function drawPills(ctx) {
    if (++pillSize > 30) {
      pillSize = 0;
    }

    for (i = 0; i < height; i += 1) {
      for (j = 0; j < width; j += 1) {
        if (map[i][j] === Pacman.PILL) {
          ctx.beginPath();

          ctx.fillStyle = "#000";
          ctx.fillRect(j * blockSize, i * blockSize, blockSize, blockSize);

          ctx.fillStyle = "#FFF";
          ctx.arc(
            j * blockSize + blockSize / 2,
            i * blockSize + blockSize / 2,
            Math.abs(5 - pillSize / 3),
            0,
            Math.PI * 2,
            false,
          );
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  }

  function draw(ctx) {
    var i,
      j,
      size = blockSize;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width * size, height * size);

    drawWall(ctx);

    for (i = 0; i < height; i += 1) {
      for (j = 0; j < width; j += 1) {
        drawBlock(i, j, ctx);
      }
    }
  }

  function drawBlock(y, x, ctx) {
    var layout = map[y][x];

    if (layout === Pacman.PILL) {
      return;
    }

    ctx.beginPath();

    if (
      layout === Pacman.EMPTY ||
      layout === Pacman.BLOCK ||
      layout === Pacman.BISCUIT
    ) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

      if (layout === Pacman.BISCUIT) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(
          x * blockSize + blockSize / 2.5,
          y * blockSize + blockSize / 2.5,
          blockSize / 6,
          blockSize / 6,
        );
      }
    }
    ctx.closePath();
  }

  reset();

  return {
    draw: draw,
    drawBlock: drawBlock,
    drawPills: drawPills,
    block: block,
    setBlock: setBlock,
    reset: reset,
    getMapData: getMapData,
    loadState: loadState,
    isWallSpace: isWall,
    isFloorSpace: isFloorSpace,
    height: height,
    width: width,
    blockSize: blockSize,
  };
};

Pacman.Audio = function (game) {
  var files = {},
    endEvents = {},
    progressEvents = {},
    playing = [];

  function load(name, path, cb) {
    var f = (files[name] = document.createElement("audio"));

    progressEvents[name] = function (event) {
      progress(event, name, cb);
    };

    f.addEventListener("canplaythrough", progressEvents[name], true);
    f.setAttribute("preload", "true");
    f.setAttribute("autobuffer", "true");
    f.setAttribute("src", path);
    f.pause();
  }

  function progress(event, name, callback) {
    if (event.loaded === event.total && typeof callback === "function") {
      callback();
      files[name].removeEventListener(
        "canplaythrough",
        progressEvents[name],
        true,
      );
    }
  }

  function disableSound() {
    for (var i = 0; i < playing.length; i++) {
      if (files[playing[i]]) {
        files[playing[i]].pause();
        files[playing[i]].currentTime = 0;
      }
    }
    playing = [];
  }

  function ended(name) {
    var i,
      tmp = [],
      found = false;

    if (files[name]) {
      files[name].removeEventListener("ended", endEvents[name], true);
    }

    for (i = 0; i < playing.length; i++) {
      if (!found && playing[i] === name) {
        found = true;
      } else {
        tmp.push(playing[i]);
      }
    }
    playing = tmp;
  }

  function play(name) {
    if (!game.soundDisabled() && files[name]) {
      endEvents[name] = function () {
        ended(name);
      };
      playing.push(name);
      files[name].addEventListener("ended", endEvents[name], true);
      try {
        var playPromise = files[name].play();
        if (playPromise !== undefined) {
          playPromise.catch(function (error) {
            console.warn("Audio play prevented:", error);
          });
        }
      } catch (e) {
        console.warn("Audio play error:", e);
      }
    }
  }

  function pause() {
    for (var i = 0; i < playing.length; i++) {
      if (files[playing[i]]) {
        files[playing[i]].pause();
      }
    }
  }

  function resume() {
    for (var i = 0; i < playing.length; i++) {
      if (files[playing[i]]) {
        files[playing[i]].play();
      }
    }
  }

  return {
    disableSound: disableSound,
    load: load,
    play: play,
    pause: pause,
    resume: resume,
  };
};

var PACMAN = (function () {
  var state = WAITING,
    audio = null,
    ghosts = [],
    ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
    eatenCount = 0,
    level = 0,
    tick = 0,
    ghostPos,
    userPos,
    stateChanged = true,
    timerStart = null,
    lastTime = 0,
    ctx = null,
    timer = null,
    map = null,
    user = null,
    stored = null,
    questionActive = false,
    safeUntilTick = 0,
    startTapHandler = null,
    startOverlayTapHandler = null,
    startCountdownActive = false,
    startCountdownTimer = null;

  function runStartCountdown(onDone) {
    var overlay = document.getElementById("start-overlay");
    if (!overlay || startCountdownActive) return;

    var icon = overlay.querySelector(".start-message i");
    var message = overlay.querySelector(".start-message p");
    var baseText = "Toca o haz clic para iniciar";
    var count = 3;

    startCountdownActive = true;
    if (overlay) {
      overlay.classList.add("is-visible");
      overlay.setAttribute("aria-hidden", "false");
    }
    if (icon) icon.style.display = "none";
    if (message) message.textContent = "Inicia en " + count;
    startCountdownTimer = window.setInterval(function () {
      count -= 1;

      if (count > 0) {
        if (message) message.textContent = "Inicia en " + count;
        return;
      }

      window.clearInterval(startCountdownTimer);
      startCountdownTimer = null;
      startCountdownActive = false;

      if (icon) icon.style.display = "";
      if (message) message.textContent = baseText;
      if (overlay) {
        overlay.classList.remove("is-visible");
        overlay.setAttribute("aria-hidden", "true");
      }
      onDone();
    }, 1000);
  }

  function getTick() {
    return tick;
  }

  function drawScore(text, position) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px BDCartoonShoutRegular";
    ctx.fillText(
      text,
      (position["new"]["x"] / 10) * map.blockSize,
      ((position["new"]["y"] + 5) / 10) * map.blockSize,
    );
  }

  function dialog(text) {
    ctx.fillStyle = "#FFFF00";
    ctx.font = "18px Calibri";
    var width = ctx.measureText(text).width,
      x = (map.width * map.blockSize - width) / 2;
    ctx.fillText(text, x, map.height * 10 + 8);
  }

  function showQuestionModal() {
    var modal = document.getElementById("question-modal");
    if (!modal) {
      console.warn("Question modal element not found in DOM");
      return;
    }
    
    // Force styles to ensure it breaks through any CSS conflicts on mobile
    modal.style.setProperty("display", "flex", "important");
    modal.style.setProperty("visibility", "visible", "important");
    modal.style.setProperty("opacity", "1", "important");
    modal.style.setProperty("z-index", "100001", "important");
    modal.style.setProperty("pointer-events", "auto", "important");
    
    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");
    questionActive = true;
    
    // Layout trigger
    void modal.offsetHeight;
  }

  function hideStartOverlay() {
    var overlay = document.getElementById("start-overlay");
    if (!overlay) {
      return;
    }
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
  }

  function answerCorrect() {
    var modal = document.getElementById("question-modal");
    if (modal) {
      modal.classList.remove("is-visible");
      modal.setAttribute("aria-hidden", "true");
    }
    questionActive = false;
    
    // El juego ya tiene el estado guardado, solo continúa
    setState(PLAYING);
  }

  function answerWrong() {
    localStorage.removeItem("pacmanResume");

    var modal = document.getElementById("question-modal");
    if (modal) {
      modal.classList.remove("is-visible");
      modal.setAttribute("aria-hidden", "true");
    }

    questionActive = false;

    startNewGame();
  }

  function saveResumeState() {
    var payload = {
      lives: user.getLives(),
      score: user.theScore(),
      level: level,
      map: map.getMapData()
    };
    localStorage.setItem("pacmanResume", JSON.stringify(payload));
  }

  function soundDisabled() {
    return localStorage["soundDisabled"] === "true";
  }

  function startLevel() {
    user.resetPosition();
    for (var i = 0; i < ghosts.length; i += 1) {
      ghosts[i].reset();
    }
    audio.play("start");
    runStartCountdown(function () {
      timerStart = tick;
      safeUntilTick = tick + Pacman.FPS * 2;
      setState(PLAYING);
    });
  }

  function startNewGame() {
    setState(WAITING);
    level = 1;
    user.reset();
    map.reset();
    map.draw(ctx);
    startLevel();
  }

  function keyDown(e) {
    if (questionActive) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.keyCode === KEY.N) {
      hideStartOverlay();
      startNewGame();
    } else if (e.keyCode === KEY.S) {
      audio.disableSound();
      localStorage["soundDisabled"] = !soundDisabled();
    } else if (e.keyCode === KEY.P && state === PAUSE) {
      audio.resume();
      map.draw(ctx);
      setState(stored);
    } else if (e.keyCode === KEY.P) {
      stored = state;
      setState(PAUSE);
      audio.pause();
      map.draw(ctx);
      dialog("Pausado");
    } else if (state !== PAUSE) {
      return user.keyDown(e);
    }
    return true;
  }

  var wasCountdownWhenMenuOpened = false;
  var menuPausedFromState = null;

  function killCountdown() {
    if (startCountdownTimer !== null) {
      window.clearInterval(startCountdownTimer);
      startCountdownTimer = null;
    }
    startCountdownActive = false;
    var overlay = document.getElementById("start-overlay");
    if (overlay) {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
      var icon = overlay.querySelector(".start-message i");
      var message = overlay.querySelector(".start-message p");
      if (icon) icon.style.display = "";
      if (message) message.textContent = "Toca o haz clic para iniciar";
    }
  }

  var isMenuPaused = false;

  window.addEventListener("arcade:menu-open", function () {
    if (state === DYING) return;
    if (isMenuPaused) return;

    wasCountdownWhenMenuOpened = startCountdownActive;
    if (startCountdownActive) {
      killCountdown();
      audio.pause();
    }

    if (state !== WAITING || wasCountdownWhenMenuOpened) {
      isMenuPaused = true;
      if (state !== PAUSE) {
        menuPausedFromState = state;
        stored = state;
      }
      setState(PAUSE);
      audio.pause();
      map.draw(ctx);
      dialog("Pausado");
    }
  });

  window.addEventListener("arcade:menu-close", function () {
    if (!isMenuPaused && !wasCountdownWhenMenuOpened) return;
    isMenuPaused = false;

    if (wasCountdownWhenMenuOpened) {
      wasCountdownWhenMenuOpened = false;
      menuPausedFromState = null;
      // Limpiar mensaje de pausa y asegurar estado correcto antes de re-iniciar nivel
      setState(WAITING);
      map.draw(ctx);
      startLevel();
      return;
    }

    if (state !== PAUSE) return;
    wasCountdownWhenMenuOpened = false;

    if (menuPausedFromState !== null && menuPausedFromState !== WAITING) {
      menuPausedFromState = null;
      map.draw(ctx);
      runStartCountdown(function () {
        audio.resume();
        timerStart = tick;
        safeUntilTick = tick + Pacman.FPS * 2;
        setState(PLAYING);
      });
    } else {
      menuPausedFromState = null;
      setState(WAITING);
      map.draw(ctx);
    }
  });

  function loseLife() {
    if (questionActive) {
      return;
    }

    try {
      hideStartOverlay();
      killCountdown();

      setState(WAITING);
      user.loseLife();

      audio.pause();
      map.draw(ctx);

      dialog("Responde la pregunta");
      setState(PAUSE);

      saveResumeState();
      showQuestionModal();
    } catch (err) {
      console.error("Error in loseLife:", err);
      // No more automatic redirect - we want to see what's happening
      dialog("Error: " + err.message);
    }
  }

  function setState(nState) {
    state = nState;
    stateChanged = true;
  }

  function collided(user, ghost) {
    return (
      Math.sqrt(Math.pow(ghost.x - user.x, 2) + Math.pow(ghost.y - user.y, 2)) <
      10
    );
  }

  function drawFooter() {
    var topLeft = map.height * map.blockSize;
    var footerHeight = map.blockSize;
    var textBase = topLeft + footerHeight * 0.65;
    var iconSize = footerHeight * 0.4; // Radius
    var iconPadding = footerHeight * 1.2; // Distance between icons

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, topLeft, map.width * map.blockSize, footerHeight);

    // Draw Score (Left aligned)
    ctx.fillStyle = "#FFFF00";
    ctx.font = "bold " + Math.floor(footerHeight * 0.5) + "px Calibri";
    ctx.fillText("Puntaje: " + user.theScore(), map.blockSize * 0.5, textBase);

    // Draw Level (Right aligned)
    var levelText = "Nivel: " + level;
    var levelWidth = ctx.measureText(levelText).width;
    ctx.fillText(
      levelText,
      map.width * map.blockSize - levelWidth - map.blockSize * 0.5,
      textBase,
    );
  }

  function redrawBlock(pos) {
    // Redraw a 3x3 grid of blocks around position to avoid ghost trails
    var bx = Math.round(pos.x / 10);
    var by = Math.round(pos.y / 10);
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        map.drawBlock(by + dy, bx + dx, ctx);
      }
    }
  }

  function mainDraw() {
    var diff, u, i, len, nScore;

    ghostPos = [];

    for (i = 0, len = ghosts.length; i < len; i += 1) {
      ghostPos.push(ghosts[i].move(ctx));
    }
    u = user.move(ctx);

    for (i = 0, len = ghosts.length; i < len; i += 1) {
      redrawBlock(ghostPos[i].old);
    }
    redrawBlock(u.old);

    for (i = 0, len = ghosts.length; i < len; i += 1) {
      ghosts[i].draw(ctx);
    }
    user.draw(ctx);

    userPos = u["new"];

    for (i = 0, len = ghosts.length; i < len; i += 1) {
      if (collided(userPos, ghostPos[i]["new"])) {
        if (ghosts[i].isVunerable()) {
          audio.play("eatghost");
          ghosts[i].eat();
          eatenCount += 1;
          nScore = eatenCount * 50;
          drawScore(nScore, ghostPos[i]);
          user.addScore(nScore);
          setState(EATEN_PAUSE);
          timerStart = tick;
        } else if (ghosts[i].isDangerous()) {
          if (tick < safeUntilTick) {
            continue;
          }
          audio.play("die");
          setState(DYING);
          timerStart = tick;
        }
      }
    }
  }

  function mainLoop() {
    var diff;

    if (state !== PAUSE) {
      ++tick;
    }

    map.drawPills(ctx);

    if (state === PLAYING) {
      mainDraw();
    } else if (state === WAITING && stateChanged) {
      stateChanged = false;
      map.draw(ctx);
    } else if (state === EATEN_PAUSE && tick - timerStart > Pacman.FPS / 3) {
      map.draw(ctx);
      setState(PLAYING);
    } else if (state === DYING) {
      if (tick - timerStart > Pacman.FPS * 2) {
        loseLife();
      } else {
        if (userPos) redrawBlock(userPos);
        for (i = 0, len = ghosts.length; i < len; i += 1) {
          if (ghostPos && ghostPos[i]) {
            redrawBlock(ghostPos[i].old);
          }
          ghosts[i].draw(ctx);
        }
        user.drawDead(ctx, (tick - timerStart) / (Pacman.FPS * 2));
      }
    } else if (state === COUNTDOWN) {
      diff = 3 + Math.floor((timerStart - tick) / Pacman.FPS);

      if (diff === 0) {
        map.draw(ctx);
        safeUntilTick = tick + Pacman.FPS * 2;
        setState(PLAYING);
      } else {
        if (diff !== lastTime) {
          lastTime = diff;
          map.draw(ctx);
          dialog("Comienza en: " + diff);
        }
      }
    }

    drawFooter();
  }

  function eatenPill() {
    audio.play("eatpill");
    timerStart = tick;
    eatenCount = 0;
    for (i = 0; i < ghosts.length; i += 1) {
      ghosts[i].makeEatable(ctx);
    }
  }

  function completedLevel() {
    setState(WAITING);
    level += 1;
    map.reset();
    user.newLevel();
    startLevel();
  }

  function keyPress(e) {
    if (state !== WAITING && state !== PAUSE) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function init(wrapper, root) {
    var i,
      len,
      ghost,
      viewport = window.visualViewport || window,
      gameCols = 19,
      gameRows = 23,
      blockSize = Math.max(
        8,
        Math.floor(
          Math.min(viewport.width / gameCols, viewport.height / gameRows),
        ),
      ),
      canvas = document.createElement("canvas");

    canvas.setAttribute("width", blockSize * gameCols + "px");
    canvas.setAttribute("height", blockSize * gameRows + "px");

    wrapper.innerHTML = "";
    wrapper.appendChild(canvas);

    ctx = canvas.getContext("2d");

    audio = new Pacman.Audio({ soundDisabled: soundDisabled });
    map = new Pacman.Map(blockSize);
    user = new Pacman.User(
      {
        completedLevel: completedLevel,
        eatenPill: eatenPill,
      },
      map,
    );

    for (i = 0, len = ghostSpecs.length; i < len; i += 1) {
      ghost = new Pacman.Ghost({ getTick: getTick }, map, ghostSpecs[i]);
      ghosts.push(ghost);
    }

    map.draw(ctx);
    dialog("Cargando ...");

    var extension = getAudioExtension();

    if (!extension) {
      loaded();
      return;
    }

    var audio_files = [
      ["start", root + "audio/opening_song." + extension],
      ["die", root + "audio/die." + extension],
      ["eatghost", root + "audio/eatghost." + extension],
      ["eatpill", root + "audio/eatpill." + extension],
      ["eating", root + "audio/eating.short." + extension],
      ["eating2", root + "audio/eating.short." + extension],
    ];

    var bootReady = false;

    function bootGame() {
      if (bootReady) {
        return;
      }
      bootReady = true;
      loaded();
    }

    // Some mobile browsers never finish canplaythrough for cross-origin audio.
    // Avoid locking the game in "Cargando..." by using a short fallback timer.
    var bootFallback = window.setTimeout(bootGame, 1200);

    load(audio_files, function () {
      window.clearTimeout(bootFallback);
      bootGame();
    });
  }

  function load(arr, callback) {
    if (arr.length === 0) {
      callback();
    } else {
      var x = arr.pop();
      audio.load(x[0], x[1], function () {
        load(arr, callback);
      });
    }
  }

  function loaded() {
    // Avoid duplicate listeners/loops when init runs more than once.
    document.removeEventListener("keydown", keyDown, true);
    document.removeEventListener("keypress", keyPress, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("keypress", keyPress, true);

    // Tap or click to start
    if (startTapHandler) {
      document.removeEventListener("mousedown", startTapHandler, false);
      document.removeEventListener("touchstart", startTapHandler, false);
      document.removeEventListener("click", startTapHandler, false);
    }

    startTapHandler = function handleStartTap(e) {
      if (e.target.tagName === "BUTTON" || e.target.closest("button") ||
          e.target.tagName === "A" || e.target.closest("a")) return;
          
      var m = document.getElementById("menu-confirm-modal");
      if (m && m.classList.contains("is-visible")) return;
      var q = document.getElementById("question-modal");
      if (q && q.classList.contains("is-visible")) return;
      if (questionActive) return;

      if (state === WAITING && !startCountdownActive) {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        startNewGame();
      }
    };

    document.addEventListener("mousedown", startTapHandler, false);
    document.addEventListener("click", startTapHandler, false);
    document.addEventListener("touchstart", startTapHandler, {
      passive: false,
      capture: false,
    });

    // ── iOS Safari specific fix - Direct overlay listener ──
    var overlay = document.getElementById("start-overlay");
    if (overlay) {
      if (startOverlayTapHandler) {
        overlay.removeEventListener("click", startOverlayTapHandler, false);
        overlay.removeEventListener(
          "touchstart",
          startOverlayTapHandler,
          false,
        );
      }

      startOverlayTapHandler = function startNewGameDirectly(e) {
        if (e.target.tagName === "BUTTON" || e.target.closest("button") ||
            e.target.tagName === "A" || e.target.closest("a")) return;
        
        e.preventDefault();
        e.stopPropagation();
        tryStartGame();
      };

      overlay.addEventListener("click", startOverlayTapHandler, false);
      overlay.addEventListener("touchstart", startOverlayTapHandler, {
        passive: false,
      });
      overlay.style.cursor = "pointer";
      overlay.style.zIndex = "9999";
    }

    if (timer) {
      window.clearInterval(timer);
    }

    timer = window.setInterval(mainLoop, 1000 / Pacman.FPS);

    var resumeOk = localStorage.getItem("pacmanResumeOk") === "true";
    var restart = localStorage.getItem("pacmanRestart") === "true";
    var resumeRaw = localStorage.getItem("pacmanResume");

    localStorage.removeItem("pacmanResumeOk");
    localStorage.removeItem("pacmanRestart");

    if (restart) {
      localStorage.removeItem("pacmanResume");
      return;
    }

    if (resumeOk && resumeRaw) {
      var resumeData = JSON.parse(resumeRaw);
      level = resumeData.level || 1;
      
      // Load map stringified if we have it
      if (resumeData.map) {
         try {
           map.loadState(resumeData.map);
         } catch(e){}
      }
      
      user.reset();
      user.setLives(resumeData.lives || 1);
      user.setScore(resumeData.score || 0);
      map.draw(ctx);
      
      var modal = document.getElementById("question-modal");
      if (modal) {
        modal.classList.remove("is-visible");
        modal.setAttribute("aria-hidden", "true");
      }
      questionActive = false;
      
      // Reiniciar los fantasmas y empezar el nivel con el contador
      startLevel();
      return;
    }
  }

  function shutdown() {
    questionActive = false;
    setState(WAITING);

    if (startCountdownTimer !== null) {
      window.clearInterval(startCountdownTimer);
      startCountdownTimer = null;
    }
    startCountdownActive = false;

    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }

    document.removeEventListener("keydown", keyDown, true);
    document.removeEventListener("keypress", keyPress, true);

    if (startTapHandler) {
      document.removeEventListener("mousedown", startTapHandler, false);
      document.removeEventListener("touchstart", startTapHandler, false);
      document.removeEventListener("click", startTapHandler, false);
    }

    var overlay = document.getElementById("start-overlay");
    if (overlay && startOverlayTapHandler) {
      overlay.removeEventListener("click", startOverlayTapHandler, false);
      overlay.removeEventListener("touchstart", startOverlayTapHandler, false);
      startOverlayTapHandler = null;
    }

    if (audio) {
      audio.pause();
    }
  }

  function tryStartGame() {
    if (!ctx || !user || !map) {
      if (typeof initPacmanPage === "function") initPacmanPage();
      if (!ctx || !user || !map) return false;
    }

    var q = document.getElementById("question-modal");
    if (q && q.classList.contains("is-visible")) {
      return false;
    }

    if (state === WAITING && !startCountdownActive && !questionActive) {
      // Ensure the main game loop is running (in case loaded() never fired)
      if (!timer) {
        timer = window.setInterval(mainLoop, 1000 / Pacman.FPS);
      }
      startNewGame();
      return true;
    }
    return false;
  }

  return {
    init: init,
    answerCorrect: answerCorrect,
    answerWrong: answerWrong,
    shutdown: shutdown,
    tryStartGame: tryStartGame,
    triggerKey: function (keyCode) {
      var fakeEvent = {
        keyCode: keyCode,
        preventDefault: function () {},
        stopPropagation: function () {},
      };
      if (typeof keyDown === "function") {
        keyDown(fakeEvent);
      }
    },
  };
})();

var KEY = {
  BACKSPACE: 8,
  TAB: 9,
  NUM_PAD_CLEAR: 12,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  PAUSE: 19,
  CAPS_LOCK: 20,
  ESCAPE: 27,
  SPACEBAR: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  PRINT_SCREEN: 44,
  INSERT: 45,
  DELETE: 46,
  SEMICOLON: 59,
  WINDOWS_LEFT: 91,
  WINDOWS_RIGHT: 92,
  SELECT: 93,
  NUM_PAD_ASTERISK: 106,
  NUM_PAD_PLUS_SIGN: 107,
  "NUM_PAD_HYPHEN-MINUS": 109,
  NUM_PAD_FULL_STOP: 110,
  NUM_PAD_SOLIDUS: 111,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  SEMICOLON: 186,
  EQUALS_SIGN: 187,
  COMMA: 188,
  "HYPHEN-MINUS": 189,
  FULL_STOP: 190,
  SOLIDUS: 191,
  GRAVE_ACCENT: 192,
  LEFT_SQUARE_BRACKET: 219,
  REVERSE_SOLIDUS: 220,
  RIGHT_SQUARE_BRACKET: 221,
  APOSTROPHE: 222,
};

(function () {
  /* 0 - 9 */
  for (var i = 48; i <= 57; i++) {
    KEY["" + (i - 48)] = i;
  }
  /* A - Z */
  for (i = 65; i <= 90; i++) {
    KEY["" + String.fromCharCode(i)] = i;
  }
  /* NUM_PAD_0 - NUM_PAD_9 */
  for (i = 96; i <= 105; i++) {
    KEY["NUM_PAD_" + (i - 96)] = i;
  }
  /* F1 - F12 */
  for (i = 112; i <= 123; i++) {
    KEY["F" + (i - 112 + 1)] = i;
  }
})();

Pacman.WALL = 0;
Pacman.BISCUIT = 1;
Pacman.EMPTY = 2;
Pacman.BLOCK = 3;
Pacman.PILL = 4;

Pacman.MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 4, 0],
  [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  [2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 2, 2],
  [0, 0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [2, 2, 2, 2, 1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 2, 2, 2, 2],
  [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [2, 2, 2, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2, 2],
  [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 4, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 4, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

Pacman.WALLS = [
  [
    { move: [0, 9.5] },
    { line: [3, 9.5] },
    { curve: [3.5, 9.5, 3.5, 9] },
    { line: [3.5, 8] },
    { curve: [3.5, 7.5, 3, 7.5] },
    { line: [1, 7.5] },
    { curve: [0.5, 7.5, 0.5, 7] },
    { line: [0.5, 1] },
    { curve: [0.5, 0.5, 1, 0.5] },
    { line: [9, 0.5] },
    { curve: [9.5, 0.5, 9.5, 1] },
    { line: [9.5, 3.5] },
  ],

  [
    { move: [9.5, 1] },
    { curve: [9.5, 0.5, 10, 0.5] },
    { line: [18, 0.5] },
    { curve: [18.5, 0.5, 18.5, 1] },
    { line: [18.5, 7] },
    { curve: [18.5, 7.5, 18, 7.5] },
    { line: [16, 7.5] },
    { curve: [15.5, 7.5, 15.5, 8] },
    { line: [15.5, 9] },
    { curve: [15.5, 9.5, 16, 9.5] },
    { line: [19, 9.5] },
  ],

  [{ move: [2.5, 5.5] }, { line: [3.5, 5.5] }],

  [
    { move: [3, 2.5] },
    { curve: [3.5, 2.5, 3.5, 3] },
    { curve: [3.5, 3.5, 3, 3.5] },
    { curve: [2.5, 3.5, 2.5, 3] },
    { curve: [2.5, 2.5, 3, 2.5] },
  ],

  [{ move: [15.5, 5.5] }, { line: [16.5, 5.5] }],

  [
    { move: [16, 2.5] },
    { curve: [16.5, 2.5, 16.5, 3] },
    { curve: [16.5, 3.5, 16, 3.5] },
    { curve: [15.5, 3.5, 15.5, 3] },
    { curve: [15.5, 2.5, 16, 2.5] },
  ],

  [
    { move: [6, 2.5] },
    { line: [7, 2.5] },
    { curve: [7.5, 2.5, 7.5, 3] },
    { curve: [7.5, 3.5, 7, 3.5] },
    { line: [6, 3.5] },
    { curve: [5.5, 3.5, 5.5, 3] },
    { curve: [5.5, 2.5, 6, 2.5] },
  ],

  [
    { move: [12, 2.5] },
    { line: [13, 2.5] },
    { curve: [13.5, 2.5, 13.5, 3] },
    { curve: [13.5, 3.5, 13, 3.5] },
    { line: [12, 3.5] },
    { curve: [11.5, 3.5, 11.5, 3] },
    { curve: [11.5, 2.5, 12, 2.5] },
  ],

  [
    { move: [7.5, 5.5] },
    { line: [9, 5.5] },
    { curve: [9.5, 5.5, 9.5, 6] },
    { line: [9.5, 7.5] },
  ],
  [{ move: [9.5, 6] }, { curve: [9.5, 5.5, 10.5, 5.5] }, { line: [11.5, 5.5] }],

  [
    { move: [5.5, 5.5] },
    { line: [5.5, 7] },
    { curve: [5.5, 7.5, 6, 7.5] },
    { line: [7.5, 7.5] },
  ],
  [{ move: [6, 7.5] }, { curve: [5.5, 7.5, 5.5, 8] }, { line: [5.5, 9.5] }],

  [
    { move: [13.5, 5.5] },
    { line: [13.5, 7] },
    { curve: [13.5, 7.5, 13, 7.5] },
    { line: [11.5, 7.5] },
  ],
  [{ move: [13, 7.5] }, { curve: [13.5, 7.5, 13.5, 8] }, { line: [13.5, 9.5] }],

  [
    { move: [0, 11.5] },
    { line: [3, 11.5] },
    { curve: [3.5, 11.5, 3.5, 12] },
    { line: [3.5, 13] },
    { curve: [3.5, 13.5, 3, 13.5] },
    { line: [1, 13.5] },
    { curve: [0.5, 13.5, 0.5, 14] },
    { line: [0.5, 17] },
    { curve: [0.5, 17.5, 1, 17.5] },
    { line: [1.5, 17.5] },
  ],
  [
    { move: [1, 17.5] },
    { curve: [0.5, 17.5, 0.5, 18] },
    { line: [0.5, 21] },
    { curve: [0.5, 21.5, 1, 21.5] },
    { line: [18, 21.5] },
    { curve: [18.5, 21.5, 18.5, 21] },
    { line: [18.5, 18] },
    { curve: [18.5, 17.5, 18, 17.5] },
    { line: [17.5, 17.5] },
  ],
  [
    { move: [18, 17.5] },
    { curve: [18.5, 17.5, 18.5, 17] },
    { line: [18.5, 14] },
    { curve: [18.5, 13.5, 18, 13.5] },
    { line: [16, 13.5] },
    { curve: [15.5, 13.5, 15.5, 13] },
    { line: [15.5, 12] },
    { curve: [15.5, 11.5, 16, 11.5] },
    { line: [19, 11.5] },
  ],

  [{ move: [5.5, 11.5] }, { line: [5.5, 13.5] }],
  [{ move: [13.5, 11.5] }, { line: [13.5, 13.5] }],

  [
    { move: [2.5, 15.5] },
    { line: [3, 15.5] },
    { curve: [3.5, 15.5, 3.5, 16] },
    { line: [3.5, 17.5] },
  ],
  [
    { move: [16.5, 15.5] },
    { line: [16, 15.5] },
    { curve: [15.5, 15.5, 15.5, 16] },
    { line: [15.5, 17.5] },
  ],

  [{ move: [5.5, 15.5] }, { line: [7.5, 15.5] }],
  [{ move: [11.5, 15.5] }, { line: [13.5, 15.5] }],

  [
    { move: [2.5, 19.5] },
    { line: [5, 19.5] },
    { curve: [5.5, 19.5, 5.5, 19] },
    { line: [5.5, 17.5] },
  ],
  [{ move: [5.5, 19] }, { curve: [5.5, 19.5, 6, 19.5] }, { line: [7.5, 19.5] }],

  [
    { move: [11.5, 19.5] },
    { line: [13, 19.5] },
    { curve: [13.5, 19.5, 13.5, 19] },
    { line: [13.5, 17.5] },
  ],
  [
    { move: [13.5, 19] },
    { curve: [13.5, 19.5, 14, 19.5] },
    { line: [16.5, 19.5] },
  ],

  [
    { move: [7.5, 13.5] },
    { line: [9, 13.5] },
    { curve: [9.5, 13.5, 9.5, 14] },
    { line: [9.5, 15.5] },
  ],
  [
    { move: [9.5, 14] },
    { curve: [9.5, 13.5, 10, 13.5] },
    { line: [11.5, 13.5] },
  ],

  [
    { move: [7.5, 17.5] },
    { line: [9, 17.5] },
    { curve: [9.5, 17.5, 9.5, 18] },
    { line: [9.5, 19.5] },
  ],
  [
    { move: [9.5, 18] },
    { curve: [9.5, 17.5, 10, 17.5] },
    { line: [11.5, 17.5] },
  ],

  [
    { move: [8.5, 9.5] },
    { line: [8, 9.5] },
    { curve: [7.5, 9.5, 7.5, 10] },
    { line: [7.5, 11] },
    { curve: [7.5, 11.5, 8, 11.5] },
    { line: [11, 11.5] },
    { curve: [11.5, 11.5, 11.5, 11] },
    { line: [11.5, 10] },
    { curve: [11.5, 9.5, 11, 9.5] },
    { line: [10.5, 9.5] },
  ],
];

Object.prototype.clone = function () {
  var i,
    newObj = this instanceof Array ? [] : {};
  for (i in this) {
    if (i === "clone") {
      continue;
    }
    if (this[i] && typeof this[i] === "object") {
      newObj[i] = this[i].clone();
    } else {
      newObj[i] = this[i];
    }
  }
  return newObj;
};

function initPacmanPage() {
  var el = document.getElementById("pacman");

  if (!el) {
    return;
  }

  if (!hasCanvasSupport()) {
    el.innerHTML =
      "Lo siento, necesitas un buen navegador<br /><small>" +
      "(firefox 3.6+, Chrome 4+, Opera 10+ and Safari 4+)</small>";
    return;
  }

  if (el.dataset.pacmanInitialized === "true") {
    return;
  }

  el.dataset.pacmanInitialized = "true";

  window.setTimeout(function () {
    try {
      PACMAN.init(
        el,
        "https://raw.githubusercontent.com/daleharvey/pacman/master/",
      );
    } catch (e) {
      el.dataset.pacmanInitialized = "false";
    }
  }, 0);
}

function ensurePacmanInitialized() {
  var el = document.getElementById("pacman");

  if (!el) {
    return;
  }

  if (el.dataset.pacmanInitialized === "true") {
    return;
  }

  if (!el.querySelector("canvas")) {
    initPacmanPage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPacmanPage);
} else {
  initPacmanPage();
}

window.addEventListener("load", ensurePacmanInitialized);
window.addEventListener("pageshow", ensurePacmanInitialized);
window.addEventListener("focus", ensurePacmanInitialized);

// Mobile Swipe Control
var xDown = null;
var yDown = null;

function getTouches(evt) {
  return evt.touches || evt.originalEvent.touches;
}

function handleTouchStart(evt) {
  // Use a while loop to check for A or BUTTON to avoid closest() on old iOS
  var target = evt.target;
  var inModal = false;
  while (target && target !== document.body) {
    if (target.nodeName === "A" || target.nodeName === "BUTTON") return;
    if (
      target.classList &&
      target.classList.contains("modal-overlay") &&
      target.id !== "start-overlay"
    )
      return;
    target = target.parentNode;
  }

  // Still don't swipe if the start overlay is actually visible
  var overlay = document.getElementById("start-overlay");
  if (overlay && overlay.classList.contains("is-visible")) return;

  evt.preventDefault();
  var touches = getTouches(evt);
  if (!touches || !touches.length) return;
  var firstTouch = touches[0];
  xDown = firstTouch.clientX;
  yDown = firstTouch.clientY;
}

function handleTouchMove(evt) {
  evt.preventDefault();
  if (xDown === null || yDown === null) return;

  var touches = getTouches(evt);
  if (!touches || !touches.length) return;
  var xUp = touches[0].clientX;
  var yUp = touches[0].clientY;
  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;

  // Minimum swipe distance to count as a direction input
  if (Math.abs(xDiff) < 20 && Math.abs(yDiff) < 20) return;

  var keyCode;
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    keyCode = xDiff > 0 ? 37 : 39; // left : right
  } else {
    keyCode = yDiff > 0 ? 38 : 40; // up : down
  }

  // Dispatch via direct method call to bypass iOS Safari KeyboardEvent bugs
  if (window.PACMAN && typeof window.PACMAN.triggerKey === "function") {
    window.PACMAN.triggerKey(keyCode);
  }

  // Fallback native event (as in the original working code)
  try {
    var e = new KeyboardEvent("keydown", {
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
    });
    document.dispatchEvent(e);
  } catch (err) {}

  // Reset so the next swipe starts fresh
  xDown = null;
  yDown = null;
}

// Safely pass passive option if supported
var passiveOpt = false;
try {
  var opts = Object.defineProperty({}, "passive", {
    get: function () {
      passiveOpt = { passive: false };
    },
  });
  window.addEventListener("test", null, opts);
  window.removeEventListener("test", null, opts);
} catch (e) {}

document.addEventListener("touchstart", handleTouchStart, passiveOpt);
document.addEventListener("touchmove", handleTouchMove, passiveOpt);

// ── Global tap-to-start handler (mobile fallback) ──
(function () {
  function globalStartHandler(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.nodeName === "A" || target.nodeName === "BUTTON") return;
      if (
        target.classList &&
        target.classList.contains("modal-overlay") &&
        target.id !== "start-overlay"
      )
        return;
      target = target.parentNode;
    }

    if (window.PACMAN && typeof window.PACMAN.tryStartGame === "function") {
      if (window.PACMAN.tryStartGame()) {
        if (e.cancelable) e.preventDefault();
      }
    }
  }

  document.addEventListener("touchstart", globalStartHandler, passiveOpt);
   document.addEventListener("mousedown", globalStartHandler, false);
})();
