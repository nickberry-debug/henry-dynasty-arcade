// Category screen — opens when the user taps a folder on the home page.
// Shows all games tagged to that category as premium cards. Hubs are
// rendered with a "OPENS HUB" badge so it's clear they go to a sub-grid
// rather than directly into gameplay.

import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_BY_ID, gamesIn, type Category } from "../config/games";
import { useActiveProfile } from "../profiles/store";

const VALID: Category[] = ["sports","action","adventure","space","strategy","create","brain","party","resources"];

export default function CategoryScreen() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const profile = useActiveProfile();

  const cat = category && VALID.includes(category as Category)
    ? CATEGORY_BY_ID[category as Category]
    : null;

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050308" }}>
        <div className="max-w-sm w-full rounded-2xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-4xl mb-2">🤔</div>
          <div className="font-display tracking-widest text-lg" style={{ color: "#fef3c7" }}>UNKNOWN CATEGORY</div>
          <button onClick={() => navigate("/")}
            className="mt-3 px-4 py-2 rounded-full font-display tracking-widest text-[11px] pressable touch-target"
            style={{ background: "#a78bfa", color: "#0a0a14" }}>
            BACK HOME
          </button>
        </div>
      </div>
    );
  }

  const games = gamesIn(cat.id);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      background: `radial-gradient(900px 600px at 50% 0%, ${cat.accent}22, transparent 60%), ` +
                  "linear-gradient(180deg, #0a0814 0%, #050308 100%)",
    }}>
      {/* Subtle starfield matching home */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff, transparent), " +
            "radial-gradient(1px 1px at 32% 64%, #fff, transparent), " +
            "radial-gradient(1px 1px at 68% 22%, #fff, transparent), " +
            "radial-gradient(1px 1px at 84% 78%, #fff, transparent)",
        }} />

      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto w-full safe-top relative z-10">
        <button onClick={() => navigate("/")} aria-label="Back to home"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="text-3xl">{cat.emoji}</div>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cat.accent }}>
            {games.length} GAME{games.length === 1 ? "" : "S"}
          </div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: cat.accent }}>
            {cat.label.toUpperCase()}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-[11px] opacity-80 mb-4" style={{ color: "rgba(229,231,235,0.85)" }}>
          {cat.subtitle}
        </div>

        {games.length === 0 ? (
          <div className="text-center py-12 opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
            No games in this folder yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g, i) => {
              const isFavorite = profile?.favoriteGame === g.id;
              return (
                <motion.button key={g.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -4, scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 22 }}
                  onClick={() => navigate(g.route)}
                  aria-label={`Open ${g.name} — ${g.subtitle}`}
                  className="relative text-left rounded-2xl overflow-hidden p-4 pressable touch-target group"
                  style={{
                    background: g.bg,
                    border: `${isFavorite ? "2px" : "1px"} solid ${isFavorite ? "#FFD700" : g.accent + "55"}`,
                    minHeight: 200,
                    boxShadow: `0 6px 22px -10px ${g.accent}40, 0 0 0 1px ${g.accent}1A inset`,
                  }}>
                  <div className="absolute inset-0 opacity-25 pointer-events-none transition-opacity group-hover:opacity-45"
                    style={{ background: `radial-gradient(520px 220px at 80% -10%, ${g.accent}, transparent 60%)` }} />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="text-4xl">{g.emoji}</div>
                      <div className="flex flex-col items-end gap-1">
                        {g.type === "hub" && (
                          <span className="text-[8px] tracking-widest font-display px-1.5 py-0.5 rounded"
                            style={{ background: `${g.accent}33`, color: g.accent, border: `1px solid ${g.accent}66` }}>
                            OPENS HUB
                          </span>
                        )}
                        <span className="text-[9px] tracking-widest font-display px-2 py-0.5 rounded-full"
                          style={{ background: `${g.accent}1A`, color: g.accent, border: `1px solid ${g.accent}55` }}>
                          {g.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="font-display tracking-wider text-lg mt-2" style={{ color: g.accent }}>
                      {g.name}
                      {isFavorite && <span className="ml-1.5" style={{ color: "#FFD700" }}>★</span>}
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>{g.subtitle}</div>
                    <div className="text-[11px] mt-2" style={{ color: "rgba(229,231,235,0.85)" }}>
                      {g.description}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
