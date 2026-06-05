// AudioLibrary — shared audio system for the whole arcade.
//
// Wraps the Web Audio API with a simple play-by-key API backed by a
// registry of Kenney CC0 sound files vendored under /public/assets/
// kenney/. Auto-creates the AudioContext lazily (with .resume() because
// iOS Safari starts it suspended — same fix as the Quiet Game). Buffers
// are fetched + decoded once and cached. Volume + mute persist per
// profile via the existing localStorage pattern.
//
// Usage:
//   import { playSfx, playMusic, stopMusic, setMuted, isMuted } from "../art/AudioLibrary";
//   playSfx("explosion");
//   playSfx("laser", { volume: 0.5 });
//   playMusic("victory");
//
// Add a new sound: drop a new entry in SOUNDS below pointing at any
// .ogg/.wav under /public/assets/. No other wiring needed.

const STORE_KEY = "arcade_audio_v1";

// ── Sound registry — logical name → URL ───────────────────────────────
//
// All paths are under /public/assets/kenney/<pack>/ — drop-in CC0.

const K = "/assets/kenney";

export type SfxKey =
  // Combat / impact
  | "explosion" | "explosionBig" | "impactHit" | "impactSoft" | "impactMetal"
  | "metalBell" | "shellHit" | "playerHurt"
  // Weapons
  | "shellFire" | "laserSmall" | "laserBig" | "laserRetro" | "rocketLaunch" | "missilePop" | "zap"
  // Sci-fi
  | "engineLow" | "engineHigh" | "computerBlip" | "powerUp"
  // UI / arcade
  | "click" | "blip" | "confirm" | "denied" | "coin" | "pop" | "ding" | "fizz" | "whoosh"
  // Card Clash
  | "cardFlip" | "cardReveal" | "cardPlay"
  // Math / educational
  | "correct" | "wrong" | "streak"
  // Sport / cheer
  | "crowdCheer" | "whistle" | "buzzer"
  // Voice
  | "voCountdown3" | "voCountdown2" | "voCountdown1" | "voGo" | "voCorrect" | "voWrong"
  | "voGameOver" | "voYouWin" | "voYouLose" | "voReady" | "voSet" | "voLevelUp" | "voTie";

export type MusicKey = "victory" | "defeat" | "jingleHype" | "jingleChill" | "jingleSax";

interface SoundDef { url: string; gain?: number; }

const SOUNDS: Record<SfxKey, SoundDef> = {
  // Combat / impact (Kenney impact-sounds — heavy/medium/light variants)
  explosion:    { url: `${K}/sci-fi-sounds/Audio/lowFrequency_explosion_000.ogg`, gain: 0.9 },
  explosionBig: { url: `${K}/sci-fi-sounds/Audio/lowFrequency_explosion_000.ogg`, gain: 1.1 },
  impactHit:    { url: `${K}/impact-sounds/Audio/impactGeneric_medium_000.ogg`,    gain: 0.8 },
  impactSoft:   { url: `${K}/impact-sounds/Audio/impactSoft_medium_000.ogg`,        gain: 0.7 },
  impactMetal:  { url: `${K}/impact-sounds/Audio/impactMetal_light_000.ogg`,        gain: 0.8 },
  metalBell:    { url: `${K}/impact-sounds/Audio/impactBell_heavy_000.ogg`,         gain: 0.7 },
  shellHit:     { url: `${K}/impact-sounds/Audio/impactPlate_medium_000.ogg`,       gain: 0.9 },
  playerHurt:   { url: `${K}/impact-sounds/Audio/impactBell_heavy_001.ogg`,         gain: 0.7 },
  // Weapons
  shellFire:    { url: `${K}/sci-fi-sounds/Audio/laserLarge_003.ogg`,                gain: 0.7 },
  laserSmall:   { url: `${K}/digital-audio/Audio/laser2.ogg`,                       gain: 0.55 },
  laserBig:     { url: `${K}/sci-fi-sounds/Audio/laserLarge_000.ogg`,                gain: 0.75 },
  laserRetro:   { url: `${K}/sci-fi-sounds/Audio/laserRetro_000.ogg`,                gain: 0.6 },
  rocketLaunch: { url: `${K}/sci-fi-sounds/Audio/spaceEngine_003.ogg`,               gain: 0.7 },
  missilePop:   { url: `${K}/digital-audio/Audio/phaseJump3.ogg`,                   gain: 0.6 },
  zap:          { url: `${K}/digital-audio/Audio/zapThreeToneUp.ogg`,               gain: 0.6 },
  // Sci-fi
  engineLow:    { url: `${K}/sci-fi-sounds/Audio/spaceEngineSmall_003.ogg`,         gain: 0.5 },
  engineHigh:   { url: `${K}/sci-fi-sounds/Audio/engineCircular_002.ogg`,           gain: 0.5 },
  computerBlip: { url: `${K}/sci-fi-sounds/Audio/computerNoise_002.ogg`,            gain: 0.6 },
  powerUp:      { url: `${K}/digital-audio/Audio/powerUp10.ogg`,                    gain: 0.7 },
  // UI / arcade
  click:        { url: `${K}/digital-audio/Audio/pepSound1.ogg`,                    gain: 0.55 },
  blip:         { url: `${K}/digital-audio/Audio/pepSound1.ogg`,                    gain: 0.5 },
  confirm:      { url: `${K}/digital-audio/Audio/powerUp10.ogg`,                    gain: 0.55 },
  denied:       { url: `${K}/digital-audio/Audio/spaceTrash3.ogg`,                  gain: 0.5 },
  coin:         { url: `${K}/digital-audio/Audio/pepSound1.ogg`,                    gain: 0.55 },
  pop:          { url: `${K}/digital-audio/Audio/phaseJump3.ogg`,                   gain: 0.5 },
  ding:         { url: `${K}/digital-audio/Audio/zapThreeToneUp.ogg`,               gain: 0.55 },
  fizz:         { url: `${K}/digital-audio/Audio/spaceTrash3.ogg`,                  gain: 0.5 },
  whoosh:       { url: `${K}/digital-audio/Audio/phaseJump5.ogg`,                   gain: 0.55 },
  // Card Clash
  cardFlip:     { url: `${K}/digital-audio/Audio/phaseJump3.ogg`,                   gain: 0.55 },
  cardReveal:   { url: `${K}/digital-audio/Audio/zapThreeToneUp.ogg`,               gain: 0.6 },
  cardPlay:     { url: `${K}/digital-audio/Audio/pepSound1.ogg`,                    gain: 0.55 },
  // Math / educational
  correct:      { url: `${K}/voiceover-pack/Male/correct.ogg`,                      gain: 0.85 },
  wrong:        { url: `${K}/voiceover-pack/Male/wrong.ogg`,                        gain: 0.7 },
  streak:       { url: `${K}/digital-audio/Audio/powerUp10.ogg`,                    gain: 0.6 },
  // Sport / cheer
  crowdCheer:   { url: `${K}/music-jingles/Preview.ogg`,                            gain: 0.5 }, // best stand-in
  whistle:      { url: `${K}/digital-audio/Audio/zapThreeToneUp.ogg`,               gain: 0.55 },
  buzzer:       { url: `${K}/sci-fi-sounds/Audio/computerNoise_002.ogg`,            gain: 0.6 },
  // Voice (Kenney voiceover-pack — male variant for crispness; arcade-neutral)
  voCountdown3: { url: `${K}/voiceover-pack/Male/3.ogg`,                            gain: 0.9 },
  voCountdown2: { url: `${K}/voiceover-pack/Male/2.ogg`,                            gain: 0.9 },
  voCountdown1: { url: `${K}/voiceover-pack/Male/1.ogg`,                            gain: 0.9 },
  voGo:         { url: `${K}/voiceover-pack/Male/go.ogg`,                           gain: 0.95 },
  voCorrect:    { url: `${K}/voiceover-pack/Male/correct.ogg`,                      gain: 0.9 },
  voWrong:      { url: `${K}/voiceover-pack/Male/wrong.ogg`,                        gain: 0.85 },
  voGameOver:   { url: `${K}/voiceover-pack/Male/game_over.ogg`,                    gain: 0.9 },
  voYouWin:     { url: `${K}/voiceover-pack/Male/you_win.ogg`,                      gain: 0.95 },
  voYouLose:    { url: `${K}/voiceover-pack/Male/you_lose.ogg`,                     gain: 0.85 },
  voReady:      { url: `${K}/voiceover-pack/Male/ready.ogg`,                        gain: 0.9 },
  voSet:        { url: `${K}/voiceover-pack/Male/set.ogg`,                          gain: 0.9 },
  voLevelUp:    { url: `${K}/voiceover-pack/Male/level_up.ogg`,                     gain: 0.95 },
  voTie:        { url: `${K}/voiceover-pack/Male/its_a_tie.ogg`,                    gain: 0.85 },
};

const MUSIC: Record<MusicKey, SoundDef> = {
  victory:    { url: `${K}/music-jingles/Audio/Sax jingles/jingles_SAX00.ogg`, gain: 0.55 },
  defeat:     { url: `${K}/music-jingles/Audio/Sax jingles/jingles_SAX04.ogg`, gain: 0.45 },
  jingleHype: { url: `${K}/music-jingles/Audio/Sax jingles/jingles_SAX06.ogg`, gain: 0.5 },
  jingleChill:{ url: `${K}/music-jingles/Audio/Sax jingles/jingles_SAX10.ogg`, gain: 0.5 },
  jingleSax:  { url: `${K}/music-jingles/Audio/Sax jingles/jingles_SAX08.ogg`, gain: 0.5 },
};

// ── State ─────────────────────────────────────────────────────────────

interface AudioState {
  muted: boolean;
  master: number; // 0..1
  sfx: number;    // 0..1
  music: number;  // 0..1
}

function loadState(): AudioState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { muted: false, master: 0.7, sfx: 0.8, music: 0.5, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { muted: false, master: 0.7, sfx: 0.8, music: 0.5 };
}
function persistState(s: AudioState) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let state = loadState();
let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
const failed = new Set<string>();   // urls we've failed to load — never retry
let currentMusic: { source: AudioBufferSourceNode; gain: GainNode; key: MusicKey } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!AC) return null;
      ctx = new AC();
    } catch { return null; }
  }
  if (ctx.state === "suspended") {
    // Best-effort resume — must be called from a user gesture on iOS,
    // but if we're already past the first interaction it'll succeed.
    ctx.resume().catch(() => {});
  }
  return ctx;
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (buffers.has(url)) return buffers.get(url)!;
  if (failed.has(url)) return null;
  if (pending.has(url)) return pending.get(url)!;
  const p = (async () => {
    try {
      const ac = getCtx();
      if (!ac) return null;
      const res = await fetch(url);
      if (!res.ok) { failed.add(url); return null; }
      const arr = await res.arrayBuffer();
      const buf = await ac.decodeAudioData(arr);
      buffers.set(url, buf);
      return buf;
    } catch {
      failed.add(url);
      return null;
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, p);
  return p;
}

// ── Public API ────────────────────────────────────────────────────────

export function playSfx(key: SfxKey, opts?: { volume?: number; pitch?: number }): void {
  if (state.muted) return;
  const def = SOUNDS[key];
  if (!def) return;
  const ac = getCtx();
  if (!ac) return;
  void (async () => {
    const buf = await loadBuffer(def.url);
    if (!buf) return;
    try {
      const src = ac.createBufferSource();
      src.buffer = buf;
      if (opts?.pitch) src.playbackRate.value = opts.pitch;
      const g = ac.createGain();
      g.gain.value = state.master * state.sfx * (def.gain ?? 1) * (opts?.volume ?? 1);
      src.connect(g).connect(ac.destination);
      src.start(0);
    } catch { /* ignore */ }
  })();
}

export function playMusic(key: MusicKey, opts?: { loop?: boolean; fadeIn?: number }): void {
  if (state.muted) return;
  const def = MUSIC[key];
  if (!def) return;
  const ac = getCtx();
  if (!ac) return;
  void (async () => {
    const buf = await loadBuffer(def.url);
    if (!buf) return;
    // Fade out + stop previous music if any
    if (currentMusic) {
      try {
        currentMusic.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
        const old = currentMusic;
        setTimeout(() => { try { old.source.stop(); } catch { /* ignore */ } }, 600);
      } catch { /* ignore */ }
    }
    try {
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = opts?.loop ?? true;
      const g = ac.createGain();
      const targetGain = state.master * state.music * (def.gain ?? 1);
      const fadeIn = opts?.fadeIn ?? 0.5;
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(targetGain, ac.currentTime + fadeIn);
      src.connect(g).connect(ac.destination);
      src.start(0);
      currentMusic = { source: src, gain: g, key };
    } catch { /* ignore */ }
  })();
}

export function stopMusic(fadeOut = 0.5): void {
  if (!currentMusic) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    currentMusic.gain.gain.linearRampToValueAtTime(0, ac.currentTime + fadeOut);
    const old = currentMusic;
    setTimeout(() => { try { old.source.stop(); } catch { /* ignore */ } }, fadeOut * 1000 + 100);
    currentMusic = null;
  } catch { /* ignore */ }
}

export function isMuted(): boolean { return state.muted; }
export function setMuted(m: boolean): void {
  state = { ...state, muted: m };
  persistState(state);
  if (m) stopMusic(0.2);
}
export function setVolume(kind: "master" | "sfx" | "music", v: number): void {
  state = { ...state, [kind]: Math.max(0, Math.min(1, v)) };
  persistState(state);
}
export function getAudioState(): Readonly<AudioState> { return state; }

/** Call from any user gesture (button click, key press) to unlock iOS
 *  Safari's autoplay restrictions. Safe to call repeatedly. */
export function unlockAudio(): void {
  const ac = getCtx();
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
}

// Re-load state on profile change so per-profile audio prefs survive.
if (typeof window !== "undefined") {
  window.addEventListener("arcade-active-profile-changed", () => {
    state = loadState();
  });
}
