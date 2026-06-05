// Cosmic Squad — Combat screen.
// Turn-based loop:
//   1. Tap a friendly ship to select it (camera follows it).
//   2. Drag from the ship to set a flight path. The dashed preview
//      reflects real inertia — capital ships curve wide, fighters
//      pivot tight. (Plain tap on the grid also works.)
//   3. Tap a missile in the loadout to set fire intent.
//   4. End Turn → ships steer toward their targets over ~1.2s; victory
//      check after resolution.
// The minimap in the top-right shows the whole map — scout for enemies.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CosmicShell, COSMIC_ACCENT } from "../components/CosmicShell";
import { BattleGrid } from "../components/BattleGrid";
import { useCosmic } from "../store";
import { getMission } from "../missions";
import {
  applyOrders, buildShipState, checkVictory, endTurn, initBattle,
  planAiOrders, tickStep, SUBTICKS, type BattleStateLive, type Order,
} from "../engine";
import { MISSILE_TYPES, type MissileId, type Battle } from "../types";
import { playSfx, unlockAudio } from "../../art";

export default function Combat() {
  const { slotId, missionId } = useParams<{ slotId: string; missionId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const load = useCosmic(s => s.load);
  useEffect(() => { unlockAudio(); }, []);
  const saves = useCosmic(s => s.saves);
  const award = useCosmic(s => s.awardMission);

  useEffect(() => { load(); }, []);

  const save = saves.find(s => s.id === slotId);
  const mission = missionId ? getMission(missionId) : undefined;
  const wingmenIds = useMemo(() => (params.get("wingmen") || "").split(",").filter(Boolean), [params]);

  const battleRef = useRef<BattleStateLive | null>(null);
  const [tick, setTick] = useState(0);  // forces re-render after mutations
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [resolving, setResolving] = useState(false);
  // Camera in world (cell) coords. Lerps toward the selected ship.
  const [camera, setCamera] = useState<{ x: number; y: number }>({ x: 4, y: 14 });

  // Build battle on mount.
  useEffect(() => {
    if (!save || !mission) return;
    if (battleRef.current) return;
    const playerShip = buildShipState({
      id: "p-player",
      ownerSlot: "player",
      classId: save.currentShipClass,
      faction: "player",
      callsign: save.callsign,
      loadout: save.loadout,
    });
    const wingmen = save.wingmen
      .filter(w => wingmenIds.includes(w.id))
      .map(w => buildShipState({
        id: `p-${w.id}`,
        ownerSlot: "wingman",
        classId: w.shipClassId,
        faction: "player",
        callsign: w.callsign,
        loadout: ["pulse", "vulcan"] as MissileId[],
        wingmanId: w.id,
      }));
    const count = mission.enemyCount[0] + Math.floor(Math.random() * (mission.enemyCount[1] - mission.enemyCount[0] + 1));
    const enemies = Array.from({ length: count }, (_, i) => {
      const cid = mission.enemyClasses[i % mission.enemyClasses.length];
      return buildShipState({
        id: `e-${i}`,
        ownerSlot: "enemy",
        classId: cid,
        faction: "enemy",
        callsign: `Bandit-${i + 1}`,
        loadout: ["pulse", "vulcan"] as MissileId[],
      });
    });
    const b = initBattle({ mission, playerShip, wingmen, enemies });
    battleRef.current = b;
    setSelectedShipId(playerShip.id);
    setCamera({ x: playerShip.x, y: playerShip.y });
    setTick(t => t + 1);
  }, [save?.id, mission?.id]);

  // Lerp camera to selected ship. Snappy but smooth so it feels like
  // a real follow-cam, not a teleport.
  useEffect(() => {
    const b = battleRef.current;
    if (!b) return;
    const target = b.ships.find(s => s.id === selectedShipId);
    if (!target) return;
    let raf = 0;
    const step = () => {
      setCamera(c => {
        const dx = target.x - c.x;
        const dy = target.y - c.y;
        if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return c;
        return { x: c.x + dx * 0.15, y: c.y + dy * 0.15 };
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [selectedShipId, tick]);

  if (!save || !mission) {
    return <CosmicShell title="Combat"><div className="text-center text-ink-300 py-12">Battle could not start.</div></CosmicShell>;
  }
  const battle = battleRef.current;
  if (!battle) return <CosmicShell title="Loading…"><div className="text-center text-ink-300 py-12">Spinning up…</div></CosmicShell>;

  const selectedShip = battle.ships.find(s => s.id === selectedShipId) ?? null;
  const playerShips = battle.ships.filter(s => s.faction === "player" && !s.destroyed);
  const enemyShips = battle.ships.filter(s => s.faction === "enemy" && !s.destroyed);

  const handleCellClick = (x: number, y: number) => {
    if (!selectedShip || selectedShip.faction !== "player" || resolving) return;
    setOrders(prev => ({ ...prev, [selectedShip.id]: { ...prev[selectedShip.id], shipId: selectedShip.id, moveTo: { x, y } } }));
  };

  const handleDragMove = (shipId: string, endX: number, endY: number) => {
    if (resolving) return;
    setOrders(prev => ({ ...prev, [shipId]: { ...prev[shipId], shipId, moveTo: { x: endX, y: endY } } }));
  };

  const handleShipClick = (shipId: string) => {
    const ship = battle.ships.find(s => s.id === shipId);
    if (!ship) return;
    if (ship.faction === "player") {
      setSelectedShipId(shipId);
    } else {
      // Click enemy = set as fire target for selected ship (non-homing fire).
      if (!selectedShip || selectedShip.faction !== "player") return;
      setOrders(prev => {
        const cur = prev[selectedShip.id] || { shipId: selectedShip.id };
        return { ...prev, [selectedShip.id]: { ...cur, fireTargetId: shipId } };
      });
    }
  };

  const toggleFire = (m: MissileId) => {
    if (!selectedShip) return;
    setOrders(prev => {
      const cur = prev[selectedShip.id] || { shipId: selectedShip.id };
      return { ...prev, [selectedShip.id]: { ...cur, fire: cur.fire === m ? undefined : m } };
    });
  };

  const endPlayerTurn = async () => {
    if (resolving || battle.result) return;
    setResolving(true);
    const playerOrders = Object.values(orders);
    for (const ship of battle.ships) {
      if (ship.ownerSlot !== "wingman" || ship.destroyed) continue;
      if (orders[ship.id]) continue;
      const target = battle.ships.find(s => s.faction === "enemy" && !s.destroyed);
      if (target) {
        playerOrders.push({
          shipId: ship.id,
          moveTo: { x: target.x, y: target.y },
          fire: ship.loadout[0],
          fireTargetId: target.id,
        });
      }
    }
    applyOrders(battle, playerOrders);
    const aiOrders = planAiOrders(battle);
    applyOrders(battle, aiOrders);
    setOrders({});
    // Animate sub-ticks at a comfortable pace — about 1.2s per turn so
    // you can read the inertia in the curves. setTimeout pegs the cadence
    // regardless of the device's refresh rate.
    await new Promise<void>(resolve => {
      let i = 0;
      const step = () => {
        if (i >= SUBTICKS) { resolve(); return; }
        tickStep(battle);
        i++;
        setTick(t => t + 1);
        setTimeout(step, 75);
      };
      step();
    });
    endTurn(battle);
    checkVictory(battle);
    setTick(t => t + 1);
    setResolving(false);

    // If victory/defeat → award & navigate.
    if (battle.result) {
      const wingmenDied = battle.ships
        .filter(s => s.ownerSlot === "wingman" && s.destroyed && s.wingmanId)
        .map(s => s.wingmanId!)
        .filter(Boolean);
      const battleRecord: Battle = {
        id: `b-${Date.now()}`,
        missionId: mission.id,
        startedAt: Date.now(),
        completedAt: Date.now(),
        turnHistory: battle.history,
        result: battle.result,
        stats: {
          kills: battle.ships.filter(s => s.faction === "enemy" && s.destroyed).length,
          losses: battle.ships.filter(s => s.faction === "player" && s.destroyed).length,
          damageTaken: battle.ships
            .filter(s => s.faction === "player")
            .reduce((sum, s) => sum + (s.hpMax - s.hp), 0),
          turnsUsed: battle.turn,
        },
      };
      if (battle.result === "victory") {
        playSfx("voYouWin", { volume: 0.9 });
        playSfx("explosionBig", { volume: 0.5 });
        award(save.id, {
          missionId: mission.id,
          rankPoints: mission.rewardRank,
          credits: mission.rewardCredits,
          unlockClass: mission.unlockClass,
          battle: battleRecord,
          wingmenDied,
        });
      } else {
        playSfx("voYouLose", { volume: 0.85 });
      }
    }
  };

  if (battle.result) {
    return (
      <CosmicShell title={battle.result === "victory" ? "Mission Complete" : "Mission Failed"} backTo={`/cosmic/play/${save.id}`}>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">{battle.result === "victory" ? "🏆" : "💥"}</div>
          <div className="font-display text-3xl tracking-widest mb-2" style={{ color: battle.result === "victory" ? "#86efac" : "#fca5a5" }}>
            {battle.result.toUpperCase()}
          </div>
          {battle.result === "victory" && (
            <div className="text-sm text-ink-100 max-w-md mx-auto leading-relaxed">
              +{mission.rewardRank} rank points · +{mission.rewardCredits} credits
              {mission.unlockClass && <div className="mt-2 text-emerald-300">New ship unlocked.</div>}
            </div>
          )}
          <div className="mt-2 text-[11px] text-ink-300">
            {battle.ships.filter(s => s.faction === "enemy" && s.destroyed).length} kills · {battle.turn - 1} turns
          </div>
          <button
            onClick={() => navigate(`/cosmic/play/${save.id}`)}
            className="mt-6 px-6 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
            style={{ background: COSMIC_ACCENT, color: "#03101a", minHeight: 48 }}
          >
            RETURN TO HUB
          </button>
        </div>
      </CosmicShell>
    );
  }

  return (
    <CosmicShell
      title={mission.title}
      subtitle={`Turn ${battle.turn} / ${mission.turnLimit} · ${enemyShips.length} hostiles · ${playerShips.length} friendlies`}
      backTo={`/cosmic/play/${save.id}`}
    >
      <BattleGrid
        ships={battle.ships}
        missiles={battle.missiles}
        obstacles={battle.obstacles}
        cameraX={camera.x}
        cameraY={camera.y}
        selectedShipId={selectedShipId ?? undefined}
        pendingMove={selectedShipId ? orders[selectedShipId]?.moveTo ?? null : null}
        onCellClick={handleCellClick}
        onShipClick={handleShipClick}
        onDragMove={handleDragMove}
        inputsLocked={resolving}
      />

      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "rgba(155,227,255,0.05)", border: `1px solid ${COSMIC_ACCENT}33` }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">SELECTED</div>
          {selectedShip ? (
            <>
              <div className="font-display text-sm text-white">"{selectedShip.callsign}"</div>
              <div className="text-[11px] text-ink-300">
                HP {selectedShip.hp}/{selectedShip.hpMax} · Shields F{selectedShip.shieldFront}/R{selectedShip.shieldRear}/S{selectedShip.shieldLR}
              </div>
              {selectedShip.faction === "player" && (
                <div className="mt-2 space-y-1.5">
                  {selectedShip.loadout.map(m => {
                    const spec = MISSILE_TYPES.find(x => x.id === m)!;
                    const cd = (selectedShip.cooldowns[m] ?? 0) - battle.turn;
                    const ready = cd <= 0;
                    const active = orders[selectedShip.id]?.fire === m;
                    return (
                      <button
                        key={m}
                        disabled={!ready}
                        onClick={() => toggleFire(m)}
                        className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg pressable touch-target disabled:opacity-40"
                        style={{
                          background: active ? `${COSMIC_ACCENT}33` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
                          minHeight: 40,
                        }}
                      >
                        <span className="text-lg">{spec.emoji}</span>
                        <span className="flex-1 text-xs">
                          <div className="text-white">{spec.label} {spec.homing && <span style={{ color: COSMIC_ACCENT }}>HOMING</span>}</div>
                          <div className="text-[10px] text-ink-300">DMG {spec.damage} · RNG {spec.range}{!ready && ` · CD ${cd}t`}</div>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-ink-300 italic">Tap a friendly ship.</div>
          )}
        </div>

        <div className="rounded-xl p-3 flex flex-col" style={{ background: "rgba(155,227,255,0.05)", border: `1px solid ${COSMIC_ACCENT}33` }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">ORDERS</div>
          {selectedShip && orders[selectedShip.id] ? (
            <div className="text-xs text-ink-100 space-y-1">
              {orders[selectedShip.id].moveTo && (
                <div>Move → ({orders[selectedShip.id].moveTo!.x}, {orders[selectedShip.id].moveTo!.y})</div>
              )}
              {orders[selectedShip.id].fire && (
                <div>Fire → {MISSILE_TYPES.find(m => m.id === orders[selectedShip.id].fire)?.label}
                  {orders[selectedShip.id].fireTargetId && ` @ ${battle.ships.find(s => s.id === orders[selectedShip.id].fireTargetId)?.callsign}`}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-ink-300 italic">No orders queued for this ship.</div>
          )}
          <div className="flex-1" />
          <button
            disabled={resolving}
            onClick={endPlayerTurn}
            className="mt-3 px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50"
            style={{ background: COSMIC_ACCENT, color: "#03101a", minHeight: 48 }}
          >
            {resolving ? "RESOLVING…" : "END TURN"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-1">COMBAT LOG</div>
        <div className="text-[11px] text-ink-200 space-y-0.5 max-h-32 overflow-y-auto font-mono">
          {battle.history.slice(-3).flatMap(h => h.events).slice(-12).reverse().map((e, i) => (
            <div key={i}>· {e.text}</div>
          ))}
          {battle.history.length === 0 && <div className="italic text-ink-400">Awaiting first orders…</div>}
        </div>
      </div>
    </CosmicShell>
  );
}
