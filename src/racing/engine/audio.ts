// Turbo Racers -- thin audio wrapper. Lazy-loaded, single-instance per cue.
// Plays the Kenney voiceover countdown + boost + crash + engine loop.

const CACHE = new Map<string, HTMLAudioElement>();

function get(path: string, opts?: { loop?: boolean; volume?: number }): HTMLAudioElement {
  let a = CACHE.get(path);
  if (!a) {
    a = new Audio(path);
    a.preload = "auto";
    if (opts?.loop) a.loop = true;
    if (opts?.volume != null) a.volume = opts.volume;
    CACHE.set(path, a);
  }
  return a;
}

/** Mobile browsers gate audio behind a user gesture. Call from a button handler. */
export function unlockAudio(): void {
  // Touch every cue so subsequent .play() calls work mid-frame.
  ["/assets/racing/audio/vo_ready.ogg",
   "/assets/racing/audio/vo_go.ogg",
   "/assets/racing/audio/engine_loop.ogg",
   "/assets/racing/audio/boost.ogg",
   "/assets/racing/audio/crash.ogg"].forEach(p => {
    const a = get(p);
    a.muted = true;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
  });
}

export function playVo(name: "1" | "2" | "3" | "ready" | "go" | "congratulations" | "final_round" | "hurry_up"): void {
  const a = get(`/assets/racing/audio/vo_${name}.ogg`, { volume: 0.85 });
  try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
}

export function playBoost(): void {
  const a = get("/assets/racing/audio/boost.ogg", { volume: 0.6 });
  try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
}

export function playCrash(): void {
  const a = get("/assets/racing/audio/crash.ogg", { volume: 0.7 });
  try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
}

let engineA: HTMLAudioElement | null = null;
export function startEngine(): void {
  if (engineA) return;
  engineA = get("/assets/racing/audio/engine_loop.ogg", { loop: true, volume: 0.18 });
  try { engineA.play().catch(() => {}); } catch { /* ignore */ }
}
export function stopEngine(): void {
  if (engineA) { try { engineA.pause(); } catch { /* ignore */ } engineA = null; }
}
/** Modulate engine pitch by speed -- 0..1 maps to playbackRate 0.7..1.6. */
export function setEnginePitch(speed01: number): void {
  if (!engineA) return;
  try { engineA.playbackRate = 0.7 + Math.max(0, Math.min(1, speed01)) * 0.9; } catch { /* ignore */ }
}
