// Temporal Order — resolution screen. The mission ends here. Apply the
// integrity delta, generate the AI timeline ripple, award a trophy if
// the player named the right culprit, return to the Bureau.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Trophy, X, Check } from "lucide-react";
import { TemporalShell, TEMPORAL_GOLD } from "../components/TemporalShell";
import { useTemporal } from "../store";
import { getEra, getMission } from "../data/eras";
import { generateRipple } from "../ai";
import { speak } from "../../wordplay/voice";

export default function Resolution() {
  const { slotId, missionId } = useParams<{ slotId: string; missionId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const saves = useTemporal(s => s.saves);
  const endMission = useTemporal(s => s.endMission);
  const load = useTemporal(s => s.load);

  const save = saves.find(s => s.id === slotId);
  const mission = missionId ? getMission(missionId) : undefined;
  const era = mission ? getEra(mission.eraId) : undefined;
  const resolutionId = parseInt(params.get("r") ?? "1", 10);
  const suspectName = params.get("s") ?? "";

  const [ripple, setRipple] = useState<{ primary: string; secondary: string } | null>(null);
  const [committed, setCommitted] = useState(false);

  useEffect(() => { load(); }, []);

  const variation = save?.activeMission?.variation;
  const resolution = variation?.resolutions.find(r => r.id === resolutionId);
  const namedCorrectly = variation?.perpetrator.name === suspectName;
  const baseDelta = resolution?.integrityDelta ?? 0;
  const finalDelta = useMemo(() => {
    if (!variation) return 0;
    // Penalty for naming the wrong culprit; bonus for the right one.
    return baseDelta + (namedCorrectly ? 2 : -4);
  }, [baseDelta, namedCorrectly]);

  useEffect(() => {
    if (!save || !mission || !era || !resolution || !variation || committed) return;
    let cancelled = false;
    (async () => {
      const rippleResult = await generateRipple({
        era,
        resolutionDescription: `${resolution.description} (accused ${suspectName}, ${namedCorrectly ? "correctly" : "wrongly"})`,
        integrityAfter: Math.max(0, Math.min(100, save.integrity + finalDelta)),
      });
      if (cancelled) return;
      setRipple(rippleResult);
      // Trophy reward: name of resolution + named-correctly path.
      const trophy = namedCorrectly ? { name: trophyName(era.id, mission.id), from: era.name } : undefined;
      endMission(save.id, {
        templateId: mission.id,
        resolutionId,
        integrityDelta: finalDelta,
        eraId: era.id,
        ripple: rippleResult,
        trophy,
        xpGained: 30 + (namedCorrectly ? 30 : 0) + Math.max(0, finalDelta) * 2,
      });
      speak(rippleResult.primary);
      setCommitted(true);
    })();
    return () => { cancelled = true; };
  }, [save?.id, mission?.id, era?.id, resolutionId, committed]);

  if (!save || !mission || !era || !resolution || !variation) {
    return <TemporalShell title="Resolution" backTo={`/temporal/play/${slotId}`}><div className="text-center text-amber-100/85 py-12">Mission state lost.</div></TemporalShell>;
  }

  return (
    <TemporalShell title="The Timeline Settles" subtitle={`${mission.title} · ${era.name}`} backTo={`/temporal/play/${slotId}`} flag={era.flag}>
      <div className="space-y-3">
        {/* Verdict card */}
        <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg p-4"
          style={{
            background: namedCorrectly ? "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(20,12,5,0.85))" : "linear-gradient(135deg, rgba(252,165,165,0.18), rgba(20,12,5,0.85))",
            border: `2px solid ${namedCorrectly ? "rgba(134,239,172,0.5)" : "rgba(252,165,165,0.4)"}`,
          }}>
          <div className="flex items-center gap-2 mb-2">
            {namedCorrectly ? <Check size={16} className="text-emerald-300" /> : <X size={16} className="text-red-300" />}
            <div className="font-display text-base tracking-widest" style={{ color: namedCorrectly ? "#86efac" : "#fca5a5" }}>
              {namedCorrectly ? "RIGHT CULPRIT" : "WRONG CULPRIT"}
            </div>
          </div>
          <div className="text-[12px] text-amber-50 leading-relaxed">
            You named <span className="font-display">{suspectName}</span>.
            {namedCorrectly
              ? ` They were the one. Behind the scenes: ${variation.trueCause}`
              : ` The real culprit was ${variation.perpetrator.name}. ${variation.trueCause}`}
          </div>
        </motion.section>

        {/* Resolution chosen */}
        <section className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${TEMPORAL_GOLD}33` }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: TEMPORAL_GOLD }}>YOUR RESOLUTION</div>
          <div className="text-[13px] text-amber-50 leading-relaxed">{resolution.description}</div>
          <div className="text-[11px] text-amber-100/85 mt-2">{resolution.consequence}</div>
          <div className="mt-2 inline-block px-2 py-1 rounded text-[11px]"
            style={{
              background: finalDelta >= 0 ? "rgba(134,239,172,0.15)" : "rgba(252,165,165,0.15)",
              border: `1px solid ${finalDelta >= 0 ? "rgba(134,239,172,0.4)" : "rgba(252,165,165,0.4)"}`,
              color: finalDelta >= 0 ? "#86efac" : "#fca5a5",
            }}>
            Timeline integrity {finalDelta >= 0 ? "+" : ""}{finalDelta}
          </div>
        </section>

        {/* AI Ripple */}
        <section className="rounded-lg p-4" style={{ background: `linear-gradient(135deg, ${era.palette.accent}18, rgba(20,12,5,0.85))`, border: `1px solid ${era.palette.accent}55` }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} style={{ color: era.palette.accent }} />
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: era.palette.accent }}>TIMELINE RIPPLE</div>
          </div>
          {!ripple && (
            <div role="status" aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-amber-100/80 text-[11px] italic py-2">
              <Loader2 size={11} className="animate-spin" aria-hidden="true" /> History is rearranging itself…
            </div>
          )}
          {ripple && (
            <>
              <div className="text-[12px] text-amber-50 leading-relaxed mb-2">{ripple.primary}</div>
              <div className="text-[12px] text-amber-100/85 leading-relaxed italic">{ripple.secondary}</div>
            </>
          )}
        </section>

        {/* Trophy */}
        {namedCorrectly && committed && (
          <motion.section initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${TEMPORAL_GOLD}22, rgba(20,12,5,0.85))`, border: `2px solid ${TEMPORAL_GOLD}` }}>
            <Trophy size={24} style={{ color: TEMPORAL_GOLD }} />
            <div>
              <div className="text-[10px] tracking-[0.3em]" style={{ color: TEMPORAL_GOLD }}>TROPHY EARNED</div>
              <div className="font-display text-amber-50 text-base">{trophyName(era.id, mission.id)}</div>
              <div className="text-[10px] text-amber-100/85">filed in the Chrono Library archives</div>
            </div>
          </motion.section>
        )}

        <button onClick={() => navigate(`/temporal/play/${save.id}`)}
          disabled={!ripple}
          className="w-full px-4 py-4 rounded font-display tracking-[0.3em] text-sm pressable touch-target disabled:opacity-40"
          style={{ background: TEMPORAL_GOLD, color: "#1a1308", minHeight: 60 }}>
          RETURN TO BUREAU
        </button>
      </div>
    </TemporalShell>
  );
}

function trophyName(eraId: string, missionId: string): string {
  const map: Record<string, string> = {
    egypt_lost_vizier: "Vizier's Cartouche",
    greece_silent_philosopher: "Socratic Scroll Fragment",
    viking_compass_anomaly: "Sea-Smoothed Compass",
    renaissance_blueprints: "Sketch of a Flying Machine",
    revolution_lost_founder: "Quill from the Tavern",
    hollywood_phantom_reel: "Single Frame of Phantom Film",
  };
  return map[missionId] ?? `${eraId} Memento`;
}
