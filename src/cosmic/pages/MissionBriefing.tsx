// Cosmic Squad — mission briefing screen. Shows the mission objective,
// intel, hazards, and lets the player pick which wingmen to bring
// before launching into Combat.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, Crosshair, ShieldAlert, Info, type LucideIcon } from "lucide-react";
import { CosmicShell, COSMIC_ACCENT } from "../components/CosmicShell";
import { useCosmic } from "../store";
import { getMission } from "../missions";
import { getShipClass } from "../ships";
import { speak } from "../../wordplay/voice";

export default function MissionBriefing() {
  const { slotId, missionId } = useParams<{ slotId: string; missionId: string }>();
  const navigate = useNavigate();
  const load = useCosmic(s => s.load);
  const saves = useCosmic(s => s.saves);

  useEffect(() => { load(); }, []);

  const save = saves.find(s => s.id === slotId);
  const mission = missionId ? getMission(missionId) : undefined;
  const [selectedWingmen, setSelectedWingmen] = useState<string[]>([]);

  useEffect(() => {
    if (!save || !mission) return;
    setSelectedWingmen(save.wingmen.slice(0, mission.maxWingmen).map(w => w.id));
  }, [save?.id, mission?.id]);

  // Auto-read the briefing aloud on entry.
  useEffect(() => {
    if (mission) speak(`Mission: ${mission.title}. ${mission.briefing}`);
  }, [mission?.id]);

  if (!save || !mission) {
    return <CosmicShell title="Briefing"><div className="text-center text-ink-300 py-12">Mission not found.</div></CosmicShell>;
  }

  const toggleWingman = (id: string) => {
    if (selectedWingmen.includes(id)) {
      setSelectedWingmen(selectedWingmen.filter(x => x !== id));
    } else if (selectedWingmen.length < mission.maxWingmen) {
      setSelectedWingmen([...selectedWingmen, id]);
    }
  };

  const launch = () => {
    const query = new URLSearchParams({ wingmen: selectedWingmen.join(",") });
    navigate(`/cosmic/play/${save.id}/mission/${mission.id}/combat?${query}`);
  };

  return (
    <CosmicShell
      title={mission.title}
      subtitle={`Difficulty ${mission.difficulty} · ${mission.objective.replace(/_/g, " ")} · ${mission.turnLimit} turns`}
      backTo={`/cosmic/play/${save.id}`}
    >
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4" style={{ background: "rgba(155,227,255,0.05)", border: `1px solid ${COSMIC_ACCENT}33` }}>
          <Header icon={Info} label="BRIEFING" />
          <div className="text-sm text-ink-100 mt-2 leading-relaxed">{mission.briefing}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="rounded-xl p-4" style={{ background: "rgba(255,213,74,0.04)", border: "1px solid rgba(255,213,74,0.25)" }}>
          <Header icon={Crosshair} label="INTEL" color="#ffd54a" />
          <div className="text-sm text-ink-100 mt-2 leading-relaxed">{mission.intel}</div>
          <div className="text-[11px] text-ink-300 mt-2">
            Enemy forces: {mission.enemyClasses.map(id => getShipClass(id)?.name).filter(Boolean).join(", ")}
          </div>
        </motion.div>

        {mission.hazards && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl p-4" style={{ background: "rgba(220,80,80,0.05)", border: "1px solid rgba(220,80,80,0.25)" }}>
            <Header icon={ShieldAlert} label="HAZARDS" color="#fca5a5" />
            <div className="text-sm text-ink-100 mt-2 leading-relaxed">{mission.hazards}</div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-xl p-4" style={{ background: "rgba(155,227,255,0.04)", border: `1px solid ${COSMIC_ACCENT}33` }}>
          <div className="flex items-center justify-between mb-3">
            <Header icon={Rocket} label="WING SELECTION" />
            <div className="text-[11px] text-ink-300">{selectedWingmen.length} / {mission.maxWingmen}</div>
          </div>
          {save.wingmen.length === 0 && <div className="text-sm text-ink-300 italic">No wingmen — flying solo.</div>}
          {mission.maxWingmen === 0 && <div className="text-sm text-ink-300 italic">This is a solo sortie. No wingmen allowed.</div>}
          {mission.maxWingmen > 0 && save.wingmen.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {save.wingmen.map(w => {
                const picked = selectedWingmen.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWingman(w.id)}
                    className="text-left rounded-lg p-3 pressable touch-target"
                    style={{
                      background: picked ? `${COSMIC_ACCENT}22` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${picked ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
                      minHeight: 70,
                    }}
                  >
                    <div className="font-display text-sm text-white">"{w.callsign}"</div>
                    <div className="text-[11px] text-ink-300">{w.realName}</div>
                    <div className="text-[10px] text-ink-400 mt-1">Gun {w.gunnery} · Pilot {w.piloting}</div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        <button
          onClick={launch}
          className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target"
          style={{ background: COSMIC_ACCENT, color: "#03101a", minHeight: 60 }}
        >
          LAUNCH MISSION
        </button>
      </div>
    </CosmicShell>
  );
}

function Header({ icon: Icon, label, color = COSMIC_ACCENT }: { icon: LucideIcon; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} />
      <div className="text-[10px] tracking-[0.3em] font-display" style={{ color }}>{label}</div>
    </div>
  );
}
