// Game switcher footer — sticky strip at the bottom of landing pages.
// Three cards: Baseball, Football, Olympus. Tapping switches modes.
// The active game's card is highlighted.
import { Link, useLocation } from "react-router-dom";

type GameId = "baseball" | "football" | "olympus";

interface Card {
  id: GameId;
  emoji: string;
  name: string;
  to: string;
  accent: string;
  // optional: description / status / etc — landing page passes summaries in
}

const CARDS: Card[] = [
  { id: "baseball", emoji: "⚾", name: "Baseball", to: "/", accent: "#fbbf24" },
  { id: "football", emoji: "🏈", name: "Football", to: "/football", accent: "#FFB81C" },
  { id: "olympus",  emoji: "⚔️", name: "Olympus",  to: "/olympus",  accent: "#DAA520" },
];

interface Props {
  /** Override the currently-active game; if omitted, inferred from the URL. */
  active?: GameId;
  /** Per-card summary line ("Day 47 of 162", "Week 7", "Henry the Bold L14"). */
  summaries?: Partial<Record<GameId, string>>;
}

export function GameSwitcher({ active, summaries }: Props) {
  const loc = useLocation();
  const inferred: GameId = loc.pathname.startsWith("/football") ? "football"
    : loc.pathname.startsWith("/olympus") ? "olympus"
    : "baseball";
  const current = active ?? inferred;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-4 pb-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-ink-300 font-display text-center mb-2">Explore Other Games</div>
      <div className="grid grid-cols-3 gap-2">
        {CARDS.map(c => {
          const isActive = c.id === current;
          const summary = summaries?.[c.id];
          return (
            <Link
              key={c.id}
              to={c.to}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border pressable touch-target text-center transition ${
                isActive
                  ? "border-2"
                  : "border border-white/10 bg-white/3 hover:bg-white/5"
              }`}
              style={isActive ? { borderColor: c.accent, background: `${c.accent}18` } : undefined}
            >
              <span className="text-2xl mb-1">{c.emoji}</span>
              <span className="font-display text-xs tracking-wider" style={isActive ? { color: c.accent } : undefined}>{c.name}</span>
              {summary && <span className="text-[9px] text-ink-300 mt-0.5 leading-tight max-w-full truncate">{summary}</span>}
              {isActive && <span className="text-[8px] mt-0.5 font-display tracking-widest" style={{ color: c.accent }}>● ACTIVE</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
