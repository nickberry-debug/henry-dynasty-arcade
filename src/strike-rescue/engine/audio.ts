// Strike Rescue — Web Audio synth.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let unlocked = false;
let muted = false;
let volume = 0.8;

export function unlockAudio() {
  if (unlocked) return;
  try {
    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    unlocked = true;
  } catch { /* ignore */ }
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
}
export function getVolume(): number { return volume; }
export function setMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
}
export function isMuted(): boolean { return muted; }

function envelope(node: GainNode, attack = 0.005, decay = 0.1, sustain = 0.0, peak = 1.0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  node.gain.cancelScheduledValues(t);
  node.gain.setValueAtTime(0, t);
  node.gain.linearRampToValueAtTime(peak, t + attack);
  node.gain.linearRampToValueAtTime(sustain, t + attack + decay);
}

export function sfxGun() {
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(420, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.06);
  envelope(g, 0.002, 0.06, 0, 0.18);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.08);

  const buf = ctx.createBuffer(1, 512, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const ns = ctx.createBufferSource();
  ns.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.value = 0.12;
  ns.connect(ng); ng.connect(masterGain);
  ns.start();
}

export function sfxGrenadeThrow() {
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
  envelope(g, 0.005, 0.18, 0, 0.22);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.2);
}

export function sfxExplosion() {
  if (!ctx || !masterGain) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
  }
  const ns = ctx.createBufferSource();
  ns.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.value = 0.45;
  ns.connect(ng); ng.connect(masterGain);
  ns.start();

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
  const g = ctx.createGain();
  envelope(g, 0.005, 0.5, 0, 0.3);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.55);
}

export function sfxHit() {
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.07);
  envelope(g, 0.001, 0.07, 0, 0.14);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.09);
}

export function sfxPickup() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  const notes = [660, 880];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0 + i * 0.08);
    g.gain.setValueAtTime(0, t0 + i * 0.08);
    g.gain.linearRampToValueAtTime(0.18, t0 + i * 0.08 + 0.01);
    g.gain.linearRampToValueAtTime(0, t0 + i * 0.08 + 0.18);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t0 + i * 0.08);
    osc.stop(t0 + i * 0.08 + 0.2);
  });
}

export function sfxPowRescued() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0 + i * 0.1);
    g.gain.setValueAtTime(0, t0 + i * 0.1);
    g.gain.linearRampToValueAtTime(0.22, t0 + i * 0.1 + 0.01);
    g.gain.linearRampToValueAtTime(0, t0 + i * 0.1 + 0.24);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t0 + i * 0.1);
    osc.stop(t0 + i * 0.1 + 0.3);
  });
}

export function sfxVictory() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  const chord = [392, 494, 587, 784];
  chord.forEach((freq) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.linearRampToValueAtTime(freq * 1.5, t0 + 0.8);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.linearRampToValueAtTime(0, t0 + 0.9);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t0); osc.stop(t0 + 0.95);
  });
}

export function sfxPauseBlip() {
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(540, ctx.currentTime);
  envelope(g, 0.005, 0.1, 0, 0.18);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.12);
}

let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
export function startEngine() {
  if (!ctx || !masterGain || engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineGain = ctx.createGain();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.setValueAtTime(55, ctx.currentTime);
  engineGain.gain.value = 0.04;
  engineOsc.connect(engineGain);
  engineGain.connect(masterGain);
  engineOsc.start();
}
export function setEngineRpm(rpm01: number) {
  if (!ctx || !engineOsc) return;
  const f = 50 + rpm01 * 65;
  engineOsc.frequency.linearRampToValueAtTime(f, ctx.currentTime + 0.05);
}
export function stopEngine() {
  if (!engineOsc) return;
  try { engineOsc.stop(); } catch { /* ignore */ }
  engineOsc.disconnect();
  engineGain?.disconnect();
  engineOsc = null;
  engineGain = null;
}

let bossTimer: number | null = null;
export function startBossMusic() {
  if (!ctx || !masterGain || bossTimer != null) return;
  const beat = 0.32;
  const riff = [110, 110, 165, 110, 196, 165, 130, 110];
  let step = 0;
  const play = () => {
    if (!ctx || !masterGain) return;
    const freq = riff[step % riff.length];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + beat * 0.9);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + beat);
    step++;
  };
  bossTimer = window.setInterval(play, beat * 1000);
}
export function stopBossMusic() {
  if (bossTimer != null) clearInterval(bossTimer);
  bossTimer = null;
}
