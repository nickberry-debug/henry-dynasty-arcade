// Football franchise news ticker — two scrolling lines along the bottom
// of franchise screens. Top line: scores. Bottom line: news / drama /
// rumors. Mirrors the baseball ticker structurally; sources from the
// football drama engine + standings.
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFootball } from "../store";

const PIXELS_PER_SECOND_TOP = 70;
const PIXELS_PER_SECOND_BOT = 50;

// Routes where the ticker SHOULD show — only inside the franchise tree.
const SHOW_ON_PREFIXES = ["/football"];
// Sub-paths within /football where the ticker should NOT show.
const HIDE_ON_SUBPATHS = ["/football/hub", "/football/live", "/football/tournament", "/football/game"];

export function FootballNewsTicker() {
  const league = useFootball(s => s.league);
  const navigate = useNavigate();
  const location = useLocation();
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  // Build items from league state — scores + news.
  const { topItems, botItems, allItems } = useMemo(() => {
    if (!league) return { topItems: [], botItems: [], allItems: [] };
    // SCORES: most recent played games + user team record.
    const recent = league.schedule.filter(g => g.played && g.score).slice(-10).reverse();
    const top = recent.slice(0, 8).map(g => {
      const h = league.teams.find(t => t.id === g.homeId);
      const a = league.teams.find(t => t.id === g.awayId);
      if (!h || !a || !g.score) return null;
      return {
        id: g.id,
        emoji: "🏈",
        text: `${a.abbr} ${g.score.away} — ${h.abbr} ${g.score.home}`,
        category: "Game",
      };
    }).filter(Boolean) as { id: string; emoji: string; text: string; category: string }[];
    const userTeam = league.userTeamId ? league.teams.find(t => t.id === league.userTeamId) : null;
    if (userTeam) {
      top.push({
        id: "fb-ticker-record",
        emoji: "📊",
        text: `${userTeam.name} ${userTeam.wins}-${userTeam.losses}${userTeam.ties ? `-${userTeam.ties}` : ""}`,
        category: "Standings",
      });
    }

    // NEWS: storylines first (most "alive" content), then recent newsLog
    // items. Plain strings for `category` since we mix in our own
    // "Storyline" / "Info" buckets that aren't in the union.
    const news: { id: string; emoji: string; text: string; category: string }[] = [];
    const storylines = league.storylines?.active ?? [];
    for (const s of storylines.slice().sort((a, b) => b.intensity - a.intensity).slice(0, 5)) {
      news.push({
        id: `ticker-${s.id}`,
        emoji: s.emoji ?? "📰",
        text: s.label + (s.intensity > 1 ? " " + "★".repeat(Math.min(3, s.intensity - 1)) : ""),
        category: "Storyline",
      });
    }
    for (const n of (league.newsLog ?? []).slice(0, 12)) {
      news.push({
        id: n.id,
        emoji: n.emoji ?? emojiForCategory(n.category),
        text: n.headline,
        category: n.category as string,
      });
    }
    if (news.length === 0) {
      news.push({ id: "fb-ticker-info", emoji: "📅", text: `${league.season} Season · Week ${league.week}`, category: "Info" });
    }
    return { topItems: top.length > 0 ? top : [{ id: "fb-ticker-week", emoji: "🏈", text: `${league.season} · Week ${league.week}`, category: "Info" }], botItems: news, allItems: [...top, ...news] };
  }, [league?.schedule, league?.newsLog, league?.userTeamId, league?.season, league?.week]);

  // Compute scroll durations.
  useEffect(() => {
    const top = topRef.current;
    if (top) {
      const w = top.scrollWidth;
      top.style.animationDuration = `${Math.max(20, w / PIXELS_PER_SECOND_TOP)}s`;
    }
    const bot = botRef.current;
    if (bot) {
      const w = bot.scrollWidth;
      bot.style.animationDuration = `${Math.max(25, w / PIXELS_PER_SECOND_BOT)}s`;
    }
  }, [topItems, botItems]);

  // Visibility guard — must be a franchise route, not a special sub-route.
  const isFranchiseRoute = SHOW_ON_PREFIXES.some(p => location.pathname === p || location.pathname.startsWith(p + "/"))
    && !HIDE_ON_SUBPATHS.some(p => location.pathname === p || location.pathname.startsWith(p + "/"));
  if (!league || !isFranchiseRoute || allItems.length === 0) return null;

  let holdTimer: any = null;
  const handlePointerDown = () => { holdTimer = setTimeout(() => setPaused(true), 350); };
  const handlePointerUp = () => { clearTimeout(holdTimer); };
  const handleTap = (e: React.MouseEvent, id: string, category: string) => {
    e.stopPropagation();
    if (paused) { setPaused(false); return; }
    if (category === "Game") { navigate("/football/schedule"); return; }
    if (id === "fb-ticker-record") { navigate("/football/standings"); return; }
    navigate("/football");
  };

  const topDoubled = [...topItems, ...topItems];
  const botDoubled = [...botItems, ...botItems];
  const HEIGHT = 80;

  return (
    <div
      className="football-news-ticker"
      style={{
        position: "fixed",
        bottom: "var(--ticker-bottom, 0px)",
        left: 0, right: 0,
        height: HEIGHT,
        zIndex: 28,
        background: "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(8,12,16,0.98) 100%)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={() => setExpanded(v => !v)}
      aria-label="Football news and scores ticker"
    >
      <div className="ticker-live" style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, zIndex: 2,
        width: 72,
        background: "linear-gradient(90deg, #FFB81C 0%, #c89414 70%, transparent 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 4,
        fontFamily: "Oswald, 'Bebas Neue', system-ui, sans-serif",
        fontWeight: 700, fontSize: 11, letterSpacing: 2,
        color: "#0a0d13",
      }}>
        <span className="football-ticker-dot" />
        <span>LIVE</span>
      </div>

      <Line label="SCORES" labelColor="#FFB81C" trackRef={topRef} items={topDoubled} paused={paused} onTap={handleTap} textColor="#f4f7ff" fontWeight={600} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginLeft: 72 }} />
      <Line label="NEWS" labelColor="#7ec8ff" trackRef={botRef} items={botDoubled} paused={paused} onTap={handleTap} textColor="#cdd5e2" fontWeight={500} />

      {paused && (
        <div style={{
          position: "absolute", right: 8, top: 6,
          padding: "2px 8px",
          background: "rgba(255,184,28,0.85)", color: "#0a0d13",
          fontSize: 10, fontWeight: 700, borderRadius: 6, letterSpacing: 1,
        }}>PAUSED — tap to resume</div>
      )}

      {expanded && (
        <div
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "70vh",
              background: "linear-gradient(180deg, rgba(15,20,28,0.98), rgba(8,12,18,0.99))",
              borderTop: "2px solid rgba(255,184,28,0.5)",
              padding: "16px 16px 96px 16px", overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "Oswald, system-ui, sans-serif", letterSpacing: 2, fontSize: 14, color: "#FFB81C" }}>AROUND THE LEAGUE</div>
              <button onClick={() => setExpanded(false)} className="text-xs px-3 py-1 rounded-md bg-white/10 text-white pressable touch-target">Close</button>
            </div>
            {allItems.map(it => (
              <button
                key={it.id}
                onClick={(e) => { setExpanded(false); handleTap(e, it.id, it.category); }}
                className="w-full text-left rounded-lg px-3 py-2.5 mb-1.5 pressable touch-target"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase" }}>{it.category}</div>
                <div style={{ color: "#f4f7ff", fontSize: 14, marginTop: 2 }}>{it.emoji} {it.text}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes football-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .football-ticker-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #0a0d13;
          box-shadow: 0 0 8px #0a0d13;
          animation: football-ticker-pulse 1.5s ease-in-out infinite;
        }
        @keyframes football-ticker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          .football-ticker-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function Line({
  label, labelColor, trackRef, items, paused, onTap, textColor, fontWeight,
}: {
  label: string;
  labelColor: string;
  trackRef: React.RefObject<HTMLDivElement>;
  items: { id: string; emoji: string; text: string; category: string }[];
  paused: boolean;
  onTap: (e: React.MouseEvent, id: string, category: string) => void;
  textColor: string;
  fontWeight: number;
}) {
  return (
    <div style={{ flex: 1, position: "relative", paddingLeft: 72, overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div style={{
        position: "absolute", left: 78, top: "50%", transform: "translateY(-50%)", zIndex: 2,
        fontFamily: "Oswald, system-ui, sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 2,
        color: labelColor,
        background: "linear-gradient(90deg, rgba(8,12,16,1) 60%, rgba(8,12,16,0) 100%)",
        padding: "0 10px 0 0", pointerEvents: "none",
      }}>{label}</div>
      <div
        ref={trackRef}
        className="football-ticker-track"
        style={{
          position: "absolute", inset: 0, paddingLeft: 124, paddingRight: 80,
          display: "flex", alignItems: "center", whiteSpace: "nowrap",
          willChange: "transform",
          animation: `football-ticker-scroll linear infinite`,
          animationDuration: "60s",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((it, idx) => (
          <span
            key={`${it.id}-${idx}`}
            onClick={(e) => onTap(e, it.id, it.category)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0 18px",
              borderRight: "1px solid rgba(255,255,255,0.10)",
              fontSize: 15, color: textColor, fontWeight, cursor: "pointer", lineHeight: 1.2,
            }}
          >
            <span style={{ fontSize: 15 }}>{it.emoji}</span>
            <span>{it.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function emojiForCategory(cat: string): string {
  switch (cat) {
    case "Injury": return "🤕";
    case "Trade": return "🤝";
    case "Drama": return "🎭";
    case "Milestone": return "🏆";
    case "Drama-AI": return "🤖";
    case "Game": return "🏈";
    default: return "📰";
  }
}
