(() => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;

  let isEnabled = true;
  let audioCtx = null;
  let masterGain = null;
  let loopTimer = null;
  let isPlaying = false;
  let stepIndex = 0;

  const tempo = 144;
  const beat = 60 / tempo;
  const sequence = [
    { freq: 261.63, beats: 0.25 }, // C4
    { freq: 329.63, beats: 0.25 }, // E4
    { freq: 392.00, beats: 0.25 }, // G4
    { freq: 523.25, beats: 0.25 }, // C5
    { freq: 493.88, beats: 0.25 }, // B4
    { freq: 392.00, beats: 0.25 }, // G4
    { freq: 349.23, beats: 0.25 }, // F4
    { freq: 293.66, beats: 0.25 }, // D4
    { freq: 261.63, beats: 0.25 }, // C4
    { freq: 329.63, beats: 0.25 }, // E4
    { freq: 392.00, beats: 0.25 }, // G4
    { freq: 523.25, beats: 0.25 }, // C5
    { freq: 587.33, beats: 0.25 }, // D5
    { freq: 523.25, beats: 0.25 }, // C5
    { freq: 440.00, beats: 0.25 }, // A4
    { freq: 392.00, beats: 0.25 }, // G4
  ];

  const initContext = () => {
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);
    }
  };

  const playStep = (freq, duration) => {
    if (!audioCtx || !masterGain || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration);
  };

  const scheduleNext = () => {
    if (!isPlaying || !audioCtx) return;
    
    // If suspended, wait a bit and try again without killing the loop
    if (audioCtx.state !== "running") {
      loopTimer = window.setTimeout(scheduleNext, 500);
      return;
    }

    const step = sequence[stepIndex % sequence.length];
    const duration = step.beats * beat;

    playStep(step.freq, duration);
    stepIndex += 1;

    loopTimer = window.setTimeout(scheduleNext, duration * 1000);
  };

  const startMusic = () => {
    if (isPlaying) {
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      return;
    }
    initContext();

    const tryResume = () => {
      audioCtx.resume().then(() => {
        if (audioCtx.state === "running") {
          masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
          masterGain.gain.setTargetAtTime(0.25, audioCtx.currentTime, 0.1);
          if (!isPlaying) {
            isPlaying = true;
            scheduleNext();
            removeUnlockListeners();
          }
        }
      }).catch(err => console.warn("Audio resume failed:", err));
    };

    tryResume();
  };

  const removeUnlockListeners = () => {
    const events = ["pointerdown", "touchstart", "touchend", "mousedown", "click", "keydown"];
    events.forEach((evt) => {
      window.removeEventListener(evt, handleUnlock, { capture: true });
      document.removeEventListener(evt, handleUnlock, { capture: true });
    });
  };

  const handleUnlock = (e) => {
    if (!isEnabled) return;
    
    if (!audioCtx) {
      initContext();
    }
    
    // Explicitly call resume() within the handler's execution context
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        if (audioCtx.state === "running" && !isPlaying) {
          startMusic();
        }
      });
    } else if (!isPlaying) {
      startMusic();
    }
  };

  const setupListeners = () => {
    const events = ["pointerdown", "touchstart", "touchend", "mousedown", "click", "keydown"];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUnlock, { capture: true });
      document.addEventListener(evt, handleUnlock, { capture: true });
    });
  };

  setupListeners();

  document.addEventListener("visibilitychange", () => {
    if (!audioCtx || !isPlaying) return;
    if (document.hidden) {
      audioCtx.suspend();
    } else if (isEnabled) {
      // On resume, we might need another user gesture on some mobile browsers
      // but try it anyway
      audioCtx.resume();
    }
  });
})();

