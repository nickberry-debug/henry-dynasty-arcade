// Live save indicator — pinned top-right of Olympus screens. Reflects
// the store's saveStatus + lastSavedAt. Updates on every action.
import { useEffect, useState } from "react";
import { useOlympus } from "../store";
import { Check, Loader, WifiOff, AlertCircle } from "lucide-react";

export function SaveIndicator() {
  const status = useOlympus(s => s.saveStatus);
  const lastSavedAt = useOlympus(s => s.lastSavedAt);
  const [, force] = useState(0);

  // Tick once per second so the "saved Xs ago" text refreshes.
  useEffect(() => {
    const t = setInterval(() => force(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Don't render anything until we've actually saved once — avoids
  // the awkward "SAVED —" flash on first mount before loadAll() has
  // populated lastSavedAt.
  if (status === "saved" && lastSavedAt === 0) return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 text-blue-200 text-[10px] font-display tracking-wider">
        <Loader size={10} className="animate-spin" /> SAVING
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-display tracking-wider">
        <WifiOff size={10} /> RECONNECTING
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 text-red-300 text-[10px] font-display tracking-wider">
        <AlertCircle size={10} /> SAVE FAILED
      </span>
    );
  }
  const ago = lastSavedAt > 0 ? ageString(Date.now() - lastSavedAt) : "—";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-display tracking-wider">
      <Check size={10} /> SAVED {ago}
    </span>
  );
}

function ageString(ms: number): string {
  if (ms < 2000) return "now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
