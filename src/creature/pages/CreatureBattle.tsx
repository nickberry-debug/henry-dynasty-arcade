// Creature Keeper — turn-based battle screen.
// The opponent is set via navigation state (CreatureWild routes here
// with { playerId, foeSpeciesId, foeLevel }). On win we credit berries +
// xp and bounce back to the wild page; on loss we return to the hub.
//
// PG framing throughout — "fainted" not "killed", "tagged out" is fine
// flavor too. Kid-friendly tuning: ~6-10 turn fights.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useCreature } from "../store";
import { getSpecies, getMove, getItem, ITEMS } from "../catalog";
import { TYPE_INFO, type Creature } from "../types";
import { CreatureSprite } from "../CreatureSprite";
import { newBattle, resolveTurn, fleeBattle, useBattleItem, type BattleState } from "../battleEngine";
import { makeCreatureFor } from "../store";
import { postActivity } from "../../sync/liveActivity";
import { publishSession, clearSession } from "../../sync/liveSession";
import { useActiveProfile } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

interface NavState {
  playerId: string;
  foeSpeciesId: string;
  foeLevel: number;
}

/** Fabricate a wild opponent at the requested level. We use the same
 *  makeCreatureFor helper that hatches a starter, then bump stats by
 *  level to scale the fight. */
function makeWildFoe(speciesId: string, level: number): Creature {
  const c = makeCreatureFor(speciesId);
  const levels = Math.max(1, level - 1);
  return {
    ...c,
    nickname: getSpecies(speciesId)?.stageNames[Math.min(2, Math.floor(level / 8)) as 0 | 1 | 2] ?? c.nickname,
    stage: Math.min(2, Math.floor(level / 8)) as 0 | 1 | 2,
    level,
    stats: {
      hp: c.stats.hp + 4 * levels,
      attack: c.stats.attack + 2 * levels,
      defense: c.stats.defense + 2 * levels,
      speed: c.stats.speed + 1 * levels,
      special: c.stats.special + 2 * levels,
      energy: c.stats.energy + 2 * levels,
    },
    // Variant chance scales with foe level.
    variant: Math.random() < (0.03 + level * 0.005),
  };
}

export default function CreatureBattle() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as NavState | null;
  const c = useCreature();
  useEffect(() => { unlockAudio(); }, []);
  const profile = useActiveProfile();

  const player = c.save.archive.find(x => x.id === navState?.playerId);

  // Build the battle state ONCE. Reset on navigation.
  const initial = useMemo<BattleState | null>(() => {
    if (!player || !navState) return null;
    const foe = makeWildFoe(navState.foeSpeciesId, navState.foeLevel);
    c.markSeen(foe.speciesId);
    return newBattle(player, foe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, navState?.foeSpeciesId, navState?.foeLevel]);

  const [state, setState] = useState<BattleState | null>(initial);
  const [resolved, setResolved] = useState(false);
  useEffect(() => { setState(initial); setResolved(false); }, [initial]);

  // Live presence — broadcast this Creature Keeper fight to the family.
  useEffect(() => {
    if (!profile || !player || !state) return;
    publishSession({
      profileId: profile.id,
      profileName: profile.handle || profile.name,
      profileColor: profile.color,
      gameId: "creature",
      label: "Creature battle",
      detail: `${player.nickname} vs ${state.foe.creature.nickname} L${state.foe.creature.level}`,
      emoji: "⚔️",
      phase: "active",
      startedAt: Date.now(),
    });
    return () => { clearSession(profile.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, player?.id, state?.foe.creature.speciesId]);

  // Track whether the foe just got added to the archive so we can tell
  // the player they caught it.
  const [caughtSpeciesId, setCaughtSpeciesId] = useState<string | null>(null);

  // Post-battle: credit rewards once.
  useEffect(() => {
    if (!state || resolved) return;
    if (state.phase === "won" && state.reward && player) {
      c.finishBattle(player.id, true, state.reward.berries, state.reward.xp, state.reward.itemDropId);
      playSfx("voYouWin", { volume: 0.9 });
      playSfx("powerUp", { volume: 0.6, pitch: 1.2 });
      // Catch-on-win: add the defeated species to the archive if the
      // player doesn't already have one. (catchCreature dedupes internally.)
      const foeSpeciesId = state.foe.creature.speciesId;
      const alreadyOwned = c.save.archive.some(x => x.speciesId === foeSpeciesId);
      if (!alreadyOwned) {
        c.catchCreature(foeSpeciesId);
        setCaughtSpeciesId(foeSpeciesId);
      }
      setResolved(true);
      const sp = getSpecies(player.speciesId);
      const stageName = sp?.stageNames[player.stage] ?? player.nickname;
      try {
        postActivity({
          profileId: profile?.id ?? "guest",
          profileName: profile?.handle ?? "Player",
          profileColor: profile?.color ?? "#86efac",
          gameId: "creature",
          kind: "creature_evolve",
          text: `${player.nickname} the ${stageName} won a battle (+${state.reward.berries} 🍒)`,
          emoji: "⚔️",
        });
      } catch { /* ignore */ }
    } else if (state.phase === "lost" && player) {
      // Consolation XP so a loss still moves the needle. The store scales
      // this by 30% on the loss path.
      const lossXp = Math.round(18 + state.foe.creature.level * 4);
      c.finishBattle(player.id, false, 0, lossXp);
      playSfx("voYouLose", { volume: 0.85 });
      setResolved(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, resolved]);

  if (!player || !state || !navState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center"
        style={{ background: "#08130a", color: "#fef3c7" }}>
        <div>
          <div className="font-display text-lg" style={{ color: "#fde047" }}>No battle in progress.</div>
          <button onClick={() => navigate("/creature")} className="mt-4 px-4 py-2 rounded-full"
            style={{ background: "#86efac22", border: "1px solid #86efac55", color: "#86efac" }}>
            Back to Creature Hub
          </button>
        </div>
      </div>
    );
  }

  const playerSp = getSpecies(player.speciesId);
  const foeSp = getSpecies(state.foe.creature.speciesId);
  const playerType = playerSp ? TYPE_INFO[playerSp.type] : TYPE_INFO.stone;
  const foeType = foeSp ? TYPE_INFO[foeSp.type] : TYPE_INFO.stone;

  function onMove(moveId: string) {
    if (state!.phase !== "choose") return;
    setState(s => s ? resolveTurn(s, moveId) : s);
  }

  function onFlee() {
    if (state!.phase !== "choose") return;
    setState(s => s ? fleeBattle(s) : s);
    setTimeout(() => navigate("/creature/wild"), 600);
  }

  function onItem(itemId: string) {
    const item = getItem(itemId);
    if (!item) return;
    if ((c.save.items[itemId] ?? 0) <= 0) return;
    setState(s => s ? useBattleItem(s, { id: item.id, effect: item.effect as { kind: string; hp?: number; energy?: number } }) : s);
    // Spend the item from inventory.
    c.useCareItem(player!.id, itemId, {});
  }

  const battleItems = ITEMS.filter(i => i.effect.kind === "battle-heal" || i.effect.kind === "battle-energy")
    .filter(i => (c.save.items[i.id] ?? 0) > 0);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(700px 500px at 30% 0%, ${foeType.color}26, transparent 60%), ` +
                    `radial-gradient(700px 500px at 70% 100%, ${playerType.color}1f, transparent 60%), ` +
                    "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#86efac" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>BATTLE</h1>
        </div>
        <div className="font-display text-[11px] tracking-widest" style={{ color: "#fde047" }}>
          TURN {state.turn}
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        {/* Foe column (top) */}
        <section className="rounded-2xl p-3 mb-3"
          style={{
            background: `linear-gradient(135deg, ${foeType.color}26, rgba(10,10,20,0.85))`,
            border: `1.5px solid ${foeType.color}66`,
          }}>
          <div className="flex items-center gap-3">
            <div className="flex justify-center" style={{ minWidth: 88 }}>
              <CreatureSprite creature={state.foe.creature} size={84} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-widest opacity-70" style={{ color: foeType.color }}>FOE</div>
              <div className="font-display text-base tracking-wide truncate" style={{ color: "#fef3c7" }}>
                {state.foe.creature.nickname} · L{state.foe.creature.level}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: foeType.color }}>{foeType.emoji} {foeType.label}</div>
              <Bar label="HP" value={state.foe.hpNow} max={state.foe.hpMax} tint={foeType.color} />
            </div>
          </div>
        </section>

        {/* Player column */}
        <section className="rounded-2xl p-3 mb-3"
          style={{
            background: `linear-gradient(135deg, ${playerType.color}26, rgba(10,15,10,0.92))`,
            border: `1.5px solid ${playerType.color}66`,
          }}>
          <div className="flex items-center gap-3">
            <div className="flex justify-center" style={{ minWidth: 100 }}>
              <CreatureSprite creature={state.player.creature} size={100} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-widest opacity-70" style={{ color: playerType.color }}>YOU</div>
              <div className="font-display text-base tracking-wide truncate" style={{ color: "#fef3c7" }}>
                {state.player.creature.nickname} · L{state.player.creature.level}
              </div>
              <Bar label="HP" value={state.player.hpNow} max={state.player.hpMax} tint={playerType.color} />
              <Bar label="Energy" value={state.player.energyNow} max={state.player.energyMax} tint="#fbbf24" />
            </div>
          </div>
        </section>

        {/* Floating damage popup */}
        <AnimatePresence>
          {state.lastDamage && (
            <motion.div
              key={state.turn + "_" + state.lastDamage.side}
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center font-display text-3xl mt-2"
              style={{
                color: state.lastDamage.effective === "super" ? "#fde047" :
                       state.lastDamage.effective === "weak"  ? "#9aa6bf" : "#fef3c7",
              }}>
              −{state.lastDamage.amount} {state.lastDamage.effective === "super" ? "✦" : ""}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move buttons */}
        {state.phase === "choose" && (
          <section className="grid grid-cols-2 gap-2 mt-3">
            {state.player.creature.activeMoveIds.map(mid => {
              const m = getMove(mid);
              if (!m) return null;
              const t = TYPE_INFO[m.type];
              const noEnergy = m.cost > state.player.energyNow;
              return (
                <button key={mid} onClick={() => onMove(mid)}
                  disabled={noEnergy}
                  aria-label={`Use ${m.name}`}
                  className="rounded-xl p-2.5 text-left pressable touch-target"
                  style={{
                    background: noEnergy ? "rgba(255,255,255,0.04)" : `${t.color}14`,
                    border: `1px solid ${t.color}55`,
                    opacity: noEnergy ? 0.45 : 1,
                    minHeight: 64,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-[13px]" style={{ color: "#fef3c7" }}>{m.name}</div>
                    <div className="text-[10px] tracking-widest" style={{ color: t.color }}>{t.emoji}{m.power || "·"}</div>
                  </div>
                  <div className="text-[9px] mt-0.5 flex justify-between" style={{ color: "rgba(229,231,235,0.6)" }}>
                    <span>{m.flavor}</span>
                    <span style={{ color: "#fbbf24" }}>E{m.cost}</span>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Items + flee row */}
        {state.phase === "choose" && (
          <section className="mt-3 flex flex-wrap gap-2">
            {battleItems.map(it => (
              <button key={it.id} onClick={() => onItem(it.id)}
                className="px-3 py-2 rounded-full pressable touch-target"
                style={{ background: "rgba(253,224,71,0.10)", border: "1px solid rgba(253,224,71,0.4)", color: "#fde047", fontSize: 11 }}
                aria-label={`Use ${it.name}`}>
                {it.emoji} {it.name} ×{c.save.items[it.id] ?? 0}
              </button>
            ))}
            <button onClick={onFlee}
              className="ml-auto px-3 py-2 rounded-full pressable touch-target"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", color: "#9aa6bf", fontSize: 11 }}>
              ↩ Run away
            </button>
          </section>
        )}

        {/* Log */}
        <section className="mt-3 rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[9px] tracking-[0.3em] mb-1.5 opacity-70" style={{ color: "#86efac" }}>BATTLE LOG</div>
          <ul className="space-y-0.5 text-[11px] leading-snug max-h-32 overflow-auto" style={{ color: "rgba(229,231,235,0.85)" }}>
            {state.log.slice(-6).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        {/* End-of-battle modal */}
        <AnimatePresence>
          {(state.phase === "won" || state.phase === "lost" || state.phase === "fled") && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.55)" }}>
              <motion.div
                initial={{ y: 24, scale: 0.95 }} animate={{ y: 0, scale: 1 }}
                className="rounded-2xl p-5 max-w-md w-full"
                style={{
                  background: `linear-gradient(135deg, ${state.phase === "won" ? "#86efac26" : "#fca5a526"}, rgba(10,15,10,0.95))`,
                  border: `1.5px solid ${state.phase === "won" ? "#86efac" : "#fca5a5"}66`,
                }}>
                <div className="text-center mb-3">
                  <div className="text-4xl mb-1" aria-hidden="true">
                    {state.phase === "won" ? "🎉" : state.phase === "lost" ? "💤" : "👣"}
                  </div>
                  <div className="font-display text-xl tracking-wider"
                    style={{ color: state.phase === "won" ? "#fde047" : "#fca5a5" }}>
                    {state.phase === "won" ? "VICTORY!" : state.phase === "lost" ? "FAINTED" : "RAN AWAY"}
                  </div>
                </div>
                {state.phase === "lost" && (
                  <div className="text-center mb-3 text-[12px]" style={{ color: "rgba(229,231,235,0.85)" }}>
                    Tough loss — still earned a little XP from the fight.
                  </div>
                )}
                {state.phase === "won" && state.reward && (
                  <div className="text-center mb-3">
                    <div className="text-[12px]" style={{ color: "rgba(229,231,235,0.85)" }}>
                      You earned <span style={{ color: "#fde047" }}>+{state.reward.berries} 🍒 berries</span> and{" "}
                      <span style={{ color: "#86efac" }}>+{state.reward.xp} XP</span>.
                    </div>
                    {state.reward.itemDropId && (
                      <div className="text-[11px] mt-1" style={{ color: "#fbbf24" }}>
                        Found an item! ({state.reward.itemDropId.replace(/_/g, " ")})
                      </div>
                    )}
                    {caughtSpeciesId && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-[10px] tracking-[0.3em]" style={{ color: "#f9a8d4" }}>NEW CREATURE!</div>
                        <div className="font-display text-[15px] mt-0.5" style={{ color: "#fef3c7" }}>
                          You caught a {state.foe.creature.nickname}!
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.75)" }}>
                          A fresh L1 joined your archive.
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 justify-center">
                  <button onClick={() => navigate("/creature/wild")}
                    className="px-4 py-2.5 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
                    style={{ background: "#86efac", color: "#0a0a14" }}>
                    Find another fight
                  </button>
                  <button onClick={() => navigate("/creature")}
                    className="px-4 py-2.5 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                    Back to hub
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Bar({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[9px] uppercase tracking-widest" style={{ color: tint }}>
        <span>{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full mt-0.5 overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
          style={{ background: tint }} />
      </div>
    </div>
  );
}
