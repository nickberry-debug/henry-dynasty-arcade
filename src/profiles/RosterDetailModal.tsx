// Read-only detail modal for any Family Roster entry. Reusable across
// the four kinds (hero/cosmic/agent/studio/mech). Each kind formats its
// own body but the chrome (header, close, color tint) is shared.

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { RosterEntry } from "./familyRosters";

interface Props {
  entry: RosterEntry;
  profileName: string;
  profileColor: string;
  onClose: () => void;
}

export function RosterDetailModal({ entry, profileName, profileColor, onClose }: Props) {
  return (
    <div role="dialog" aria-modal="true" aria-label={`${entry.name} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl max-w-md w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${profileColor}26, rgba(8,8,14,0.96))`,
          border: `1.5px solid ${profileColor}88`,
          boxShadow: `0 12px 36px -8px ${profileColor}66`,
        }}>
        <header className="flex items-start gap-3 p-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: profileColor }}>{kindLabel(entry.kind)}</div>
            <h2 className="font-display text-xl tracking-wide truncate" style={{ color: "#fef3c7" }}>{entry.name}</h2>
            <div className="text-[11px] mt-0.5" style={{ color: profileColor }}>{entry.subtitle}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.6)" }}>Saved by {profileName}</div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="pressable rounded-full"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="p-4">
          {entry.description && (
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(229,231,235,0.85)" }}>
              {entry.description}
            </p>
          )}
          <RosterEntryBody entry={entry} profileColor={profileColor} />
        </div>
      </motion.div>
    </div>
  );
}

function kindLabel(k: RosterEntry["kind"]): string {
  switch (k) {
    case "hero":   return "Olympus Hero";
    case "cosmic": return "Cosmic Pilot";
    case "agent":  return "Temporal Agent";
    case "studio": return "Movie Studio";
    case "mech":   return "Mech Bot";
  }
}

function RosterEntryBody({ entry, profileColor }: { entry: RosterEntry; profileColor: string }) {
  // The roster entry carries the kind-specific identity only — for full
  // detail we'd need to load the underlying record. The Mech kind passes
  // its full Bot through `payload`; other kinds show their subtitle +
  // description for now.
  if (entry.kind === "mech" && entry.payload) {
    return <MechBody bot={entry.payload as import("../mech/types").Bot} accent={profileColor} />;
  }
  return (
    <div className="text-[11px]" style={{ color: "rgba(229,231,235,0.65)" }}>
      Open the {kindLabel(entry.kind)} in its own game to see full stats, history, and progression.
    </div>
  );
}

function MechBody({ bot, accent }: { bot: import("../mech/types").Bot; accent: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        <Stat label="HP"     value={bot.derived.hp}    accent="#86efac" />
        <Stat label="ARMOR"  value={bot.derived.armor} accent="#7dd3fc" />
        <Stat label="POWER"  value={bot.derived.power} accent="#fbbf24" />
        <Stat label="ENERGY" value={bot.derived.energy} accent="#a78bfa" />
        <Stat label="WEIGHT" value={bot.derived.weight} accent="#fb923c" />
        <Stat label="SPEED"  value={bot.derived.speed}  accent="#67e8f9" />
        <Stat label="BAL"    value={bot.derived.balance} accent="#fde047" />
        <Stat label="AI"     value={bot.personality}   accent={accent} />
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: accent }}>Parts</div>
        <ul className="space-y-0.5 text-[11px]" style={{ color: "rgba(229,231,235,0.85)" }}>
          <li><strong style={{ color: accent }}>Head:</strong> {bot.parts.head.name}</li>
          <li><strong style={{ color: accent }}>L Arm:</strong> {bot.parts.leftArm.name}{bot.weapons.left ? ` · ${bot.weapons.left.name}` : ""}</li>
          <li><strong style={{ color: accent }}>R Arm:</strong> {bot.parts.rightArm.name}{bot.weapons.right ? ` · ${bot.weapons.right.name}` : ""}</li>
          <li><strong style={{ color: accent }}>Chest:</strong> {bot.parts.chest.name}</li>
          <li><strong style={{ color: accent }}>Legs:</strong> {bot.parts.legs.name}</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md py-1.5 px-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[8px] tracking-widest uppercase opacity-70" style={{ color: accent }}>{label}</div>
      <div className="font-display text-sm mt-0.5" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}
