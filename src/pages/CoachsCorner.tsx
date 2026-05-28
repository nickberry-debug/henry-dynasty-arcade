import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TUTORIAL_CHAPTERS, ACHIEVEMENT_DEFS, TutorialChapter } from "../data/tutorial";
import { useStore } from "../store";
import { useScrollLock } from "../hooks/useScrollLock";
import { Check, ChevronRight, ArrowLeft, Lock, Compass, Sparkles } from "lucide-react";

export default function CoachsCorner() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();
  const [openChapter, setOpenChapter] = useState<TutorialChapter | null>(null);
  useScrollLock(!!openChapter);

  if (!league) return null;
  const tut = league.tutorial;

  const toggleGuidedMode = async () => {
    await mutate(lg => { lg.tutorial.guidedSeason = !lg.tutorial.guidedSeason; });
  };

  const startTour = async () => {
    await mutate(lg => { lg.tutorial.hasSeenWelcome = false; });
    navigate("/welcome");
  };

  const completed = (id: string) => tut.completedChapters.includes(id);

  const completeChapter = async (id: string) => {
    if (completed(id)) return;
    await mutate(lg => {
      if (!lg.tutorial.completedChapters.includes(id)) lg.tutorial.completedChapters.push(id);
      if (!lg.achievements.includes("first-tutorial")) lg.achievements.push("first-tutorial");
      if (lg.tutorial.completedChapters.length === TUTORIAL_CHAPTERS.length && !lg.achievements.includes("all-tutorials")) {
        lg.achievements.push("all-tutorials");
      }
    });
  };

  // Group by category
  const groups: Record<string, TutorialChapter[]> = {};
  TUTORIAL_CHAPTERS.forEach(c => {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category].push(c);
  });

  const progress = Math.round((tut.completedChapters.length / TUTORIAL_CHAPTERS.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-5 lg:p-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-ink-300 tracking-widest uppercase">Tutorial Hub</div>
            <div className="font-display text-3xl lg:text-4xl tracking-wide">📋 Coach's Corner</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display text-accent">{progress}%</div>
            <div className="text-[10px] text-ink-300">complete</div>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-accent to-emerald-400" />
        </div>
        <div className="text-sm text-ink-200 mt-3">
          Pick any chapter to learn. Read them in any order. Completed chapters get a ✓.
        </div>
      </div>

      {/* GUIDED TOUR PANEL */}
      <div className="glass rounded-2xl p-5 card-elevated">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="text-4xl">🧭</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl tracking-wide mb-1">Guided Tour</div>
            <div className="text-sm text-ink-200 mb-3">Want a step-by-step walkthrough? Turn on Guided Mode and the game will gently nudge you at key moments — picking your team, signing your first free agent, trade deadlines, the All-Star Game, and more.</div>
            <label className="flex items-center gap-3 mb-3 cursor-pointer touch-target">
              <input
                type="checkbox"
                checked={tut.guidedSeason}
                onChange={toggleGuidedMode}
                className="appearance-none w-11 h-6 rounded-full bg-ink-600 checked:bg-emerald-500 transition relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition checked:after:left-[22px]"
              />
              <span className="font-medium">{tut.guidedSeason ? "Guided Mode is ON" : "Guided Mode is OFF"}</span>
              {tut.guidedSeason && <Sparkles size={16} className="text-emerald-400" />}
            </label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={startTour} className="px-4 py-2.5 rounded-xl bg-accent text-ink-950 text-sm font-display tracking-wider pressable touch-target flex items-center gap-1.5">
                <Compass size={16} /> {tut.hasSeenWelcome ? "Replay Welcome Tour" : "Start the Tour"}
              </button>
              <Link to="/title" className="px-4 py-2.5 rounded-xl bg-white/5 text-sm pressable touch-target">Title Screen</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters */}
      {Object.entries(groups).map(([cat, chapters]) => (
        <div key={cat}>
          <div className="text-xs uppercase tracking-widest text-ink-300 mb-2 px-1">{cat}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => setOpenChapter(ch)}
                className="glass rounded-2xl p-4 text-left pressable hover:border-accent/40 border border-transparent transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">{ch.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base truncate">{ch.title}</div>
                  </div>
                  {completed(ch.id) && (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={16} />
                    </div>
                  )}
                </div>
                <div className="text-xs text-ink-200 line-clamp-2">{ch.summary}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Achievements */}
      <div className="glass rounded-2xl p-5">
        <div className="font-display text-xl tracking-wide mb-3">🏆 Achievements</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = league.achievements.includes(a.id);
            return (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${unlocked ? "border-amber-400/40 bg-amber-400/5" : "border-white/5 bg-white/5"}`}>
                <div className={`text-2xl ${unlocked ? "" : "opacity-30 grayscale"}`}>{unlocked ? a.icon : <Lock size={20} />}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${unlocked ? "" : "text-ink-300"}`}>{a.name}</div>
                  <div className="text-[11px] text-ink-300 line-clamp-2">{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chapter overlay */}
      <AnimatePresence>
        {openChapter && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setOpenChapter(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6 lg:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setOpenChapter(null)} className="flex items-center gap-1 text-sm text-ink-300 mb-4 pressable">
                <ArrowLeft size={16} /> Back to chapters
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-5xl">{openChapter.emoji}</div>
                <div>
                  <div className="font-display tracking-wide text-2xl lg:text-3xl">{openChapter.title}</div>
                  <div className="text-xs text-ink-300 uppercase tracking-widest">{openChapter.category}</div>
                </div>
              </div>
              <div className="space-y-4 text-base">
                {openChapter.body.map((sec, i) => (
                  <div key={i}>
                    {sec.heading && <div className="font-display tracking-wide text-accent text-sm uppercase mb-1">{sec.heading}</div>}
                    {sec.text && <div className="text-ink-100 leading-relaxed">{sec.text}</div>}
                    {sec.tip && <div className="mt-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-amber-200">💡 {sec.tip}</div>}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-6">
                {openChapter.tryItRoute && (
                  <Link
                    to={openChapter.tryItRoute}
                    onClick={() => completeChapter(openChapter.id)}
                    className="px-4 py-2.5 rounded-xl bg-accent text-ink-950 font-display text-sm tracking-wider pressable touch-target flex items-center gap-1"
                  >
                    {openChapter.tryItLabel ?? "Try it now"} <ChevronRight size={16} />
                  </Link>
                )}
                <button
                  onClick={() => { completeChapter(openChapter.id); setOpenChapter(null); }}
                  className={`px-4 py-2.5 rounded-xl text-sm pressable touch-target ${completed(openChapter.id) ? "bg-white/5 text-ink-300" : "bg-emerald-500 text-ink-950 font-medium"}`}
                >
                  {completed(openChapter.id) ? "Already done" : "Got it!"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
