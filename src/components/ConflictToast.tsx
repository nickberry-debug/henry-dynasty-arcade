// Conflict toast — small banner shown when the cloud sync layer dropped
// one of THIS device's writes in favor of a newer one from another device
// (last-writer-wins). Offers a one-tap "restore my version" so the user
// isn't silently losing changes when two family members edit the same
// thing within a minute of each other.
//
// Toasts auto-dismiss after 30s. Pure overlay, no route required.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { getConflicts, subscribeConflicts, restoreConflict, dismissConflict, type Conflict } from "../sync/cloudBlob";
import { useProfiles } from "../profiles/store";

function describe(c: Conflict, profileName: string): string {
  // Human-readable summary of what got overwritten.
  // The blobKey is the implementation-level shorthand — translate to a
  // friendlier label for the toast.
  const labels: Record<string, string> = {
    "profiles_v1":         "the player list",
    "stats_v1":            "your stats",
    "memory_v1":           "your memory wall",
    "cosmic_saves_v1":     "your Cosmic pilots",
    "temporal_saves_v1":   "your Temporal agents",
    "potionlab_save_v1":   "your Potion Lab progress",
    "mech_save_v1":        "your Mech bots",
    "creature_save_v1":    "your Creature roster",
    // Dexie record kinds (raised by savedRecords.ts):
    "leagues":             "a Baseball league",
    "footballLeagues":     "a Football league",
    "mogulStudios":        "a Movie Studio",
  };
  const what = labels[c.blobKey] ?? c.blobKey;
  return `Another device updated ${what} for ${profileName} after you did.`;
}

export function ConflictToast() {
  const [list, setList] = useState<Conflict[]>(() => getConflicts());
  const { profiles } = useProfiles();
  useEffect(() => {
    setList(getConflicts());
    return subscribeConflicts(() => setList(getConflicts()));
  }, []);

  // Auto-dismiss anything older than 30s so the toast stack stays calm.
  useEffect(() => {
    if (list.length === 0) return;
    const t = setInterval(() => {
      const now = Date.now();
      for (const c of list) {
        if (now - c.noticedAt > 30_000) dismissConflict(c.id);
      }
    }, 5_000);
    return () => clearInterval(t);
  }, [list]);

  if (list.length === 0) return null;

  return (
    <div role="status" aria-live="polite"
      className="fixed z-40 flex flex-col gap-2"
      style={{
        bottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
        right: "max(env(safe-area-inset-right, 16px), 16px)",
        maxWidth: "min(360px, calc(100vw - 32px))",
      }}>
      <AnimatePresence>
        {list.map(c => {
          const profile = profiles.find(p => p.id === c.profileId);
          const name = profile?.handle || profile?.name || "this player";
          const accent = profile?.color || "#fbbf24";
          return (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="rounded-xl p-3 flex gap-3 items-start"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(15,15,25,0.95))",
                border: `1.5px solid ${accent}88`,
                boxShadow: "0 8px 24px -6px rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)",
              }}>
              <AlertTriangle size={18} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[10px] tracking-[0.3em] uppercase mb-0.5" style={{ color: "#fbbf24" }}>
                  Sync conflict
                </div>
                <div className="text-[12px] leading-snug" style={{ color: "#e5e7eb" }}>
                  {describe(c, name)}
                </div>
                <div className="text-[10px] mt-1" style={{ color: "rgba(229,231,235,0.6)" }}>
                  Their version is in effect.
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => restoreConflict(c.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] pressable touch-target"
                    style={{ background: accent, color: "#1a1208", minHeight: 28 }}>
                    <RotateCcw size={11} aria-hidden="true" /> Restore mine
                  </button>
                  <button onClick={() => dismissConflict(c.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", minHeight: 28 }}>
                    Keep theirs
                  </button>
                </div>
              </div>
              <button onClick={() => dismissConflict(c.id)}
                aria-label="Dismiss"
                className="pressable rounded-full"
                style={{ width: 22, height: 22, color: "rgba(229,231,235,0.6)" }}>
                <X size={14} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
