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


  const ensureContext = () => {
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);
    }
  };

  const playStep = (freq, duration) => {
    if (!audioCtx || !masterGain) return;
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
    const step = sequence[stepIndex % sequence.length];
    const duration = step.beats * beat;

    playStep(step.freq, duration);
    stepIndex += 1;

    loopTimer = window.setTimeout(scheduleNext, duration * 1000);
  };

  const startMusic = () => {
    if (isPlaying) return;
    ensureContext();

    audioCtx
      .resume()
      .then(() => {
        if (!masterGain) return;
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setTargetAtTime(0.18, audioCtx.currentTime, 0.05);
        isPlaying = true;
        scheduleNext();
      })
      .catch(() => {
        // Ignore resume errors from browser autoplay policies.
      });
  };

  const stopMusic = () => {
    if (!audioCtx || !masterGain) return;
    isPlaying = false;

    if (loopTimer) {
      window.clearTimeout(loopTimer);
      loopTimer = null;
    }

    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);

    window.setTimeout(() => {
      if (audioCtx && !isPlaying) {
        audioCtx.suspend();
      }
    }, 220);
  };

  const handleFirstGesture = () => {
    if (!isEnabled) return;
    startMusic();
  };


  document.addEventListener("pointerdown", handleFirstGesture, {
    once: true,
    passive: true,
  });
  document.addEventListener("keydown", handleFirstGesture, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (!audioCtx || !isPlaying) return;
    if (document.hidden) {
      audioCtx.suspend();
    } else if (isEnabled) {
      audioCtx.resume();
    }
  });
})();
