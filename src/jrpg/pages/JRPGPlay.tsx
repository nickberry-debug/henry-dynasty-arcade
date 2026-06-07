// AETHERSONG world page — handles town + dungeon exploration.
// Owns the camera, tile rendering, player movement, NPC interaction,
// encounter rolling, and the per-step audio.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TILE, getTileset } from "../engine/tileset";
import { USE_V2_TILES, preloadTilesetV2, getV2Tile } from "../engine/tilesetV2";
import { getLioraSprite, getNpcSprite, type Facing } from "../engine/minisprite";
import { TOWN_MAP, DUNGEON_ROOMS, isPassableTownTile, isPassableDungeonTile, type DungeonRoom } from "../data/maps";
import { loadSave, writeSave, newGame } from "../engine/save";
import type { SavePayload } from "../types";
import { JrpgJoystick, JrpgActionButtons } from "../components/JrpgJoystick";
import { playTrack, sfxTick, sfxHeal, isMuted, setMuted } from "../engine/audio";
import { randomTrashEncounter, ENEMIES } from "../data/enemies";

interface GameLoopState {
  facing: Facing;
  pos: { x: number; y: number };
  inputDx: number;
  inputDy: number;
  pressedA: boolean;
  pressedB: boolean;
  walkPhase: 0 | 1;
  stepCounter: number;
  paused: boolean;
}

export default function JRPGPlay() {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SavePayload | null>(null);
  const loopRef = useRef<GameLoopState>({
    facing: "down", pos: { x: 0, y: 0 }, inputDx: 0, inputDy: 0,
    pressedA: false, pressedB: false, walkPhase: 0, stepCounter: 0, paused: false,
  });
  const rafRef = useRef<number | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [innOpen, setInnOpen] = useState(false);
  const [muted, setMutedLocal] = useState(isMuted());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Tracked separately from stateRef so DOM-side conditionals (like the
  // DEBUG: FIGHT NOW button) re-render when we cross locations.
  const [currentLocation, setCurrentLocation] = useState<string>("town");

  useEffect(() => {
    let save = loadSave();
    if (!save) {
      save = newGame();
      writeSave(save);
    }
    stateRef.current = save;
    setCurrentLocation(save.location);
    const loop = loopRef.current;
    loop.pos = { x: save.pos.x * TILE, y: save.pos.y * TILE };
    loop.facing = "down";
    if (save.location === "town") playTrack("town");
    else if (save.location === "dungeon-boss") playTrack("boss");
    else playTrack("dungeon");
    if (USE_V2_TILES) { void preloadTilesetV2(); }
  }, []);

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

    function step(now: number): void {
      const dt = Math.min(33, now - last) / 1000;
      last = now;
      const save = stateRef.current;
      const loop = loopRef.current;
      if (save && !loop.paused) tickGame(save, loop, dt);
      drawFrame(ctx2d!, save, loop);
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function tickGame(save: SavePayload, loop: GameLoopState, dt: number): void {
    if (dialog || menuOpen || shopOpen || innOpen) return;
    const speed = 110;
    const inMag = Math.hypot(loop.inputDx, loop.inputDy);
    if (inMag > 0.05) {
      if (Math.abs(loop.inputDx) > Math.abs(loop.inputDy)) {
        loop.facing = loop.inputDx > 0 ? "right" : "left";
      } else {
        loop.facing = loop.inputDy > 0 ? "down" : "up";
      }
      tryMove(save, loop, loop.inputDx * speed * dt, loop.inputDy * speed * dt);
      loop.stepCounter += dt;
      if (loop.stepCounter > 0.18) {
        loop.stepCounter = 0;
        loop.walkPhase = (1 - loop.walkPhase) as 0 | 1;
      }
      if (save.location !== "town") {
        // Use center-of-sprite tile (same basis as the exit check below) so
        // the encounter check and the exit check agree on "which tile am I on".
        const tx = Math.floor((loop.pos.x + TILE / 2) / TILE);
        const ty = Math.floor((loop.pos.y + TILE / 2) / TILE);
        const key = tx + "," + ty;
        const lastTile = (loop as unknown as { lastTile?: string }).lastTile;
        if (key !== lastTile) {
          (loop as unknown as { lastTile?: string }).lastTile = key;
          const room = DUNGEON_ROOMS[save.location as DungeonRoom["id"]];
          if (room) {
            const roll = Math.random();
            // Production log: keeps a per-step heartbeat so future "no battles"
            // reports can be diagnosed from console alone.
            console.log("[AETHERSONG] step (" + tx + "," + ty + ") roll=" + roll.toFixed(3) + " rate=" + room.encounterRate + " -> " + (roll < room.encounterRate ? "BATTLE" : "ok"));
            if (roll < room.encounterRate) {
              const enemies = randomTrashEncounter();
              save.pos = { x: tx, y: ty };
              writeSave(save);
              sessionStorage.setItem("aethersong_pending_battle", JSON.stringify(enemies));
              sessionStorage.setItem("aethersong_return_location", save.location);
              sessionStorage.setItem("aethersong_return_pos", JSON.stringify({ x: tx, y: ty }));
              nav("/jrpg/battle");
            }
          }
        }
      }
    }

    const tx = Math.floor((loop.pos.x + TILE / 2) / TILE);
    const ty = Math.floor((loop.pos.y + TILE / 2) / TILE);
    if (loop.pressedA) {
      loop.pressedA = false;
      handleInteraction(save, loop, tx, ty);
    }
    if (loop.pressedB) {
      loop.pressedB = false;
      setMenuOpen(true);
    }
    if (save.location === "town") {
      const row = TOWN_MAP.tiles[ty];
      if (row && row[tx] === "X") {
        save.pos = { x: tx, y: ty };
        writeSave(save);
        save.location = "dungeon-room-1";
        save.pos = DUNGEON_ROOMS["dungeon-room-1"].spawn;
        writeSave(save);
        const sp = DUNGEON_ROOMS["dungeon-room-1"].spawn;
        loop.pos = { x: sp.x * TILE, y: sp.y * TILE };
        playTrack("dungeon");
        flashToast("The Silent Chapel.");
        setCurrentLocation(save.location);
      }
    } else {
      const room = DUNGEON_ROOMS[save.location as DungeonRoom["id"]];
      if (room) {
        if (room.bossTrigger && room.bossTrigger.x === tx && room.bossTrigger.y === ty) {
          save.pos = { x: tx, y: ty };
          writeSave(save);
          const boss = JSON.parse(JSON.stringify(ENEMIES.hush_echo_boss));
          sessionStorage.setItem("aethersong_pending_battle", JSON.stringify([boss]));
          sessionStorage.setItem("aethersong_return_location", save.location);
          sessionStorage.setItem("aethersong_return_pos", JSON.stringify({ x: tx, y: ty }));
          sessionStorage.setItem("aethersong_is_boss", "1");
          nav("/jrpg/battle");
          return;
        }
        for (const ex of room.exits) {
          if (ex.x === tx && ex.y === ty) {
            if (ex.to === "town") {
              save.location = "town";
              save.pos = ex.spawnAt ?? { x: 16, y: 22 };
              loop.pos = { x: save.pos.x * TILE, y: save.pos.y * TILE };
              writeSave(save);
              playTrack("town");
              flashToast("Threnfall.");
              setCurrentLocation("town");
              return;
            }
            save.location = ex.to;
            save.pos = ex.spawnAt ?? DUNGEON_ROOMS[ex.to].spawn;
            loop.pos = { x: save.pos.x * TILE, y: save.pos.y * TILE };
            writeSave(save);
            playTrack(ex.to === "dungeon-boss" ? "boss" : "dungeon");
            flashToast(ex.to === "dungeon-boss" ? "The Bell Tower." : "Deeper in the chapel...");
            setCurrentLocation(save.location);
            return;
          }
        }
      }
    }
  }

  function tryMove(save: SavePayload, loop: GameLoopState, dx: number, dy: number): void {
    const passable = save.location === "town" ? isPassableTownTile : isPassableDungeonTile;
    const tiles = save.location === "town" ? TOWN_MAP.tiles : DUNGEON_ROOMS[save.location as DungeonRoom["id"]].tiles;
    const nextX = loop.pos.x + dx;
    if (canStand(tiles, passable, nextX, loop.pos.y)) loop.pos.x = nextX;
    const nextY = loop.pos.y + dy;
    if (canStand(tiles, passable, loop.pos.x, nextY)) loop.pos.y = nextY;
  }

  function canStand(tiles: string[], passable: (c: string) => boolean, px: number, py: number): boolean {
    const sample = (sx: number, sy: number): boolean => {
      const tx = Math.floor(sx / TILE);
      const ty = Math.floor(sy / TILE);
      if (ty < 0 || ty >= tiles.length) return false;
      const row = tiles[ty];
      if (tx < 0 || tx >= row.length) return false;
      return passable(row[tx]);
    };
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    return sample(cx - 4, cy - 2) && sample(cx + 4, cy - 2) && sample(cx - 4, cy + 6) && sample(cx + 4, cy + 6);
  }

  function flashToast(msg: string): void {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(curr => (curr === msg ? null : curr)), 1500);
  }

  function handleInteraction(save: SavePayload, _loop: GameLoopState, tx: number, ty: number): void {
    if (save.location === "town") {
      if (TOWN_MAP.saveTile.x === tx && TOWN_MAP.saveTile.y === ty) {
        save.pos = { x: tx, y: ty };
        save.savedAt = Date.now();
        save.hero.stats.hp = save.hero.stats.maxHp;
        save.hero.stats.mp = save.hero.stats.maxMp;
        save.flags.firstSave = true;
        writeSave(save);
        sfxHeal();
        flashToast("Saved. Healed. The chime hums approval.");
        return;
      }
      for (const npc of TOWN_MAP.npcs) {
        if (Math.abs(npc.x - tx) <= 1 && Math.abs(npc.y - ty) <= 1) {
          if (npc.role === "innkeeper") { setInnOpen(true); return; }
          if (npc.role === "shop") { setShopOpen(true); return; }
          setDialog(npc.line);
          return;
        }
      }
    } else {
      const room = DUNGEON_ROOMS[save.location as DungeonRoom["id"]];
      if (room.saveTile && room.saveTile.x === tx && room.saveTile.y === ty) {
        save.pos = { x: tx, y: ty };
        save.savedAt = Date.now();
        save.hero.stats.hp = save.hero.stats.maxHp;
        save.hero.stats.mp = save.hero.stats.maxMp;
        writeSave(save);
        sfxHeal();
        flashToast("Saved. Healed.");
        return;
      }
      if (room.chest && room.chest.x === tx && room.chest.y === ty) {
        const flagKey = "chest_" + room.id + "_" + tx + "_" + ty;
        if ((save.flags as Record<string, boolean | undefined>)[flagKey]) {
          flashToast("Empty.");
          return;
        }
        (save.flags as Record<string, boolean | undefined>)[flagKey] = true;
        const existing = save.inventory.find(e => e.itemId === room.chest!.itemId);
        if (existing) existing.qty += room.chest.qty;
        else save.inventory.push({ itemId: room.chest.itemId, qty: room.chest.qty });
        writeSave(save);
        sfxHeal();
        flashToast("Found " + room.chest.qty + "x " + room.chest.itemId.replace(/_/g, " ") + "!");
        return;
      }
    }
  }

  function drawFrame(ctx2d: CanvasRenderingContext2D, save: SavePayload | null, loop: GameLoopState): void {
    const canvas = ctx2d.canvas;
    const w = parseInt(canvas.style.width || String(canvas.width), 10);
    const h = parseInt(canvas.style.height || String(canvas.height), 10);
    if (!save) { ctx2d.fillStyle = "#000"; ctx2d.fillRect(0, 0, w, h); return; }
    const zoom = save.location === "town" ? 2.8 : 3.2;
    const drawTile = TILE * zoom;
    const camX = loop.pos.x + TILE / 2 - w / 2 / zoom;
    const camY = loop.pos.y + TILE / 2 - h / 2 / zoom;

    ctx2d.fillStyle = save.location === "town" ? "#1a3a4a" : "#0a0510";
    ctx2d.fillRect(0, 0, w, h);

    const tiles = save.location === "town" ? TOWN_MAP.tiles : DUNGEON_ROOMS[save.location as DungeonRoom["id"]].tiles;
    const ts = getTileset();
    const context = save.location === "town" ? "town" : "dungeon";
    const startTx = Math.max(0, Math.floor(camX / TILE));
    const startTy = Math.max(0, Math.floor(camY / TILE));
    const endTx = Math.min(tiles[0].length, startTx + Math.ceil(w / drawTile) + 2);
    const endTy = Math.min(tiles.length, startTy + Math.ceil(h / drawTile) + 2);

    for (let ty = startTy; ty < endTy; ty += 1) {
      const row = tiles[ty];
      if (!row) continue;
      for (let tx = startTx; tx < endTx; tx += 1) {
        const c = row[tx];
        if (!c) continue;
        let tc: HTMLCanvasElement | undefined;
        if (USE_V2_TILES) {
          // v2: Kenney roguelike sheet, indexed per-context. Falls through
          // to the procedural v1 tile if the glyph isn't mapped.
          tc = getV2Tile(context, c) ?? ts.by[c];
        } else {
          tc = ts.by[c];
          if (save.location !== "town") {
            if (c === ".") tc = ts.by["#"];
            if (c === "#") tc = ts.by["#"];
          }
        }
        if (!tc) continue;
        const dx = Math.floor((tx * TILE - camX) * zoom);
        const dy = Math.floor((ty * TILE - camY) * zoom);
        ctx2d.drawImage(tc, dx, dy, drawTile, drawTile);
      }
    }

    if (save.location !== "town") {
      ctx2d.fillStyle = "rgba(0,0,0,0.5)";
      ctx2d.fillRect(0, 0, w, h);
      const cx = Math.floor((loop.pos.x + TILE / 2 - camX) * zoom);
      const cy = Math.floor((loop.pos.y + TILE / 2 - camY) * zoom);
      const grad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, drawTile * 5);
      grad.addColorStop(0, "rgba(254, 230, 138, 0.65)");
      grad.addColorStop(0.4, "rgba(254, 230, 138, 0.18)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, w, h);
    }

    if (save.location === "town") {
      for (const npc of TOWN_MAP.npcs) {
        const sprite = getNpcSprite(npc.tint, npc.role);
        const frame = sprite.frames.down[0];
        const dx = Math.floor((npc.x * TILE - camX) * zoom);
        const dy = Math.floor((npc.y * TILE - camY) * zoom);
        ctx2d.drawImage(frame, dx, dy, drawTile, drawTile);
        if (npc.role === "save") {
          ctx2d.fillStyle = "#fde68a";
          ctx2d.fillRect(dx + drawTile * 0.35, dy - 4, 3, 3);
        }
      }
    }
    const liora = getLioraSprite();
    const frame = liora.frames[loop.facing][loop.walkPhase];
    const px = Math.floor((loop.pos.x - camX) * zoom);
    const py = Math.floor((loop.pos.y - camY) * zoom);
    ctx2d.drawImage(frame, px, py, drawTile, drawTile);

    drawHud(ctx2d, save, w, h);
  }

  function drawHud(ctx2d: CanvasRenderingContext2D, save: SavePayload, w: number, _h: number): void {
    ctx2d.save();
    ctx2d.fillStyle = "rgba(10,4,20,0.7)";
    ctx2d.fillRect(8, 8, 220, 56);
    ctx2d.strokeStyle = "#fbbf24";
    ctx2d.strokeRect(8, 8, 220, 56);
    ctx2d.fillStyle = "#fde68a";
    ctx2d.font = "bold 13px system-ui";
    ctx2d.fillText("Liora · Lv. " + save.hero.level, 16, 24);
    ctx2d.fillStyle = "#7f1d1d";
    ctx2d.fillRect(16, 30, 200, 8);
    ctx2d.fillStyle = "#ef4444";
    ctx2d.fillRect(16, 30, 200 * (save.hero.stats.hp / save.hero.stats.maxHp), 8);
    ctx2d.fillStyle = "#fff";
    ctx2d.font = "11px system-ui";
    ctx2d.fillText("HP " + save.hero.stats.hp + "/" + save.hero.stats.maxHp, 20, 38);
    ctx2d.fillStyle = "#1e3a8a";
    ctx2d.fillRect(16, 42, 200, 6);
    ctx2d.fillStyle = "#60a5fa";
    ctx2d.fillRect(16, 42, 200 * (save.hero.stats.mp / save.hero.stats.maxMp), 6);
    ctx2d.fillStyle = "#fff";
    ctx2d.fillText("MP " + save.hero.stats.mp + "/" + save.hero.stats.maxMp, 20, 48);
    ctx2d.fillStyle = "#365314";
    ctx2d.fillRect(16, 52, 200, 4);
    ctx2d.fillStyle = "#a3e635";
    ctx2d.fillRect(16, 52, 200 * (save.hero.xp / save.hero.xpToNext), 4);
    ctx2d.fillStyle = "rgba(10,4,20,0.7)";
    ctx2d.fillRect(w - 200, 8, 192, 28);
    ctx2d.strokeStyle = "#fbbf24";
    ctx2d.strokeRect(w - 200, 8, 192, 28);
    ctx2d.fillStyle = "#fde68a";
    ctx2d.font = "bold 14px Georgia,serif";
    const loc = save.location === "town" ? "Threnfall" : save.location === "dungeon-boss" ? "The Bell Tower" : ("Silent Chapel · Room " + save.location.slice(-1));
    ctx2d.fillText(loc, w - 192, 26);
    ctx2d.fillStyle = "#fde68a";
    ctx2d.font = "12px system-ui";
    ctx2d.fillText("◈ " + save.gold + " gold", w - 192, 50);
    ctx2d.restore();
  }

  useEffect(() => {
    const downKeys = new Set<string>();
    function updateAxes(): void {
      const loop = loopRef.current;
      const u = downKeys.has("ArrowUp") || downKeys.has("KeyW");
      const d = downKeys.has("ArrowDown") || downKeys.has("KeyS");
      const l = downKeys.has("ArrowLeft") || downKeys.has("KeyA");
      const r = downKeys.has("ArrowRight") || downKeys.has("KeyD");
      let x = 0, y = 0;
      if (l) x -= 1;
      if (r) x += 1;
      if (u) y -= 1;
      if (d) y += 1;
      const m = Math.hypot(x, y) || 1;
      loop.inputDx = x / m;
      loop.inputDy = y / m;
    }
    function onDown(e: KeyboardEvent): void {
      downKeys.add(e.code);
      if (e.code === "Space" || e.code === "Enter") {
        const loop = loopRef.current;
        loop.pressedA = true;
        if (dialog) setDialog(null);
      }
      if (e.code === "Escape") {
        const loop = loopRef.current;
        loop.pressedB = true;
        if (menuOpen) setMenuOpen(false);
        if (shopOpen) setShopOpen(false);
        if (innOpen) setInnOpen(false);
      }
      updateAxes();
    }
    function onUp(e: KeyboardEvent): void {
      downKeys.delete(e.code);
      updateAxes();
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [dialog, menuOpen, shopOpen, innOpen]);

  function buyItem(itemId: string, price: number): void {
    const save = stateRef.current;
    if (!save) return;
    if (save.gold < price) { flashToast("Not enough gold."); return; }
    save.gold -= price;
    const ex = save.inventory.find(e => e.itemId === itemId);
    if (ex) ex.qty += 1;
    else save.inventory.push({ itemId, qty: 1 });
    writeSave(save);
    sfxTick();
    flashToast("Bought " + itemId.replace(/_/g, " ") + ".");
  }

  function restAtInn(): void {
    const save = stateRef.current;
    if (!save) return;
    if (save.gold < 12) { flashToast("Not enough gold to rest."); return; }
    save.gold -= 12;
    save.hero.stats.hp = save.hero.stats.maxHp;
    save.hero.stats.mp = save.hero.stats.maxMp;
    writeSave(save);
    sfxHeal();
    flashToast("You slept warm. Fully restored.");
    setInnOpen(false);
  }

  function useItemFromMenu(itemId: string): void {
    const save = stateRef.current;
    if (!save) return;
    const ex = save.inventory.find(e => e.itemId === itemId);
    if (!ex || ex.qty <= 0) return;
    if (itemId === "mendherb") {
      save.hero.stats.hp = Math.min(save.hero.stats.maxHp, save.hero.stats.hp + 30);
      ex.qty -= 1;
    } else if (itemId === "tonewater") {
      save.hero.stats.mp = Math.min(save.hero.stats.maxMp, save.hero.stats.mp + 15);
      ex.qty -= 1;
    } else if (itemId === "lantern_oil") {
      save.hero.stats.hp = Math.min(save.hero.stats.maxHp, save.hero.stats.hp + 80);
      ex.qty -= 1;
    }
    writeSave(save);
    sfxHeal();
    flashToast("Used " + itemId.replace(/_/g, " ") + ".");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />
      <JrpgJoystick onMove={(dx, dy) => { const l = loopRef.current; l.inputDx = dx; l.inputDy = dy; }} />
      <JrpgActionButtons
        onA={() => {
          const l = loopRef.current;
          if (dialog) { setDialog(null); return; }
          if (menuOpen) { setMenuOpen(false); return; }
          if (shopOpen) { setShopOpen(false); return; }
          if (innOpen) { setInnOpen(false); return; }
          l.pressedA = true;
        }}
        onB={() => {
          if (menuOpen || shopOpen || innOpen || dialog) {
            setDialog(null); setMenuOpen(false); setShopOpen(false); setInnOpen(false);
            return;
          }
          setMenuOpen(true);
        }}
      />

      <button onClick={() => nav("/jrpg")} style={topRightBtnStyle(56)}>&larr; Title</button>
      <button onClick={() => { const m = !muted; setMuted(m); setMutedLocal(m); }} style={topRightBtnStyle(8)}>{muted ? "Mute" : "Sound"}</button>

      {/* DEBUG: force-trigger an encounter so we can sanity-check the battle
          pipeline independent of the RNG / step trigger. Hidden in town. */}
      {currentLocation !== "town" && (
        <button
          onClick={() => {
            const save = stateRef.current;
            if (!save) return;
            const loop = loopRef.current;
            const tx = Math.floor((loop.pos.x + TILE / 2) / TILE);
            const ty = Math.floor((loop.pos.y + TILE / 2) / TILE);
            const enemies = randomTrashEncounter();
            save.pos = { x: tx, y: ty };
            writeSave(save);
            sessionStorage.setItem("aethersong_pending_battle", JSON.stringify(enemies));
            sessionStorage.setItem("aethersong_return_location", save.location);
            sessionStorage.setItem("aethersong_return_pos", JSON.stringify({ x: tx, y: ty }));
            console.log("[AETHERSONG] DEBUG FIGHT NOW pressed -> /jrpg/battle");
            nav("/jrpg/battle");
          }}
          style={{
            position: "fixed", top: 72, right: 8,
            background: "rgba(120,30,30,0.85)",
            border: "1px solid #fca5a5",
            color: "#fee2e2",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 20,
            letterSpacing: 0.5,
          }}
        >DEBUG: FIGHT NOW</button>
      )}

      {toastMsg && (
        <div style={{
          position: "fixed", left: "50%", top: 90, transform: "translateX(-50%)",
          background: "rgba(10,4,20,0.86)", color: "#fde68a",
          padding: "10px 18px", borderRadius: 8,
          border: "1px solid #fbbf24", fontFamily: "Georgia, serif",
          fontSize: 16, zIndex: 30,
        }}>{toastMsg}</div>
      )}

      {dialog && (<DialogBox text={dialog} onClose={() => setDialog(null)} />)}
      {menuOpen && (
        <PauseMenu
          save={stateRef.current}
          onClose={() => setMenuOpen(false)}
          onUseItem={useItemFromMenu}
          onTitle={() => nav("/jrpg")}
        />
      )}
      {shopOpen && (
        <ShopUI gold={stateRef.current?.gold ?? 0} onBuy={buyItem} onClose={() => setShopOpen(false)} />
      )}
      {innOpen && (
        <InnUI gold={stateRef.current?.gold ?? 0} onRest={restAtInn} onClose={() => setInnOpen(false)} />
      )}
    </div>
  );
}

function topRightBtnStyle(right: number): React.CSSProperties {
  return {
    position: "fixed", top: 8, right,
    background: "rgba(10,4,20,0.75)",
    border: "1px solid #71717a",
    color: "#fde68a",
    padding: "6px 10px",
    borderRadius: 6, fontSize: 13, cursor: "pointer",
    zIndex: 20,
  };
}

function DialogBox({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", left: 16, right: 16, bottom: 120,
      background: "linear-gradient(180deg, rgba(20,10,40,0.95), rgba(8,4,20,0.95))",
      color: "#e4e4e7", padding: 16, borderRadius: 12,
      border: "2px solid #fbbf24",
      fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.5,
      zIndex: 30,
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    }}>
      <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
      <div style={{ textAlign: "right", marginTop: 12 }}>
        <button onClick={onClose} style={{
          background: "#fbbf24", color: "#1c1530", padding: "6px 18px",
          border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer",
        }}>OK</button>
      </div>
    </div>
  );
}

function PauseMenu({ save, onClose, onUseItem, onTitle }: { save: SavePayload | null; onClose: () => void; onUseItem: (id: string) => void; onTitle: () => void }) {
  if (!save) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(520px, 100%)", maxHeight: "80vh", overflowY: "auto",
        background: "#1c1530", border: "2px solid #fbbf24", borderRadius: 12,
        color: "#e4e4e7", padding: 20, fontFamily: "Georgia, serif",
      }}>
        <h3 style={{ margin: "0 0 12px", color: "#fde68a" }}>Pause Menu</h3>
        <div style={{ background: "#0d0820", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          <div>Liora · Lv. {save.hero.level} · XP {save.hero.xp}/{save.hero.xpToNext}</div>
          <div>HP {save.hero.stats.hp}/{save.hero.stats.maxHp} · MP {save.hero.stats.mp}/{save.hero.stats.maxMp}</div>
          <div>ATK {save.hero.stats.atk} · DEF {save.hero.stats.def} · VOICE {save.hero.stats.voice} · RES {save.hero.stats.resist}</div>
          <div>Gold ◈ {save.gold}</div>
        </div>
        <h4 style={{ color: "#fbbf24", margin: "12px 0 6px" }}>Inventory</h4>
        {save.inventory.length === 0 && <div style={{ color: "#94a3b8" }}>(empty)</div>}
        {save.inventory.map(e => (
          <div key={e.itemId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #2c2640" }}>
            <span>{e.itemId.replace(/_/g, " ")} x{e.qty}</span>
            <button onClick={() => onUseItem(e.itemId)} style={{
              background: "#7c3aed", color: "#fff", padding: "4px 10px",
              border: "none", borderRadius: 4, cursor: "pointer",
            }}>Use</button>
          </div>
        ))}
        <h4 style={{ color: "#fbbf24", margin: "16px 0 6px" }}>Abilities (Verses)</h4>
        {save.hero.abilities.map(a => (
          <div key={a.id} style={{ padding: "4px 0", color: "#cbd5e1" }}>
            {a.id.replace(/_/g, " ")} <span style={{ color: "#71717a" }}>· MP {a.mp}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onTitle} style={{ background: "#71717a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>To Title</button>
          <button onClick={onClose} style={{ background: "#fbbf24", color: "#1c1530", fontWeight: 700, border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer" }}>Resume</button>
        </div>
      </div>
    </div>
  );
}

function ShopUI({ gold, onBuy, onClose }: { gold: number; onBuy: (id: string, price: number) => void; onClose: () => void }) {
  const items = [
    { id: "mendherb", name: "Mendherb", desc: "Restore 30 HP.", price: 8 },
    { id: "tonewater", name: "Tonewater", desc: "Restore 15 MP.", price: 15 },
    { id: "lantern_oil", name: "Lantern Oil", desc: "Restore 80 HP.", price: 30 },
  ];
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(480px,100%)", background: "#1c1530", color: "#e4e4e7",
        border: "2px solid #fbbf24", borderRadius: 12, padding: 20, fontFamily: "Georgia, serif",
      }}>
        <h3 style={{ margin: "0 0 4px", color: "#fde68a" }}>Mira&apos;s Wares</h3>
        <div style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 12 }}>You carry ◈ {gold} gold.</div>
        {items.map(i => (
          <div key={i.id} style={{ background: "#0d0820", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: "#fbbf24" }}>{i.name}</strong>
              <span>◈ {i.price}</span>
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>{i.desc}</div>
            <button onClick={() => onBuy(i.id, i.price)} style={{
              marginTop: 8, background: "#7c3aed", color: "#fff", border: "none",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
            }}>Buy</button>
          </div>
        ))}
        <button onClick={onClose} style={{
          marginTop: 10, background: "#fbbf24", color: "#1c1530", border: "none",
          padding: "8px 18px", borderRadius: 6, fontWeight: 700, cursor: "pointer",
        }}>Done</button>
      </div>
    </div>
  );
}

function InnUI({ gold, onRest, onClose }: { gold: number; onRest: () => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(420px,100%)", background: "#1c1530", color: "#e4e4e7",
        border: "2px solid #fbbf24", borderRadius: 12, padding: 22, fontFamily: "Georgia, serif",
      }}>
        <h3 style={{ margin: "0 0 8px", color: "#fde68a" }}>Bram&apos;s Inn</h3>
        <p style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
          A worn quilt. A clean pillow. ◈ 12 gold a night.
          Sleep restores your HP and MP. (You have ◈ {gold}.)
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "#71717a", color: "#fff", border: "none",
            padding: "8px 16px", borderRadius: 6, cursor: "pointer",
          }}>No thanks</button>
          <button onClick={onRest} style={{
            background: "#fbbf24", color: "#1c1530", border: "none",
            padding: "8px 18px", borderRadius: 6, fontWeight: 700, cursor: "pointer",
          }}>Rest (◈12)</button>
        </div>
      </div>
    </div>
  );
}
