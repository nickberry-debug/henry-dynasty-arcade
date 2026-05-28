// Live news ticker — ESPN/CNN style. Two scrolling lines along the bottom
// of franchise screens, just above the BottomNav. Top line: scores +
// standings + hot players. Bottom line: news, rumors, drama, info.
// Hidden on in-game / training action screens.
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { buildTickerItems, ensureDramaState } from "../engine/drama";

const PIXELS_PER_SECOND_TOP = 70; // scores scroll a bit faster
const PIXELS_PER_SECOND_BOT = 50; // news scrolls slower so it's readable

// Categories that look/feel like SCORES (top line). Everything else is
// treated as news (bottom line).
const SCORE_CATEGORIES = new Set(["Game", "Standings", "Hot", "hot-streak", "cold-streak", "comeback", "rivalry"]);

// Routes where the ticker should NOT show — anything that's a live action
// screen, training drill, or score-keeper session. Everything else under
// the LayoutWithBars chrome is a "franchise hub" screen.
const HIDE_ON_PREFIXES = ["/live", "/training", "/score"];

export function NewsTicker() {
  const league = useStore(s => s.league);
  const navigate = useNavigate();
  const location = useLocation();
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  // Read drama settings so we honour the "show ticker" toggle.
  const drama = league ? (league as any).drama : null;
  const showTicker = drama?.showTicker !== false; // default ON

  const items = useMemo(() => {
    if (!league) return [];
    try { ensureDramaState(league); } catch {}
    return buildTickerItems(league);
  }, [league?.day, league?.newsLog]);

  // Split items into score line vs news line. If one side ends up empty,
  // give it a single placeholder so the band doesn't look broken.
  const { topItems, botItems } = useMemo(() => {
    const t = items.filter(it => SCORE_CATEGORIES.has(it.category));
    const b = items.filter(it => !SCORE_CATEGORIES.has(it.category));
    if (t.length === 0 && league?.userTeamId) {
      const ut = league.teams.find(x => x.id === league.userTeamId);
      if (ut) t.push({ id: "ticker-record-fb", emoji: "📊", text: `${ut.name} ${ut.wins}-${ut.losses}`, category: "Standings" });
    }
    if (b.length === 0) b.push({ id: "ticker-info-fb", emoji: "📅", text: `Day ${league?.day ?? 1} • ${league?.year ?? ""} Season`, category: "Info" });
    return { topItems: t, botItems: b };
  }, [items, league?.userTeamId, league?.day, league?.year]);

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

  const isFranchiseRoute = !HIDE_ON_PREFIXES.some(p => location.pathname === p || location.pathname.startsWith(p + "/"));
  if (!league || !showTicker || !isFranchiseRoute || items.length === 0) return null;

  let holdTimer: any = null;
  const handlePointerDown = () => {
    holdTimer = setTimeout(() => setPaused(true), 350);
  };
  const handlePointerUp = () => {
    clearTimeout(holdTimer);
  };
  const handleTap = (e: React.MouseEvent | React.TouchEvent, id: string, category: string) => {
    e.stopPropagation();
    if (paused) { setPaused(false); return; }
    if (id.startsWith("dr-")) { navigate("/news"); return; }
    if (id.startsWith("ticker-hot-")) { navigate("/stats"); return; }
    if (id === "ticker-user-record" || id === "ticker-record-fb") { navigate("/standings"); return; }
    if (id === "ticker-welcome" || id === "ticker-day" || id === "ticker-info-fb") { navigate("/dashboard"); return; }
    if (category === "Game") { navigate("/schedule"); return; }
    navigate("/news");
  };

  // Duplicate items so the scroll wraps seamlessly.
  const topDoubled = [...topItems, ...topItems];
  const botDoubled = [...botItems, ...botItems];

  const HEIGHT = 80;

  return (
    <div
      className="news-ticker"
      style={{
        position: "fixed",
        bottom: "var(--ticker-bottom, 0px)",
        left: 0,
        right: 0,
        height: HEIGHT,
        zIndex: 28,
        background: "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(8,8,8,0.98) 100%)",
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
      aria-label="Live news and scores ticker"
    >
      {/* LIVE chip — taller now, spans both lines */}
      <div className="ticker-live" style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        zIndex: 2,
        width: 72,
        background: "linear-gradient(90deg, #d22 0%, #b11 70%, transparent 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        fontFamily: "Oswald, 'Bebas Neue', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 2,
        color: "#fff",
      }}>
        <span className="ticker-live-dot" />
        <span>LIVE</span>
      </div>

      {/* Top line — SCORES */}
      <Line
        label="SCORES"
        labelColor="#ffd470"
        trackRef={topRef}
        items={topDoubled}
        paused={paused}
        onTap={handleTap}
        textColor="#f4f7ff"
        fontWeight={600}
      />
      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginLeft: 72 }} />
      {/* Bottom line — NEWS */}
      <Line
        label="NEWS"
        labelColor="#7ec8ff"
        trackRef={botRef}
        items={botDoubled}
        paused={paused}
        onTap={handleTap}
        textColor="#cdd5e2"
        fontWeight={500}
      />

      {paused && (
        <div style={{
          position: "absolute",
          right: 8, top: 6,
          padding: "2px 8px",
          background: "rgba(255,179,2,0.85)",
          color: "#0a0d13",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 6,
          letterSpacing: 1,
        }}>PAUSED — tap to resume</div>
      )}

      {/* Tap-to-expand overlay: shows the full news list above the ticker */}
      {expanded && (
        <div
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 40,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "70vh",
              background: "linear-gradient(180deg, rgba(15,15,20,0.98), rgba(8,8,12,0.99))",
              borderTop: "2px solid rgba(255,179,2,0.5)",
              padding: "16px 16px 96px 16px",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "Oswald, system-ui, sans-serif", letterSpacing: 2, fontSize: 14, color: "#ffd470" }}>AROUND THE LEAGUE</div>
              <button onClick={() => setExpanded(false)} className="text-xs px-3 py-1 rounded-md bg-white/10 text-white pressable touch-target">Close</button>
            </div>
            {items.map(it => (
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

      {/* Inline styles for keyframes + live pulse */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 8px #fff;
          animation: ticker-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none !important; }
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
  onTap: (e: React.MouseEvent | React.TouchEvent, id: string, category: string) => void;
  textColor: string;
  fontWeight: number;
}) {
  return (
    <div style={{
      flex: 1,
      position: "relative",
      paddingLeft: 72,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
    }}>
      {/* Inline section label */}
      <div style={{
        position: "absolute",
        left: 78,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 2,
        fontFamily: "Oswald, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: 2,
        color: labelColor,
        background: "linear-gradient(90deg, rgba(8,8,12,1) 60%, rgba(8,8,12,0) 100%)",
        padding: "0 10px 0 0",
        pointerEvents: "none",
      }}>{label}</div>
      <div
        ref={trackRef}
        className="ticker-track"
        style={{
          position: "absolute",
          inset: 0,
          paddingLeft: 124,
          paddingRight: 80,
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          willChange: "transform",
          animation: `ticker-scroll linear infinite`,
          animationDuration: "60s",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((it, idx) => (
          <span
            key={`${it.id}-${idx}`}
            onClick={(e) => onTap(e, it.id, it.category)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 18px",
              borderRight: "1px solid rgba(255,255,255,0.10)",
              fontSize: 15,
              color: textColor,
              fontWeight,
              cursor: "pointer",
              lineHeight: 1.2,
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
