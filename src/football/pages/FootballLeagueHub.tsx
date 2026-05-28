// Football League — consolidated landing for everything outside of
// "your team" and "this week". Sub-tab cards surface Standings, Teams,
// Schedule, and conditional Free Agency / Draft / Playoffs windows.
import { useFootball } from "../store";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ListOrdered, Users, CalendarDays, UserPlus, ScrollText, Trophy, ArrowRight } from "lucide-react";

export default function FootballLeagueHub() {
  const league = useFootball(s => s.league)!;
  const standings = useMemo(
    () => [...league.teams].sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)),
    [league.teams],
  );
  const userTeam = league.teams.find(t => t.id === league.userTeamId);
  const userRank = userTeam ? standings.findIndex(s => s.id === userTeam.id) + 1 : null;

  const fa = league.phase === "freeagency";
  const draft = league.phase === "draft";
  const playoffs = league.phase === "playoffs" || (league.playoffsBracket != null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <header>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">FRANCHISE</div>
        <h1 className="font-display text-3xl mt-1">🏆 League</h1>
        {userRank && (
          <div className="text-sm text-ink-200 mt-1">
            You're <span className="text-white font-display">{ordinal(userRank)}</span> overall · {standings.length} teams
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <SubTabCard to="/football/standings" icon={<ListOrdered size={20} />} label="Standings" body="Division &amp; conference order." tint="#FFB81C" />
        <SubTabCard to="/football/teams" icon={<Users size={20} />} label="Teams" body="Scout every roster." tint="#60a5fa" />
        <SubTabCard to="/football/schedule" icon={<CalendarDays size={20} />} label="Schedule" body="17-week slate." tint="#94a3b8" />
        {fa && (
          <SubTabCard to="/football/freeagency" icon={<UserPlus size={20} />} label="Free Agency" body="The market is open." tint="#34d399" hot />
        )}
        {draft && (
          <SubTabCard to="/football" icon={<ScrollText size={20} />} label="Draft" body="Build the future." tint="#a78bfa" hot />
        )}
        {playoffs && (
          <SubTabCard to="/football" icon={<Trophy size={20} />} label="Playoffs" body="One-and-done bracket." tint="#fb7185" hot />
        )}
      </div>

      <div className="glass rounded-2xl p-5 card-elevated">
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-3">TOP OF STANDINGS</div>
        <div className="space-y-1.5">
          {standings.slice(0, 8).map((t, i) => (
            <Link to={`/football/team/${t.id}`} key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 pressable touch-target" style={{
              background: t.id === userTeam?.id ? "rgba(255,184,28,0.08)" : "transparent",
              border: t.id === userTeam?.id ? "1px solid rgba(255,184,28,0.3)" : "1px solid transparent",
            }}>
              <span className="font-mono text-ink-200 w-5 text-right">{i + 1}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-display text-[10px]" style={{ background: t.primary, color: t.accent }}>
                {t.abbr}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.city} {t.name}</div>
                <div className="text-[11px] text-ink-200">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""}</div>
              </div>
              <div className={`text-sm font-mono ${t.pointsFor - t.pointsAgainst >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {t.pointsFor - t.pointsAgainst >= 0 ? "+" : ""}{t.pointsFor - t.pointsAgainst}
              </div>
            </Link>
          ))}
        </div>
        <Link to="/football/standings" className="mt-3 flex items-center justify-center gap-1 text-xs pressable touch-target" style={{ color: "#FFB81C" }}>
          Full standings <ArrowRight size={12} />
        </Link>
      </div>
    </motion.div>
  );
}

function SubTabCard({ to, icon, label, body, tint, hot }: {
  to: string; icon: React.ReactNode; label: string; body: string; tint: string; hot?: boolean;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl p-4 pressable touch-target flex flex-col gap-1.5 min-h-[96px]"
      style={{
        background: hot ? `linear-gradient(135deg, ${tint}33, rgba(15,20,28,0.85))` : "rgba(255,255,255,0.04)",
        border: `1px solid ${hot ? tint + "88" : "rgba(255,255,255,0.08)"}`,
        boxShadow: hot ? `0 8px 24px ${tint}33` : "none",
        touchAction: "manipulation",
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: tint }}>{icon}</span>
        <span className="font-display tracking-widest text-sm" style={{ color: tint }}>{label}</span>
        {hot && <span className="text-[8px] px-1.5 py-0.5 rounded ml-auto" style={{ background: tint, color: "#0a0d13" }}>OPEN</span>}
      </div>
      <div className="text-[11px] text-ink-200 leading-snug">{body}</div>
    </Link>
  );
}

function ordinal(n: number): string {
  const suf = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}
