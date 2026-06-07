// Battler sprite manifest — LuizMelo battlers.

export type EnemySpriteId = "goblin" | "mushroom" | "skeleton" | "flying_eye";
export type BattlerId = "hero" | EnemySpriteId;

export type AnimName = "Idle" | "Run" | "Walk" | "Attack" | "Attack2" | "TakeHit" | "Death";

export interface AnimDef {
  src: string;
  frames: number;
  frameW: number;
  frameH: number;
  fps: number;
  hold?: boolean;
}

export interface BattlerSheet {
  frameW: number;
  frameH: number;
  renderScale: number;
  feetOffset: { x: number; y: number };
  facesRight: boolean;
  anims: Partial<Record<AnimName, AnimDef>>;
}

export const SHEETS: Record<BattlerId, BattlerSheet> = {
  hero: {
    frameW: 200, frameH: 200, renderScale: 1.0,
    feetOffset: { x: 0, y: 0 },
    facesRight: true,
    anims: {
      Idle:    { src: "/assets/jrpg/battlers/hero/Idle.png",    frames: 8, frameW: 200, frameH: 200, fps: 8 },
      Run:     { src: "/assets/jrpg/battlers/hero/Run.png",     frames: 8, frameW: 200, frameH: 200, fps: 12 },
      Attack:  { src: "/assets/jrpg/battlers/hero/Attack.png",  frames: 6, frameW: 200, frameH: 200, fps: 14 },
      Attack2: { src: "/assets/jrpg/battlers/hero/Attack2.png", frames: 6, frameW: 200, frameH: 200, fps: 14 },
      TakeHit: { src: "/assets/jrpg/battlers/hero/TakeHit.png", frames: 4, frameW: 200, frameH: 200, fps: 10 },
      Death:   { src: "/assets/jrpg/battlers/hero/Death.png",   frames: 6, frameW: 200, frameH: 200, fps: 8, hold: true },
    },
  },
  goblin: {
    frameW: 150, frameH: 150, renderScale: 1.4,
    feetOffset: { x: 0, y: 0 },
    facesRight: true,
    anims: {
      Idle:    { src: "/assets/jrpg/battlers/enemies/goblin/Idle.png",    frames: 4, frameW: 150, frameH: 150, fps: 8 },
      Run:     { src: "/assets/jrpg/battlers/enemies/goblin/Run.png",     frames: 8, frameW: 150, frameH: 150, fps: 12 },
      Attack:  { src: "/assets/jrpg/battlers/enemies/goblin/Attack.png",  frames: 8, frameW: 150, frameH: 150, fps: 14 },
      TakeHit: { src: "/assets/jrpg/battlers/enemies/goblin/TakeHit.png", frames: 4, frameW: 150, frameH: 150, fps: 10 },
      Death:   { src: "/assets/jrpg/battlers/enemies/goblin/Death.png",   frames: 4, frameW: 150, frameH: 150, fps: 8, hold: true },
    },
  },
  mushroom: {
    frameW: 150, frameH: 150, renderScale: 1.4,
    feetOffset: { x: 0, y: 0 },
    facesRight: true,
    anims: {
      Idle:    { src: "/assets/jrpg/battlers/enemies/mushroom/Idle.png",    frames: 4, frameW: 150, frameH: 150, fps: 8 },
      Run:     { src: "/assets/jrpg/battlers/enemies/mushroom/Run.png",     frames: 8, frameW: 150, frameH: 150, fps: 12 },
      Attack:  { src: "/assets/jrpg/battlers/enemies/mushroom/Attack.png",  frames: 8, frameW: 150, frameH: 150, fps: 14 },
      TakeHit: { src: "/assets/jrpg/battlers/enemies/mushroom/TakeHit.png", frames: 4, frameW: 150, frameH: 150, fps: 10 },
      Death:   { src: "/assets/jrpg/battlers/enemies/mushroom/Death.png",   frames: 4, frameW: 150, frameH: 150, fps: 8, hold: true },
    },
  },
  skeleton: {
    frameW: 150, frameH: 150, renderScale: 1.4,
    feetOffset: { x: 0, y: 0 },
    facesRight: true,
    anims: {
      Idle:    { src: "/assets/jrpg/battlers/enemies/skeleton/Idle.png",    frames: 4, frameW: 150, frameH: 150, fps: 8 },
      Walk:    { src: "/assets/jrpg/battlers/enemies/skeleton/Walk.png",    frames: 4, frameW: 150, frameH: 150, fps: 10 },
      Attack:  { src: "/assets/jrpg/battlers/enemies/skeleton/Attack.png",  frames: 8, frameW: 150, frameH: 150, fps: 14 },
      TakeHit: { src: "/assets/jrpg/battlers/enemies/skeleton/TakeHit.png", frames: 4, frameW: 150, frameH: 150, fps: 10 },
      Death:   { src: "/assets/jrpg/battlers/enemies/skeleton/Death.png",   frames: 4, frameW: 150, frameH: 150, fps: 8, hold: true },
    },
  },
  flying_eye: {
    frameW: 150, frameH: 150, renderScale: 1.4,
    feetOffset: { x: 0, y: -10 },
    facesRight: true,
    anims: {
      Idle:    { src: "/assets/jrpg/battlers/enemies/flying_eye/Idle.png",    frames: 8, frameW: 150, frameH: 150, fps: 10 },
      Attack:  { src: "/assets/jrpg/battlers/enemies/flying_eye/Attack.png",  frames: 8, frameW: 150, frameH: 150, fps: 14 },
      TakeHit: { src: "/assets/jrpg/battlers/enemies/flying_eye/TakeHit.png", frames: 4, frameW: 150, frameH: 150, fps: 10 },
      Death:   { src: "/assets/jrpg/battlers/enemies/flying_eye/Death.png",   frames: 4, frameW: 150, frameH: 150, fps: 8, hold: true },
    },
  },
};

const imgCache = new Map<string, HTMLImageElement>();
const loading = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imgCache.get(src);
  if (cached) return Promise.resolve(cached);
  const inflight = loading.get(src);
  if (inflight) return inflight;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgCache.set(src, img); loading.delete(src); resolve(img); };
    img.onerror = (e) => { loading.delete(src); reject(e); };
    img.src = src;
  });
  loading.set(src, p);
  return p;
}

export function preloadBattler(id: BattlerId): Promise<void> {
  const sheet = SHEETS[id];
  return Promise.all(
    Object.values(sheet.anims).filter((a): a is AnimDef => !!a).map(a => loadImage(a.src))
  ).then(() => undefined);
}
