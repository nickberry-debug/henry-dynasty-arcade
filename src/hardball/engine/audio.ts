// Hardball — Web Audio synth bus
// Every SFX is generated at runtime. No external assets.
// One AudioContext, lazy created on first user gesture (mobile rule).

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambienceNode: { stop: () => void } | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setMuted(next: boolean): void {
  muted = next;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(next ? 0 : 0.6, ctx.currentTime, 0.05);
  }
}

export function isMuted(): boolean {
  return muted;
}


// ── helpers ────────────────────────────────────────────────────────────
function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function playEnv(node: AudioNode, peak: number, attack: number, decay: number): GainNode {
  const c = ensureCtx()!;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  node.connect(g);
  g.connect(masterGain!);
  return g;
}

// ── BAT CRACK — sharp noise burst + downward sine "thunk" ──────────────
export function batCrack(power = 1): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  // crack = bandpassed noise
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.12);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 4;
  src.connect(bp);
  playEnv(bp, 0.7 * power, 0.001, 0.12);
  src.start(t);
  // thunk = downward sine
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
  playEnv(osc, 0.45 * power, 0.003, 0.18);
  osc.start(t);
  osc.stop(t + 0.22);
}


// ── GLOVE POP — quick low-pass noise burst ─────────────────────────────
export function glovePop(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.08);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  src.connect(lp);
  playEnv(lp, 0.5, 0.001, 0.07);
  src.start(c.currentTime);
}

// ── WHIFF — air-swing whoosh ───────────────────────────────────────────
export function whiff(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.18);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2200, c.currentTime);
  bp.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.18);
  bp.Q.value = 1.5;
  src.connect(bp);
  playEnv(bp, 0.35, 0.002, 0.17);
  src.start(c.currentTime);
}

// ── UMP CALL — short formant-ish vowel burst ───────────────────────────
export function umpCall(kind: "strike" | "ball"): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  const base = kind === "strike" ? 220 : 180;
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.linearRampToValueAtTime(base * 0.85, t + 0.32);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = kind === "strike" ? 900 : 650;
  bp.Q.value = 5;
  osc.connect(bp);
  playEnv(bp, 0.35, 0.01, 0.32);
  osc.start(t);
  osc.stop(t + 0.4);
}


// ── CROWD CHEER — pink-noise swell ─────────────────────────────────────
export function crowdCheer(intensity = 1): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 1.6);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1100;
  src.connect(lp);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.45 * intensity, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
  lp.connect(g);
  g.connect(masterGain!);
  src.start(t);
}

// ── CROWD AMBIENCE — looped low-passed noise murmur ────────────────────
export function startCrowdAmbience(): void {
  const c = ensureCtx(); if (!c) return;
  if (ambienceNode) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 3.0);
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const g = c.createGain();
  g.gain.value = 0.07;
  src.connect(lp);
  lp.connect(g);
  g.connect(masterGain!);
  src.start();
  ambienceNode = { stop: () => { try { src.stop(); } catch {} } };
}

export function stopCrowdAmbience(): void {
  if (ambienceNode) { ambienceNode.stop(); ambienceNode = null; }
}


// ── ORGAN JINGLE — triangle arpeggio for big moments ───────────────────
export function organJingle(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const notes = [392, 523, 659, 784]; // G4 C5 E5 G5
  const t0 = c.currentTime;
  notes.forEach((freq, i) => {
    const t = t0 + i * 0.11;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g);
    g.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// ── PITCH WHOOSH — quick pitched whoosh as ball leaves hand ─────────────
export function pitchWhoosh(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.18);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.18);
  bp.Q.value = 2;
  src.connect(bp);
  playEnv(bp, 0.18, 0.002, 0.16);
  src.start(t);
}

// ── UI CLICK — generic tap feedback ────────────────────────────────────
export function uiClick(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.value = 540;
  playEnv(osc, 0.15, 0.001, 0.05);
  osc.start();
  osc.stop(c.currentTime + 0.06);
}


// =====================================================================
// PHASE 2 audio additions (walk-up jingles, K-call, win fanfare, steal)
// =====================================================================

function _tone(freq: number, type: OscillatorType, dur: number, t: number, peak = 0.18) {
  const c = ensureCtx(); if (!c) return;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(masterGain!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function walkUp(key: string): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t0 = c.currentTime;
  switch (key) {
    case "bear_growl":
      _tone(140, "sawtooth", 0.4, t0, 0.3);
      _tone(100, "sawtooth", 0.5, t0 + 0.15, 0.25);
      break;
    case "thunder_clap": {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 0.8);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 250;
      src.connect(lp);
      const g = c.createGain();
      g.gain.setValueAtTime(0.4, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
      lp.connect(g); g.connect(masterGain!);
      src.start(t0);
      break;
    }
    case "wave_swell":
      _tone(280, "sine", 0.3, t0, 0.2);
      _tone(330, "sine", 0.3, t0 + 0.18, 0.18);
      _tone(440, "sine", 0.4, t0 + 0.35, 0.16);
      break;
    case "rome_brass":
      _tone(196, "sawtooth", 0.18, t0, 0.22);
      _tone(262, "sawtooth", 0.18, t0 + 0.18, 0.22);
      _tone(330, "sawtooth", 0.3, t0 + 0.36, 0.22);
      break;
    case "unicorn_chime":
      _tone(659, "triangle", 0.18, t0, 0.18);
      _tone(880, "triangle", 0.18, t0 + 0.15, 0.18);
      _tone(1175, "triangle", 0.3, t0 + 0.3, 0.16);
      break;
    default:
      organJingle();
  }
}

export function strikeoutCall(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.linearRampToValueAtTime(80, t + 0.55);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1100;
  bp.Q.value = 8;
  osc.connect(bp);
  playEnv(bp, 0.55, 0.005, 0.55);
  osc.start(t);
  osc.stop(t + 0.6);
}

export function winFanfare(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t0 = c.currentTime;
  const notes = [392, 523, 659, 784, 1047];
  notes.forEach((freq, i) => _tone(freq, "triangle", 0.32, t0 + i * 0.12, 0.25));
  setTimeout(() => crowdCheer(1.4), 150);
}

export function stealWhistle(): void {
  const c = ensureCtx(); if (!c || muted) return;
  const t = c.currentTime;
  _tone(900, "square", 0.12, t, 0.22);
  _tone(1300, "square", 0.12, t + 0.08, 0.22);
}
