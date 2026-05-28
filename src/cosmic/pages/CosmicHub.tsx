// Cosmic Squad — Hub. Lists save slots (up to 3) + new campaign
// wizard. Each slot card shows pilot/rank/wingmen status. Picking a
// slot navigates to /cosmic/play/:id (the mission hub).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Rocket } from "lucide-react";
import { CosmicShell, COSMIC_ACCENT } from "../components/CosmicShell";
import { useCosmic, createSave } from "../store";
import { RANK_TIERS, type Era } from "../types";

export default function CosmicHub() {
  const navigate = useNavigate();
  const saves = useCosmic(s => s.saves);
  const load = useCosmic(s => s.load);
  const newSave = useCosmic(s => s.newSave);
  const deleteSave = useCosmic(s => s.deleteSave);
  const setActive = useCosmic(s => s.setActive);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => { load(); }, []);

  const openSave = (id: string) => {
    setActive(id);
    navigate(`/cosmic/play/${id}`);
  };

  return (
    <CosmicShell title="Squadron Command" subtitle="Pick a campaign or start a new one">
      <div className="space-y-3 mt-2">
        {saves.length === 0 && !showWizard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(155,227,255,0.05)", border: `1px dashed ${COSMIC_ACCENT}55` }}
          >
            <Rocket size={32} className="mx-auto mb-3" style={{ color: COSMIC_ACCENT }} />
            <div className="font-display text-lg mb-1">No campaigns yet</div>
            <div className="text-sm text-ink-300 mb-4">Forge your callsign and pick your squadron's era.</div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-5 py-3 rounded-xl font-display tracking-widest pressable touch-target"
              style={{ background: COSMIC_ACCENT, color: "#03101a", minHeight: 48 }}
            >
              NEW CAMPAIGN
            </button>
          </motion.div>
        )}

        {saves.map(s => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(155,227,255,0.05)", border: `1px solid ${COSMIC_ACCENT}33` }}
          >
            <button onClick={() => openSave(s.id)} className="flex-1 text-left pressable touch-target" style={{ minHeight: 60, touchAction: "manipulation" }}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="font-display text-lg text-white">"{s.callsign}"</div>
                <div className="text-xs text-ink-300">· {s.pilotName}</div>
              </div>
              <div className="text-[11px] tracking-widest font-display mt-0.5" style={{ color: COSMIC_ACCENT }}>
                {RANK_TIERS[s.rank]} · {s.squadronName}
              </div>
              <div className="text-[11px] text-ink-300 mt-1">
                {s.completedMissions.length} missions · {s.wingmen.length} wingmen · {s.unlockedShipClasses.length} ships · {s.credits} cr
              </div>
            </button>
            <button
              onClick={() => { if (confirm(`Delete ${s.callsign}'s campaign?`)) deleteSave(s.id); }}
              className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target text-ink-300 hover:text-red-400"
              aria-label="Delete save"
              style={{ background: "rgba(255,255,255,0.04)", minWidth: 44, minHeight: 44 }}
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}

        {saves.length > 0 && saves.length < 3 && !showWizard && (
          <button
            onClick={() => setShowWizard(true)}
            className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 pressable touch-target font-display tracking-widest text-sm"
            style={{
              background: "rgba(155,227,255,0.03)",
              border: `1px dashed ${COSMIC_ACCENT}55`,
              color: COSMIC_ACCENT,
              minHeight: 60,
            }}
          >
            <Plus size={16} /> NEW CAMPAIGN
          </button>
        )}

        {showWizard && (
          <NewCampaignWizard
            onCancel={() => setShowWizard(false)}
            onCreate={(args) => {
              const save = createSave(args);
              newSave(save);
              setShowWizard(false);
              navigate(`/cosmic/play/${save.id}`);
            }}
          />
        )}
      </div>
    </CosmicShell>
  );
}

const ERAS: { id: Era; label: string; tagline: string }[] = [
  { id: "starwars", label: "Galactic Civil War", tagline: "Republic vs Imperium" },
  { id: "halo", label: "Covenant War", tagline: "UNSC vs alien zealots" },
  { id: "startrek", label: "Final Frontier", tagline: "Federation, Klingons, Romulans" },
  { id: "real", label: "Near Earth", tagline: "Shuttle-era hardware" },
  { id: "galactica", label: "Cylon Wars", tagline: "Colonial Vipers vs robots" },
  { id: "masseffect", label: "Reaper War", tagline: "Mass Effect-era frigates" },
  { id: "wingcommander", label: "Kilrathi Front", tagline: "Confederation fleet" },
  { id: "eve", label: "Capsuleer Wars", tagline: "Drone fleets, no rules" },
  { id: "babylon5", label: "Shadow War", tagline: "Minbari elegance" },
  { id: "future", label: "Sol Coalition", tagline: "Near-future doctrine" },
];

function NewCampaignWizard({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (args: { pilotName: string; callsign: string; squadronName: string; era: Era; difficulty: "cadet" | "veteran" | "ace" }) => void;
}) {
  const [pilotName, setPilotName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [squadronName, setSquadronName] = useState("Wolf Pack");
  const [era, setEra] = useState<Era>("starwars");
  const [difficulty, setDifficulty] = useState<"cadet" | "veteran" | "ace">("cadet");

  const canCreate = pilotName.trim().length > 0 && callsign.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(155,227,255,0.05)", border: `1px solid ${COSMIC_ACCENT}55` }}
    >
      <div className="font-display tracking-widest text-sm" style={{ color: COSMIC_ACCENT }}>NEW CAMPAIGN</div>

      <Field label="Pilot name">
        <input
          autoFocus
          value={pilotName}
          onChange={e => setPilotName(e.target.value)}
          placeholder="e.g. Henry Berry"
          className="w-full px-3 py-2.5 rounded-lg bg-black/40 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
          style={{ border: `1px solid ${COSMIC_ACCENT}33` }}
        />
      </Field>

      <Field label="Callsign">
        <input
          value={callsign}
          onChange={e => setCallsign(e.target.value)}
          placeholder="e.g. Comet"
          className="w-full px-3 py-2.5 rounded-lg bg-black/40 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
          style={{ border: `1px solid ${COSMIC_ACCENT}33` }}
        />
      </Field>

      <Field label="Squadron name">
        <input
          value={squadronName}
          onChange={e => setSquadronName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-black/40 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
          style={{ border: `1px solid ${COSMIC_ACCENT}33` }}
        />
      </Field>

      <Field label="Era">
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {ERAS.map(e => (
            <button
              key={e.id}
              onClick={() => setEra(e.id)}
              className="text-left px-3 py-2 rounded-lg pressable touch-target"
              style={{
                background: era === e.id ? `${COSMIC_ACCENT}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${era === e.id ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
                minHeight: 50, touchAction: "manipulation",
              }}
            >
              <div className="text-sm text-white">{e.label}</div>
              <div className="text-[10px] text-ink-300">{e.tagline}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Difficulty">
        <div className="grid grid-cols-3 gap-1.5">
          {(["cadet", "veteran", "ace"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
              style={{
                background: difficulty === d ? COSMIC_ACCENT : "rgba(255,255,255,0.04)",
                color: difficulty === d ? "#03101a" : "#fff",
                border: `1px solid ${difficulty === d ? COSMIC_ACCENT : "rgba(255,255,255,0.08)"}`,
                minHeight: 44,
              }}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl font-display tracking-widest text-xs pressable touch-target"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 48 }}
        >
          CANCEL
        </button>
        <button
          disabled={!canCreate}
          onClick={() => onCreate({ pilotName: pilotName.trim(), callsign: callsign.trim(), squadronName: squadronName.trim() || "Wolf Pack", era, difficulty })}
          className="flex-1 px-4 py-3 rounded-xl font-display tracking-widest text-xs pressable touch-target disabled:opacity-40"
          style={{ background: COSMIC_ACCENT, color: "#03101a", minHeight: 48 }}
        >
          LAUNCH
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Wrap as a label so the inner input is programmatically labelled
  // without us threading htmlFor/id through every callsite.
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
