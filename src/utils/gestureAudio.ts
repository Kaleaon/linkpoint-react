// Web Audio API acoustic sound synthesizer for Second Life gestures.
// Generates authentic real-time sound effects for gesture playback without external asset latency.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn("AudioContext unavailable:", err);
    return null;
  }
}

export const GESTURE_SOUNDS = [
  { id: "applause", name: "Crowd Applause", description: "Enthusiastic clapping burst" },
  { id: "laugh", name: "Chuckle / Laugh", description: "Cheerful staccato laugh" },
  { id: "drumroll", name: "Snare Drum Roll", description: "Rapid snare roll with crash" },
  { id: "fanfare", name: "Triumphant Fanfare", description: "Brass celebration chords" },
  { id: "chime", name: "Crystal Chime", description: "Clean high harmonic bell" },
  { id: "whistle", name: "Whistle", description: "Sliding cheer whistle" },
  { id: "gong", name: "Resonant Gong", description: "Deep metallic vibration" },
  { id: "kiss", name: "Air Kiss Pop", description: "Sweet acoustic kiss pop" },
  { id: "gasp", name: "Surprised Gasp", description: "Sharp breath intake" },
] as const;

export type GestureSoundId = typeof GESTURE_SOUNDS[number]["id"];

export function playGestureSound(soundId?: string, volume: number = 0.5): void {
  if (!soundId) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.min(Math.max(volume, 0.05), 1.0), now);
  masterGain.connect(ctx.destination);

  switch (soundId) {
    case "applause": {
      // Create series of rapid clapping noise pulses
      const duration = 1.4;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(3.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      // Rhythmic bursts of clapping
      for (let t = 0; t < 1.3; t += 0.08 + Math.random() * 0.03) {
        const clapTime = now + t;
        gain.gain.setValueAtTime(0.01, clapTime);
        gain.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.3, clapTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.01, clapTime + 0.07);
      }
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      noise.start(now);
      noise.stop(now + duration);
      break;
    }

    case "laugh": {
      // 4 chuckles with pitch modulation
      const chuckles = [
        { freq: 440, time: 0, dur: 0.12 },
        { freq: 520, time: 0.15, dur: 0.12 },
        { freq: 480, time: 0.30, dur: 0.13 },
        { freq: 400, time: 0.46, dur: 0.16 },
      ];

      chuckles.forEach((c) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        const startTime = now + c.time;

        osc.frequency.setValueAtTime(c.freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(c.freq * 0.8, startTime + c.dur);

        g.gain.setValueAtTime(0.001, startTime);
        g.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + c.dur);

        osc.connect(g);
        g.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + c.dur + 0.05);
      });
      break;
    }

    case "drumroll": {
      // Snare roll: bursts of bandpassed noise rapidly increasing in density, ending in crash
      const rollDuration = 1.0;
      const bufferSize = ctx.sampleRate * rollDuration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1400, now);

      const rollGain = ctx.createGain();
      rollGain.gain.setValueAtTime(0.05, now);
      rollGain.gain.linearRampToValueAtTime(0.35, now + 0.85);
      rollGain.gain.linearRampToValueAtTime(0.001, now + rollDuration);

      noise.connect(filter);
      filter.connect(rollGain);
      rollGain.connect(masterGain);

      noise.start(now);
      noise.stop(now + rollDuration);

      // Cymbal crash at 0.9s
      const crashTime = now + 0.88;
      const crashBuf = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate);
      const cData = crashBuf.getChannelData(0);
      for (let i = 0; i < cData.length; i++) cData[i] = Math.random() * 2 - 1;

      const crashSrc = ctx.createBufferSource();
      crashSrc.buffer = crashBuf;
      const crashFilter = ctx.createBiquadFilter();
      crashFilter.type = "bandpass";
      crashFilter.frequency.setValueAtTime(4500, crashTime);
      crashFilter.Q.setValueAtTime(1.5, crashTime);

      const crashGain = ctx.createGain();
      crashGain.gain.setValueAtTime(0.6, crashTime);
      crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.7);

      crashSrc.connect(crashFilter);
      crashFilter.connect(crashGain);
      crashGain.connect(masterGain);

      crashSrc.start(crashTime);
      crashSrc.stop(crashTime + 0.7);
      break;
    }

    case "fanfare": {
      // 4 brass-like notes: C5 (523), E5 (659), G5 (784), C6 (1046)
      const notes = [
        { freq: 523.25, time: 0, dur: 0.14 },
        { freq: 659.25, time: 0.16, dur: 0.14 },
        { freq: 783.99, time: 0.32, dur: 0.16 },
        { freq: 1046.5, time: 0.50, dur: 0.45 },
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = "sawtooth";
        oscHarmonic.type = "sine";

        const start = now + n.time;
        osc.frequency.setValueAtTime(n.freq, start);
        oscHarmonic.frequency.setValueAtTime(n.freq * 2, start);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1800, start);

        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.3, start + 0.03);
        g.gain.setValueAtTime(0.25, start + n.dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

        osc.connect(filter);
        oscHarmonic.connect(filter);
        filter.connect(g);
        g.connect(masterGain);

        osc.start(start);
        oscHarmonic.start(start);
        osc.stop(start + n.dur + 0.05);
        oscHarmonic.stop(start + n.dur + 0.05);
      });
      break;
    }

    case "chime": {
      // Pure ringing bell harmonics
      const freqs = [1760, 2640, 3520];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const amp = 0.3 / (idx + 1);
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.2);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.5);
      });
      break;
    }

    case "whistle": {
      // Sweeping cheerful whistle
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";

      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.35, now + 0.05);
      g.gain.setValueAtTime(0.3, now + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }

    case "gong": {
      // Low deep metallic gong
      const freqs = [110, 164.8, 220, 330];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now);

        g.gain.setValueAtTime(0.4 / (i + 1), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.0);
      });
      break;
    }

    case "kiss": {
      // Sweet air kiss pop sound
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1300, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);

      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }

    case "gasp": {
      // Breathy inhale
      const duration = 0.35;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.exponentialRampToValueAtTime(1500, now + duration);
      filter.Q.setValueAtTime(2.0, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.3, now + duration * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(g);
      g.connect(masterGain);

      src.start(now);
      src.stop(now + duration);
      break;
    }

    default: {
      // Default notification pop
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(880, now);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
      break;
    }
  }
}
