// League — consolidated landing for everything outside of "your team"
// and "this week". Sub-tabs surface Standings, Stats, Trades (when
// open), Free Agency (when open), and Draft (when open). The cards
// stay clean by hiding sub-tabs whose windows aren't active.
import { useStore } from "../store";
import { Link } from "react-router-dom";
import { TeamLogo } from "../components/TeamLogo";
import { leagueStandings } from "../engine/season";
import { fmt } from "../utils/format";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ListOrdered, BarChart3, UserPlus, ScrollText, Trophy, Newspaper, History, ArrowRight } from "lucide-react";

export default function LeagueHub() {
  const league = useStore(s => s.league)!;
  const standings = useMemo(() => leagueStandings(league), [league.teams, league.schedule]);
  const userTeam = league.teams.find(t => t.id === league.userTeamId);
  const userStanding = userTeam ? standings.findIndex(s => s.team.id === userTeam.id) : -1;

  // Which sub-features are currently in-window.
  const fa = league.phase === "freeagency";
  const draft = league.phase === "draft" && !!league.draft;
  const playoffs = league.phase === "playoffs";
  const tradesOpen = league.phase === "regular" || league.phase === "offseason";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <header>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">FRANCHISE</div>
        <h1 className="font-display text-3xl mt-1">🏆 League</h1>
        {userStanding >= 0 && (
          <div className="text-sm text-ink-200 mt-1">
            You're <span className="text-white font-display">{ordinal(userStanding + 1)}</span> overall &middot; {standings.length} teams
          </div>
        )}
      </header>

      {/* Sub-tab navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <SubTabCard to="/standings" icon={<ListOrdered size={20} />} label="Standings" body="See where every team sits." tint="#ffb302" always />
        <SubTabCard to="/stats" icon={<BarChart3 size={20} />} label="Stats" body="League leaders &amp; your team rankings." tint="#60a5fa" always />
        {tradesOpen && (
          <SubTabCard to="/teams" icon={<UserPlus size={20} />} label="Teams &amp; Trades" body="Scout other rosters." tint="#f59e0b" />
        )}
        {fa && (
          <SubTabCard to="/freeagency" icon={<UserPlus size={20} />} label="Free Agency" body="The market is open." tint="#34d399" hot />
        )}
        {draft && (
          <SubTabCard to="/draft" icon={<ScrollText size={20} />} label="Draft" body="Pick the future of your franchise." tint="#a78bfa" hot />
        )}
        {playoffs && (
          <SubTabCard to="/playoffs" icon={<Trophy size={20} />} label="Playoffs" body="October baseball." tint="#fb7185" hot />
        )}
        <SubTabCard to="/news" icon={<Newspaper size={20} />} label="News" body="Around the league." tint="#94a3b8" always />
        <SubTabCard to="/history" icon={<History size={20} />} label="History" body="Past champions &amp; HoF." tint="#94a3b8" always />
      </div>

      {/* Top-of-standings preview */}
      <div className="glass rounded-2xl p-5 card-elevated">
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-3">TOP OF STANDINGS</div>
        <div className="space-y-1.5">
          {standings.slice(0, 8).map((row, i) => (
            <Link to={`/team/${row.team.id}`} key={row.team.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 pressable touch-target" style={{
              background: row.team.id === userTeam?.id ? "rgba(255,179,2,0.08)" : "transparent",
              border: row.team.id === userTeam?.id ? "1px solid rgba(255,179,2,0.3)" : "1px solid transparent",
            }}>
              <span className="font-mono text-ink-200 w-5 text-right">{i + 1}</span>
              <TeamLogo team={row.team} size={32} variant="cap" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{row.team.city} {row.team.name}</div>
                <div className="text-[11px] text-ink-200">{row.team.wins}-{row.team.losses} &middot; {fmt.avg(row.pct)}</div>
              </div>
              <div className={`text-sm font-mono ${row.diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{row.diff >= 0 ? "+" : ""}{row.diff}</div>
            </Link>
          ))}
        </div>
        <Link to="/standings" className="mt-3 flex items-center justify-center gap-1 text-xs text-accent pressable touch-target">
          Full standings <ArrowRight size={12} />
        </Link>
      </div>
    </motion.div>
  );
}

function SubTabCard({ to, icon, label, body, tint, hot, always }: {
  to: string; icon: React.ReactNode; label: string; body: string; tint: string;
  hot?: boolean; always?: boolean;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl p-4 pressable touch-target flex flex-col gap-1.5 min-h-[96px]"
      style={{
        background: hot ? `linear-gradient(135deg, ${tint}33, rgba(15,25,45,0.85))` : "rgba(255,255,255,0.04)",
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
