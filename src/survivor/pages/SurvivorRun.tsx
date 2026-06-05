// ⚡ Survivor — the run. Canvas-rendered arena, virtual joystick on
// touch, keyboard movement on desktop. Level-up modal pauses sim.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Heart, Pause } from "lucide-react";
import { useSurvivor } from "../store";
import { HEROES, WEAPON_TIERS } from "../catalog";
import { newGame, tick, ARENA_W, ARENA_H, DT, type Game } from "../engine";
import { rollChoices } from "../choices";
import type { Choice } from "../types";
import { drawSprite } from "../sprites";
import {
  drawAnimatedMonster, drawGroundShadow, preloadMonsterSprites, ARCHETYPE_MAP,
} from "../animatedSprites";
import { playSfx, unlockAudio } from "../../art";
import { drawArenaBackdrop, drawGem, drawPickup } from "../arena";
import { getActiveProfileId, recordGameSession, loadProfiles } from "../../profiles/store";
import { addMemory } from "../../profiles/memory";
import { postActivity } from "../../sync/liveActivity";
import { publishSession, clearSession } from "../../sync/liveSession";
import { useActiveProfile } from "../../profiles/store";

export default function SurvivorRun() {
  const navigate = useNavigate();
  const survivor = useSurvivor();
  const profile = useActiveProfile();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { unlockAudio(); preloadMonsterSprites(); }, []);

  // Broadcast live-session presence so the family sees this Survivor run.
  useEffect(() => {
    if (!profile) return;
    const cfg = (() => {
      try {
        const raw = sessionStorage.getItem("dd_survivor_run");
        return raw ? JSON.parse(raw) as { heroId: string; biomeId: string } : null;
      } catch { return null; }
    })();
    const hero = cfg ? HEROES.find(h => h.id === cfg.heroId) : null;
    publishSession({
      profileId: profile.id,
      profileName: profile.handle || profile.name,
      profileColor: profile.color,
      gameId: "survivor",
      label: "Survivor run",
      detail: hero?.name ?? "Hero",
      emoji: hero?.emoji ?? "⚡",
      phase: "active",
      startedAt: Date.now(),
    });
    return () => { clearSession(profile.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const config = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("dd_survivor_run");
      if (!raw) return null;
      return JSON.parse(raw) as { heroId: string; biomeId: string };
    } catch { return null; }
  }, []);

  // Build the game once.
  const gameRef = useRef<Game | null>(null);
  const heroBaseRef = useRef<any>(null);
  const [, force] = useState(0);
  const [showChoices, setShowChoices] = useState<Choice[] | null>(null);
  const [endShown, setEndShown] = useState(false);

  useEffect(() => {
    if (!config) { navigate("/survivor"); return; }
    const hero = HEROES.find(h => h.id === config.heroId);
    if (!hero) { navigate("/survivor"); return; }

    // Apply meta upgrades to starting stats
    const m = survivor.save.meta;
    gameRef.current = newGame({
      heroBase: hero.base,
      startingWeapons: hero.startingWeapons,
      biomeId: config.biomeId,
      metaBoosts: {
        hp: (m.starting_hp ?? 0) * 10,
        speed: (m.starting_speed ?? 0) * 5,
        power: (m.starting_power ?? 0) * 5,
        luck: (m.starting_luck ?? 0) * 5,
        magnet: (m.starting_magnet ?? 0) * 10,
      },
    });
    gameRef.current.hero.glyph = hero.emoji;
    gameRef.current.hero.tint = hero.color;
    gameRef.current.hero.spriteId = hero.id;
    heroBaseRef.current = { ...gameRef.current.stats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Game loop — fixed-step accumulator.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (!g) return;
      acc += dt;
      while (acc >= DT) {
        const wasPaused = g.paused;
        const overBefore = g.over;
        tick(g, DT);
        acc -= DT;
        // Just got paused (level-up) → roll choices
        if (g.paused && !wasPaused && heroBaseRef.current && !showChoices) {
          setShowChoices(rollChoices(g, heroBaseRef.current));
          playSfx("voLevelUp", { volume: 0.85 });
        }
        // Just ended
        if (g.over && !overBefore && !endShown) {
          setEndShown(true);
          finalize(g);
          playSfx(g.win ? "voYouWin" : "voGameOver", { volume: 0.9 });
        }
      }
      draw();
      force(n => n + 1);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finalize(g: Game) {
    const pid = getActiveProfileId();
    const hero = HEROES.find(h => h.id === config?.heroId);
    if (!hero) return;
    survivor.finishRun(hero.id, {
      elapsed: g.run.elapsed,
      level: g.run.level,
      kills: g.run.kills,
      coinsEarned: Math.round(g.run.coins / 4),
    });
    if (pid) {
      recordGameSession(pid, "survivor", {
        sessions: 1,
        wins: g.win ? 1 : 0,
        losses: g.win ? 0 : 1,
        seconds: Math.round(g.run.elapsed),
        level: g.run.level,
      });
      addMemory({
        profileId: pid, gameId: "survivor",
        kind: g.win ? "achievement" : "loss",
        emoji: hero.emoji,
        text: g.win
          ? `Survived ${Math.round(g.run.elapsed)}s with ${hero.name} (lvl ${g.run.level}, ${g.run.kills} kills).`
          : `${hero.name} fell at lvl ${g.run.level} after ${Math.round(g.run.elapsed)}s.`,
      });
      const me = loadProfiles().find(p => p.id === pid);
      if (me) {
        postActivity({
          profileId: pid,
          profileName: me.handle || me.name,
          profileColor: me.color,
          gameId: "survivor",
          kind: g.win ? "generic" : "generic",
          emoji: hero.emoji,
          text: g.win
            ? `${me.handle || me.name} survived the boss with ${hero.name}!`
            : `${me.handle || me.name}'s ${hero.name} fell at lvl ${g.run.level}.`,
        });
      }
    }
  }

  // ── Input: virtual joystick + keyboard ────────────────────────────────
  const joyRef = useRef<{ active: boolean; cx: number; cy: number; dx: number; dy: number }>({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  useEffect(() => {
    const keys = new Set<string>();
    function syncKeys() {
      const g = gameRef.current;
      if (!g) return;
      let dx = 0, dy = 0;
      if (keys.has("a") || keys.has("ArrowLeft"))  dx -= 1;
      if (keys.has("d") || keys.has("ArrowRight")) dx += 1;
      if (keys.has("w") || keys.has("ArrowUp"))    dy -= 1;
      if (keys.has("s") || keys.has("ArrowDown"))  dy += 1;
      if (!joyRef.current.active) {
        g.input.dx = dx;
        g.input.dy = dy;
      }
    }
    function onDown(e: KeyboardEvent) { keys.add(e.key); syncKeys(); }
    function onUp(e: KeyboardEvent)   { keys.delete(e.key); syncKeys(); }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  function onJoyDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    joyRef.current.active = true;
    joyRef.current.cx = rect.left + rect.width / 2;
    joyRef.current.cy = rect.top + rect.height / 2;
    joyRef.current.dx = (e.clientX - joyRef.current.cx) / 50;
    joyRef.current.dy = (e.clientY - joyRef.current.cy) / 50;
    if (gameRef.current) {
      gameRef.current.input.dx = clamp(joyRef.current.dx, -1, 1);
      gameRef.current.input.dy = clamp(joyRef.current.dy, -1, 1);
    }
  }
  function onJoyMove(e: React.PointerEvent) {
    if (!joyRef.current.active) return;
    e.preventDefault();
    joyRef.current.dx = (e.clientX - joyRef.current.cx) / 50;
    joyRef.current.dy = (e.clientY - joyRef.current.cy) / 50;
    if (gameRef.current) {
      gameRef.current.input.dx = clamp(joyRef.current.dx, -1, 1);
      gameRef.current.input.dy = clamp(joyRef.current.dy, -1, 1);
    }
  }
  function onJoyUp(e: React.PointerEvent) {
    joyRef.current.active = false;
    joyRef.current.dx = 0; joyRef.current.dy = 0;
    if (gameRef.current) { gameRef.current.input.dx = 0; gameRef.current.input.dy = 0; }
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  // ── Render to canvas ──────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Camera follows hero — center arena coords on hero so the arena
    // can be larger than the viewport.
    const vw = rect.width;
    const vh = rect.height;
    const camX = g.hero.x - vw / 2;
    const camY = g.hero.y - vh / 2;
    const shakeX = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
    const shakeY = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;

    // Background — biome-specific tiled scenery + vignette
    drawArenaBackdrop(ctx, vw, vh, camX + shakeX, camY + shakeY, g.biome.id);

    // Helper to convert world->screen
    const sx = (x: number) => x - camX - shakeX;
    const sy = (y: number) => y - camY - shakeY;

    // Time for animated decals
    const t = g.run.elapsed;

    // Gems — glowing diamonds
    for (const gem of g.gems) {
      drawGem(ctx, sx(gem.x), sy(gem.y), t + (gem.id ?? 0) * 0.13, gem.xpValue ?? 1);
    }
    // Pickups — colored chip with symbol
    for (const p of g.pickups) {
      drawPickup(ctx, sx(p.x), sy(p.y), p.pickup ?? "heal", t + (p.id ?? 0) * 0.21);
    }

    // Projectiles
    for (const p of g.projectiles) {
      if (p.shape === "aura" || p.shape === "wave") {
        // Soft inner glow
        const grad = ctx.createRadialGradient(sx(p.x), sy(p.y), 0, sx(p.x), sy(p.y), p.radius);
        grad.addColorStop(0, p.color + "55");
        grad.addColorStop(1, p.color + "00");
        ctx.fillStyle = grad;
        ctx.fillRect(sx(p.x) - p.radius, sy(p.y) - p.radius, p.radius * 2, p.radius * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === "orbit") {
        // Trailing glow
        const grad = ctx.createRadialGradient(sx(p.x), sy(p.y), 0, sx(p.x), sy(p.y), p.radius * 2.2);
        grad.addColorStop(0, p.color + "aa");
        grad.addColorStop(1, p.color + "00");
        ctx.fillStyle = grad;
        ctx.fillRect(sx(p.x) - p.radius * 2.2, sy(p.y) - p.radius * 2.2, p.radius * 4.4, p.radius * 4.4);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), p.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else {
        // aim — motion-streaked bullet with trail
        const px = sx(p.x), py = sy(p.y);
        const tx = sx(p.x - p.vx * 0.12), ty = sy(p.y - p.vy * 0.12);
        // Outer trail
        ctx.strokeStyle = p.color + "44";
        ctx.lineWidth = p.radius * 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(tx, ty);
        ctx.stroke();
        // Inner core
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius * 0.7;
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(sx(p.x - p.vx * 0.05), sy(p.y - p.vy * 0.05));
        ctx.stroke();
        // White-hot tip
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, py, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineCap = "butt";
      }
    }

    // Enemies — try animated luizmelo PNG sprites first (drawn at run
    // start via preloadMonsterSprites). If a sheet isn't loaded yet,
    // fall through to the procedural canvas silhouette. Emoji is a
    // last-resort that should never fire in practice.
    for (const e of g.enemies) {
      const flash = (e.flash ?? 0) > 0;
      const tint = e.tint ?? "#dc2626";
      const ex = sx(e.x), ey = sy(e.y);
      // Facing: enemies chase the hero, so they face the hero's direction.
      const facing: 1 | -1 = g.hero.x < e.x ? -1 : 1;
      const map = e.archetype ? ARCHETYPE_MAP[e.archetype] : undefined;
      let drew = false;
      if (map) {
        drawGroundShadow(ctx, ex, ey, e.radius, !!map.flying);
        drew = drawAnimatedMonster(ctx, ex, ey, map.monster, {
          radius: e.radius,
          flash: flash ? 1 : 0,
          facing,
          tint: map.tint,
          scale: map.scale,
        });
      }
      if (!drew) {
        drew = drawSprite(ctx, ex, ey, e.spriteId ?? e.archetype, {
          radius: e.radius, tint, flash: flash ? 1 : 0,
        });
      }
      if (!drew) {
        ctx.font = `${e.radius * 1.6}px system-ui, sans-serif`;
        ctx.fillStyle = flash ? "#fff" : tint;
        ctx.globalAlpha = flash ? 0.9 : 1;
        ctx.fillText(e.glyph, ex, ey);
        ctx.globalAlpha = 1;
      }
      // Mini HP bar above bigger enemies
      if (e.archetype === "tank" || e.archetype === "miniboss" || e.archetype === "boss") {
        const w = e.radius * 2.4;
        const h = 4;
        const bx = sx(e.x) - w / 2;
        const by = sy(e.y) - e.radius - 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(bx, by, w * (e.hp / e.hpMax), h);
      }
    }

    // Hero — hand-drawn canvas sprite per class, with emoji fallback.
    {
      const drew = drawSprite(ctx, sx(g.hero.x), sy(g.hero.y), g.hero.spriteId, {
        radius: g.hero.radius, tint: g.hero.tint ?? "#fef3c7",
      });
      if (!drew) {
        ctx.font = "32px system-ui, sans-serif";
        ctx.fillStyle = g.hero.tint ?? "#fff";
        ctx.fillText(g.hero.glyph, sx(g.hero.x), sy(g.hero.y));
      }
    }
    // Hero HP ring
    ctx.beginPath();
    ctx.arc(sx(g.hero.x), sy(g.hero.y), g.hero.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (g.hero.hp / g.stats.hpMax));
    ctx.strokeStyle = g.hero.hp / g.stats.hpMax > 0.4 ? "#86efac" : "#f87171";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Damage popups — bold with drop shadow
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const pop of g.popups) {
      const alpha = Math.max(0, Math.min(1, pop.ttl / 0.5));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillText(pop.text, sx(pop.x) + 1, sy(pop.y) + 1);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, sx(pop.x), sy(pop.y));
    }
    ctx.globalAlpha = 1;
  }

  // ── Pick a level-up choice ────────────────────────────────────────────
  function pickChoice(c: Choice) {
    const g = gameRef.current;
    if (!g) return;
    c.apply();
    g.paused = false;
    setShowChoices(null);
    // Evolution celebration — when a tier 3->4 upgrade fires, c.apply()
    // stamps g.lastEvolution with the new weapon's details. Pop a brief
    // toast so the player sees the moment, then clear it.
    type GameWithEvo = typeof g & { lastEvolution?: { weaponName: string; emoji: string; color: string } };
    const gx = g as GameWithEvo;
    if (gx.lastEvolution) {
      setEvolution(gx.lastEvolution);
      gx.lastEvolution = undefined;
      setTimeout(() => setEvolution(null), 2400);
    }
  }
  const [evolution, setEvolution] = useState<{ weaponName: string; emoji: string; color: string } | null>(null);

  const g = gameRef.current;

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col"
      style={{ background: g?.biome.bg ?? "#050308" }}>
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/survivor")} aria-label="Quit run"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <Pause size={14} aria-hidden="true" />
        </button>
        {g && (
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span style={{ color: "#86efac" }}>L{g.run.level}</span>
                <span style={{ color: "#fde047" }}>{fmtTime(g.run.elapsed)}</span>
                <span style={{ color: "#fca5a5" }}>{g.run.kills} kills</span>
              </div>
              <div className="h-1.5 mt-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="h-full" style={{ width: `${Math.min(100, (g.run.xp / g.run.xpToNext) * 100)}%`, background: "#86efac" }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: g.hero.hp / g.stats.hpMax > 0.4 ? "#86efac" : "#f87171" }}>
              <Heart size={12} aria-hidden="true" />
              <span className="font-mono">{Math.ceil(g.hero.hp)}/{g.stats.hpMax}</span>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

        {/* Joystick — touch only, lower-left corner */}
        <div
          className="absolute"
          style={{ left: 20, bottom: 20, width: 120, height: 120, touchAction: "none" }}
          onPointerDown={onJoyDown}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyUp}
          onPointerCancel={onJoyUp}>
          <div className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.18)" }} />
          <div
            className="absolute"
            style={{
              left: `calc(50% + ${clamp(joyRef.current.dx, -1, 1) * 30}px - 24px)`,
              top:  `calc(50% + ${clamp(joyRef.current.dy, -1, 1) * 30}px - 24px)`,
              width: 48, height: 48, borderRadius: 24,
              background: "rgba(255,255,255,0.85)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }} />
        </div>

        {/* Evolution celebration overlay — pops briefly when a weapon
            crosses tier 3 -> evolved tier 4 via the EVOLUTIONS combo. */}
        <AnimatePresence>
          {evolution && (
            <motion.div
              key="evo"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="absolute inset-x-0 top-1/4 z-40 flex justify-center pointer-events-none">
              <div className="rounded-2xl px-5 py-4 text-center"
                style={{
                  background: `linear-gradient(135deg, ${evolution.color}33, rgba(10,10,20,0.95))`,
                  border: `2px solid ${evolution.color}`,
                  boxShadow: `0 0 30px ${evolution.color}aa, 0 12px 24px rgba(0,0,0,0.6)`,
                  minWidth: 240,
                }}>
                <div className="text-4xl mb-1">{evolution.emoji}</div>
                <div className="font-display tracking-[0.3em] text-[11px]" style={{ color: evolution.color }}>
                  ✦ EVOLVED ✦
                </div>
                <div className="font-display text-lg mt-1" style={{ color: "#fef3c7" }}>
                  {evolution.weaponName}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level-up modal */}
        <AnimatePresence>
          {showChoices && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
              <div className="max-w-md w-full">
                <div className="text-center text-[10px] tracking-[0.4em] font-display mb-3" style={{ color: "#fde047" }}>
                  LEVEL UP — PICK ONE
                </div>
                <div className="space-y-2">
                  {showChoices.map(c => (
                    <button key={c.id} onClick={() => pickChoice(c)}
                      className="w-full text-left rounded-xl p-3 pressable touch-target"
                      style={{
                        background: `linear-gradient(135deg, ${c.color}28, rgba(8,8,14,0.95))`,
                        border: `1.5px solid ${c.color}88`,
                        boxShadow: `0 4px 16px -4px ${c.color}66`,
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl" aria-hidden="true">{c.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display tracking-wide text-base" style={{ color: c.color }}>{c.title}</div>
                          <div className="text-[12px] mt-0.5" style={{ color: "rgba(229,231,235,0.85)" }}>{c.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End-of-run modal */}
        {g && g.over && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-md w-full rounded-2xl p-5 text-center"
              style={{
                background: g.win ? "linear-gradient(135deg, rgba(134,239,172,0.2), rgba(8,8,14,0.95))" : "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(8,8,14,0.95))",
                border: `1.5px solid ${g.win ? "#86efac" : "#f87171"}`,
              }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: g.win ? "#86efac" : "#f87171" }}>
                {g.win ? <Trophy size={20} /> : <Skull size={20} />}
                <div className="font-display tracking-widest text-xl">{g.win ? "SURVIVED" : "DEFEATED"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Stat label="LEVEL" value={g.run.level} accent="#86efac" />
                <Stat label="KILLS" value={g.run.kills} accent="#fca5a5" />
                <Stat label="TIME"  value={fmtTime(g.run.elapsed)} accent="#fde047" />
              </div>
              <div className="text-[12px] mt-3" style={{ color: "#fde047" }}>
                +{Math.round(g.run.coins / 4)} coins earned
              </div>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => navigate("/survivor")}
                  className="px-4 py-2.5 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7", minHeight: 44 }}>
                  BACK TO HUB
                </button>
                <button onClick={() => location.reload()}
                  className="px-4 py-2.5 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
                  style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "#1a0505", minHeight: 44 }}>
                  RUN AGAIN
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md py-1.5 px-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[9px] tracking-widest uppercase opacity-70" style={{ color: accent }}>{label}</div>
      <div className="font-display text-base mt-0.5" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
