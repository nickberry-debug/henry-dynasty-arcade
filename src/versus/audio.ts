// src/versus/audio.ts
//
// Web Audio synth for the Sports Versus combat-sports games.
// All sounds are synthesized on the fly — no external audio asset files
// required. Each named event is a small Oscillator/Noise envelope.
//
// Phase 3 spec: bell ring, hit thuds, rope twangs, crowd reactions,
// finisher fanfare. We expose a single `playFx(name)` helper plus a
// suspended-context guard so the first user gesture can resume audio.

type FxName =
  | "bell"
  | "hit_jab" | "hit_cross" | "hit_hook" | "hit_uppercut"
  | "thud_grapple" | "rope_twang"
  | "crowd_cheer" | "crowd_boo"
  | "ko_fanfare" | "finisher_fanfare"
  | "pin_count" | "kickout"
  | "round_chime";

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    // Vite/TS thinks webkitAudioContext is non-standard but Safari needs it.
    const Ctor: typeof AudioContext = (window.AudioContext
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? (window as any).webkitAudioContext);
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Mobile Safari + iPad: AudioContext starts suspended. Call from a gesture
 *  (button click) to unlock — wired from VersusHub's "PLAY" CTA. */
export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

export function setMuted(m: boolean): void { muted = m; }
export function isMuted(): boolean { return muted; }

function envOsc(c: AudioContext, opts: {
  freq: number; type?: OscillatorType; durMs: number;
  startGain?: number; peakGain?: number;
  freqEndMul?: number; // pitch sweep — end freq = freq * this
  delayMs?: number;
}): void {
  const startGain = opts.startGain ?? 0;
  const peakGain  = opts.peakGain  ?? 0.25;
  const t0 = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const t1 = t0 + opts.durMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEndMul) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freq * opts.freqEndMul), t1);
  }
  gain.gain.setValueAtTime(startGain, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function noiseBurst(c: AudioContext, opts: { durMs: number; peakGain?: number; lpHz?: number; delayMs?: number }): void {
  const t0 = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const durS = opts.durMs / 1000;
  const peak = opts.peakGain ?? 0.2;
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(durS * sr)), sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);
  let last: AudioNode = src;
  if (opts.lpHz) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lpHz;
    src.connect(lp);
    last = lp;
  }
  last.connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + durS + 0.02);
}

export function playFx(name: FxName): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  switch (name) {
    case "bell":
      envOsc(c, { freq: 880, type: "sine",     durMs: 900,  peakGain: 0.30, freqEndMul: 0.85 });
      envOsc(c, { freq: 1320, type: "triangle", durMs: 700,  peakGain: 0.18, freqEndMul: 0.90, delayMs: 30 });
      envOsc(c, { freq: 1760, type: "sine",     durMs: 500,  peakGain: 0.10, freqEndMul: 0.95, delayMs: 60 });
      return;
    case "round_chime":
      envOsc(c, { freq: 1240, type: "sine", durMs: 250, peakGain: 0.22 });
      envOsc(c, { freq: 1860, type: "sine", durMs: 220, peakGain: 0.14, delayMs: 60 });
      return;
    case "hit_jab":
      noiseBurst(c, { durMs: 80,  peakGain: 0.30, lpHz: 1400 });
      envOsc(c,    { freq: 220, type: "square", durMs: 90,  peakGain: 0.18, freqEndMul: 0.7 });
      return;
    case "hit_cross":
      noiseBurst(c, { durMs: 110, peakGain: 0.34, lpHz: 1200 });
      envOsc(c,    { freq: 180, type: "square", durMs: 120, peakGain: 0.22, freqEndMul: 0.6 });
      return;
    case "hit_hook":
      noiseBurst(c, { durMs: 140, peakGain: 0.36, lpHz: 1000 });
      envOsc(c,    { freq: 140, type: "sawtooth", durMs: 160, peakGain: 0.24, freqEndMul: 0.55 });
      return;
    case "hit_uppercut":
      noiseBurst(c, { durMs: 160, peakGain: 0.38, lpHz: 900 });
      envOsc(c,    { freq: 110, type: "sawtooth", durMs: 200, peakGain: 0.28, freqEndMul: 0.5 });
      return;
    case "thud_grapple":
      noiseBurst(c, { durMs: 220, peakGain: 0.40, lpHz: 600 });
      envOsc(c,    { freq:  90, type: "sawtooth", durMs: 250, peakGain: 0.32, freqEndMul: 0.5 });
      return;
    case "rope_twang":
      envOsc(c, { freq: 320, type: "sawtooth", durMs: 280, peakGain: 0.22, freqEndMul: 1.5 });
      envOsc(c, { freq: 480, type: "triangle", durMs: 220, peakGain: 0.14, freqEndMul: 1.3, delayMs: 40 });
      return;
    case "crowd_cheer":
      noiseBurst(c, { durMs: 1100, peakGain: 0.22, lpHz: 2400 });
      noiseBurst(c, { durMs:  900, peakGain: 0.18, lpHz: 1600, delayMs: 100 });
      return;
    case "crowd_boo":
      noiseBurst(c, { durMs: 900, peakGain: 0.20, lpHz: 700 });
      envOsc(c,    { freq: 140, type: "sawtooth", durMs: 900, peakGain: 0.10, freqEndMul: 0.9 });
      return;
    case "ko_fanfare":
      [523, 659, 784, 1046].forEach((f, i) =>
        envOsc(c, { freq: f, type: "triangle", durMs: 260, peakGain: 0.30, delayMs: i * 110 })
      );
      envOsc(c, { freq: 1568, type: "sine", durMs: 600, peakGain: 0.18, delayMs: 440 });
      return;
    case "finisher_fanfare":
      // Bigger, longer arpeggio + low brass thump
      [392, 494, 587, 784, 988].forEach((f, i) =>
        envOsc(c, { freq: f, type: "triangle", durMs: 240, peakGain: 0.32, delayMs: i * 90 })
      );
      envOsc(c, { freq: 110, type: "sawtooth", durMs: 700, peakGain: 0.28, freqEndMul: 0.9, delayMs: 200 });
      envOsc(c, { freq: 1176, type: "sine",    durMs: 700, peakGain: 0.20, delayMs: 460 });
      return;
    case "pin_count":
      envOsc(c, { freq: 620, type: "sine",   durMs: 180, peakGain: 0.34 });
      envOsc(c, { freq: 200, type: "square", durMs: 100, peakGain: 0.18, delayMs: 10 });
      return;
    case "kickout":
      noiseBurst(c, { durMs: 240, peakGain: 0.30, lpHz: 1800 });
      envOsc(c,    { freq: 700, type: "triangle", durMs: 240, peakGain: 0.22, freqEndMul: 2.0 });
      return;
  }
}
