// Sports Hub — top-level grouping page for all sports sims. Existing
// Baseball Dynasty / Football Dynasty / Versus + new Hockey / Basketball /
// College Football routes via SeasonSim.

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Crest } from "../art/CrestGenerator";
import { TEAMS_BY_SPORT } from "./teams";
import { SPORT_CONFIGS, type SportId } from "./franchise";
import { ImageParallax } from "../art";

interface Card {
  emoji: string; title: string; subtitle: string; description: string;
  accent: string; bg: string; onClick: () => void; status: string;
}

export default function SportsHub() {
  const navigate = useNavigate();

  const cards: Card[] = [
    {
      emoji: "⚾", title: "Baseball Dynasty", subtitle: "Deep franchise sim",
      description: "Roster, lineups, season, playoffs, multi-year dynasty.",
      status: "Full sim", accent: "#fde047",
      bg: "linear-gradient(135deg, rgba(40,30,8,0.95), rgba(15,10,3,0.85))",
      onClick: () => navigate("/baseball"),
    },
    {
      emoji: "🏈", title: "Football Dynasty", subtitle: "NFL-style sim",
      description: "Roster, schedule, playoffs, free agency, multi-year.",
      status: "Full sim", accent: "#fb923c",
      bg: "linear-gradient(135deg, rgba(40,15,5,0.95), rgba(15,5,2,0.85))",
      onClick: () => navigate("/football"),
    },
    {
      emoji: "🏒", title: "Hockey", subtitle: "Season + bracket",
      description: "12 original teams, 28-game season, 8-team playoffs.",
      status: "New", accent: SPORT_CONFIGS.hockey.accent,
      bg: "linear-gradient(135deg, rgba(8,30,40,0.95), rgba(2,10,20,0.85))",
      onClick: () => navigate("/sports/hockey"),
    },
    {
      emoji: "🏀", title: "Basketball", subtitle: "Season + bracket",
      description: "12 original teams, 30-game season, 8-team playoffs.",
      status: "New", accent: SPORT_CONFIGS.basketball.accent,
      bg: "linear-gradient(135deg, rgba(40,18,5,0.95), rgba(15,8,2,0.85))",
      onClick: () => navigate("/sports/basketball"),
    },
    {
      emoji: "🏈", title: "College Football", subtitle: "Recruiting + bowls",
      description: "16 original schools, 12-game season, 4-team playoff, class years.",
      status: "New", accent: SPORT_CONFIGS.cfb.accent,
      bg: "linear-gradient(135deg, rgba(40,30,8,0.95), rgba(15,10,3,0.85))",
      onClick: () => navigate("/sports/cfb"),
    },
    {
      emoji: "⚔️", title: "Versus Mode", subtitle: "Quick play-by-play",
      description: "Baseball + Football head-to-head, including online cross-device.",
      status: "Existing", accent: "#67e8f9",
      bg: "linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))",
      onClick: () => navigate("/versus"),
    },
  ];

  const allCrests = [
    ...TEAMS_BY_SPORT.hockey.slice(0, 4),
    ...TEAMS_BY_SPORT.basketball.slice(0, 4),
    ...TEAMS_BY_SPORT.cfb.slice(0, 4),
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "radial-gradient(900px 600px at 50% 0%, rgba(251,191,36,0.12), transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
    }}>
      {/* City skyline parallax — fits the "stadium" vibe. Fixed bottom,
       *  silhouettes only, low opacity so it suggests a stadium horizon
       *  without overpowering the cards. */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        height: 180, zIndex: 0, opacity: 0.32, pointerEvents: "none",
      }}>
        <ImageParallax preset="warpedCity" speedScale={0.35} />
      </div>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto w-full safe-top relative" style={{ zIndex: 1 }}>
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>🏆 SPORTS</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>SPORTS HUB</h1>
        </div>
      </header>

      <main className="px-4 max-w-5xl mx-auto w-full relative" style={{ zIndex: 1 }}>
        {/* Crest showcase */}
        <section className="mb-6">
          <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "rgba(229,231,235,0.7)" }}>ORIGINAL TEAMS · GENERATED CRESTS</div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {allCrests.map(t => (
              <div key={t.id} className="flex-shrink-0 text-center" style={{ width: 80 }}>
                <Crest spec={t.crest} size={64} />
                <div className="text-[9px] mt-1 truncate" style={{ color: "#fef3c7" }}>{t.abbr}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
          {cards.map(c => (
            <button key={c.title} onClick={c.onClick}
              className="text-left rounded-2xl p-4 pressable touch-target"
              style={{
                background: c.bg, border: `1.5px solid ${c.accent}40`,
                boxShadow: `0 8px 24px -8px ${c.accent}30`,
                minHeight: 160,
              }}>
              <div className="flex items-start justify-between">
                <div className="text-4xl">{c.emoji}</div>
                <span className="text-[9px] tracking-widest font-display px-2 py-0.5 rounded-full"
                  style={{ background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accent}66` }}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              <div className="font-display tracking-wider text-lg mt-2" style={{ color: c.accent }}>{c.title}</div>
              <div className="text-[10px] opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>{c.subtitle}</div>
              <div className="text-[11px] mt-1.5" style={{ color: "rgba(229,231,235,0.85)" }}>{c.description}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
