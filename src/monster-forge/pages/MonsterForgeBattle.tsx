// Monster Forge - Phase 4 Battle Arena page.
//
// Side-by-side arena: player monster on left, opponent on right. HP bars
// top of each side (color-coded to element), power charges indicator
// (3 lightning bolts deplete as used), action panel at bottom:
//   ATTACK / POWER / DEFEND
//
// Monsters animate via CSS transforms (jump forward on attack). Power
// effects reuse `buildPowerEffect` from Phase 3 - spawned in the canvas
// scene attached to the attacker's root.
//
// W/L recorded on conclusion. Shards awarded (5 win / 1 loss). XP +10
// to winning monster. Level up if XP threshold crossed.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { ArrowLeft } from "lucide-react";
import { assembleMonster, loadSaved, type AssembledMonster } from "../engine";
import { loadManifest, type Manifest, type SavedMonster, type BodyType } from "../partsManifest";
import { applyPotionsToMonster } from "../engine/effects";
import { buildIdleAnimator, type IdleAnimator } from "../engine/animations";
import { buildPowerEffect, type ActiveEffect } from "../engine/powers";
import {
  createBattle, applyAction, startRound, aiChooseAction, toBattleMonster,
  type BattleState, type BattleMonster, type Action,
} from "../engine/battle";
import { recordOutcome, getRecord } from "../engine/records";
import { addShards } from "../engine/shards";
import { makeCpuMonster } from "../engine/cpu";
import { unlockAchievement } from "../engine/achievements";

export default function MonsterForgeBattle() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const playerId = params.get("p") ?? "";
  const mode = (params.get("m") ?? "cpu") as "cpu" | "friend";
  const opponentId = params.get("o") ?? "";

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [state, setState] = useState<BattleState | null>(null);
  const [showPowerPicker, setShowPowerPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [popups, setPopups] = useState<{ id: number; side: "player" | "opponent"; text: string; color: string }[]>([]);
  const [resolved, setResolved] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");
  const [shardsAwarded, setShardsAwarded] = useState(0);
  const [matchupBanner, setMatchupBanner] = useState<{ text: string; key: number } | null>(null);

  // 3D scene refs
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerAmRef = useRef<AssembledMonster | null>(null);
  const opponentAmRef = useRef<AssembledMonster | null>(null);
  const playerAnimRef = useRef<IdleAnimator | null>(null);
  const opponentAnimRef = useRef<IdleAnimator | null>(null);
  const effectsRef = useRef<ActiveEffect[]>([]);
  const animationsActiveRef = useRef<{ side: "player" | "opponent"; kind: "attack" | "hit" | "ko"; t0: number; duration: number }[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const popupIdRef = useRef(0);

  // ── Load monsters + assemble battle state ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await loadManifest();
      if (cancelled) return;
      setManifest(m);
      const saved = loadSaved();
      const player = saved.find(x => x.id === playerId);
      if (!player) { setOutcomeText("Monster not found"); setResolved(true); return; }
      const playerBodyDef = m.parts.body.find(b => b.id === player.config.body);
      const playerBodyType = (playerBodyDef?.bodyType ?? "biped") as BodyType;

      let opponent: SavedMonster | null = null;
      let opponentBodyType: BodyType = "biped";
      if (mode === "cpu") {
        const cpu = makeCpuMonster(m, player.stats);
        opponent = cpu.monster;
        opponentBodyType = cpu.bodyType;
      } else if (mode === "friend" && opponentId) {
        opponent = saved.find(x => x.id === opponentId) ?? null;
        const oDef = opponent ? m.parts.body.find(b => b.id === opponent!.config.body) : null;
        opponentBodyType = (oDef?.bodyType ?? "biped") as BodyType;
      }
      if (!opponent) { setOutcomeText("Opponent not found"); setResolved(true); return; }

      const pBm = toBattleMonster(player, playerBodyType, false);
      const oBm = toBattleMonster(opponent, opponentBodyType, mode === "cpu");
      setState(createBattle(pBm, oBm));

      // Build 3D scene
      await buildArena(player, opponent, m);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build the shared 3D arena scene (one renderer, two monsters offset) ──
  async function buildArena(player: SavedMonster, opponent: SavedMonster, m: Manifest) {
    const host = sceneHostRef.current;
    if (!host) return;
    const width = host.clientWidth || 600;
    const height = host.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // Arena floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x2d1530, roughness: 0.8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.4, 4.5, 64),
      new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff5252, emissiveIntensity: 0.6, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffe5cc, 1.2);
    key.position.set(2, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa0c4ff, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    // Camera
    const cam = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    cam.position.set(0, 1.6, 6);
    cam.lookAt(0, 1.0, 0);
    cameraRef.current = cam;

    // Player monster - left
    const pAm = await assembleMonster(player.config, m);
    applyPotionsToMonster(pAm, player.activePotions ?? [], m);
    pAm.root.position.set(-1.8, 0, 0);
    pAm.root.rotation.y = Math.PI * 0.15; // turn slightly to face opponent
    scene.add(pAm.root);
    playerAmRef.current = pAm;
    playerAnimRef.current = buildIdleAnimator(pAm);

    // Opponent monster - right
    const oAm = await assembleMonster(opponent.config, m);
    applyPotionsToMonster(oAm, opponent.activePotions ?? [], m);
    oAm.root.position.set(1.8, 0, 0);
    oAm.root.rotation.y = -Math.PI * 0.15 + Math.PI; // face player
    scene.add(oAm.root);
    opponentAmRef.current = oAm;
    opponentAnimRef.current = buildIdleAnimator(oAm);

    // Resize handler
    const onResize = () => {
      const w = host.clientWidth || 600, h = host.clientHeight || 360;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    const tick = () => {
      const dt = clockRef.current.getDelta();
      const t = clockRef.current.elapsedTime;
      // Mixers + idle
      pAm.mixer?.update(dt);
      oAm.mixer?.update(dt);
      playerAnimRef.current?.update(t, dt);
      opponentAnimRef.current?.update(t, dt);

      // Active battle anims (attack lunge, hit shake, ko fade)
      const now = performance.now() / 1000;
      const stillActive: typeof animationsActiveRef.current = [];
      for (const anim of animationsActiveRef.current) {
        const am = anim.side === "player" ? playerAmRef.current : opponentAmRef.current;
        const k = Math.min(1, (now - anim.t0) / anim.duration);
        if (am) {
          if (anim.kind === "attack") {
            // Lunge forward then back
            const lunge = Math.sin(k * Math.PI) * 1.2 * (anim.side === "player" ? 1 : -1);
            const baseX = anim.side === "player" ? -1.8 : 1.8;
            am.root.position.x = baseX + lunge;
          } else if (anim.kind === "hit") {
            // Brief shake + tilt
            am.root.rotation.z = Math.sin(k * Math.PI * 6) * 0.15 * (1 - k);
          } else if (anim.kind === "ko") {
            am.root.position.y = -k * 0.3;
            am.root.rotation.z = k * 0.6 * (anim.side === "player" ? 1 : -1);
            am.root.scale.setScalar((1 - k) * 0.95 + 0.05);
          }
        }
        if (k < 1) stillActive.push(anim);
        else if (am && anim.kind !== "ko") {
          // Snap back
          am.root.position.x = anim.side === "player" ? -1.8 : 1.8;
          am.root.rotation.z = 0;
        }
      }
      animationsActiveRef.current = stillActive;

      // Active power effects
      effectsRef.current = effectsRef.current.filter(e => e.update(t, dt));

      renderer.render(scene, cam);
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      try { host.removeChild(renderer.domElement); } catch { /* */ }
    };
  }
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  // ── Floating damage popup helper ───────────────────────────────────
  function pushPopup(side: "player" | "opponent", text: string, color: string) {
    const id = ++popupIdRef.current;
    setPopups(ps => [...ps, { id, side, text, color }]);
    setTimeout(() => setPopups(ps => ps.filter(p => p.id !== id)), 1100);
  }

  // ── Spawn power effect in 3D (reuse Phase 3) ───────────────────────
  function spawnPowerFx(side: "player" | "opponent", powerIdx: number) {
    const am = side === "player" ? playerAmRef.current : opponentAmRef.current;
    const bm = side === "player" ? state?.player : state?.opponent;
    if (!am || !bm) return;
    const pw = bm.powers[powerIdx];
    if (!pw) return;
    const fx = buildPowerEffect(pw, am);
    effectsRef.current.push(fx);
  }

  // ── Action handler ──────────────────────────────────────────────────
  async function performAction(side: "player" | "opponent", action: Action) {
    if (!state || state.winner || busy) return;
    setBusy(true);
    setShowPowerPicker(false);

    // Spawn the visual for the action first
    if (action.kind === "attack") {
      animationsActiveRef.current.push({ side, kind: "attack", t0: performance.now()/1000, duration: 0.6 });
    } else if (action.kind === "power") {
      spawnPowerFx(side, action.powerIndex);
      animationsActiveRef.current.push({ side, kind: "attack", t0: performance.now()/1000, duration: 0.8 });
    }
    // Hit shake on defender (when offensive)
    if (action.kind !== "defend") {
      const otherSide = side === "player" ? "opponent" : "player";
      setTimeout(() => {
        animationsActiveRef.current.push({ side: otherSide, kind: "hit", t0: performance.now()/1000, duration: 0.45 });
      }, 250);
    }

    // Apply to logical state after small visual delay
    await wait(action.kind === "power" ? 700 : 500);
    const after = applyAction(state, side, action);

    // Damage popup
    const dmgEvt = after.log.slice().reverse().find(e => (e.kind === "attack" || e.kind === "power") && e.side === side);
    if (dmgEvt && dmgEvt.damage) {
      const defSide = side === "player" ? "opponent" : "player";
      pushPopup(defSide, `-${dmgEvt.damage}`, dmgEvt.matchupMul && dmgEvt.matchupMul >= 2 ? "#ef4444" : "#fbbf24");
      if (dmgEvt.matchupText) {
        setMatchupBanner({ text: dmgEvt.matchupText, key: Date.now() });
        setTimeout(() => setMatchupBanner(null), 1400);
      }
    }
    if (action.kind === "defend") {
      pushPopup(side, "GUARD!", "#60a5fa");
    }

    setState(after);

    // Check KO
    if (after.winner) {
      const koSide = after.winner === "player" ? "opponent" : "player";
      animationsActiveRef.current.push({ side: koSide, kind: "ko", t0: performance.now()/1000, duration: 1.0 });
      await wait(1000);
      handleConclude(after);
      setBusy(false);
      return;
    }

    // Advance turn / round
    if (after.nextActor === null) {
      await wait(450);
      setState(s => s ? startRound(s) : s);
    }

    setBusy(false);
  }

  // ── Conclude battle - record W/L + shards + achievements ──────────
  function handleConclude(finalState: BattleState) {
    setResolved(true);
    const playerWon = finalState.winner === "player";
    const playerId = finalState.player.id;
    const opponentId = finalState.opponent.id;
    if (playerWon) {
      recordOutcome(playerId, "win");
      // Opponent only records loss if it was a saved (friend) monster
      if (!opponentId.startsWith("cpu_")) recordOutcome(opponentId, "loss");
      const earned = addShards(5);
      setShardsAwarded(5);
      setOutcomeText(`${finalState.player.name} wins!`);
      // Achievements
      unlockAchievement("first_battle");
      const rec = getRecord(playerId);
      if (rec.wins >= 10) unlockAchievement("champion");
      void earned;
    } else {
      recordOutcome(playerId, "loss");
      if (!opponentId.startsWith("cpu_")) recordOutcome(opponentId, "win");
      addShards(1);
      setShardsAwarded(1);
      setOutcomeText(`${finalState.opponent.name} wins!`);
    }
  }

  // ── CPU auto-act ────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || state.winner || busy) return;
    if (state.nextActor === "opponent" && state.opponent.isCpu) {
      const action = aiChooseAction(state, "opponent");
      const t = setTimeout(() => performAction("opponent", action), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nextActor, busy, state?.winner]);

  const playerTurn = !!state && state.nextActor === "player" && !state.winner && !busy;
  const opponentMonsterReadonly = !!state && state.opponent && !state.opponent.isCpu && state.nextActor === "opponent";

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(700px 500px at 25% 0%, rgba(180,80,80,0.2), transparent 60%), " +
          "radial-gradient(800px 600px at 80% 100%, rgba(80,40,160,0.2), transparent 60%), " +
          "linear-gradient(180deg, #150612 0%, #050308 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-3 flex items-center gap-3 safe-top">
        <button onClick={() => navigate("/monster-forge")} aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-[9px] tracking-[0.3em] font-display" style={{ color: "#fda4af" }}>MONSTER FORGE</div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>BATTLE ARENA</h1>
        </div>
        <div className="text-[10px] tracking-wider font-display" style={{ color: "rgba(229,231,235,0.6)" }}>
          {state ? `Round ${state.round}` : ""}
        </div>
      </header>

      {/* HP bars + names */}
      <div className="px-3 flex gap-3 mb-2">
        {state && <SideHud bm={state.player} side="player" />}
        {state && <SideHud bm={state.opponent} side="opponent" />}
      </div>

      {/* 3D arena */}
      <div className="relative px-3" style={{ flex: "0 1 auto" }}>
        <div ref={sceneHostRef} className="relative w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: "16/9", background: "linear-gradient(180deg, #1b0a1f 0%, #060309 100%)", border: "1px solid rgba(255,255,255,0.1)" }} />
        {/* Damage popups */}
        {popups.map(p => (
          <div key={p.id}
            className="absolute font-display text-2xl pointer-events-none animate-dmgFloat"
            style={{
              left: p.side === "player" ? "22%" : "72%",
              top: "30%",
              color: p.color,
              textShadow: "0 2px 6px rgba(0,0,0,0.7)",
            }}>{p.text}</div>
        ))}
        {matchupBanner && (
          <div key={matchupBanner.key}
            className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-display tracking-widest animate-bannerPop pointer-events-none"
            style={{ background: matchupBanner.text.includes("SUPER") ? "rgba(239,68,68,0.85)" : "rgba(59,130,246,0.85)", color: "#fff" }}>
            {matchupBanner.text}
          </div>
        )}
      </div>

      {/* Action panel */}
      <div className="mt-3 px-3 pb-6 max-w-3xl mx-auto w-full safe-bottom" style={{ flex: 1 }}>
        {resolved ? (
          <ResolutionPanel
            outcomeText={outcomeText}
            shardsAwarded={shardsAwarded}
            playerWon={!!state && state.winner === "player"}
            onAgain={() => navigate("/monster-forge")}
            playerName={state?.player.name ?? ""} />
        ) : !showPowerPicker ? (
          <div className="grid grid-cols-3 gap-2">
            <ActionButton label="ATTACK" emoji="⚔️" disabled={!playerTurn} onClick={() => performAction("player", { kind: "attack" })} />
            <ActionButton
              label={`POWER · ${state?.player.charges ?? 0}`}
              emoji="✨"
              disabled={!playerTurn || (state?.player.charges ?? 0) <= 0 || (state?.player.powers?.length ?? 0) === 0}
              onClick={() => setShowPowerPicker(true)} />
            <ActionButton label="DEFEND" emoji="🛡️" disabled={!playerTurn} onClick={() => performAction("player", { kind: "defend" })} />
          </div>
        ) : (
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>PICK A POWER</div>
            <div className="grid grid-cols-1 gap-2">
              {state?.player.powers.map((p, i) => (
                <button key={p.id}
                  onClick={() => performAction("player", { kind: "power", powerIndex: i })}
                  disabled={!playerTurn}
                  className="px-3 py-3 rounded-xl text-left pressable touch-target flex items-center gap-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(125,80,180,0.25), rgba(180,80,80,0.20))",
                    border: "1px solid rgba(180,80,200,0.4)",
                    color: "#fef3c7", opacity: playerTurn ? 1 : 0.6,
                  }}>
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="font-display tracking-wide text-[13px]" style={{ color: "#fde047" }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.65)" }}>{p.description}</div>
                  </div>
                  <div className="text-[10px] font-display tracking-wider" style={{ color: "#fda4af" }}>×{p.power.toFixed(1)}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPowerPicker(false)}
              className="mt-2 w-full px-3 py-2 rounded-xl text-[11px] font-display tracking-wider pressable touch-target"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(229,231,235,0.7)" }}>
              CANCEL
            </button>
          </div>
        )}

        {!resolved && !playerTurn && !showPowerPicker && (
          <div className="mt-3 text-center text-[11px]" style={{ color: "rgba(229,231,235,0.6)" }}>
            {opponentMonsterReadonly ? "Friend's turn (auto)…" : "Opponent thinking…"}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dmgFloat {
          0%   { opacity: 0; transform: translateY(0) scale(0.7); }
          15%  { opacity: 1; transform: translateY(-10px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.9); }
        }
        .animate-dmgFloat { animation: dmgFloat 1.1s ease-out forwards; }
        @keyframes bannerPop {
          0%   { opacity: 0; transform: translate(-50%, -10px) scale(0.7); }
          20%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          80%  { opacity: 1; transform: translate(-50%, 0) scale(1.0); }
          100% { opacity: 0; transform: translate(-50%, -10px) scale(0.95); }
        }
        .animate-bannerPop { animation: bannerPop 1.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

function SideHud({ bm, side }: { bm: BattleMonster; side: "player" | "opponent" }) {
  const pct = Math.max(0, Math.min(1, bm.hp / Math.max(1, bm.maxHp)));
  const color = ELEMENT_BAR_COLOR[bm.element] ?? "#fde047";
  return (
    <div className="flex-1 rounded-xl p-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-display text-[12px] tracking-wide truncate" style={{ color: "#fde047" }}>
          {bm.name}
        </div>
        <div className="text-[9px] tracking-widest font-display" style={{ color: "rgba(229,231,235,0.65)" }}>
          {bm.element.toUpperCase()}
        </div>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 0.4s ease-out" }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <div style={{ color: "rgba(229,231,235,0.7)" }}>HP {Math.round(bm.hp)}/{bm.maxHp}</div>
        <div className="flex gap-0.5">
          {[0,1,2].map(i => (
            <div key={i} className="text-[10px]" style={{ opacity: i < bm.charges ? 1 : 0.25 }}>⚡</div>
          ))}
        </div>
      </div>
      {side === "player" && bm.defending && (
        <div className="mt-1 text-[9px] font-display tracking-widest" style={{ color: "#60a5fa" }}>GUARDING</div>
      )}
      {side === "opponent" && bm.defending && (
        <div className="mt-1 text-[9px] font-display tracking-widest" style={{ color: "#60a5fa" }}>GUARDING</div>
      )}
    </div>
  );
}

function ActionButton({ label, emoji, disabled, onClick }: { label: string; emoji: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-4 rounded-xl pressable touch-target flex flex-col items-center justify-center gap-1"
      style={{
        background: "linear-gradient(135deg, rgba(180,80,80,0.3), rgba(125,80,180,0.3))",
        border: "1px solid rgba(180,80,80,0.5)",
        color: "#fef3c7",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}>
      <div className="text-xl">{emoji}</div>
      <div className="font-display text-[10px] tracking-[0.2em]">{label}</div>
    </button>
  );
}

function ResolutionPanel({ outcomeText, shardsAwarded, playerWon, onAgain, playerName }: {
  outcomeText: string; shardsAwarded: number; playerWon: boolean; onAgain: () => void; playerName: string;
}) {
  return (
    <div className="rounded-2xl p-5 text-center"
      style={{
        background: playerWon
          ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(180,80,80,0.18))"
          : "linear-gradient(135deg, rgba(80,40,160,0.18), rgba(180,80,80,0.18))",
        border: playerWon ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.15)",
      }}>
      <div className="text-2xl mb-1">{playerWon ? "🏆" : "💔"}</div>
      <div className="font-display text-xl tracking-wider mb-2" style={{ color: "#fde047" }}>
        {outcomeText}
      </div>
      {playerWon && (
        <div className="text-[11px] mb-2" style={{ color: "rgba(229,231,235,0.8)" }}>
          {playerName} earned <strong>+10 XP</strong>
        </div>
      )}
      <div className="text-[11px] mb-3" style={{ color: "#fbbf24" }}>
        💎 +{shardsAwarded} Crystal Shards
      </div>
      <button onClick={onAgain}
        className="w-full px-4 py-3 rounded-xl font-display tracking-[0.25em] pressable touch-target"
        style={{
          background: "linear-gradient(135deg, #b91c1c, #7e22ce)",
          color: "#fef3c7", border: "1px solid rgba(255,255,255,0.15)",
          fontSize: 12,
        }}>
        BACK TO LAB
      </button>
    </div>
  );
}

const ELEMENT_BAR_COLOR: Record<string, string> = {
  fire: "#ff6f00", aqua: "#039be5", spark: "#fff176", earth: "#8d6e63",
  light: "#eceff1", dark: "#4a148c", physical: "#ef4444",
};

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
