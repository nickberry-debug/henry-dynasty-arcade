// JuiceKit — the "game feel" layer shared by every action game.
// Pure DOM/RAF, no assets. Hit-stop, screen shake, flash, squash/
// stretch helpers, camera punch. Honors prefers-reduced-motion via the
// global MotionConfig (these are imperative, so we also check directly).

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Brief global time-freeze. Returns a promise that resolves after the
 *  freeze. Callers can `await hitStop(80)` between landing a hit and
 *  applying knockback for that satisfying crunch. */
export function hitStop(ms = 70): Promise<void> {
  if (reduceMotion()) return Promise.resolve();
  return new Promise(res => setTimeout(res, ms));
}

/** Screen shake on a target element. Intensity scales with `power`
 *  (0..1). Auto-cleans the transform after. */
export function screenShake(el: HTMLElement | null, power = 0.5, durationMs = 260): void {
  if (!el || reduceMotion()) return;
  const mag = 2 + power * 10;
  const start = performance.now();
  const baseTransform = el.style.transform || "";
  function frame(now: number) {
    const t = (now - start) / durationMs;
    if (t >= 1) { el!.style.transform = baseTransform; return; }
    const decay = 1 - t;
    const dx = (Math.random() * 2 - 1) * mag * decay;
    const dy = (Math.random() * 2 - 1) * mag * decay;
    el!.style.transform = `${baseTransform} translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** White (or colored) full-element flash overlay. Appends a div, fades
 *  it out, removes it. */
export function flash(el: HTMLElement | null, color = "rgba(255,255,255,0.85)", durationMs = 180): void {
  if (!el || reduceMotion()) return;
  const overlay = document.createElement("div");
  overlay.style.cssText = `position:absolute;inset:0;background:${color};pointer-events:none;z-index:50;opacity:1;transition:opacity ${durationMs}ms ease-out;border-radius:inherit;`;
  const prevPosition = getComputedStyle(el).position;
  if (prevPosition === "static") el.style.position = "relative";
  el.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = "0"; });
  setTimeout(() => overlay.remove(), durationMs + 40);
}

/** Squash/stretch keyframe on a sprite element — used on jump/land/hit. */
export function squashStretch(el: HTMLElement | null, axis: "squash" | "stretch" = "squash"): void {
  if (!el || reduceMotion()) return;
  const from = axis === "squash" ? "scale(1.18, 0.82)" : "scale(0.82, 1.18)";
  el.style.transition = "transform 90ms ease-out";
  el.style.transform = from;
  setTimeout(() => {
    el.style.transition = "transform 140ms cubic-bezier(.34,1.56,.64,1)";
    el.style.transform = "scale(1,1)";
  }, 90);
}

/** Camera punch — a quick zoom-in/out pulse on a container (the
 *  "viewport"). Good on heavy hits / home runs / touchdowns. */
export function cameraPunch(el: HTMLElement | null, amount = 0.06, durationMs = 220): void {
  if (!el || reduceMotion()) return;
  el.style.transition = `transform ${durationMs / 2}ms ease-out`;
  el.style.transform = `scale(${1 + amount})`;
  setTimeout(() => {
    el.style.transition = `transform ${durationMs / 2}ms ease-in`;
    el.style.transform = "scale(1)";
  }, durationMs / 2);
}

/** Convenience: the full "big hit" combo — flash + shake + camera punch
 *  + hit-stop, scaled by power. Returns the hit-stop promise. */
export async function bigHit(opts: {
  scene: HTMLElement | null;
  viewport?: HTMLElement | null;
  power?: number;          // 0..1
  flashColor?: string;
}): Promise<void> {
  const { scene, viewport, power = 0.7, flashColor } = opts;
  flash(scene, flashColor);
  screenShake(scene, power);
  if (viewport) cameraPunch(viewport, 0.04 + power * 0.05);
  return hitStop(50 + power * 90);
}
