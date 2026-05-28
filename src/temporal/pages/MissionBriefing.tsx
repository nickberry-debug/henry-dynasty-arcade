// Temporal Order — mission briefing screen. Fires the AI variation
// generator on entry, then lets the player jump into the era.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, AlertCircle, Rocket } from "lucide-react";
import { TemporalShell, TEMPORAL_GOLD } from "../components/TemporalShell";
import { useTemporal } from "../store";
import { getEra, getMission } from "../data/eras";
import { generateMissionVariation } from "../ai";
import { hasAnthropicKey } from "../../arcade/keys";

export default function MissionBriefing() {
  const { slotId, missionId } = useParams<{ slotId: string; missionId: string }>();
  const navigate = useNavigate();
  const saves = useTemporal(s => s.saves);
  const startMission = useTemporal(s => s.startMission);
  const load = useTemporal(s => s.load);

  useEffect(() => { load(); }, []);

  const save = saves.find(s => s.id === slotId);
  const mission = missionId ? getMission(missionId) : undefined;
  const era = mission ? getEra(mission.eraId) : undefined;

  const [generating, setGenerating] = useState(true);
  const [aiUsed, setAiUsed] = useState(false);

  // If there's already an active mission for this template, reuse the
  // variation. Otherwise generate fresh.
  useEffect(() => {
    if (!save || !mission || !era) return;
    if (save.activeMission?.templateId === mission.id) {
      setGenerating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setGenerating(true);
      const history = save.missionsCompleted
        .filter(c => getMission(c.templateId)?.eraId === era.id)
        .map(c => `Previously: ${getMission(c.templateId)?.title} (resolution ${c.resolutionId})`)
        .join(". ");
      const variation = await generateMissionVariation({ template: mission, era, history });
      if (cancelled) return;
      startMission(save.id, mission.id, variation);
      setAiUsed(hasAnthropicKey());
      setGenerating(false);
    })();
    return () => { cancelled = true; };
  }, [save?.id, mission?.id, era?.id]);

  if (!save || !mission || !era) {
    return <TemporalShell title="Briefing" backTo={`/temporal/play/${slotId}`}><div className="text-center text-amber-100/85 py-12">Mission file missing.</div></TemporalShell>;
  }

  const active = save.activeMission?.templateId === mission.id ? save.activeMission : null;
  const variation = active?.variation;

  const enter = () => navigate(`/temporal/play/${save.id}/era/${era.id}`);

  return (
    <TemporalShell title={mission.title} subtitle={`${era.name} · ${era.year}`} backTo={`/temporal/play/${save.id}`} flag={era.flag}>
      <div className="space-y-3">
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            role="status" aria-live="polite" aria-busy="true"
            className="rounded-lg p-6 text-center" style={{ background: "rgba(245,197,24,0.06)", border: `1px solid ${TEMPORAL_GOLD}55` }}>
            <Loader2 size={28} className="mx-auto mb-3 animate-spin" style={{ color: TEMPORAL_GOLD }} aria-hidden="true" />
            <div className="font-display text-sm tracking-widest text-amber-50">SPINNING UP TIMELINE…</div>
            <div className="text-[11px] text-amber-100/80 mt-1">
              {hasAnthropicKey() ? "Generating a fresh anomaly for this run" : "Using offline scenario library"}
            </div>
          </motion.div>
        )}

        {!generating && variation && (
          <>
            <motion.section initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-4" style={{ background: `linear-gradient(135deg, ${era.palette.accent}18, rgba(20,12,5,0.85))`, border: `1px solid ${era.palette.accent}66` }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} style={{ color: era.palette.accent }} />
                <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: era.palette.accent }}>THE ANOMALY</div>
              </div>
              <div className="text-sm text-amber-50 leading-relaxed">{variation.anomaly}</div>
            </motion.section>

            <section className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>YOUR COVER</div>
              <div className="text-sm text-amber-50">{era.disguiseAs}</div>
              <div className="text-[11px] text-amber-100/85 mt-1">{era.flavor}</div>
            </section>

            <section className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>SUSPECTS</div>
              <ul className="space-y-1.5">
                {variation.suspects.map((s, i) => (
                  <li key={i} className="text-[12px] text-amber-100/90">
                    <span className="text-amber-50 font-display">{s.name}</span>
                    <span className="text-amber-100/80"> — {s.motive}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg p-3" style={{ background: "rgba(245,197,24,0.04)", border: `1px solid ${TEMPORAL_GOLD}33` }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={12} style={{ color: TEMPORAL_GOLD }} />
                <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: TEMPORAL_GOLD }}>OBJECTIVE</div>
              </div>
              <div className="text-[12px] text-amber-100/90 leading-relaxed">
                Investigate {variation.clues.length} clues across the era. Speak to the suspects in character. Choose how to resolve the anomaly. Higher integrity = a cleaner timeline.
              </div>
            </section>

            {!hasAnthropicKey() && (
              <div className="rounded p-2 text-[11px]" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", color: "#fef3c7" }}>
                💡 Add an Anthropic API key in arcade settings to enable AI-generated variations — every mission plays differently.
              </div>
            )}

            <button onClick={enter}
              className="w-full px-4 py-4 rounded flex items-center justify-center gap-2 font-display tracking-[0.3em] text-sm pressable touch-target"
              style={{ background: TEMPORAL_GOLD, color: "#1a1308", minHeight: 60, boxShadow: "0 0 24px rgba(245,197,24,0.4)" }}>
              <Rocket size={14} /> JUMP TO {era.year}
            </button>
          </>
        )}
      </div>
    </TemporalShell>
  );
}
