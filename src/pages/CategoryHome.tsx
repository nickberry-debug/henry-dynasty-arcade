// Category-folder home page. Replaces the long flat grid with iOS-style
// folder tiles — tap a folder to see the games inside. Registry-driven
// (src/config/games.ts), so adding a new game = just tag its category.
//
// Top of page:
//   • Profile badge + Settings gear
//   • Search (cross-category)
//   • Continue Playing strip (recent for this profile)
// Body: 8 folder tiles + Resources tile.
// Tapping a folder → /home/<category>

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Settings as SettingsIcon, X, Clock, ArrowRight } from "lucide-react";
import { CATEGORIES, GAMES, gamesIn, getGameById, getGameByRoute, searchGames, type GameEntry, type Category } from "../config/games";
import { ProfileBadge } from "../profiles/ProfileBadge";
import { useActiveProfile, loadStats, getActiveProfileId } from "../profiles/store";
import { ArcadeSettings } from "../arcade/ArcadeSettings";
import { SyncIndicator } from "../components/SyncIndicator";

import { BUILD_VERSION as APP_VERSION, formatBuildDate } from "../build-info";

function unseenLatest(): boolean {
  try { return localStorage.getItem("dd_whats_new_seen") !== APP_VERSION; } catch { return false; }
}

export default function CategoryHome() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Build Continue Playing from per-profile stats — most-recent first.
  const continuePlaying = useMemo<GameEntry[]>(() => {
    const pid = getActiveProfileId();
    if (!pid) return [];
    const stats = loadStats(pid);
    const entries = Object.entries(stats)
      .filter(([, s]) => (s.lastPlayed ?? 0) > 0)
      .sort((a, b) => (b[1].lastPlayed ?? 0) - (a[1].lastPlayed ?? 0));
    const seen = new Set<string>();
    const out: GameEntry[] = [];
    for (const [gameId] of entries) {
      // Try direct id match, then strip common prefix variants
      const candidates = [gameId, gameId.replace(/^sports_/, "")];
      let g: GameEntry | undefined;
      for (const c of candidates) {
        g = getGameById(c);
        if (g) break;
      }
      if (g && !seen.has(g.id)) { out.push(g); seen.add(g.id); }
      if (out.length >= 6) break;
    }
    return out;
    // Re-eval on profile change. (Recent activity is cheap to recompute.)
  }, [profile?.id]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      background:
        "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.18), transparent 60%), " +
        "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.14), transparent 60%), " +
        "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
    }}>
      {/* Subtle starfield */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff, transparent), " +
            "radial-gradient(1px 1px at 32% 64%, #fff, transparent), " +
            "radial-gradient(1px 1px at 68% 22%, #fff, transparent), " +
            "radial-gradient(1px 1px at 84% 78%, #fff, transparent), " +
            "radial-gradient(1.4px 1.4px at 48% 38%, #ffd54a, transparent), " +
            "radial-gradient(1.4px 1.4px at 22% 88%, #c084fc, transparent)",
        }} />

      {/* Version badge */}
      <div className="absolute z-10 font-display tracking-[0.3em] text-[10px] px-2.5 py-1 rounded-full"
        style={{
          top: "max(env(safe-area-inset-top, 12px), 12px)", left: "50%", transform: "translateX(-50%)",
          background: "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.40)", color: "#fde047",
        }}>
        v{APP_VERSION} <span style={{ opacity: 0.6, fontSize: "0.8em" }}>· {formatBuildDate()}</span>
      </div>

      <header className="px-4 pt-14 pb-2 flex items-center gap-3 max-w-5xl mx-auto w-full safe-top relative z-10">
        <ProfileBadge />
        <SyncIndicator />
        <div className="flex-1" />
        <button onClick={() => setSearchOpen(true)} aria-label="Search games"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fef3c7" }}>
          <Search size={18} />
        </button>
        <button onClick={() => setSettingsOpen(true)} aria-label="Settings"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fef3c7" }}>
          <SettingsIcon size={18} />
        </button>
      </header>

      <main className="px-4 pb-12 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center pt-3 pb-5">
          <h1 className="font-display tracking-[0.15em] text-3xl sm:text-4xl"
            style={{ color: "#ffd54a", letterSpacing: "0.18em" }}>
            BERRY KID'S ARCADE
          </h1>
          <div className="text-[11px] mt-1 opacity-80" style={{ color: "rgba(229,231,235,0.85)" }}>
            Tap a folder to see its games.
          </div>
        </div>

        {/* Continue Playing — only when there are recents */}
        {continuePlaying.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#86efac" }}>
              <Clock size={11} /> CONTINUE PLAYING
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
              {continuePlaying.map(g => (
                <button key={g.id} onClick={() => navigate(g.route)}
                  className="flex-shrink-0 rounded-xl p-2.5 text-left pressable touch-target"
                  style={{
                    background: `linear-gradient(135deg, ${g.accent}28, rgba(8,8,14,0.95))`,
                    border: `1px solid ${g.accent}55`,
                    minWidth: 150,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">{g.emoji}</div>
                    <div className="font-display text-[12px] truncate" style={{ color: g.accent }}>{g.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Folder grid */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((cat, i) => {
              const games = gamesIn(cat.id);
              const previews = games.slice(0, 4);
              return (
                <motion.button key={cat.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 22 }}
                  onClick={() => navigate(`/home/${cat.id}`)}
                  className="relative text-left rounded-2xl overflow-hidden p-4 pressable touch-target"
                  style={{
                    background: cat.bg,
                    border: `1.5px solid ${cat.accent}55`,
                    minHeight: 168,
                    boxShadow: `0 8px 24px -10px ${cat.accent}40`,
                  }}>
                  <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ background: `radial-gradient(500px 200px at 80% -10%, ${cat.accent}, transparent 60%)` }} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{cat.emoji}</div>
                      <div className="text-[9px] tracking-widest font-display px-2 py-0.5 rounded-full"
                        style={{ background: `${cat.accent}1A`, color: cat.accent, border: `1px solid ${cat.accent}55` }}>
                        {games.length} GAME{games.length === 1 ? "" : "S"}
                      </div>
                    </div>
                    <div className="font-display tracking-wider text-lg mt-2" style={{ color: cat.accent }}>
                      {cat.label.toUpperCase()}
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>{cat.subtitle}</div>
                    {/* Folder preview — show 4 game emojis */}
                    <div className="flex gap-1.5 mt-3">
                      {previews.map(g => (
                        <div key={g.id} className="rounded-md flex items-center justify-center text-lg"
                          style={{
                            width: 32, height: 32,
                            background: `${g.accent}22`,
                            border: `1px solid ${g.accent}55`,
                          }}>
                          {g.emoji}
                        </div>
                      ))}
                      {games.length > 4 && (
                        <div className="rounded-md flex items-center justify-center text-[10px] font-mono"
                          style={{
                            width: 32, height: 32,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fef3c7",
                          }}>
                          +{games.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Stale cache escape hatch — reachable when something looks broken */}
        <div className="text-center mt-4">
          <button onClick={async () => {
            try {
              if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister().catch(() => false)));
              }
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
            } catch { /* ignore */ }
            sessionStorage.clear();
            location.reload();
          }}
            className="text-[9px] tracking-widest opacity-50 hover:opacity-100 underline pressable"
            style={{ color: "#fef3c7" }}>
            STUCK? RESET APP CACHE
          </button>
        </div>

        {/* Family + Stats + What's New shortcuts */}
        <section className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Link to="/family" className="rounded-xl p-3 pressable touch-target text-center"
            style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.40)" }}>
            <div className="text-2xl">📊</div>
            <div className="font-display tracking-wider text-[11px] mt-1" style={{ color: "#a78bfa" }}>FAMILY STATS</div>
          </Link>
          <Link to="/family/roster" className="rounded-xl p-3 pressable touch-target text-center"
            style={{ background: "rgba(134,239,172,0.10)", border: "1px solid rgba(134,239,172,0.40)" }}>
            <div className="text-2xl">👥</div>
            <div className="font-display tracking-wider text-[11px] mt-1" style={{ color: "#86efac" }}>ROSTER</div>
          </Link>
          <Link to="/whats-new" className="rounded-xl p-3 pressable touch-target text-center relative"
            style={{ background: "rgba(253,224,71,0.10)", border: "1px solid rgba(253,224,71,0.40)" }}>
            <div className="text-2xl">📰</div>
            <div className="font-display tracking-wider text-[11px] mt-1" style={{ color: "#fde047" }}>WHAT'S NEW</div>
            {unseenLatest() && (
              <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                style={{ background: "#dc2626", boxShadow: "0 0 8px #dc2626" }} />
            )}
          </Link>
        </section>
      </main>

      {settingsOpen && <ArcadeSettings onClose={() => setSettingsOpen(false)} />}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Search overlay ────────────────────────────────────────────────────

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const results = searchGames(q);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="max-w-2xl w-full mx-auto p-4 pt-12 safe-top">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.20)" }}>
          <Search size={16} style={{ color: "rgba(229,231,235,0.7)" }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search games — name, theme, anything…"
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: "#fef3c7" }} />
          <button onClick={onClose} aria-label="Close search"
            className="w-7 h-7 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.10)", color: "#fef3c7" }}>
            <X size={13} />
          </button>
        </div>

        <div className="mt-3 max-h-[70vh] overflow-y-auto">
          {q.trim() === "" && (
            <div className="text-center py-12 opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
              Start typing — searches every game by name, subtitle, or description.
            </div>
          )}
          {q.trim() !== "" && results.length === 0 && (
            <div className="text-center py-12 opacity-70" style={{ color: "#fca5a5" }}>
              No games match "{q}".
            </div>
          )}
          <div className="space-y-1.5">
            {results.map(g => (
              <button key={g.id} onClick={() => { navigate(g.route); onClose(); }}
                className="w-full rounded-lg p-2.5 text-left flex items-center gap-3 pressable touch-target"
                style={{
                  background: `linear-gradient(90deg, ${g.accent}22, rgba(8,8,14,0.95))`,
                  border: `1px solid ${g.accent}55`,
                }}>
                <div className="text-2xl">{g.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display tracking-wide text-[13px]" style={{ color: g.accent }}>{g.name}</div>
                  <div className="text-[10px] opacity-70 truncate" style={{ color: "#fef3c7" }}>{g.subtitle}</div>
                </div>
                <ArrowRight size={14} style={{ color: g.accent }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
