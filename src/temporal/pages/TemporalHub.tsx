// Temporal Order — save slot screen + new-agent wizard.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Clock } from "lucide-react";
import { TemporalShell, TEMPORAL_GOLD } from "../components/TemporalShell";
import { useTemporal, createAgent } from "../store";
import { characterDataUrl, AGENT_PALETTES } from "../engine/sprites";

export default function TemporalHub() {
  const navigate = useNavigate();
  const saves = useTemporal(s => s.saves);
  const load = useTemporal(s => s.load);
  const newSave = useTemporal(s => s.newSave);
  const deleteSave = useTemporal(s => s.deleteSave);
  const setActive = useTemporal(s => s.setActive);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => { load(); }, []);

  return (
    <TemporalShell title="The Chrono Library" subtitle="Pick an agent or recruit a new one">
      <div className="space-y-3">
        {saves.length === 0 && !showWizard && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-6 text-center"
            style={{ background: "rgba(245,197,24,0.06)", border: `2px dashed ${TEMPORAL_GOLD}55` }}>
            <Clock size={32} className="mx-auto mb-3" style={{ color: TEMPORAL_GOLD }} />
            <div className="font-display text-lg mb-1 text-amber-50">No agents on the roster</div>
            <div className="text-sm text-amber-100/70 mb-4 max-w-sm mx-auto">
              The Library recruits time-travelers to keep the timeline whole. Pick your codename and step into the Bureau.
            </div>
            <button onClick={() => setShowWizard(true)}
              className="px-5 py-3 rounded font-display tracking-widest pressable touch-target"
              style={{ background: TEMPORAL_GOLD, color: "#1a1308", minHeight: 48 }}>
              RECRUIT AN AGENT
            </button>
          </motion.div>
        )}

        {saves.map(s => {
          const palette = AGENT_PALETTES[s.appearance];
          const sprite = characterDataUrl(palette);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-3 flex items-center gap-3"
              style={{ background: "rgba(245,197,24,0.06)", border: `1px solid ${TEMPORAL_GOLD}44` }}>
              <img src={sprite} alt="" style={{ width: 48, height: 72, imageRendering: "pixelated" }} />
              <button onClick={() => { setActive(s.id); navigate(`/temporal/play/${s.id}`); }}
                className="flex-1 text-left pressable touch-target"
                style={{ minHeight: 64, touchAction: "manipulation" }}>
                <div className="font-display text-lg text-amber-50">{s.agentName}</div>
                <div className="text-[11px] tracking-widest mt-0.5" style={{ color: TEMPORAL_GOLD }}>
                  LV {s.level} · Integrity {s.integrity}/100 · {s.missionsCompleted.length} missions
                </div>
                <div className="text-[11px] text-amber-100/70 mt-1">
                  {s.trophies.length} trophies · {s.ripples.length} ripples · {s.coins} coins
                </div>
              </button>
              <button onClick={() => { if (confirm(`Retire ${s.agentName}?`)) deleteSave(s.id); }}
                className="w-11 h-11 rounded flex items-center justify-center pressable touch-target text-amber-200/60 hover:text-red-400"
                style={{ background: "rgba(0,0,0,0.4)", minWidth: 44, minHeight: 44 }}>
                <Trash2 size={14} />
              </button>
            </motion.div>
          );
        })}

        {saves.length > 0 && saves.length < 5 && !showWizard && (
          <button onClick={() => setShowWizard(true)}
            className="w-full rounded-lg p-3 flex items-center justify-center gap-2 pressable touch-target font-display tracking-widest text-sm"
            style={{
              background: "rgba(245,197,24,0.03)",
              border: `1px dashed ${TEMPORAL_GOLD}55`,
              color: TEMPORAL_GOLD, minHeight: 56,
            }}>
            <Plus size={14} /> RECRUIT ANOTHER AGENT
          </button>
        )}

        {showWizard && (
          <NewAgentWizard
            onCancel={() => setShowWizard(false)}
            onCreate={(args) => {
              const save = createAgent(args);
              newSave(save);
              setShowWizard(false);
              navigate(`/temporal/play/${save.id}`);
            }}
          />
        )}
      </div>
    </TemporalShell>
  );
}

function NewAgentWizard({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (args: { agentName: string; appearance: "agent1" | "agent2" | "agent3" | "agent4" }) => void;
}) {
  const [agentName, setAgentName] = useState("");
  const [appearance, setAppearance] = useState<"agent1" | "agent2" | "agent3" | "agent4">("agent1");
  const choices: Array<"agent1" | "agent2" | "agent3" | "agent4"> = ["agent1", "agent2", "agent3", "agent4"];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-lg p-4 space-y-4"
      style={{ background: "rgba(245,197,24,0.06)", border: `1px solid ${TEMPORAL_GOLD}66` }}>
      <div className="font-display tracking-widest text-sm" style={{ color: TEMPORAL_GOLD }}>NEW AGENT</div>
      <div>
        <div className="text-[10px] tracking-[0.3em] font-display text-amber-100/70 mb-1.5">CODENAME</div>
        <input autoFocus value={agentName} onChange={e => setAgentName(e.target.value)}
          placeholder="e.g. Henry Berry"
          className="w-full px-3 py-2.5 rounded bg-black/40 text-amber-50 outline-none"
          style={{ border: `1px solid ${TEMPORAL_GOLD}66`, fontFamily: "ui-monospace, monospace" }} />
      </div>
      <div>
        <div className="text-[10px] tracking-[0.3em] font-display text-amber-100/70 mb-1.5">APPEARANCE</div>
        <div className="grid grid-cols-4 gap-2">
          {choices.map(id => {
            const url = characterDataUrl(AGENT_PALETTES[id]);
            return (
              <button key={id} onClick={() => setAppearance(id)}
                className="rounded p-2 flex items-center justify-center pressable touch-target"
                style={{
                  background: appearance === id ? `${TEMPORAL_GOLD}33` : "rgba(0,0,0,0.4)",
                  border: `2px solid ${appearance === id ? TEMPORAL_GOLD : "rgba(255,255,255,0.08)"}`,
                  minHeight: 80,
                }}>
                <img src={url} alt="" style={{ width: 48, height: 72, imageRendering: "pixelated" }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 px-4 py-3 rounded font-display tracking-widest text-xs pressable touch-target"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 48, color: "#fef3c7" }}>
          CANCEL
        </button>
        <button disabled={!agentName.trim()}
          onClick={() => onCreate({ agentName: agentName.trim(), appearance })}
          className="flex-1 px-4 py-3 rounded font-display tracking-widest text-xs pressable touch-target disabled:opacity-40"
          style={{ background: TEMPORAL_GOLD, color: "#1a1308", minHeight: 48 }}>
          ENLIST
        </button>
      </div>
    </motion.div>
  );
}
