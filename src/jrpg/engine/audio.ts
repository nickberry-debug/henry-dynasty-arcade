// AETHERSONG audio engine.

export type TrackName = "town" | "dungeon" | "battle" | "boss" | "silent";

type RunningTrack = { stop: () => void };

interface AudioState {
  ctx: AudioContext | null;
  master: GainNode | null;
  current: RunningTrack | null;
  currentName: TrackName;
  muted: boolean;
  volume: number;
}

const state: AudioState = {
  ctx: null,
  master: null,
  current: null,
  currentName: "silent",
  muted: false,
  volume: 0.5,
};

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!state.ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    state.ctx = new Ctor();
    state.master = state.ctx.createGain();
    state.master.gain.value = state.muted ? 0 : state.volume;
    state.master.connect(state.ctx.destination);
  }
  if (state.ctx.state === "suspended") {
    state.ctx.resume().catch(() => undefined);
  }
  return state.ctx;
}

export function setMuted(m: boolean): void {
  state.muted = m;
  if (state.master) state.master.gain.value = m ? 0 : state.volume;
}
export function isMuted(): boolean { return state.muted; }

export function setVolume(v: number): void {
  state.volume = Math.max(0, Math.min(1, v));
  if (state.master && !state.muted) state.master.gain.value = state.volume;
}

const SCALES = {
  town:    [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33],
  dungeon: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00],
  battle:  [164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00],
  boss:    [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23],
} as const satisfies Record<Exclude<TrackName, "silent">, readonly number[]>;

const TEMPO = {
  town:    { bpm: 88,  patternLen: 16 },
  dungeon: { bpm: 72,  patternLen: 16 },
  battle:  { bpm: 132, patternLen: 16 },
  boss:    { bpm: 108, patternLen: 16 },
} as const;

function makeBlip(ctx: AudioContext, dest: AudioNode, when: number, freq: number, dur: number, type: OscillatorType = "triangle", peakGain = 0.16): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peakGain, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function makePad(ctx: AudioContext, dest: AudioNode, when: number, freq: number, dur: number, peakGain = 0.05): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peakGain, when + 0.4);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  osc.connect(g).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function startTrack(track: Exclude<TrackName, "silent">): RunningTrack {
  const ctxMaybe = ensureCtx();
  if (!ctxMaybe || !state.master) return { stop() { /* noop */ } };
  const ctx: AudioContext = ctxMaybe;
  const dest = ctx.createGain();
  dest.gain.value = 0.7;
  dest.connect(state.master);
  const scale = SCALES[track];
  const { bpm, patternLen } = TEMPO[track];
  const stepSec = 60 / bpm / 2;

  let cancelled = false;
  let stepIdx = 0;
  const seed = track.length * 7919;
  const seq: number[] = [];
  for (let i = 0; i < patternLen; i += 1) {
    const k = (seed * (i + 1)) % scale.length;
    seq.push(scale[k]);
  }
  const dissonant = track === "boss";

  function tick(): void {
    if (cancelled) return;
    const now = ctx.currentTime;
    const t = now + 0.05;
    const f = seq[stepIdx % seq.length];
    makeBlip(ctx, dest, t, f, stepSec * 1.4, "triangle", 0.12);
    if (stepIdx % 4 === 0) {
      makePad(ctx, dest, t, f / 2, stepSec * 4, 0.04);
    }
    if (stepIdx % 2 === 0) {
      makeBlip(ctx, dest, t, f / 4, stepSec * 1.2, "sine", 0.08);
    }
    if (dissonant && stepIdx % 4 === 2) {
      makeBlip(ctx, dest, t, f * 1.06, stepSec * 0.6, "sawtooth", 0.06);
    }
    stepIdx += 1;
    setTimeout(tick, stepSec * 1000);
  }
  tick();
  return {
    stop() {
      cancelled = true;
      try {
        const now = ctx.currentTime;
        dest.gain.cancelScheduledValues(now);
        dest.gain.setValueAtTime(dest.gain.value, now);
        dest.gain.linearRampToValueAtTime(0, now + 0.4);
        setTimeout(() => { try { dest.disconnect(); } catch { /* noop */ } }, 600);
      } catch { /* noop */ }
    },
  };
}

export function playTrack(name: TrackName): void {
  if (state.currentName === name) return;
  if (state.current) { state.current.stop(); state.current = null; }
  state.currentName = name;
  if (name === "silent") return;
  const ctx = ensureCtx();
  if (!ctx) return;
  state.current = startTrack(name);
}

export function stopTrack(): void {
  if (state.current) state.current.stop();
  state.current = null;
  state.currentName = "silent";
}

export function sfxHit(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.005;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.18);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(state.master);
  o.start(t); o.stop(t + 0.22);
}

export function sfxHeal(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.005;
  [440, 554.37, 659.25].forEach((f, i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t + i * 0.08);
    g.gain.setValueAtTime(0, t + i * 0.08);
    g.gain.linearRampToValueAtTime(0.18, t + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.3);
    o.connect(g).connect(state.master!);
    o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.32);
  });
}

export function sfxLevel(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.005;
  [392, 523.25, 659.25, 783.99].forEach((f, i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t + i * 0.09);
    g.gain.setValueAtTime(0, t + i * 0.09);
    g.gain.linearRampToValueAtTime(0.22, t + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.35);
    o.connect(g).connect(state.master!);
    o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.4);
  });
}

export function sfxTick(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.002;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(880, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(state.master);
  o.start(t); o.stop(t + 0.08);
}

export function sfxFlare(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.005;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(440, t);
  o.frequency.exponentialRampToValueAtTime(1660, t + 0.4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g).connect(state.master);
  o.start(t); o.stop(t + 0.55);
}

export function sfxFanfare(): void {
  const ctx = ensureCtx(); if (!ctx || !state.master) return;
  const t = ctx.currentTime + 0.005;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t + i * 0.07);
    g.gain.setValueAtTime(0, t + i * 0.07);
    g.gain.linearRampToValueAtTime(0.2, t + i * 0.07 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.5);
    o.connect(g).connect(state.master!);
    o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.55);
  });
}
