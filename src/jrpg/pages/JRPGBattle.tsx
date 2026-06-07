// AETHERSONG cinematic battle screen.
// Side-view, ATB-driven. LuizMelo battlers with anime juice.

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loadSave, writeSave } from "../engine/save";
import type { SavePayload, EnemyTemplate } from "../types";
import { SHEETS, loadImage, preloadBattler, type AnimName, type BattlerId, type AnimDef } from "../engine/battlers";
import {
  newBattle, tickAtb, heroAttack, heroUseAbility, heroUseItem, heroFlee, endHeroAction,
  type BattleStateExternal,
} from "../engine/battle";
import { ABILITIES } from "../data/heroes";
import { playTrack, sfxHit, sfxFlare, sfxHeal, sfxLevel, sfxFanfare, sfxTick, stopTrack, isMuted, setMuted } from "../engine/audio";

interface VfxBurst {
  kind: "lantern" | "flare" | "rest";
  x: number;
  y: number;
  age: number;
  ttl: number;
}

interface FloatNum { x: number; y: number; text: string; age: number; ttl: number; color: string; }

interface ActorAnim {
  current: AnimName;
  startedAt: number;
}

export default function JRPGBattle() {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BattleStateExternal | null>(null);
  const saveRef = useRef<SavePayload | null>(null);
  const heroAnimRef = useRef<ActorAnim>({ current: "Idle", startedAt: performance.now() });
  const enemyAnimsRef = useRef<Map<string, ActorAnim>>(new Map());
  const vfxRef = useRef<VfxBurst[]>([]);
  const floatsRef = useRef<FloatNum[]>([]);
  const shakeRef = useRef<number>(0);
  const [, setTick] = useState(0);
  const [showAbilityMenu, setShowAbilityMenu] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState<string | null>(null);
  const [muted, setMutedLocal] = useState(isMuted());
  const [bgReady, setBgReady] = useState(false);
  const bgImgs = useRef<Record<string, HTMLImageElement>>({});
  const [error, setError] = useState<string | null>(null);

  // Boot
  useEffect(() => {
    const save = loadSave();
    if (!save) { nav("/jrpg"); return; }
    saveRef.current = save;
    const rawTemplates = sessionStorage.getItem("aethersong_pending_battle");
    let templates: EnemyTemplate[];
    try {
      templates = rawTemplates ? JSON.parse(rawTemplates) as EnemyTemplate[] : [];
    } catch { templates = []; }
    if (templates.length === 0) { nav("/jrpg/play"); return; }
    const state = newBattle(save.hero, save.inventory, templates);
    stateRef.current = state;
    enemyAnimsRef.current.clear();
    state.enemies.forEach(e => {
      enemyAnimsRef.current.set(e.battleId, { current: "Idle", startedAt: performance.now() });
    });
    // Boss music if applicable
    const isBoss = sessionStorage.getItem("aethersong_is_boss") === "1";
    playTrack(isBoss ? "boss" : "battle");
    if (state.intro) setIntroOpen(state.intro);
    // Preload assets
    const ids: BattlerId[] = ["hero", ...new Set(state.enemies.map(e => e.spriteId))];
    Promise.all([
      ...ids.map(id => preloadBattler(id)),
      loadImage("/assets/jrpg/backgrounds/bg_sky.png").then(i => { bgImgs.current.sky = i; }),
      loadImage("/assets/jrpg/backgrounds/bg_far_mountains.png").then(i => { bgImgs.current.far_mountains = i; }),
      loadImage("/assets/jrpg/backgrounds/bg_mountains.png").then(i => { bgImgs.current.mountains = i; }),
      loadImage("/assets/jrpg/backgrounds/bg_trees.png").then(i => { bgImgs.current.trees = i; }),
      loadImage("/assets/jrpg/backgrounds/bg_far_clouds.png").then(i => { bgImgs.current.far_clouds = i; }),
      loadImage("/assets/jrpg/backgrounds/bg_near_clouds.png").then(i => { bgImgs.current.near_clouds = i; }),
    ]).then(() => setBgReady(true)).catch(err => {
      console.warn("battle preload error", err);
      setBgReady(true); // proceed anyway with placeholders
    });
  }, [nav]);

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d", { alpha: false });
    if (!ctx2d) return;
    ctx2d.imageSmoothingEnabled = false;

    let last = performance.now();
    function resize(): void {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (ctx2d) {
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d.imageSmoothingEnabled = false;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    function step(now: number): void {
      const dt = Math.min(33, now - last) / 1000;
      last = now;
      const state = stateRef.current;
      if (state && !introOpen) {
        // Tick ATB
        const events = tickAtb(state, dt);
        events.forEach(ev => handleEvent(ev, now));
      }
      // Tick vfx + floats
      vfxRef.current = vfxRef.current.filter(v => { v.age += dt; return v.age < v.ttl; });
      floatsRef.current = floatsRef.current.filter(f => { f.age += dt; return f.age < f.ttl; });
      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt * 60);
      // Hero anim transition: Attack -> Idle
      const heroAnim = heroAnimRef.current;
      if (heroAnim.current === "Attack" || heroAnim.current === "Attack2") {
        const def = SHEETS.hero.anims[heroAnim.current];
        if (def && (now - heroAnim.startedAt) > (def.frames / def.fps) * 1000) {
          heroAnim.current = "Idle";
          heroAnim.startedAt = now;
          if (state) endHeroAction(state);
        }
      }
      if (heroAnim.current === "TakeHit") {
        const def = SHEETS.hero.anims.TakeHit;
        if (def && (now - heroAnim.startedAt) > (def.frames / def.fps) * 1000) {
          heroAnim.current = "Idle";
          heroAnim.startedAt = now;
        }
      }
      // Enemy anim transitions
      enemyAnimsRef.current.forEach((anim, id) => {
        const enemy = state?.enemies.find(e => e.battleId === id);
        if (!enemy) return;
        if (enemy.dead && anim.current !== "Death") {
          anim.current = "Death";
          anim.startedAt = now;
          return;
        }
        if (anim.current === "Attack") {
          const sheet = SHEETS[enemy.spriteId];
          const def = sheet.anims.Attack;
          if (def && (now - anim.startedAt) > (def.frames / def.fps) * 1000) {
            anim.current = "Idle";
            anim.startedAt = now;
          }
        }
        if (anim.current === "TakeHit") {
          const sheet = SHEETS[enemy.spriteId];
          const def = sheet.anims.TakeHit;
          if (def && (now - anim.startedAt) > (def.frames / def.fps) * 1000) {
            anim.current = "Idle";
            anim.startedAt = now;
          }
        }
      });
      drawFrame(ctx2d!);
      // tick state component for HUD
      setTick(t => (t + 1) % 1000000);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOpen]);

  const handleEvent = useCallback((ev: { kind: string; text?: string; targetId?: string; amount?: number; actorId?: string }, now: number) => {
    const state = stateRef.current;
    if (!state) return;
    switch (ev.kind) {
      case "hero-attack":
        heroAnimRef.current = { current: "Attack", startedAt: now };
        sfxHit();
        shakeRef.current = 8;
        break;
      case "hero-ability":
        heroAnimRef.current = { current: "Attack2", startedAt: now };
        sfxFlare();
        shakeRef.current = 14;
        if (ev.targetId && ev.targetId !== "hero") {
          const ent = state.enemies.find(e => e.battleId === ev.targetId);
          if (ent) {
            vfxRef.current.push({ kind: "flare", x: getEnemyX(state, ent.battleId), y: getEnemyY(), age: 0, ttl: 0.5 });
          }
        } else if (ev.targetId === "hero") {
          vfxRef.current.push({ kind: "rest", x: getHeroX(), y: getHeroY(), age: 0, ttl: 0.5 });
        }
        break;
      case "hero-item":
        heroAnimRef.current = { current: "Idle", startedAt: now };
        sfxHeal();
        break;
      case "enemy-attack": {
        const ent = state.enemies.find(e => e.battleId === ev.actorId);
        if (ent) {
          const a = enemyAnimsRef.current.get(ent.battleId);
          if (a) { a.current = "Attack"; a.startedAt = now; }
        }
        sfxHit();
        shakeRef.current = 10;
        break;
      }
      case "damage": {
        if (ev.targetId === "hero") {
          heroAnimRef.current = { current: "TakeHit", startedAt: now };
          floatsRef.current.push({ x: getHeroX(), y: getHeroY() - 30, text: "-" + ev.amount, age: 0, ttl: 1.0, color: "#ef4444" });
        } else if (ev.targetId) {
          const ent = state.enemies.find(e => e.battleId === ev.targetId);
          if (ent) {
            const a = enemyAnimsRef.current.get(ent.battleId);
            if (a && !ent.dead) { a.current = "TakeHit"; a.startedAt = now; }
            floatsRef.current.push({ x: getEnemyX(state, ent.battleId), y: getEnemyY() - 30, text: "-" + ev.amount, age: 0, ttl: 1.0, color: "#fde68a" });
          }
        }
        break;
      }
      case "heal":
        if (ev.targetId === "hero") {
          floatsRef.current.push({ x: getHeroX(), y: getHeroY() - 30, text: "+" + ev.amount, age: 0, ttl: 1.0, color: "#a3e635" });
        }
        break;
      case "victory":
        setResultBanner(ev.text ?? "Victory!");
        sfxFanfare();
        stopTrack();
        break;
      case "defeat":
        setResultBanner(ev.text ?? "Defeat...");
        stopTrack();
        break;
      case "fled":
        setResultBanner("Fled.");
        stopTrack();
        break;
      case "level-up":
        sfxLevel();
        floatsRef.current.push({ x: getHeroX(), y: getHeroY() - 60, text: ev.text ?? "Level up!", age: 0, ttl: 2.0, color: "#fde68a" });
        break;
      case "miss":
        sfxTick();
        if (ev.text) floatsRef.current.push({ x: window.innerWidth / 2, y: 160, text: ev.text, age: 0, ttl: 1.2, color: "#cbd5e1" });
        break;
    }
  }, []);

  function getHeroX(): number { return window.innerWidth * 0.27; }
  function getHeroY(): number { return window.innerHeight * 0.62; }
  function getEnemyX(state: BattleStateExternal, id: string): number {
    const idx = state.enemies.findIndex(e => e.battleId === id);
    const total = state.enemies.length;
    const start = window.innerWidth * 0.6;
    const spacing = Math.min(160, window.innerWidth * 0.12);
    return start + (idx - (total - 1) / 2) * spacing;
  }
  function getEnemyY(): number { return window.innerHeight * 0.62; }

  function drawFrame(ctx2d: CanvasRenderingContext2D): void {
    const canvas = ctx2d.canvas;
    const w = parseInt(canvas.style.width || String(canvas.width), 10);
    const h = parseInt(canvas.style.height || String(canvas.height), 10);

    // Sky + parallax background
    ctx2d.fillStyle = "#0a1228";
    ctx2d.fillRect(0, 0, w, h);
    if (bgReady) {
      const sx = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
      const sy = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
      // Draw sky stretched
      const layers: Array<[string, number]> = [
        ["sky", 1.0], ["far_clouds", 0.95], ["far_mountains", 0.85], ["near_clouds", 0.75], ["mountains", 0.6], ["trees", 0.5],
      ];
      layers.forEach(([key, yScale]) => {
        const img = bgImgs.current[key];
        if (!img) return;
        const ih = h * yScale;
        const aspect = img.width / img.height;
        const iw = w; // stretch horizontal to cover
        // tile horizontally if aspect ratio would leave gaps (it won't with iw=w)
        ctx2d.drawImage(img, sx, sy + (h - ih), iw, ih);
      });
    }
    // Ground
    ctx2d.fillStyle = "rgba(15,10,30,0.6)";
    ctx2d.fillRect(0, h * 0.75, w, h * 0.25);

    // ATB bars top
    drawAtbBars(ctx2d, w);

    // Sprites
    const state = stateRef.current;
    if (state) {
      // Hero
      drawBattler(ctx2d, "hero", heroAnimRef.current, getHeroX(), getHeroY(), false, 1.0, state.heroFlash);
      // Enemies
      state.enemies.forEach(e => {
        const anim = enemyAnimsRef.current.get(e.battleId);
        if (!anim) return;
        drawBattler(ctx2d, e.spriteId, anim, getEnemyX(state, e.battleId), getEnemyY(), true, e.scale, e.hitFlash);
        // Selection ring
        if (state.targetIdx === state.enemies.indexOf(e) && state.heroReady && !e.dead) {
          ctx2d.strokeStyle = "#fbbf24";
          ctx2d.lineWidth = 3;
          const cx = getEnemyX(state, e.battleId);
          const cy = getEnemyY();
          ctx2d.beginPath();
          ctx2d.arc(cx, cy + 10, 60 * e.scale, 0, Math.PI * 2);
          ctx2d.stroke();
        }
        // HP bar above enemy
        if (!e.dead) {
          const cx = getEnemyX(state, e.battleId);
          const cy = getEnemyY() - 140 * e.scale;
          ctx2d.fillStyle = "rgba(0,0,0,0.6)";
          ctx2d.fillRect(cx - 50, cy, 100, 8);
          ctx2d.fillStyle = "#ef4444";
          ctx2d.fillRect(cx - 50, cy, 100 * (e.hpNow / e.stats.maxHp), 8);
          ctx2d.fillStyle = "#fff";
          ctx2d.font = "11px system-ui";
          ctx2d.textAlign = "center";
          ctx2d.fillText(e.name, cx, cy - 4);
          ctx2d.textAlign = "left";
        }
      });
    }

    // VFX
    vfxRef.current.forEach(v => {
      const t = v.age / v.ttl;
      if (v.kind === "flare") {
        const r = 20 + t * 100;
        const a = 1 - t;
        ctx2d.fillStyle = `rgba(254, 230, 138, ${0.8 * a})`;
        ctx2d.beginPath(); ctx2d.arc(v.x, v.y - 50, r, 0, Math.PI * 2); ctx2d.fill();
        ctx2d.strokeStyle = `rgba(255, 255, 255, ${0.8 * a})`;
        ctx2d.lineWidth = 3;
        ctx2d.beginPath(); ctx2d.arc(v.x, v.y - 50, r * 0.7, 0, Math.PI * 2); ctx2d.stroke();
      } else if (v.kind === "rest") {
        ctx2d.fillStyle = `rgba(163, 230, 53, ${(1 - t) * 0.6})`;
        for (let i = 0; i < 6; i += 1) {
          const ang = (i / 6) * Math.PI * 2 + t * 2;
          const rx = v.x + Math.cos(ang) * 40 * (1 - t);
          const ry = v.y - 50 + Math.sin(ang) * 40 * (1 - t);
          ctx2d.beginPath(); ctx2d.arc(rx, ry, 6, 0, Math.PI * 2); ctx2d.fill();
        }
      }
    });

    // Floats
    floatsRef.current.forEach(f => {
      const t = f.age / f.ttl;
      ctx2d.fillStyle = f.color;
      ctx2d.font = "bold 22px system-ui";
      ctx2d.textAlign = "center";
      ctx2d.globalAlpha = 1 - t;
      ctx2d.fillText(f.text, f.x, f.y - t * 36);
      ctx2d.globalAlpha = 1;
      ctx2d.textAlign = "left";
    });
  }

  function drawAtbBars(ctx2d: CanvasRenderingContext2D, w: number): void {
    const state = stateRef.current;
    if (!state) return;
    // Hero ATB
    ctx2d.fillStyle = "rgba(10,4,20,0.8)";
    ctx2d.fillRect(8, 8, 240, 56);
    ctx2d.strokeStyle = state.heroReady ? "#fde68a" : "#71717a";
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(8, 8, 240, 56);
    ctx2d.fillStyle = "#fde68a";
    ctx2d.font = "bold 13px system-ui";
    ctx2d.fillText("Liora · Lv. " + state.hero.level + (state.heroSilenced ? " [Silenced]" : ""), 16, 24);
    // HP
    ctx2d.fillStyle = "#7f1d1d";
    ctx2d.fillRect(16, 28, 220, 8);
    ctx2d.fillStyle = "#ef4444";
    ctx2d.fillRect(16, 28, 220 * (state.hero.stats.hp / state.hero.stats.maxHp), 8);
    ctx2d.fillStyle = "#fff";
    ctx2d.font = "10px system-ui";
    ctx2d.fillText("HP " + state.hero.stats.hp + "/" + state.hero.stats.maxHp, 20, 36);
    // MP
    ctx2d.fillStyle = "#1e3a8a";
    ctx2d.fillRect(16, 40, 220, 6);
    ctx2d.fillStyle = "#60a5fa";
    ctx2d.fillRect(16, 40, 220 * (state.hero.stats.mp / state.hero.stats.maxMp), 6);
    // ATB
    ctx2d.fillStyle = "#3f3f46";
    ctx2d.fillRect(16, 50, 220, 8);
    ctx2d.fillStyle = state.heroReady ? "#fde68a" : "#a78bfa";
    ctx2d.fillRect(16, 50, 220 * (state.heroAtb / 100), 8);
    ctx2d.fillStyle = "#cbd5e1";
    ctx2d.font = "10px system-ui";
    ctx2d.fillText("ATB " + Math.floor(state.heroAtb), 200, 58);
  }

  function drawBattler(ctx2d: CanvasRenderingContext2D, id: BattlerId, anim: ActorAnim, x: number, y: number, mirror: boolean, scaleMul: number, flash: number): void {
    const sheet = SHEETS[id];
    const def: AnimDef | undefined = sheet.anims[anim.current];
    const fallback = sheet.anims.Idle;
    const useDef = def ?? fallback;
    if (!useDef) return;
    const elapsed = (performance.now() - anim.startedAt) / 1000;
    let frame = Math.floor(elapsed * useDef.fps);
    if (useDef.hold) frame = Math.min(frame, useDef.frames - 1);
    else frame = frame % useDef.frames;
    let img: HTMLImageElement | null = null;
    try {
      const w = (window as unknown as { __jrpg_img_cache?: Map<string, HTMLImageElement> });
      if (!w.__jrpg_img_cache) w.__jrpg_img_cache = new Map();
      let cached = w.__jrpg_img_cache.get(useDef.src);
      if (!cached) {
        const tmp = new Image();
        tmp.src = useDef.src;
        w.__jrpg_img_cache.set(useDef.src, tmp);
        cached = tmp;
      }
      if (cached.complete) img = cached;
    } catch { img = null; }
    if (!img || !img.complete) {
      // placeholder
      ctx2d.fillStyle = mirror ? "#7c3aed" : "#fbbf24";
      ctx2d.fillRect(x - 30, y - 80, 60, 80);
      return;
    }
    const sw = useDef.frameW;
    const sh = useDef.frameH;
    const drawScale = (id === "hero" ? 1.0 : sheet.renderScale) * scaleMul * 1.4;
    const dw = sw * drawScale;
    const dh = sh * drawScale;
    ctx2d.save();
    if (mirror) {
      ctx2d.translate(x, 0);
      ctx2d.scale(-1, 1);
      ctx2d.translate(-x, 0);
    }
    if (flash > 0) {
      ctx2d.globalAlpha = 0.7 + Math.sin(performance.now() * 0.05) * 0.3;
    }
    ctx2d.drawImage(img, frame * sw, 0, sw, sh, x - dw / 2, y - dh + 20, dw, dh);
    ctx2d.restore();
  }

  // ── Player input ────────────────────────────────────────────────────
  function doAttack(): void {
    const state = stateRef.current;
    if (!state) return;
    heroAttack(state);
    setTick(t => (t + 1) % 1000000);
  }
  function doAbility(abilityId: string): void {
    const state = stateRef.current;
    if (!state) return;
    const ref = state.hero.abilities.find(a => a.id === abilityId);
    if (!ref) return;
    heroUseAbility(state, ref);
    setShowAbilityMenu(false);
  }
  function doItem(itemId: string): void {
    const state = stateRef.current;
    if (!state) return;
    heroUseItem(state, itemId);
    setShowItemMenu(false);
  }
  function doFlee(): void {
    const state = stateRef.current;
    if (!state) return;
    heroFlee(state);
  }
  function cycleTarget(): void {
    const state = stateRef.current;
    if (!state) return;
    const alive = state.enemies.findIndex((e, i) => i > state.targetIdx && !e.dead);
    if (alive >= 0) state.targetIdx = alive;
    else state.targetIdx = state.enemies.findIndex(e => !e.dead);
  }
  function finishBattle(): void {
    const state = stateRef.current;
    const save = saveRef.current;
    if (!state || !save) { nav("/jrpg"); return; }
    save.hero = state.hero;
    save.inventory = state.inventory;
    save.gold += state.goldAward;
    if (state.result === "victory") {
      const isBoss = sessionStorage.getItem("aethersong_is_boss") === "1";
      if (isBoss) save.flags.defeatedBoss = true;
    }
    writeSave(save);
    sessionStorage.removeItem("aethersong_pending_battle");
    sessionStorage.removeItem("aethersong_is_boss");
    if (state.result === "defeat") {
      // Bounce to title screen on defeat (player can Continue from save).
      nav("/jrpg");
      return;
    }
    nav("/jrpg/play");
  }

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (introOpen || resultBanner) {
        if (e.code === "Space" || e.code === "Enter") {
          if (resultBanner) finishBattle();
          else setIntroOpen(null);
        }
        return;
      }
      const state = stateRef.current;
      if (!state || !state.heroReady) return;
      if (e.code === "Space" || e.code === "Enter") doAttack();
      else if (e.code === "KeyZ" || e.code === "Digit1") setShowAbilityMenu(s => !s);
      else if (e.code === "KeyX" || e.code === "Digit2") setShowItemMenu(s => !s);
      else if (e.code === "KeyC" || e.code === "Digit3") doFlee();
      else if (e.code === "Tab") { e.preventDefault(); cycleTarget(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOpen, resultBanner]);

  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#1c1530", color: "#fff", padding: 24 }}>
        <h2>Battle error</h2>
        <pre>{error}</pre>
        <button onClick={() => nav("/jrpg")}>Back to title</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />

      {/* Top-right back/mute */}
      <button
        onClick={() => { stopTrack(); nav("/jrpg"); }}
        style={{
          position: "fixed", top: 8, right: 56,
          background: "rgba(10,4,20,0.75)",
          border: "1px solid #71717a",
          color: "#fde68a",
          padding: "6px 10px",
          borderRadius: 6, fontSize: 13, cursor: "pointer",
          zIndex: 20,
        }}
      >&larr; Title</button>
      <button
        onClick={() => { const m = !muted; setMuted(m); setMutedLocal(m); }}
        style={{
          position: "fixed", top: 8, right: 8,
          background: "rgba(10,4,20,0.75)",
          border: "1px solid #71717a",
          color: "#fde68a",
          padding: "6px 10px",
          borderRadius: 6, fontSize: 13, cursor: "pointer",
          zIndex: 20,
        }}
      >{muted ? "Mute" : "Sound"}</button>

      {introOpen && (
        <div onClick={() => setIntroOpen(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24,
        }}>
          <div style={{
            maxWidth: 540, color: "#fde68a", fontFamily: "Georgia, serif",
            background: "linear-gradient(180deg, rgba(40,15,80,0.95), rgba(8,4,30,0.95))",
            border: "2px solid #fbbf24", borderRadius: 14, padding: 24,
            whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 16,
          }}>
            {introOpen}
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button onClick={() => setIntroOpen(null)} style={{
                background: "#fbbf24", color: "#1c1530", padding: "8px 22px",
                border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
              }}>Begin</button>
            </div>
          </div>
        </div>
      )}

      {resultBanner && (
        <div onClick={finishBattle} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24,
        }}>
          <div style={{
            color: "#fde68a", fontFamily: "Georgia, serif", textAlign: "center",
            background: "linear-gradient(180deg, rgba(40,15,80,0.95), rgba(8,4,30,0.95))",
            border: "2px solid #fbbf24", borderRadius: 14, padding: "28px 36px",
          }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{resultBanner}</div>
            <div style={{ marginTop: 18 }}>
              <button onClick={finishBattle} style={{
                background: "#fbbf24", color: "#1c1530", padding: "10px 26px",
                border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
              }}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Command panel */}
      {!introOpen && !resultBanner && (
        <CommandPanel
          state={stateRef.current}
          onAttack={doAttack}
          onAbility={() => setShowAbilityMenu(s => !s)}
          onItem={() => setShowItemMenu(s => !s)}
          onFlee={doFlee}
          onTarget={cycleTarget}
        />
      )}

      {showAbilityMenu && (
        <SubMenu title="Verse" onClose={() => setShowAbilityMenu(false)}>
          {stateRef.current?.hero.abilities.map(a => {
            const ab = ABILITIES[a.id];
            const canCast = (stateRef.current?.hero.stats.mp ?? 0) >= ab.mp;
            return (
              <button
                key={a.id}
                disabled={!canCast}
                onClick={() => doAbility(a.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: canCast ? "#2a1f48" : "#1a142a", color: canCast ? "#fde68a" : "#71717a",
                  border: "1px solid " + (canCast ? "#fbbf24" : "#3f3f46"),
                  borderRadius: 8, padding: "10px 14px", marginBottom: 6,
                  cursor: canCast ? "pointer" : "not-allowed", fontFamily: "Georgia, serif",
                }}
              >
                <div style={{ fontWeight: 700 }}>{ab.name} <span style={{ color: "#a1a1aa", fontWeight: 400 }}>· MP {ab.mp}</span></div>
                <div style={{ fontSize: 12, color: "#cbd5e1" }}>{ab.description}</div>
              </button>
            );
          })}
        </SubMenu>
      )}
      {showItemMenu && (
        <SubMenu title="Item" onClose={() => setShowItemMenu(false)}>
          {stateRef.current?.inventory.length === 0 && <div style={{ color: "#94a3b8" }}>(no items)</div>}
          {stateRef.current?.inventory.map(e => (
            <button
              key={e.itemId}
              onClick={() => doItem(e.itemId)}
              disabled={e.qty <= 0}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "#2a1f48", color: "#fde68a",
                border: "1px solid #fbbf24",
                borderRadius: 8, padding: "10px 14px", marginBottom: 6,
                cursor: e.qty > 0 ? "pointer" : "not-allowed", fontFamily: "Georgia, serif",
              }}
            >
              {e.itemId.replace(/_/g, " ")} <span style={{ color: "#a1a1aa" }}>· x{e.qty}</span>
            </button>
          ))}
        </SubMenu>
      )}
    </div>
  );
}

function CommandPanel({ state, onAttack, onAbility, onItem, onFlee, onTarget }: {
  state: BattleStateExternal | null;
  onAttack: () => void; onAbility: () => void; onItem: () => void; onFlee: () => void; onTarget: () => void;
}) {
  const ready = !!state?.heroReady && !state?.busy;
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      display: "flex", gap: 8, padding: 12,
      background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6) 50%)",
      zIndex: 10,
      justifyContent: "center",
      flexWrap: "wrap",
    }}>
      <CmdBtn label="Attack"  enabled={ready} onClick={onAttack}  accent="#fbbf24" />
      <CmdBtn label="Verse"   enabled={ready} onClick={onAbility} accent="#a78bfa" />
      <CmdBtn label="Item"    enabled={ready} onClick={onItem}    accent="#86efac" />
      <CmdBtn label="Target"  enabled={ready} onClick={onTarget}  accent="#7dd3fc" />
      <CmdBtn label="Run"     enabled={ready} onClick={onFlee}    accent="#f87171" />
    </div>
  );
}

function CmdBtn({ label, enabled, onClick, accent }: { label: string; enabled: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      style={{
        background: enabled ? "rgba(20,10,40,0.92)" : "rgba(20,10,40,0.5)",
        border: "2px solid " + (enabled ? accent : "#3f3f46"),
        color: enabled ? accent : "#71717a",
        padding: "12px 22px",
        borderRadius: 10,
        fontFamily: "Georgia, serif",
        fontWeight: 700, fontSize: 16,
        cursor: enabled ? "pointer" : "not-allowed",
        minWidth: 96,
        textTransform: "uppercase", letterSpacing: 1,
        boxShadow: enabled ? "0 4px 12px " + accent + "44" : "none",
      }}
    >{label}</button>
  );
}

function SubMenu({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30,
      padding: 12,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(440px,100%)", marginBottom: 90,
        background: "#1c1530", border: "2px solid #fbbf24", borderRadius: 12,
        padding: 14,
      }}>
        <div style={{ color: "#fde68a", fontWeight: 700, fontFamily: "Georgia,serif", marginBottom: 8, fontSize: 18 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
