// Mogul shell — 5-tab nav, persistent studio header (tinted with the
// studio's chosen colors), and the bottom news ticker. Mirrors the
// franchise shell pattern used in baseball/football.
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CalendarDays, Clapperboard, Building2, Trophy, Save as SaveIcon, ArrowLeft } from "lucide-react";
import { useMogul } from "../store";
import { MogulNewsTicker } from "./MogulNewsTicker";

const TABS = [
  { to: "/mogul/studio",          label: "This Month", icon: CalendarDays, end: true },
  { to: "/mogul/studio/manage",   label: "Studio",     icon: Clapperboard },
  { to: "/mogul/studio/industry", label: "Industry",   icon: Building2 },
  { to: "/mogul/studio/awards",   label: "Awards",     icon: Trophy },
  { to: "/mogul/studio/save",     label: "Save & Exit", icon: SaveIcon },
];

export function MogulShell() {
  const studio = useMogul(s => s.studio);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("theme-mogul");
    return () => document.documentElement.classList.remove("theme-mogul");
  }, []);

  // No studio loaded — bounce back to the hub.
  useEffect(() => {
    if (!studio) navigate("/mogul");
  }, [studio]);

  if (!studio) return null;
  const player = studio.player;
  const headerBg = `linear-gradient(135deg, ${player.primary}cc 0%, ${player.primary}66 55%, rgba(10,8,12,0.92))`;

  const monthName = MONTHS[studio.month - 1];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1a0a14 0%, #050306 100%)",
        ["--ticker-bottom" as any]: "calc(env(safe-area-inset-bottom, 0px) + 64px)",
      }}
    >
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur border-b safe-top" style={{ background: headerBg, borderBottomColor: `${player.accent}33` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mogul")} className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center pressable touch-target" aria-label="Back to Beckett Movie Studios Hub">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-widest text-sm uppercase truncate" style={{ color: player.accent, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
              🎬 {player.name}
            </div>
            <div className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span>{monthName} {studio.year}</span>
              <span className="opacity-60 mx-1.5">·</span>
              <span className="font-mono">${player.cash.toFixed(1)}M</span>
              {player.loan > 0 && (
                <>
                  <span className="opacity-60 mx-1.5">·</span>
                  <span className="text-red-300 font-mono">loan ${player.loan.toFixed(1)}M</span>
                </>
              )}
              <span className="opacity-60 mx-1.5">·</span>
              <span>{"★".repeat(player.prestige)}<span className="opacity-30">{"★".repeat(5 - player.prestige)}</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 176px)" }}>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t safe-bottom" style={{ background: "rgba(10,8,12,0.95)", borderTopColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex px-2 py-2 gap-1">
          {TABS.map(item => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end as any}
                className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl pressable touch-target min-h-[60px] ${active ? "" : "text-ink-200"}`}
                style={{ touchAction: "manipulation", color: active ? "#D4AF37" : undefined }}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <MogulNewsTicker />
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
