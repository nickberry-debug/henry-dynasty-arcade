// Shell layout for the football FRANCHISE. Four primary tabs only —
// This Week / Team / League / Save & Exit — matching the baseball
// franchise pattern. Top bar shows team + season + week + record +
// auto-save indicator. News ticker mounted at bottom, franchise-only.
//
// Live Game / Quick Tournament are NOT reachable from inside here —
// Henry exits via Save & Exit to return to the Football Hub.
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CalendarDays, Users, Trophy, Save as SaveIcon, ArrowLeft } from "lucide-react";
import { useFootball } from "../store";
import { FootballNewsTicker } from "./FootballNewsTicker";

interface TabDef { to: string; label: string; icon: any; matches: (path: string) => boolean }

const TABS: TabDef[] = [
  {
    to: "/football",
    label: "This Week",
    icon: CalendarDays,
    matches: (p) => p === "/football" || p === "/football/" || p.startsWith("/football/schedule") || p.startsWith("/football/game"),
  },
  {
    to: "/football/team",  // resolved at runtime to the user team
    label: "Team",
    icon: Users,
    matches: (p) => p === "/football/team" || p.startsWith("/football/team/"),
  },
  {
    to: "/football/league",
    label: "League",
    icon: Trophy,
    matches: (p) => p === "/football/league" || p.startsWith("/football/standings") || p.startsWith("/football/teams") || p.startsWith("/football/freeagency"),
  },
  {
    to: "/football/save",
    label: "Save & Exit",
    icon: SaveIcon,
    matches: (p) => p === "/football/save",
  },
];

export function FootballShell() {
  const navigate = useNavigate();
  const league = useFootball(s => s.league);
  const userTeam = league?.teams.find(t => t.id === league?.userTeamId);
  const modifiedAt = league?.modifiedAt;
  const lastSavedMs = modifiedAt ? Date.now() - modifiedAt : null;

  useEffect(() => {
    document.documentElement.classList.add("theme-football");
    return () => document.documentElement.classList.remove("theme-football");
  }, []);

  const teamTo = userTeam ? `/football/team/${userTeam.id}` : "/football/teams";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1A2526 0%, #0a0d13 100%)",
        ["--ticker-bottom" as any]: "calc(env(safe-area-inset-bottom, 0px) + 64px)",
      }}
    >
      {/* Persistent franchise header — tinted with user team colors so
          Henry knows whose franchise he's looking at from any screen. */}
      <header
        className="sticky top-0 z-30 px-4 py-3 backdrop-blur border-b safe-top"
        style={{
          background: userTeam
            ? `linear-gradient(135deg, ${userTeam.primary}cc 0%, ${userTeam.primary}66 55%, rgba(10,13,19,0.92))`
            : "rgba(26,37,38,0.92)",
          borderBottomColor: userTeam ? `${userTeam.accent}33` : "rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/football/hub")}
            className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            aria-label="Back to Football Hub"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {userTeam && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[11px]" style={{ background: userTeam.primary, color: userTeam.accent }}>
                  {userTeam.abbr}
                </div>
              )}
              <div className="font-display tracking-widest text-sm uppercase truncate" style={{ color: userTeam?.accent ?? "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                {userTeam ? `${userTeam.city} ${userTeam.name}` : "Franchise"}
              </div>
            </div>
            {league && (
              <div className="text-[10px] text-ink-200 truncate flex items-center gap-1.5 mt-0.5">
                <span>Year {league.season}</span>
                <span className="text-ink-400">·</span>
                <span className="capitalize">{prettyPhase(league.phase, league.week)}</span>
                <span className="text-ink-400">·</span>
                <span>Wk {league.week}/17</span>
                {userTeam && (
                  <>
                    <span className="text-ink-400">·</span>
                    <span className="font-mono">{userTeam.wins}-{userTeam.losses}{userTeam.ties ? `-${userTeam.ties}` : ""}</span>
                  </>
                )}
              </div>
            )}
          </div>
          {lastSavedMs != null && (
            <div className="text-[9px] text-ink-300 hidden sm:block" title="Auto-saved">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{prettyAgo(lastSavedMs)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 176px)" }}>
        <Outlet />
      </main>

      {/* Bottom nav — 4 tabs only */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 safe-bottom" style={{ background: "rgba(10,13,19,0.95)" }}>
        <FootballNavTabs teamTo={teamTo} />
      </nav>

      <FootballNewsTicker />
    </div>
  );
}

function FootballNavTabs({ teamTo }: { teamTo: string }) {
  const location = useLocation();
  return (
    <div className="flex px-2 py-2 gap-1">
      {TABS.map(item => {
        const to = item.to === "/football/team" ? teamTo : item.to;
        const active = item.matches(location.pathname);
        return (
          <NavLink
            key={item.to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl pressable touch-target min-h-[60px] ${active ? "" : "text-ink-200"}`}
            style={{ touchAction: "manipulation", color: active ? "#FFB81C" : undefined }}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

function prettyPhase(phase: string, week: number): string {
  if (phase === "regular") return week > 17 ? "Playoffs" : "Regular Season";
  if (phase === "playoffs") return "Playoffs";
  if (phase === "preseason") return "Preseason";
  if (phase === "offseason") return "Offseason";
  if (phase === "freeagency") return "Free Agency";
  if (phase === "draft") return "Draft";
  return phase;
}

function prettyAgo(ms: number): string {
  if (ms < 60_000) return "saved";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
