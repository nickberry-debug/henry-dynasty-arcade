// Temporal Order — Bureau / Mission Board. Shows the six eras with
// their available mission templates. Tap an era to jump there.

import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, AlertTriangle, Sparkles, Trophy } from "lucide-react";
import { TemporalShell, TEMPORAL_GOLD } from "../components/TemporalShell";
import { useTemporal } from "../store";
import { ERAS, MISSION_TEMPLATES } from "../data/eras";

export default function Bureau() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const load = useTemporal(s => s.load);
  const saves = useTemporal(s => s.saves);
  const setActive = useTemporal(s => s.setActive);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (slotId) setActive(slotId); }, [slotId]);

  const save = useMemo(() => saves.find(s => s.id === slotId), [saves, slotId]);

  if (!save) {
    return <TemporalShell title="Bureau" backTo="/temporal"><div className="text-center text-amber-100/85 py-12">Agent not found.</div></TemporalShell>;
  }

  const integrityColor = save.integrity >= 75 ? "#86efac" : save.integrity >= 40 ? "#fde047" : "#fca5a5";

  // Resume button if there's an active mission
  const resumeMission = save.activeMission && MISSION_TEMPLATES.find(m => m.id === save.activeMission!.templateId);

  return (
    <TemporalShell
      title="The Bureau"
      subtitle={`${save.agentName} · Lv ${save.level} · ${save.missionsCompleted.length} resolved`}
      backTo="/temporal"
      right={
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${TEMPORAL_GOLD}44` }}>
          <Sparkles size={12} style={{ color: integrityColor }} />
          <span className="text-[11px]" style={{ color: integrityColor }}>{save.integrity}/100</span>
        </div>
      }>
      <div className="space-y-3">
        {/* Integrity meter (always visible) */}
        <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${TEMPORAL_GOLD}33` }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] tracking-[0.3em] font-display text-amber-100/85">TIMELINE INTEGRITY</span>
            <span className="font-display text-base" style={{ color: integrityColor }}>{save.integrity}/100</span>
          </div>
          <div className="h-2.5 rounded" style={{ background: "#1a1308" }}>
            <div style={{
              width: `${save.integrity}%`, height: "100%",
              background: `linear-gradient(90deg, ${integrityColor}, ${TEMPORAL_GOLD})`,
              transition: "width 0.4s",
            }} />
          </div>
        </div>

        {/* Resume banner */}
        {resumeMission && (
          <button onClick={() => navigate(`/temporal/play/${save.id}/era/${resumeMission.eraId}`)}
            className="w-full rounded-lg p-3 flex items-center gap-3 pressable touch-target text-left"
            style={{ background: "rgba(245,197,24,0.1)", border: `2px solid ${TEMPORAL_GOLD}88`, minHeight: 64 }}>
            <AlertTriangle size={18} style={{ color: TEMPORAL_GOLD }} />
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm text-amber-50">Mission in progress</div>
              <div className="text-[11px] text-amber-100/85 truncate">{resumeMission.title} — {save.activeMission?.cluesFound.length ?? 0} of {save.activeMission?.variation.clues.length} clues</div>
            </div>
            <span className="text-[10px] tracking-widest font-display" style={{ color: TEMPORAL_GOLD }}>RESUME</span>
            <ChevronRight size={14} style={{ color: TEMPORAL_GOLD }} />
          </button>
        )}

        <div className="text-[10px] tracking-[0.3em] font-display text-amber-100/85 mt-2">ERAS</div>
        {ERAS.map(era => {
          const missions = MISSION_TEMPLATES.filter(m => m.eraId === era.id);
          const rep = save.rep[era.id] ?? 0;
          return (
            <motion.div key={era.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${era.palette.floor}22, rgba(20,12,5,0.85))`,
                border: `1px solid ${era.palette.accent}55`,
              }}>
              <div className="p-3 flex items-center gap-3">
                <div className="text-3xl" style={{ color: era.palette.accent, fontFamily: "serif" }}>{era.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base text-amber-50">{era.name}</div>
                  <div className="text-[11px] text-amber-100/85">{era.year} · {missions.length} mission{missions.length === 1 ? "" : "s"} · Rep {rep >= 0 ? "+" : ""}{rep}</div>
                </div>
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                {missions.map(m => {
                  const done = save.missionsCompleted.find(c => c.templateId === m.id);
                  const active = save.activeMission?.templateId === m.id;
                  return (
                    <button key={m.id} disabled={!!save.activeMission && !active}
                      onClick={() => navigate(`/temporal/play/${save.id}/mission/${m.id}/brief`)}
                      className="w-full text-left rounded p-2.5 flex items-start gap-2 pressable touch-target disabled:opacity-40"
                      style={{
                        background: active ? `${TEMPORAL_GOLD}22` : "rgba(0,0,0,0.4)",
                        border: `1px solid ${active ? TEMPORAL_GOLD : "rgba(255,255,255,0.06)"}`,
                        minHeight: 56,
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-amber-50 font-display flex items-center gap-1.5">
                          {m.title}
                          {done && <CheckCircle2 size={12} className="text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-amber-100/80 mt-0.5 line-clamp-2">{m.premise}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: era.palette.accent }}>
                          Difficulty {m.difficulty} · {m.archetypes.join(" / ")}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-amber-200/40 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Trophy room */}
        {save.trophies.length > 0 && (
          <div className="rounded-lg p-3 mt-3" style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${TEMPORAL_GOLD}33` }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>TROPHY ROOM</div>
            <div className="grid grid-cols-2 gap-1.5">
              {save.trophies.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] rounded p-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Trophy size={11} style={{ color: TEMPORAL_GOLD }} />
                  <div className="min-w-0">
                    <div className="text-amber-50 truncate">{t.name}</div>
                    <div className="text-amber-100/80 text-[10px]">from {t.from}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ripple log */}
        {save.ripples.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>TIMELINE RIPPLES</div>
            <div className="space-y-2">
              {save.ripples.slice(0, 4).map((r, i) => (
                <div key={i} className="text-[11px] text-amber-100/80 leading-relaxed">
                  <span className="text-amber-200/60">[{r.era}]</span> {r.primary}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TemporalShell>
  );
}
