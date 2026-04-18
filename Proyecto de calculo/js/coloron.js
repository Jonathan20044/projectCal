class Game {
  constructor() {
    this.score = 0;
    this.isRunning = 0; // game is not running

    this.calculateScale();

    this.timeline = new TimelineMax({ smoothChildTiming: true });
    this.time = 1.6; // initial speed
    this.colors = ["#FF4571", "#FFD145", "#8260F6"]; // the 3 colors used in the game
    this.colorsRGBA = [
      "rgba(255, 69, 113, 1)",
      "rgba(255, 69, 113, 1)",
      "rgba(255, 69, 113, 1)",
    ];
    this.color = this.colors[0]; // the intial color of the ball
    this.prevColor = null; // used as a holder to prevent ball colors from repeating

    this.lives = 3;
    this.colorTimer = 5;
    this.currentTime = this.colorTimer;
    this.timerInterval = null;
    this.resumeTimer = null;
    this.skipNextCheck = false;
    this.resumeLock = false;
    this.skipResumeContact = false;
  }

  /**
   * The game screen is scalable. I took 1200x800px as the initial scale.
   * In order to display the game an many screen sizes properly
   * I have to compare the player's sreen size to the initial scale,
   * then scale the game using CSS Transform to fit the screen properly
   * The function is called in the controller and anywhere where I need
   * to recalculate the scale on screen resize or device rotation
   */
  calculateScale() {
    this.screen = $(window).width(); // screen width
    this.screenHeight = $(window).height();
    this.scale =
      this.screen > this.screenHeight
        ? this.screenHeight / 800
        : this.screen / 1200;
    this.stickWidth = 180 * this.scale;
    this.steps = this.screen / this.stickWidth;
  }

  /**
   * Creating as many sticks we need to fill the screen
   * from start to end of the screen. The steps property is used for that
   */
  generateSticks() {
    let numberOfSticks = Math.ceil(this.steps);
    for (let i = 0; i <= numberOfSticks; i++) new Stick();
  }

  generateBall() {
    this.balltween = new TimelineMax({ repeat: -1, paused: 1 });
    $(".scene .ball-holder").append('<div class="ball red" id="ball"></div>');
    this.bounce();
  }

  generateTweet() {
    let top = $(window).height() / 2 - 150;
    let left = $(window).width() / 2 - 300;
    let text = encodeURIComponent(
      "Anote " + this.score + " puntos en Coloron. Puedes superar mi puntaje?",
    );
    window.open(
      "https://twitter.com/intent/tweet?url=https://codepen.io/gregh/full/yVLOyO&text=" +
        text +
        "&via=greghvns&hashtags=coloron",
      "TweetWindow",
      "width=600px,height=300px,top=" + top + ",left=" + left,
    );
  }

  startColorTimer() {
    clearInterval(this.timerInterval);

    this.currentTime = this.colorTimer;
    $("#timer").text(this.currentTime);

    this.timerInterval = setInterval(() => {
      this.currentTime--;
      $("#timer").text(this.currentTime);

      if (this.currentTime <= 0) {
        this.currentTime = this.colorTimer;
        $("#timer").text(this.currentTime);
      }
    }, 1000);
  }

  startResumeCountdown(seconds = 3) {
    clearInterval(this.timerInterval);
    clearInterval(this.resumeTimer);

    const overlay = $("#resume-overlay");
    const countdown = $("#resume-countdown");
    let remaining = seconds;

    countdown.text(remaining);
    overlay.css({ display: "flex", visibility: "visible" });

    this.resumeLock = true;
    this.resumeTimer = setInterval(() => {
      remaining -= 1;
      countdown.text(remaining);

      if (remaining <= 0) {
        clearInterval(this.resumeTimer);
        overlay.css({ display: "none", visibility: "hidden" });
        this.resumeLock = false;
        this.skipResumeContact = true;
        setTimeout(() => {
          this.skipResumeContact = false;
        }, 2000);
        this.startColorTimer();
        this.balltween.play();
        this.timeline.play();
      }
    }, 1000);
  }

  changeAllSticksColor() {
    $("#sticks .stick").each(function () {
      const randomColor = new Color().getRandomColor();
      const colorName = new Color().colorcodeToName(randomColor);

      $(this)
        .css("background-color", randomColor)
        .removeClass("red yellow purple")
        .addClass(colorName);
    });
  }

  updateLivesDisplay() {
    $("#lives").text("❤️".repeat(this.lives));
  }

  showQuestionModal() {
    const modal = $("#question-modal");
    modal.addClass("is-visible").attr("aria-hidden", "false");
  }

  hideQuestionModal() {
    const modal = $("#question-modal");
    modal.removeClass("is-visible").attr("aria-hidden", "true");
  }

  pauseForQuestion(stickIndex) {
    if (this.isPausedForQuestion) return;
    this.isPausedForQuestion = true;
    this.isRunning = 0;
    const sticksState = [];
    $("#sticks .stick").each(function () {
      sticksState.push({
        className: this.className,
        innerHTML: $(this).html(),
      });
    });

    const checkpointState = {
      score: this.score,
      time: this.time,
      color: this.color,
      prevColor: this.prevColor,
      lives: this.lives,
      timelineProgress: this.timeline ? this.timeline.progress() : 0,
      ballProgress: this.balltween ? this.balltween.progress() : 0.01,
      sticksState: sticksState,
      currentStickIndex: Number.isFinite(stickIndex) ? stickIndex : null,
    };

    TweenMax.killAll();
    clearInterval(this.timerInterval);
    localStorage.setItem("coloronPaused", "true");
    localStorage.setItem("coloronLives", this.lives);
    localStorage.setItem(
      "coloronCheckpointState",
      JSON.stringify(checkpointState),
    );
    localStorage.setItem("coloronSkipNextCheck", "true");
    this.showQuestionModal();
  }

  resumeFromCheckpoint(state) {
    this.isPausedForQuestion = false;
    this.hideQuestionModal();
    TweenMax.killAll();
    $(".start-game, .stop-game").css("display", "none");
    $(".nominee").hide();

    this.score = Number.isFinite(state.score) ? state.score : 0;
    this.time = Number.isFinite(state.time) ? state.time : 1.6;
    this.color = state.color || this.colors[0];
    this.prevColor = state.prevColor || this.color;
    this.lives = Number.isFinite(state.lives) ? state.lives : 3;

    const storedLives = parseInt(localStorage.getItem("coloronLives"), 10);
    if (Number.isFinite(storedLives) && storedLives >= 0) {
      this.lives = storedLives;
    }

    this.isRunning = 1;

    $("#sticks, .scene .ball-holder").html("");
    $("#score").text(this.score);
    this.updateLivesDisplay();

    if (Array.isArray(state.sticksState) && state.sticksState.length) {
      state.sticksState.forEach((stickState) => {
        $("#sticks").append(
          `<div class="${stickState.className}">${stickState.innerHTML}</div>`,
        );
      });
    } else {
      this.generateSticks();
    }

    this.generateBall();

    this.skipNextCheck =
      localStorage.getItem("coloronSkipNextCheck") === "true";

    if (this.skipNextCheck && Number.isFinite(state.currentStickIndex)) {
      const failedStick = $("#sticks .stick").eq(state.currentStickIndex);
      if (failedStick.length) {
        const currentBallColorName = new Color().colorcodeToName(this.color);
        failedStick
          .css("background-color", this.color)
          .removeClass("red yellow purple inactive")
          .addClass(currentBallColorName);
      }
    }

    if (
      !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent,
      )
    ) {
      Animation.sceneAnimation();
    }

    TweenMax.set("#ball", { scale: 1, backgroundColor: this.color });
    $("#ball")
      .removeClass("red")
      .removeClass("yellow")
      .removeClass("purple")
      .addClass(new Color().colorcodeToName(this.color));

    this.moveScene();

    const speed = this.speedUp();
    this.timeline.timeScale(speed);
    this.balltween.timeScale(speed);

    if (Number.isFinite(state.timelineProgress)) {
      this.timeline.progress(state.timelineProgress);
    }
    if (Number.isFinite(state.ballProgress)) {
      this.balltween.progress(state.ballProgress);
    }

    if (this.skipNextCheck) {
      this.balltween.pause();
      this.timeline.pause();
      this.startResumeCountdown(3);
      localStorage.removeItem("coloronSkipNextCheck");
    } else {
      this.startColorTimer();
      this.balltween.play();
      this.timeline.play();
    }
  }

  /**
   * The greeting when the game begins
   */
  intro() {
    this.hideQuestionModal();
    TweenMax.killAll();

    //TweenMax.to('.splash', 0.3, { opacity: 0, display: 'none', delay: 1 })

    $(".stop-game").css("display", "none");
    $(".start-game").css("display", "flex");

    let introTl = new TimelineMax();
    let ball = new TimelineMax({ repeat: -1, delay: 3 });
    introTl
      .fromTo(".start-game .logo-holder", 0.9, { opacity: 0 }, { opacity: 1 })
      .staggerFromTo(
        ".start-game .logo span",
        0.5,
        { opacity: 0 },
        { opacity: 1 },
        0.08,
      )
      .staggerFromTo(
        ".start-game .bar",
        1.6,
        { y: "+100%" },
        { y: "0%", ease: Elastic.easeOut.config(1, 0.3) },
        0.08,
      )
      .staggerFromTo(
        ".start-game .ball-demo",
        1,
        { scale: 0 },
        { scale: 1, ease: Elastic.easeOut.config(1, 0.3) },
        0.8,
        2,
      );

    ball
      .fromTo(
        ".start-game .section-1 .ball-demo",
        0.5,
        { y: "0px" },
        {
          y: "100px",
          scaleY: 1.1,
          transformOrigin: "bottom",
          ease: Power2.easeIn,
        },
      )
      .to(".start-game .section-1 .ball-demo", 0.5, {
        y: "0px",
        scaleY: 1,
        transformOrigin: "bottom",
        ease: Power2.easeOut,
        onStart: () => {
          while (this.prevColor == this.color) {
            this.color = new Color().getRandomColor();
          }
          this.prevColor = this.color;
          TweenMax.to(".start-game .section-1 .ball-demo", 0.5, {
            backgroundColor: this.color,
          });
        },
      });
  }

  /**
   * Display score
   */
  showResult() {
    let score = this.score;
    $(".stop-game").css("display", "flex");
    $(".stop-game .final-score").text(score + "!");
    $(".stop-game .result").text(this.showGrade(score));
    $(".nominee").show();

    let resultTimeline = new TimelineMax();
    resultTimeline
      .fromTo(
        ".stop-game .score-container",
        0.7,
        { opacity: 0, scale: 0.3 },
        { opacity: 1, scale: 1, ease: Elastic.easeOut.config(1.25, 0.5) },
      )
      .fromTo(
        ".stop-game .final-score",
        2,
        { scale: 0.5 },
        { scale: 1, ease: Elastic.easeOut.config(2, 0.5) },
        0,
      )
      .fromTo(
        ".stop-game .result",
        1,
        { scale: 0.5 },
        { scale: 1, ease: Elastic.easeOut.config(1.5, 0.5) },
        0.3,
      );
  }

  /**
   * Takes players score and generates the cheering copy
   * @param  {int} score
   * @return {string} grade
   */
  showGrade(score) {
    if (score > 30) return "Eres una leyenda";
    else if (score > 25) return "Imparable";
    else if (score > 20) return "Asombroso";
    else if (score > 15) return "Excelente";
    else if (score > 13) return "Muy bien";
    else if (score > 10) return "Buen trabajo";
    else if (score > 5) return "Puedes mejorar";
    else return "Sigue intentando";
  }

  start() {
    this.hideQuestionModal();
    $(".start-game, .stop-game").css("display", "none"); // hide all the popups
    $(".nominee").hide();

    this.score = 0; // reset
    this.isPausedForQuestion = false;

    this.isRunning = 1;

    // Clean up the stick and ball holders
    // and generate new ones
    $("#sticks, .scene .ball-holder").html("");
    $("#score").text(this.score);
    this.generateSticks();
    this.generateBall();
    this.lives = 3;
    localStorage.setItem("coloronLives", this.lives);
    this.updateLivesDisplay();
    this.startColorTimer();

    // disables scene animations for Phones
    if (
      !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent,
      )
    ) {
      Animation.sceneAnimation();
    }
    this.moveToStart();
    this.moveScene();

    // reset timescale to normal as the game speeds up
    this.timeline.timeScale(1);
    this.balltween.timeScale(1);
  }

  stop(showResult = true) {
    this.isRunning = 0;

    clearInterval(this.timerInterval);

    $(".start-game, .stop-game").css("display", "none");
    $("#sticks, .scene .ball-holder, #score").html("");
    TweenMax.killAll();

    if (showResult) {
      this.showResult();
    }
  }

  scaleScreen() {
    TweenMax.killAll(); // prevent multiple calls on resize

    let height = $(window).height();
    let width = $(window).width();

    this.calculateScale();

    $(".container")
      .css("transform", "scale(" + this.scale + ")")
      .css("height", height / this.scale)
      .css("width", width / this.scale)
      .css("transformOrigin", "left top");

    $("#sticks").width(
      this.screen / this.scale + (3 * this.stickWidth) / this.scale,
    );
  }

  /**
   * Calls the above function
   * If the game is running it stops and shows the score
   * If the game has stops it takes player to the main menu
   */
  scaleScreenAndRun() {
    this.scaleScreen();

    if (this.isRunning) {
      this.stop();
    } else {
      this.intro();
    }
  }

  /**
   * This is the initial animation
   * where the sticks come to the starting position
   * and the ball appears and falls down
   */
  moveToStart() {
    let tip = new TimelineMax({ delay: 2 });

    tip
      .fromTo(
        ".learn-to-play",
        1,
        { scale: 0 },
        { scale: 1, opacity: 1, ease: Elastic.easeOut.config(1.25, 0.5) },
      )
      .to(
        ".learn-to-play",
        1,
        { scale: 0, opacity: 0, ease: Elastic.easeOut.config(1.25, 0.5) },
        3,
      );

    TweenMax.fromTo(
      "#ball",
      this.time,
      {
        scale: 0,
      },

      {
        scale: 1,
        delay: this.time * (this.steps - 3 - 1.5),
        onComplete: () => {
          this.balltween.play();
        },
      },
    );

    this.timeline.add(
      TweenMax.fromTo(
        "#sticks",
        this.time * this.steps,
        { x: this.screen / this.scale },
        { x: 0, ease: Power0.easeNone },
      ),
    );
  }

  /**
   * The animation that moves sticks
   */
  moveScene() {
    this.timeline.add(
      TweenMax.to("#sticks", this.time, {
        x: "-=180px",
        ease: Power0.easeNone,
        repeat: -1,
        onRepeat: () => {
          this.rearrange();
        },
      }),
    );
  }

  /**
   * removes the first stick and adds one the the end
   * this gives the sticks an infinite movement
   */
  rearrange() {
    let scale = this.speedUp();

    this.timeline.timeScale(scale);
    this.balltween.timeScale(scale);

    $("#sticks .stick").first().remove();
    new Stick();
  }

  /**
   * The game speeds up based on score
   * The GSAP timeScale() function is called on the timeline to speed up the game
   * This calculates how much shall the game speed up
   */
  speedUp() {
    if (this.score > 30) {
      return 1.8;
    }
    if (this.score > 20) {
      return 1.7;
    }
    if (this.score > 15) {
      return 1.5;
    } else if (this.score > 12) {
      return 1.4;
    } else if (this.score > 10) {
      return 1.3;
    } else if (this.score > 8) {
      return 1.2;
    } else if (this.score > 5) {
      return 1.1;
    }
    return 1;
  }

  /**
   * Ball bouncing animation
   * It checks if the ball and stick colors match
   * And changes the ball color
   */
  bounce() {
    this.balltween
      .to("#ball", this.time / 2, {
        y: "+=250px",
        scaleY: 0.7,
        transformOrigin: "bottom",
        ease: Power2.easeIn,
        onComplete: () => {
          this.checkColor();
        },
      })
      .to("#ball", this.time / 2, {
        y: "-=250px",
        scaleY: 1.1,
        transformOrigin: "bottom",
        ease: Power2.easeOut,
        onStart: () => {
          while (this.prevColor == this.color) {
            this.color = new Color().getRandomColor();
          }
          this.prevColor = this.color;
          TweenMax.to("#ball", 0.5, { backgroundColor: this.color });
          $("#ball")
            .removeClass("red")
            .removeClass("yellow")
            .removeClass("purple")
            .addClass(new Color().colorcodeToName(this.color));
        },
      });
  }

  checkColor() {
    if (
      !this.isRunning ||
      this.resumeLock ||
      this.skipResumeContact ||
      this.isPausedForQuestion
    ) {
      return;
    }

    let ballPos = $("#ball").offset().left + $("#ball").width() / 2;
    let stickWidth = $(".stick").width();
    let score = this.score;

    $("#sticks .stick").each(function (index) {
      if (
        $(this).offset().left < ballPos &&
        $(this).offset().left > ballPos - stickWidth
      ) {
        if ($(this).hasClass("inactive")) {
          // inactive stick means the player did not color it yet, so treat as mismatch
          game.pauseForQuestion(index);
          return false;
        }

        if (
          Color.getColorFromClass($(this)) == Color.getColorFromClass("#ball")
        ) {
          // if matches increase the score
          score++;
          $("#score").text(score);
          TweenMax.fromTo(
            "#score",
            0.5,
            { scale: 1.5 },
            { scale: 1, ease: Elastic.easeOut.config(1.5, 0.5) },
          );
        } else {
          // pause and ask a question instead of losing immediately
          game.pauseForQuestion(index);
        }

        return false; // stop checking after the stick under the ball is handled
      }
    });

    this.score = score;
  }
}

class Stick {
  constructor() {
    this.stick = this.addStick();
    this.isPausedForQuestion = false;
  }

  addStick() {
    this.stick = $("#sticks").append('<div class="stick inactive"></div>');
    return this.stick;
  }
}

class Color {
  constructor() {
    this.colors = ["#FF4571", "#FFD145", "#8260F6"];
    this.effects = ["bubble", "triangle", "block"];
    this.prevEffect = null;
  }

  getRandomColor() {
    let colorIndex = Math.random() * 3;
    let color = this.colors[Math.floor(colorIndex)];
    return color;
  }

  colorcodeToName(color) {
    let colors = ["#FF4571", "#FFD145", "#8260F6"];
    let names = ["red", "yellow", "purple"];
    let index = colors.indexOf(color);
    if (index == -1) return false;
    return names[index];
  }

  /**
   * Changes the color of an element
   * As we as adds verbal name of the color
   */
  changeColor(el) {
    let index = el.data("index");
    if (index === undefined) {
      index = 0;
    } else {
      index += 1;
    }
    if (index == 3) index = 0;
    el.css("background-color", this.colors[index]).data("index", index);

    el.removeClass("red")
      .removeClass("yellow")
      .removeClass("purple")
      .addClass(this.colorcodeToName(this.colors[index]));

    if (el.hasClass("inactive")) {
      this.setEffect(el);
      el.addClass("no-effect");
    }

    el.removeClass("inactive");
  }

  getRandomEffect() {
    let effectIndex = null;

    effectIndex = Math.floor(Math.random() * 3);
    while (effectIndex == this.prevEffect) {
      effectIndex = Math.floor(Math.random() * 3);
    }

    this.prevEffect = effectIndex;
    return this.effects[effectIndex];
  }

  /**
   * Adds the effect specific particles to the stick
   */
  setEffect(el) {
    let effect = this.getRandomEffect();
    el.addClass(effect + "-stick");
    for (let i = 1; i <= 14; i++) {
      if (effect == "block") {
        el.append(
          `<div class="${effect} ${effect}-${i}"><div class="inner"></div><div class="inner inner-2"></div></div>`,
        );
      } else {
        el.append(`<div class="${effect} ${effect}-${i}"></div>`);
      }
    }
  }

  /**
   * Since the ball and sticks have several classes
   * This method searches for the color class
   * @param el [DOM element]
   * @return {string} class name
   */
  static getColorFromClass(el) {
    let classes = $(el).attr("class").split(/\s+/);
    for (var i = 0, len = classes.length; i < len; i++) {
      if (
        classes[i] == "red" ||
        classes[i] == "yellow" ||
        classes[i] == "purple"
      ) {
        return classes[i];
      }
    }
  }
}

class Animation {
  /**
   * Creates and positions the small glow elements on the screen
   */
  static generateSmallGlows(number) {
    let h = $(window).height();
    let w = $(window).width();
    let scale = w > h ? h / 800 : w / 1200;

    h = h / scale;
    w = w / scale;

    for (let i = 0; i < number; i++) {
      let left = Math.floor(Math.random() * w);
      let top = Math.floor(Math.random() * (h / 2));
      let size = Math.floor(Math.random() * 8) + 4;
      $(".small-glows").prepend('<div class="small-glow"></div>');
      let noise = $(".small-glows .small-glow").first();
      noise.css({ left: left, top: top, height: size, width: size });
    }
  }

  /**
   * Creates the animations for sticks
   * The effects is chosen by random
   * And one of the three functions is
   * Called accordingly
   */
  playBubble(el) {
    let bubble = new TimelineMax();
    bubble.staggerFromTo(
      el.find(".bubble"),
      0.3,
      { scale: 0.1 },
      { scale: 1 },
      0.03,
    );
    bubble.staggerTo(
      el.find(".bubble"),
      0.5,
      { y: "-=60px", yoyo: true, repeat: -1 },
      0.03,
    );
  }

  playTriangle(el) {
    let triangle = new TimelineMax();
    triangle
      .staggerFromTo(
        el.find(".triangle"),
        0.3,
        { scale: 0.1 },
        { scale: 1 },
        0.03,
      )
      .staggerTo(
        el.find(".triangle"),
        1.5,
        {
          cycle: {
            rotationY: [0, 360],
            rotationX: [360, 0],
          },

          repeat: -1,
          repeatDelay: 0.1,
        },
        0.1,
      );
  }

  playBlock(el) {
    let block = new TimelineMax();
    let block2 = new TimelineMax({ delay: 0.69 });

    block
      .staggerFromTo(el.find(".block"), 0.3, { scale: 0.1 }, { scale: 1 }, 0.03)
      .staggerTo(
        el.find(".block .inner:not(.inner-2)"),
        1,
        {
          cycle: {
            x: ["+200%", "-200%"],
          },

          repeat: -1,
          repeatDelay: 0.6,
        },
        0.1,
      );
    block2.staggerTo(
      el.find(".block .inner-2"),
      1,
      {
        cycle: {
          x: ["+200%", "-200%"],
        },

        repeat: -1,
        repeatDelay: 0.6,
      },
      0.1,
    );
  }

  static sceneAnimation() {
    const speed = 15; // uses it's local speed

    // animates the small glows in a circular motion
    $(".small-glow").each(function () {
      let speedDelta = Math.floor(Math.random() * 8);
      let radius = Math.floor(Math.random() * 20) + 20;
      TweenMax.to($(this), speed + speedDelta, {
        rotation: 360,
        transformOrigin: "-" + radius + "px -" + radius + "px",
        repeat: -1,
        ease: Power0.easeNone,
      });
    });

    var wavet = TweenMax.to(".top_wave", (speed * 1.7) / 42, {
      backgroundPositionX: "-=54px",
      repeat: -1,
      ease: Power0.easeNone,
    });
    var wave1 = TweenMax.to(".wave1", (speed * 1.9) / 42, {
      backgroundPositionX: "-=54px",
      repeat: -1,
      ease: Power0.easeNone,
    });
    var wave2 = TweenMax.to(".wave2", (speed * 2) / 42, {
      backgroundPositionX: "-=54px",
      repeat: -1,
      ease: Power0.easeNone,
    });
    var wave3 = TweenMax.to(".wave3", (speed * 2.2) / 42, {
      backgroundPositionX: "-=54px",
      repeat: -1,
      ease: Power0.easeNone,
    });
    var wave4 = TweenMax.to(".wave4", (speed * 2.4) / 42, {
      backgroundPositionX: "-=54px",
      repeat: -1,
      ease: Power0.easeNone,
    });

    var mount1 = TweenMax.to(".mount1", speed * 8, {
      backgroundPositionX: "-=1760px",
      repeat: -1,
      ease: Power0.easeNone,
    });
    var mount2 = TweenMax.to(".mount2", speed * 10, {
      backgroundPositionX: "-=1782px",
      repeat: -1,
      ease: Power0.easeNone,
    });

    var clouds = TweenMax.to(".clouds", speed * 3, {
      backgroundPositionX: "-=1001px",
      repeat: -1,
      ease: Power0.easeNone,
    });
  }
}

var game = new Game();
var animation = new Animation();
var color = new Color();
var userAgent = window.navigator.userAgent;

Animation.generateSmallGlows(20);

$(document).ready(function () {
  game.scaleScreen();

  const paused = localStorage.getItem("coloronPaused") === "true";
  const savedStateRaw = localStorage.getItem("coloronCheckpointState");
  const restart = localStorage.getItem("coloronRestart") === "true";

  if (restart) {
    localStorage.removeItem("coloronRestart");
    localStorage.removeItem("coloronPaused");
    localStorage.removeItem("coloronCheckpointState");
    localStorage.removeItem("coloronSkipNextCheck");
    game.start();
  } else if (paused && savedStateRaw) {
    let savedState = null;
    try {
      savedState = JSON.parse(savedStateRaw);
    } catch (error) {
      savedState = null;
    }
    if (savedState) {
      localStorage.removeItem("coloronPaused");
      localStorage.removeItem("coloronCheckpointState");
      game.resumeFromCheckpoint(savedState);
    } else {
      localStorage.removeItem("coloronPaused");
      localStorage.removeItem("coloronCheckpointState");
      localStorage.removeItem("coloronSkipNextCheck");
      game.intro();
    }
  } else {
    localStorage.removeItem("coloronPaused");
    localStorage.removeItem("coloronCheckpointState");
    localStorage.removeItem("coloronSkipNextCheck");
    game.intro();
  }

  if ($(window).height() < 480) {
    $(".play-full-page").css("display", "block");
  }
});

$(document).on("click", ".stick", function () {
  color.changeColor($(this));
  if ($(this).hasClass("no-effect")) {
    if ($(this).hasClass("bubble-stick")) {
      animation.playBubble($(this));
    } else if ($(this).hasClass("triangle-stick")) {
      animation.playTriangle($(this));
    } else if ($(this).hasClass("block-stick")) {
      animation.playBlock($(this));
    }
    $(this).removeClass("no-effect");
  }
});

$(document).on("click", ".section-2 .bar", function () {
  color.changeColor($(this));
});

$(window).resize(function () {
  if (!userAgent.match(/iPad/i) && !userAgent.match(/iPhone/i)) {
    game.scaleScreenAndRun();
  }
});

$(window).on("orientationchange", function () {
  game.scaleScreenAndRun();
});
