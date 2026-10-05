// Web Audio API sound synthesis - zero external audio assets, works 100% offline and in РФ

let audioCtx = null;
let isSoundEnabled = true;

// Load saved sound preference
try {
  const saved = localStorage.getItem('mountains_sound_enabled');
  if (saved !== null) {
    isSoundEnabled = JSON.parse(saved);
  }
} catch (e) {
  // Ignore localStorage errors
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleSound() {
  isSoundEnabled = !isSoundEnabled;
  try {
    localStorage.setItem('mountains_sound_enabled', JSON.stringify(isSoundEnabled));
  } catch (e) {}
  return isSoundEnabled;
}

export function getSoundEnabled() {
  return isSoundEnabled;
}

export function playClick() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

export function playSuccess() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.07;
      const duration = 0.22;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {}
}

export function playError() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime;
    const duration = 0.25;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, startTime); // A3
    osc.frequency.exponentialRampToValueAtTime(140, startTime + duration);

    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (e) {}
}

export function playFanfare() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0, dur: 0.2 },
      { notes: [587.33, 739.99, 880.00], time: 0.22, dur: 0.2 },
      { notes: [659.25, 830.61, 987.77], time: 0.44, dur: 0.2 },
      { notes: [783.99, 987.77, 1174.66, 1567.98], time: 0.68, dur: 0.55 },
    ];

    chords.forEach(({ notes, time, dur }) => {
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + time;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur);
      });
    });
  } catch (e) {}
}
