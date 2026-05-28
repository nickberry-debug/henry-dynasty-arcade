import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { Link } from "react-router-dom";
import { fmt } from "../utils/format";
import { motion } from "framer-motion";

export default function Teams() {
  const league = useStore(s => s.league);
  if (!league) return null;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">League</div>
          <h1 className="font-display text-4xl">TEAMS</h1>
        </div>
        <div className="text-sm text-ink-200">{league.teams.length} clubs · {league.players.length} players</div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {league.teams.map((t, idx) => {
          const pct = t.wins / Math.max(1, t.wins + t.losses);
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.012 }}>
              <Link to={`/team/${t.id}`} className="block pressable">
                <div
                  className="rounded-2xl p-4 border border-white/5 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(160deg, ${t.primary}cc, ${t.primary}66 60%, #0a0d1366)`
                  }}
                >
                  <div className="flex items-center gap-4">
                    <TeamLogo team={t} size={64} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-widest" style={{ color: t.accent }}>{t.city}</div>
                      <div className="font-display text-2xl leading-tight truncate" style={{ color: t.accent }}>{t.name}</div>
                      <div className="text-xs text-white/80 mt-1">{t.wins}-{t.losses} · {fmt.avg(pct)} · {t.abbr}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-[11px] text-white/70">
                    <span>{t.stadium.name}</span>
                    <span>Est. {t.established}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
