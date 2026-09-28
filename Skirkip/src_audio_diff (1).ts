--- src/audio.ts (原始)
// Web Audio API sound synthesis - all sounds generated programmatically
// No external audio files needed - 100% offline capable

let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicOsc: OscillatorNode | null = null;
let isMusicPlaying = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPop() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) { /* silent fail */ }
}

export function playTick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) { /* silent fail */ }
}

export function playGo() {
  try {
    const ctx = getCtx();
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.4);
    });
  } catch (e) { /* silent fail */ }
}

export function playWhoosh() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
    filter.Q.setValueAtTime(2, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) { /* silent fail */ }
}

export function playCorrect() {
  try {
    const ctx = getCtx();
    // Arpeggio C5→E5→G5→C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
    // Clap sound (white noise burst)
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + 0.3);
  } catch (e) { /* silent fail */ }
}

export function playWrong() {
  try {
    const ctx = getCtx();
    // Buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.type = 'sawtooth';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    // Thunder (low noise)
    const bufferSize = ctx.sampleRate * 0.9;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3)) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.1);
    tGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
    source.connect(filter);
    filter.connect(tGain);
    tGain.connect(ctx.destination);
    source.start(ctx.currentTime + 0.1);
  } catch (e) { /* silent fail */ }
}

export function playLifeLost() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) { /* silent fail */ }
}

export function playElimination() {
  try {
    const ctx = getCtx();
    const notes = [329.63, 293.66, 261.63]; // E4 D4 C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.3);
    });
  } catch (e) { /* silent fail */ }
}

export function playTimerAlarm() {
  try {
    const ctx = getCtx();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.1);
      osc.type = 'square';
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.1);
    }
  } catch (e) { /* silent fail */ }
}

export function playDrumRoll() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 2.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.min(1, t * 4) * (1 - Math.max(0, (t - 2) * 2));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) { /* silent fail */ }
}

export function playFanfare() {
  try {
    const ctx = getCtx();
    const melody = [
      { freq: 392, start: 0, dur: 0.2 },
      { freq: 392, start: 0.2, dur: 0.2 },
      { freq: 392, start: 0.4, dur: 0.2 },
      { freq: 523.25, start: 0.6, dur: 0.6 },
      { freq: 440, start: 1.2, dur: 0.2 },
      { freq: 440, start: 1.4, dur: 0.2 },
      { freq: 440, start: 1.6, dur: 0.2 },
      { freq: 523.25, start: 1.8, dur: 0.8 },
    ];
    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + note.start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.start + note.dur);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + note.start);
      osc.stop(ctx.currentTime + note.start + note.dur);
    });
  } catch (e) { /* silent fail */ }
}

export function startMusic() {
  try {
    if (isMusicPlaying) return;
    const ctx = getCtx();
    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0.08, ctx.currentTime);
    musicGain.connect(ctx.destination);

    const playNote = (freq: number, startTime: number, dur: number) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(musicGain!);
      osc.frequency.setValueAtTime(freq, startTime);
      noteGain.gain.setValueAtTime(0.3, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.type = 'sine';
      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    const melody = [261.63, 293.66, 329.63, 349.23, 392, 349.23, 329.63, 293.66];
    let time = ctx.currentTime;
    const loopDuration = melody.length * 0.4;

    const scheduleLoop = () => {
      if (!isMusicPlaying) return;
      melody.forEach((freq, i) => {
        playNote(freq, time + i * 0.4, 0.35);
      });
      time += loopDuration;
      setTimeout(scheduleLoop, (loopDuration - 0.5) * 1000);
    };

    isMusicPlaying = true;
    scheduleLoop();
  } catch (e) { /* silent fail */ }
}

export function stopMusic() {
  isMusicPlaying = false;
  if (musicGain) {
    try {
      musicGain.gain.exponentialRampToValueAtTime(0.01, getCtx().currentTime + 0.3);
    } catch (e) { /* silent */ }
  }
}


+++ src/audio.ts (修改后)
// Web Audio API sound synthesis - all sounds generated programmatically
// No external audio files needed - 100% offline capable

let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let isMusicPlaying = false;
let musicTimeout: any = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playPop() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
    osc.type = 'sine';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

export function playTick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.type = 'sine';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

export function playGo() {
  try {
    const ctx = getCtx();
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.4);
    });
  } catch (e) {}
}

export function playWhoosh() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) {}
}

export function playCorrect() {
  try {
    const ctx = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
    // Clap
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    source.connect(gain); gain.connect(ctx.destination);
    source.start(ctx.currentTime + 0.3);
  } catch (e) {}
}

export function playWrong() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.type = 'sawtooth';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    // Thunder
    const bufferSize = ctx.sampleRate * 0.9;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3)) * 0.5;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, ctx.currentTime);
    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.1);
    tGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
    source.connect(filter); filter.connect(tGain); tGain.connect(ctx.destination);
    source.start(ctx.currentTime + 0.1);
  } catch (e) {}
}

export function playLifeLost() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.type = 'sine';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

export function playElimination() {
  try {
    const ctx = getCtx();
    const notes = [329.63, 293.66, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.3);
    });
  } catch (e) {}
}

export function playTimerAlarm() {
  try {
    const ctx = getCtx();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.1);
      osc.type = 'square';
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.1);
    }
  } catch (e) {}
}

export function playDrumRoll() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 2.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.min(1, t * 4) * (1 - Math.max(0, (t - 2) * 2));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(300, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) {}
}

export function playFanfare() {
  try {
    const ctx = getCtx();
    const melody = [
      { freq: 392, start: 0, dur: 0.2 }, { freq: 392, start: 0.2, dur: 0.2 },
      { freq: 392, start: 0.4, dur: 0.2 }, { freq: 523.25, start: 0.6, dur: 0.6 },
      { freq: 440, start: 1.2, dur: 0.2 }, { freq: 440, start: 1.4, dur: 0.2 },
      { freq: 440, start: 1.6, dur: 0.2 }, { freq: 523.25, start: 1.8, dur: 0.8 },
    ];
    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + note.start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.start + note.dur);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + note.start);
      osc.stop(ctx.currentTime + note.start + note.dur);
    });
  } catch (e) {}
}

// === NEW SOUNDS ===

export function playCombo() {
  try {
    const ctx = getCtx();
    // Rising arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 0.15);
      osc.type = 'triangle';
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.15);
    });
  } catch (e) {}
}

export function playMegaCombo() {
  try {
    const ctx = getCtx();
    // Epic chord
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
      osc.type = i < 3 ? 'triangle' : 'sine';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
    });
  } catch (e) {}
}

export function playPowerup() {
  try {
    const ctx = getCtx();
    // Magical sparkle
    const notes = [783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
      osc.type = 'sine';
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  } catch (e) {}
}

export function playShield() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.type = 'sine';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export function playSabotage() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.type = 'sawtooth';
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export function playApplause() {
  try {
    const ctx = getCtx();
    // Multiple clap bursts
    for (let b = 0; b < 8; b++) {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02)) * 0.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime + b * 0.15);
      source.connect(gain); gain.connect(ctx.destination);
      source.start(ctx.currentTime + b * 0.15);
    }
  } catch (e) {}
}

export function playStandingOvation() {
  try {
    const ctx = getCtx();
    // Long applause with cheers
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.min(1, t * 2) * (1 - Math.max(0, (t - 2.5) * 2));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(1500, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) {}
}

export function playAnimalSound(avatar: string) {
  try {
    const ctx = getCtx();
    const sounds: Record<string, () => void> = {
      '🐱': () => { // Meow
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.type = 'sine';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
      },
      '🐶': () => { // Bark
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.type = 'sawtooth';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
      },
      '🦉': () => { // Hoot
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.type = 'sine';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      },
      '🦊': () => { // Yip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.type = 'triangle';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
      },
      '🐼': () => { // Squeak
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.type = 'sine';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
      },
      '🐰': () => { // Squeak
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.type = 'sine';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
      },
      '🦁': () => { // Roar
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.type = 'sawtooth';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
      },
      '🐸': () => { // Ribbit
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.type = 'square';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
      },
      '🦄': () => { // Magic sparkle
        const notes = [880, 1100, 1320, 1760];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.05);
          g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.05 + 0.1);
          osc.type = 'sine';
          osc.start(ctx.currentTime + i * 0.05);
          osc.stop(ctx.currentTime + i * 0.05 + 0.1);
        });
      },
      '🐧': () => { // Honk
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.type = 'square';
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
      },
    };
    (sounds[avatar] || sounds['🐱'])();
  } catch (e) {}
}

export function playRoundJingle(round: 1 | 2 | 3) {
  try {
    const ctx = getCtx();
    const jingles = {
      1: [392, 440, 523.25, 659.25], // Cheerful C major
      2: [329.63, 392, 493.88, 587.33], // Tense D minor feel
      3: [523.25, 659.25, 783.99, 1046.5, 1318.5], // Epic C major arpeggio
    };
    const notes = jingles[round];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
      osc.type = round === 3 ? 'triangle' : 'sine';
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) {}
}

export function playClapboard() {
  try {
    const ctx = getCtx();
    // Sharp click
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    source.connect(gain); gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (e) {}
}

export function playNarrator(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

export function stopNarrator() {
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch (e) {}
}

export function startMusic(round: 1 | 2 | 3 = 1) {
  try {
    if (isMusicPlaying) stopMusic();
    const ctx = getCtx();
    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0.06, ctx.currentTime);
    musicGain.connect(ctx.destination);

    const melodies = {
      1: [261.63, 293.66, 329.63, 349.23, 392, 349.23, 329.63, 293.66],
      2: [220, 261.63, 293.66, 329.63, 293.66, 261.63, 220, 196],
      3: [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440],
    };
    const melody = melodies[round];
    let time = ctx.currentTime;
    const loopDuration = melody.length * 0.4;

    const playNote = (freq: number, startTime: number, dur: number) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain); noteGain.connect(musicGain!);
      osc.frequency.setValueAtTime(freq, startTime);
      noteGain.gain.setValueAtTime(0.3, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.type = round === 3 ? 'triangle' : 'sine';
      osc.start(startTime); osc.stop(startTime + dur);
    };

    const scheduleLoop = () => {
      if (!isMusicPlaying) return;
      melody.forEach((freq, i) => playNote(freq, time + i * 0.4, 0.35));
      time += loopDuration;
      musicTimeout = setTimeout(scheduleLoop, (loopDuration - 0.5) * 1000);
    };

    isMusicPlaying = true;
    scheduleLoop();
  } catch (e) {}
}

export function stopMusic() {
  isMusicPlaying = false;
  if (musicTimeout) clearTimeout(musicTimeout);
  if (musicGain) {
    try { musicGain.gain.exponentialRampToValueAtTime(0.01, getCtx().currentTime + 0.3); } catch (e) {}
  }
}
