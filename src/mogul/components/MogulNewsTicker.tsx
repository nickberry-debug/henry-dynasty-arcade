// Mogul news ticker — two scrolling lines (box office top, news
// bottom). Franchise-mode only — hidden on /mogul hub itself.
import { useEffect, useRef, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMogul } from "../store";

const PIXELS_PER_SECOND_TOP = 70;
const PIXELS_PER_SECOND_BOT = 50;

export function MogulNewsTicker() {
  const studio = useMogul(s => s.studio);
  const location = useLocation();
  const [paused, setPaused] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  const { topItems, botItems } = useMemo(() => {
    if (!studio) return { topItems: [], botItems: [] };
    // SCORES line: recent box office openings + records.
    const recent = studio.releases.slice(0, 10);
    const top = recent.map(r => {
      const studioName = r.studioId === studio.player.id ? studio.player.abbr : studio.rivals.find(x => x.id === r.studioId)?.abbr ?? "—";
      return { id: r.id, emoji: "🎟️", text: `"${r.title}" (${studioName}) — $${r.totalBO.toFixed(1)}M`, category: "Box Office" };
    });
    if (top.length === 0) {
      top.push({ id: "fb-top", emoji: "🎟️", text: `Box office: opens with no releases yet.`, category: "Box Office" });
    }
    const bot = studio.newsLog.slice(0, 12).map(n => ({
      id: n.id,
      emoji: n.emoji ?? "📰",
      text: n.headline,
      category: n.category as string,
    }));
    if (bot.length === 0) {
      bot.push({ id: "fb-bot", emoji: "🎬", text: `${studio.player.name} ready for action.`, category: "Info" });
    }
    return { topItems: top, botItems: bot };
  }, [studio?.releases, studio?.newsLog, studio?.player.name]);

  useEffect(() => {
    const top = topRef.current;
    if (top) top.style.animationDuration = `${Math.max(20, top.scrollWidth / PIXELS_PER_SECOND_TOP)}s`;
    const bot = botRef.current;
    if (bot) bot.style.animationDuration = `${Math.max(25, bot.scrollWidth / PIXELS_PER_SECOND_BOT)}s`;
  }, [topItems, botItems]);

  // Hide on the hub itself; show on /mogul/studio/*.
  const show = location.pathname.startsWith("/mogul/studio");
  if (!studio || !show) return null;

  const topDoubled = [...topItems, ...topItems];
  const botDoubled = [...botItems, ...botItems];

  return (
    <div
      className="mogul-news-ticker"
      style={{
        position: "fixed",
        bottom: "var(--ticker-bottom, 0px)",
        left: 0, right: 0,
        height: 80,
        zIndex: 28,
        background: "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(10,6,12,0.98) 100%)",
        borderTop: "1px solid rgba(212,175,55,0.20)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
      onPointerDown={() => { setTimeout(() => setPaused(p => !p), 0); }}
    >
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, zIndex: 2,
        width: 72,
        background: "linear-gradient(90deg, #D4AF37 0%, #b8941f 70%, transparent 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4,
        fontFamily: "Oswald, 'Bebas Neue', system-ui, sans-serif",
        fontWeight: 700, fontSize: 11, letterSpacing: 2,
        color: "#0a0a0a",
      }}>
        <span className="mogul-dot" />
        <span>LIVE</span>
      </div>

      <Line label="BOX OFFICE" labelColor="#D4AF37" trackRef={topRef} items={topDoubled} paused={paused} textColor="#f4f7ff" fontWeight={600} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginLeft: 72 }} />
      <Line label="NEWS" labelColor="#f7c873" trackRef={botRef} items={botDoubled} paused={paused} textColor="#cdd5e2" fontWeight={500} />

      <style>{`
        @keyframes mogul-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mogul-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #0a0a0a;
          box-shadow: 0 0 6px #0a0a0a;
          animation: mogul-pulse 1.5s ease-in-out infinite;
        }
        @keyframes mogul-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        @media (prefers-reduced-motion: reduce) { .mogul-track { animation: none !important; } }
      `}</style>
    </div>
  );
}

function Line({ label, labelColor, trackRef, items, paused, textColor, fontWeight }: {
  label: string;
  labelColor: string;
  trackRef: React.RefObject<HTMLDivElement>;
  items: { id: string; emoji: string; text: string; category: string }[];
  paused: boolean;
  textColor: string;
  fontWeight: number;
}) {
  return (
    <div style={{ flex: 1, position: "relative", paddingLeft: 72, overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div style={{
        position: "absolute", left: 78, top: "50%", transform: "translateY(-50%)", zIndex: 2,
        fontFamily: "Oswald, system-ui, sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 2,
        color: labelColor,
        background: "linear-gradient(90deg, rgba(10,6,12,1) 60%, rgba(10,6,12,0) 100%)",
        padding: "0 10px 0 0", pointerEvents: "none",
      }}>{label}</div>
      <div
        ref={trackRef}
        className="mogul-track"
        style={{
          position: "absolute", inset: 0, paddingLeft: 124, paddingRight: 80,
          display: "flex", alignItems: "center", whiteSpace: "nowrap",
          willChange: "transform",
          animation: `mogul-scroll linear infinite`,
          animationDuration: "60s",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((it, idx) => (
          <span
            key={`${it.id}-${idx}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0 18px",
              borderRight: "1px solid rgba(255,255,255,0.10)",
              fontSize: 15, color: textColor, fontWeight, lineHeight: 1.2,
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
