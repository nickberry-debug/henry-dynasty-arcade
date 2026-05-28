import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import {
  CalendarDays, Users, Trophy, Save as SaveIcon, ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TeamLogo } from "./TeamLogo";
import { NewsTicker } from "./NewsTicker";

// Franchise nav — JUST the four primary tabs. Everything else
// (Standings, Stats, FA, Draft, Playoffs, Coach, News, History,
// Settings) is reachable from inside one of these four tabs, and
// secondary routes still render under the same chrome.
const FRANCHISE_TABS: Array<{ to: string; label: string; icon: any; matches: (path: string) => boolean }> = [
  {
    to: "/dashboard",
    label: "This Week",
    icon: CalendarDays,
    matches: (p) => p === "/dashboard" || p.startsWith("/schedule") || p.startsWith("/coach") || p === "/allstar" || p === "/welcome",
  },
  {
    to: "/team",
    label: "Team",
    icon: Users,
    matches: (p) => p === "/team" || p.startsWith("/team/") || p.startsWith("/player/"),
  },
  {
    to: "/league",
    label: "League",
    icon: Trophy,
    matches: (p) => p === "/league" || p.startsWith("/standings") || p.startsWith("/stats") || p.startsWith("/teams") || p.startsWith("/freeagency") || p.startsWith("/draft") || p.startsWith("/playoffs") || p.startsWith("/news") || p.startsWith("/history"),
  },
  {
    to: "/save",
    label: "Save & Exit",
    icon: SaveIcon,
    matches: (p) => p === "/save" || p === "/settings",
  },
];

export function Layout() {
  const [wide, setWide] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const r = () => setWide(window.innerWidth >= 1024);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ ["--ticker-bottom" as any]: wide ? "0px" : "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
    >
      <a href="#main" className="skip-link">Skip to main content</a>
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {wide && <SideTabs />}
        <main id="main" className={`flex-1 min-w-0 p-5 lg:p-10 ${wide ? "pb-28" : "pb-44"} overflow-y-auto`}>
          <Outlet />
        </main>
      </div>
      {!wide && <BottomTabs />}
      <NewsTicker />
    </div>
  );
}

function TopBar() {
  const league = useStore(s => s.league);
  const navigate = useNavigate();
  const userTeam = league?.teams.find(t => t.id === league?.userTeamId);
  const totalWeeks = league ? Math.ceil(league.settings.gameplay.scheduleLength / 7) : 0;
  const currentWeek = league ? Math.floor(league.day / 7) + 1 : 0;
  const modifiedAt = league?.modifiedAt;
  const lastSavedMs = modifiedAt ? Date.now() - modifiedAt : null;
  // Tinted franchise header — bleeds the user's team colors into the
  // chrome so Henry knows whose franchise he's looking at from any
  // screen, not just the dashboard.
  const headerBg = userTeam
    ? `linear-gradient(135deg, ${userTeam.primary}cc 0%, ${userTeam.primary}66 55%, rgba(10,13,19,0.92))`
    : "rgba(10,13,19,0.85)";
  return (
    <header className="sticky top-0 z-30 border-b safe-top" style={{ background: headerBg, borderBottomColor: userTeam ? `${userTeam.accent}33` : "rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate("/baseball")}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
          aria-label="Back to Baseball Hub"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {userTeam && <TeamLogo team={userTeam} size={32} variant="cap" />}
            <div className="font-display tracking-widest text-sm uppercase truncate" style={{ color: userTeam?.accent ?? "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
              {userTeam ? `${userTeam.city} ${userTeam.name}` : "Franchise"}
            </div>
          </div>
          {league && (
            <div className="text-[10px] text-ink-200 truncate flex items-center gap-1.5 mt-0.5">
              <span>Year {league.year}</span>
              <span className="text-ink-400">·</span>
              <span className="capitalize">{prettyPhase(league.phase)}</span>
              {league.phase === "regular" && (
                <>
                  <span className="text-ink-400">·</span>
                  <span>Wk {currentWeek}/{totalWeeks}</span>
                </>
              )}
              {userTeam && (
                <>
                  <span className="text-ink-400">·</span>
                  <span className="font-mono">{userTeam.wins}-{userTeam.losses}</span>
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
  );
}

function prettyPhase(phase: string): string {
  const map: Record<string, string> = {
    "regular": "Regular Season",
    "playoffs": "Playoffs",
    "offseason": "Offseason",
    "preseason": "Preseason",
    "freeagency": "Free Agency",
    "draft": "Draft",
    "allStarBreak": "All-Star Break",
    "openingDay": "Opening Day",
    "tradeDeadline": "Trade Deadline",
    "playoffRace": "Playoff Race",
    "awardsNight": "Awards Night",
    "hofVoting": "HoF Voting",
    "springTraining": "Spring Training"
  };
  return map[phase] ?? phase;
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

// "Team" tab resolves to the user's own team page so the URL stays
// stable; if no userTeam exists (rare), fall back to the team list.
function teamTo(league: ReturnType<typeof useStore.getState>["league"]) {
  if (!league) return "/teams";
  const t = league.teams.find(tm => tm.id === league.userTeamId);
  return t ? `/team/${t.id}` : "/teams";
}

function SideTabs() {
  const league = useStore(s => s.league);
  const location = useLocation();
  return (
    <aside className="w-60 shrink-0 border-r border-white/5 glass">
      <nav className="p-3 flex flex-col gap-1">
        {FRANCHISE_TABS.map(item => {
          const to = item.to === "/team" ? teamTo(league) : item.to;
          const active = item.matches(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={to}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium pressable touch-target ${
                active ? "bg-gradient-to-r from-accent to-accent-dark text-ink-950"
                       : "text-ink-200 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomTabs() {
  const league = useStore(s => s.league);
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5 safe-bottom">
      <div className="flex px-2 py-2 gap-1">
        {FRANCHISE_TABS.map(item => {
          const to = item.to === "/team" ? teamTo(league) : item.to;
          const active = item.matches(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl pressable touch-target min-h-[60px] ${
                active ? "text-accent" : "text-ink-200"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
