// Cosmic Squad — Mission Hub. Tabs: Missions, Squadron, Hangar,
// Archives. The player picks a mission card, picks wingmen, and
// launches into combat.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair, Users, Wrench, Archive, ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import { CosmicShell, COSMIC_ACCENT } from "../components/CosmicShell";
import { useCosmic } from "../store";
import { MISSIONS } from "../missions";
import { SHIP_CLASSES, getShipClass } from "../ships";
import { MISSILE_TYPES, RANK_TIERS, type MissileId, type ShipClassId } from "../types";

type Tab = "missions" | "squadron" | "hangar" | "archives";

export default function MissionHub() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const load = useCosmic(s => s.load);
  const saves = useCosmic(s => s.saves);
  const setActive = useCosmic(s => s.setActive);
  const setCurrentShip = useCosmic(s => s.setCurrentShip);
  const setLoadout = useCosmic(s => s.setLoadout);
  const [tab, setTab] = useState<Tab>("missions");

  useEffect(() => { load(); }, []);
  useEffect(() => { if (slotId) setActive(slotId); }, [slotId]);

  const save = useMemo(() => saves.find(s => s.id === slotId), [saves, slotId]);

  if (!save) {
    return (
      <CosmicShell title="Loading…">
        <div className="text-center text-ink-300 py-12">No campaign selected.</div>
      </CosmicShell>
    );
  }

  return (
    <CosmicShell
      title={`"${save.callsign}"`}
      subtitle={`${RANK_TIERS[save.rank]} · ${save.squadronName} · ${save.credits} credits`}
      backTo="/cosmic"
    >
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {([
          ["missions", "Missions", Crosshair],
          ["squadron", "Squadron", Users],
          ["hangar", "Hangar", Wrench],
          ["archives", "Archives", Archive],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target whitespace-nowrap"
            style={{
              background: tab === id ? `${COSMIC_ACCENT}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${tab === id ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
              color: tab === id ? COSMIC_ACCENT : "#fff",
              minHeight: 40, touchAction: "manipulation",
            }}
          >
            <Icon size={12} /> {label.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "missions" && (
        <div className="space-y-2">
          {MISSIONS.map(m => {
            const locked = m.difficulty > save.rank + 2;
            const done = save.completedMissions.includes(m.id);
            return (
              <motion.button
                key={m.id}
                disabled={locked}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/cosmic/play/${save.id}/mission/${m.id}`)}
                className="w-full text-left rounded-xl p-4 pressable touch-target flex items-start gap-3 disabled:opacity-50"
                style={{
                  background: done ? "rgba(52,211,153,0.06)" : "rgba(155,227,255,0.04)",
                  border: `1px solid ${done ? "rgba(52,211,153,0.30)" : `${COSMIC_ACCENT}33`}`,
                  minHeight: 80,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-base text-white">{m.title}</span>
                    <span className="text-[10px] tracking-widest font-display" style={{ color: COSMIC_ACCENT }}>
                      DIFFICULTY {m.difficulty}
                    </span>
                    {done && <CheckCircle2 size={14} className="text-emerald-400" />}
                  </div>
                  <div className="text-xs text-ink-200 mt-1 line-clamp-2">{m.briefing}</div>
                  <div className="text-[10px] text-ink-300 mt-1">
                    {m.objective.replace(/_/g, " ")} · {m.turnLimit}t · +{m.rewardRank} rank · +{m.rewardCredits} cr
                    {m.unlockClass && <> · unlocks {getShipClass(m.unlockClass)?.name}</>}
                  </div>
                </div>
                {locked ? <Lock size={16} className="text-ink-400 mt-1" /> : <ChevronRight size={16} className="text-ink-300 mt-1" />}
              </motion.button>
            );
          })}
        </div>
      )}

      {tab === "squadron" && (
        <div className="space-y-2">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-300">ACTIVE WINGMEN ({save.wingmen.length})</div>
          {save.wingmen.length === 0 && <div className="text-sm text-ink-300 italic py-4">No wingmen — fly solo.</div>}
          {save.wingmen.map(w => (
            <div key={w.id} className="rounded-xl p-3" style={{ background: "rgba(155,227,255,0.04)", border: `1px solid ${COSMIC_ACCENT}33` }}>
              <div className="flex items-baseline gap-2">
                <div className="font-display text-white">"{w.callsign}"</div>
                <div className="text-[11px] text-ink-300">· {w.realName} · {w.rank}</div>
              </div>
              <div className="text-[11px] text-ink-300 mt-1">
                Gun {w.gunnery} · Pilot {w.piloting} · Loyalty {w.loyalty} · {w.kills} kills · {w.missions} missions
              </div>
              <div className="text-[10px] text-ink-400 mt-0.5">Flies: {getShipClass(w.shipClassId)?.name}</div>
            </div>
          ))}
          {save.memorial.length > 0 && (
            <>
              <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mt-5">MEMORIAL WALL ({save.memorial.length})</div>
              {save.memorial.map(w => (
                <div key={w.id} className="rounded-xl p-3 opacity-70" style={{ background: "rgba(60,30,30,0.30)", border: "1px solid rgba(220,80,80,0.35)" }}>
                  <div className="flex items-baseline gap-2">
                    <div className="font-display text-white line-through">"{w.callsign}"</div>
                    <div className="text-[11px] text-ink-300">· {w.realName}</div>
                  </div>
                  <div className="text-[10px] text-ink-400 italic">KIA · {w.kills} kills, {w.missions} missions</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === "hangar" && (
        <Hangar
          save={save}
          onChooseShip={(id) => setCurrentShip(save.id, id)}
          onChangeLoadout={(l) => setLoadout(save.id, l)}
        />
      )}

      {tab === "archives" && (
        <div className="space-y-2">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-300">BATTLE ARCHIVES</div>
          {save.battles.length === 0 && <div className="text-sm text-ink-300 italic py-4">No battles recorded yet. Fly a mission to start.</div>}
          {save.battles.map(b => (
            <div key={b.id} className="rounded-xl p-3" style={{ background: "rgba(155,227,255,0.04)", border: `1px solid ${COSMIC_ACCENT}22` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-display text-sm text-white">{MISSIONS.find(m => m.id === b.missionId)?.title ?? b.missionId}</div>
                <span className="text-[10px] tracking-widest font-display" style={{ color: b.result === "victory" ? "#86efac" : "#fca5a5" }}>
                  {b.result?.toUpperCase()}
                </span>
              </div>
              <div className="text-[10px] text-ink-300 mt-1">
                {b.stats?.kills ?? 0} kills · {b.stats?.losses ?? 0} losses · {b.stats?.turnsUsed ?? 0} turns
              </div>
            </div>
          ))}
        </div>
      )}
    </CosmicShell>
  );
}

function Hangar({ save, onChooseShip, onChangeLoadout }: {
  save: ReturnType<typeof useCosmic.getState>["saves"][number];
  onChooseShip: (id: ShipClassId) => void;
  onChangeLoadout: (l: MissileId[]) => void;
}) {
  const current = getShipClass(save.currentShipClass);
  const slots = current?.weaponSlots ?? 2;
  const toggleMissile = (m: MissileId) => {
    if (save.loadout.includes(m)) {
      onChangeLoadout(save.loadout.filter(x => x !== m));
    } else if (save.loadout.length < slots) {
      onChangeLoadout([...save.loadout, m]);
    } else {
      onChangeLoadout([...save.loadout.slice(0, slots - 1), m]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">YOUR SHIP</div>
        <div className="grid grid-cols-2 gap-2">
          {SHIP_CLASSES.filter(s => save.unlockedShipClasses.includes(s.id)).map(s => {
            const selected = save.currentShipClass === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onChooseShip(s.id)}
                className="text-left rounded-xl p-3 pressable touch-target"
                style={{
                  background: selected ? `${s.primaryColor}22` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selected ? s.accent : "rgba(255,255,255,0.08)"}`,
                  minHeight: 80,
                }}
              >
                <div className="font-display text-sm text-white">{s.name}</div>
                <div className="text-[10px]" style={{ color: s.accent }}>{s.size.toUpperCase()} · {s.faction}</div>
                <div className="text-[10px] text-ink-300 mt-1">HP {s.hp} · SPD {s.speed} · MAN {s.maneuverability} · {s.weaponSlots} slots</div>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-ink-400 mt-2">
          {SHIP_CLASSES.filter(s => !save.unlockedShipClasses.includes(s.id)).length} more ships unlock as you rank up and complete missions.
        </div>
      </div>

      <div>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">
          LOADOUT ({save.loadout.length} / {slots})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MISSILE_TYPES.map(m => {
            const selected = save.loadout.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMissile(m.id)}
                className="text-left rounded-xl p-3 pressable touch-target"
                style={{
                  background: selected ? `${COSMIC_ACCENT}22` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selected ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
                  minHeight: 90,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="font-display text-sm text-white">{m.label}</span>
                  {m.homing && <span className="text-[9px] tracking-widest" style={{ color: COSMIC_ACCENT }}>HOMING</span>}
                </div>
                <div className="text-[10px] text-ink-300 mt-1">DMG {m.damage} · RNG {m.range} · CD {m.cooldown}</div>
                <div className="text-[10px] text-ink-400 mt-1">{m.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
