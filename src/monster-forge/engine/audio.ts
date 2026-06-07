// Monster Forge - Phase 5 Web Audio synth roars + mute toggle.
//
// One AudioContext shared per session. roarFor(bodyType) plays a synthesized
// growl/chirp/whoosh sized to the body archetype. mute() flag is persisted
// in localStorage and respected by all play calls.

import type { BodyType } from "../partsManifest";

const MUTE_KEY = "henry-monster-forge-muted-v1";

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    _ctx = new Ctor();
    return _ctx;
  } catch { return null; }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(v: boolean): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* */ }
}

interface RoarShape {
  type: OscillatorType;
  startFreq: number; endFreq: number;
  duration: number;
  noise?: boolean;       // mix in band-passed noise
  noiseFilterHz?: number;
}

const BRUTE_BODIES: BodyType[] = ["biped"];        // overridden below for specific ids
const TINY_KEYS = ["frog","mushnub","green_blob"];
const BRUTE_KEYS = ["demon","giant","green_spiky_blob","yeti","dino"];
const FLOAT_KEYS = ["ghost"];

function shapeFor(bodyType: BodyType, bodyId: string): RoarShape {
  if (TINY_KEYS.includes(bodyId)) {
    return { type: "square", startFreq: 800, endFreq: 1400, duration: 0.18 };
  }
  if (BRUTE_KEYS.includes(bodyId)) {
    return { type: "sawtooth", startFreq: 80, endFreq: 50, duration: 0.45, noise: true, noiseFilterHz: 400 };
  }
  if (FLOAT_KEYS.includes(bodyId)) {
    return { type: "sine", startFreq: 220, endFreq: 110, duration: 0.55, noise: true, noiseFilterHz: 1200 };
  }
  if (bodyType === "winged") return { type: "triangle", startFreq: 200, endFreq: 320, duration: 0.4, noise: true, noiseFilterHz: 1800 };
  if (bodyType === "quadruped") return { type: "sawtooth", startFreq: 180, endFreq: 110, duration: 0.32 };
  if (bodyType === "serpentine") return { type: "triangle", startFreq: 280, endFreq: 200, duration: 0.32 };
  if (bodyType === "floating") return { type: "sine", startFreq: 220, endFreq: 110, duration: 0.5, noise: true, noiseFilterHz: 1200 };
  // Default biped roar
  return { type: "sawtooth", startFreq: 200, endFreq: 130, duration: 0.35 };
}

/** Play a synth roar for the given body. Respects mute. */
export function roarFor(bodyType: BodyType, bodyId: string): void {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const shape = shapeFor(bodyType, bodyId);
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = shape.type;
    osc.frequency.setValueAtTime(shape.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, shape.endFreq), now + shape.duration);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + shape.duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + shape.duration + 0.05);

    if (shape.noise) {
      const bufferSize = Math.floor(ac.sampleRate * shape.duration);
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ac.createBufferSource();
      noise.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = shape.noiseFilterHz ?? 800;
      filter.Q.value = 4;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.001, now);
      ng.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
      ng.gain.exponentialRampToValueAtTime(0.001, now + shape.duration);
      noise.connect(filter).connect(ng).connect(ac.destination);
      noise.start(now);
      noise.stop(now + shape.duration + 0.05);
    }
  } catch { /* audio failure should never break the UI */ }
}

void BRUTE_BODIES; // kept for symmetry; future BodyType keys
