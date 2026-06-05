// Olympus mode chrome — deep midnight blue background, Greek-key accents,
// gold/bronze typography. Wraps the routed Olympus pages.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Users, Settings as SettingsIcon } from "lucide-react";
import { useOlympus } from "../store";
import { SaveIndicator } from "./SaveIndicator";

const navItems = [
  { to: "/olympus", label: "Hub", icon: Home, end: true },
  { to: "/olympus/roster", label: "Heroes", icon: Users },
  { to: "/olympus/settings", label: "Settings", icon: SettingsIcon },
];

export function OlympusShell() {
  const navigate = useNavigate();
  const loadAll = useOlympus(s => s.loadAll);
  const activeHero = useOlympus(s => s.heroes.find(h => h.id === s.activeHeroId));

  useEffect(() => {
    document.documentElement.classList.add("theme-olympus");
    loadAll();
    return () => document.documentElement.classList.remove("theme-olympus");
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(800px 400px at 50% -10%, rgba(218,165,32,0.08), transparent 70%), linear-gradient(180deg, #0F1B2D 0%, #07101E 100%)",
        color: "#e9e3d2",
        fontFamily: "'EB Garamond', 'Crimson Text', Georgia, serif",
      }}
    >
      <header
        className="sticky top-0 z-30 backdrop-blur border-b"
        style={{ background: "rgba(15,27,45,0.85)", borderColor: "rgba(218,165,32,0.2)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/title")}
            className="w-10 h-10 rounded-full flex items-center justify-center font-display text-xl pressable touch-target"
            style={{ background: "linear-gradient(135deg, #DAA520, #8B6914)", color: "#0F1B2D" }}
            aria-label="Title screen"
          >
            ⚔️
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-[0.25em] text-sm" style={{ color: "#DAA520", fontFamily: "'Cinzel', serif" }}>OLYMPUS</div>
            <div className="text-[10px] truncate" style={{ color: "rgba(233,227,210,0.6)" }}>
              {activeHero ? `${activeHero.name} · ${activeHero.className} · L${activeHero.level}` : "No hero selected"}
            </div>
          </div>
          <SaveIndicator />
          <button
            onClick={() => navigate("/play")}
            className="text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 pressable touch-target"
            style={{ background: "rgba(218,165,32,0.1)", border: "1px solid rgba(218,165,32,0.25)", color: "#DAA520" }}
            title="Switch games"
          >
            🎮 Games
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 pb-32 overflow-y-auto">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t safe-bottom"
        style={{ background: "rgba(7,16,30,0.95)", borderColor: "rgba(218,165,32,0.2)" }}
      >
        <div className="flex justify-around px-2 py-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end as any}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 min-w-[64px] px-2 py-2 rounded-xl pressable touch-target`
              }
              style={({ isActive }) => isActive ? { color: "#DAA520" } : { color: "rgba(233,227,210,0.55)" }}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
