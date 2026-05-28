// J.6 — Surface a historical event from the league's archive that "happened on this date".
import { useStore } from "../store";
import { Link } from "react-router-dom";
import { ScrollText } from "lucide-react";

export function TodayInHistory() {
  const league = useStore(s => s.league);
  if (!league || league.history.length === 0) return null;
  // Deterministic per-day pick across the 50-year history
  const idx = (league.day * 37 + league.year * 11) % league.history.length;
  const rec = league.history[idx];
  const team = league.teams.find(t => t.id === rec.champion);
  return (
    <div className="glass rounded-2xl p-4 border-l-4 border-amber-400/60">
      <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-widest mb-1">
        <ScrollText size={14} /> Today in History
      </div>
      <div className="text-sm">
        <span className="text-ink-200">{rec.year}:</span>{" "}
        <strong>{team?.name ?? "An unknown team"}</strong> won the World Series.
        {rec.mvp && <span className="text-ink-200"> MVP: {rec.mvp}.</span>}
      </div>
      <Link to="/history" className="text-[11px] text-amber-300 mt-1 inline-block">See full history →</Link>
    </div>
  );
}
