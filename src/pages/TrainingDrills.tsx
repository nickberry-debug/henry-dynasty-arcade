// Drill Library with category filter + detail modal.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DRILLS, drillsByCategory, type Drill, type DrillCategory } from "../data/drills";
import { useStore } from "../store";
import { useScrollLock } from "../hooks/useScrollLock";
import { markScheduleDone, logConditioningRep } from "../engine/trainingCamp";
import { ArrowLeft, Star, Check, X } from "lucide-react";
import { DrillHero } from "../components/DrillHero";
import { ConditioningCoach } from "../components/ConditioningCoach";
import { gainsLabel } from "../data/drillGains";

export default function TrainingDrills() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const [cat, setCat] = useState<DrillCategory | "all">("all");
  const [open, setOpen] = useState<Drill | null>(null);
  useScrollLock(!!open);
  const t = league.training!;
  const todayKey = new Date().toISOString().slice(0, 10);
  const doneToday = new Set(t.scheduleCompleted[todayKey] ?? []);

  const list = cat === "all" ? DRILLS : drillsByCategory(cat);

  const markDone = async (d: Drill) => {
    await mutate(lg => {
      markScheduleDone(lg, d.id);
      if (d.category === "conditioning") {
        logConditioningRep(lg, d.id, 1);
      }
    });
  };

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Practice</div>
          <h1 className="font-display text-3xl">📚 DRILL LIBRARY</h1>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all","hitting","pitching","conditioning"] as const).map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2.5 rounded-xl text-sm pressable touch-target whitespace-nowrap ${cat === c ? "bg-accent text-ink-950" : "bg-white/5"}`}>
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(d => (
          <button key={d.id} onClick={() => setOpen(d)} className="text-left pressable card-elevated rounded-2xl overflow-hidden bg-ink-800 border border-white/5">
            <DrillHero drill={d} height={140} />
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < d.difficulty ? "fill-amber-400 text-amber-400" : "text-ink-500"} />
                  ))}
                </div>
                {doneToday.has(d.id) && <Check size={16} className="text-emerald-400" />}
              </div>
              <div className="text-xs text-emerald-300 font-display tracking-wide mb-1">{gainsLabel(d.id) || "+0.1 across all"}</div>
              <div className="text-xs text-ink-200 line-clamp-2">{d.purpose}</div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-6xl">{open.emoji}</div>
                  <div>
                    <div className="font-display text-2xl tracking-wide">{open.name}</div>
                    <div className="text-[10px] text-ink-300 uppercase tracking-widest">{open.category}</div>
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className={i < open.difficulty ? "fill-amber-400 text-amber-400" : "text-ink-500"} />
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><X size={18}/></button>
              </div>

              <DrillHero drill={open} height={220} preferVideo />

              <div className="my-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                <div className="text-[10px] text-emerald-300 uppercase tracking-widest font-display mb-0.5">Worth Per Set</div>
                <div className="text-sm font-display tracking-wide text-emerald-200">{gainsLabel(open.id) || "+0.1 across all"}</div>
              </div>

              <Section heading="What this drill fixes">{open.purpose}</Section>
              <Section heading="What you need">
                <ul className="list-disc list-inside text-sm space-y-0.5">{open.equipment.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </Section>
              <Section heading="How to do it">
                <ol className="list-decimal list-inside text-sm space-y-1.5">{open.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </Section>
              <Section heading="What it should feel like"><span className="text-emerald-300">{open.feel}</span></Section>
              <Section heading="Common mistake"><span className="text-amber-300">{open.commonMistake}</span></Section>
              <Section heading="Pro tip"><span className="text-sky-300">💡 {open.proTip}</span></Section>
              {open.suggestedReps && <Section heading="Goal">{open.suggestedReps}{open.durationMin ? ` · ~${open.durationMin} min` : ""}</Section>}

              {open.category === "conditioning" && (
                <Section heading="Count reps with camera">
                  <ConditioningCoach drillId={open.id} />
                </Section>
              )}

              <div className="flex gap-2 mt-5 sticky bottom-0 -mx-6 -mb-6 p-4 bg-ink-900/80 backdrop-blur-sm border-t border-white/5">
                <button onClick={() => { markDone(open); setOpen(null); }} className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-ink-950 font-display tracking-wider pressable touch-target flex items-center justify-center gap-2">
                  <Check size={16}/> Mark Done
                </button>
                {(open.category === "hitting" || open.category === "pitching") && (
                  <Link to={open.category === "hitting" ? "/training/hit" : "/training/pitch"} className="px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target">Start Practice</Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] text-accent uppercase tracking-widest font-display mb-1">{heading}</div>
      <div className="text-sm text-ink-100 leading-relaxed">{children}</div>
    </div>
  );
}

/** Lightweight SVG-animated stick figure per drill — uses CSS keyframes to loop. */
function DrillAnimation({ drill }: { drill: Drill }) {
  // Use a simple looping SVG keyed off drill id. The animation styling lives in globals.css.
  const animKey = animKeyFor(drill.id);
  return (
    <div className="my-3 rounded-2xl bg-gradient-to-br from-ink-700 to-ink-900 border border-white/5 overflow-hidden">
      <div className="aspect-[16/10] relative flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Ground */}
          <line x1="0" y1="110" x2="200" y2="110" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <g className={`stick-figure stick-${animKey}`} stroke="#ffb302" strokeWidth="2.5" fill="none" strokeLinecap="round">
            {/* Head */}
            <circle cx="100" cy="40" r="6" fill="#ffb302" />
            {/* Body */}
            <line x1="100" y1="46" x2="100" y2="80" />
            {/* Arms */}
            <line x1="100" y1="55" x2="85" y2="65" className="arm-left" />
            <line x1="100" y1="55" x2="115" y2="65" className="arm-right" />
            {/* Legs */}
            <line x1="100" y1="80" x2="92" y2="105" className="leg-left" />
            <line x1="100" y1="80" x2="108" y2="105" className="leg-right" />
            {/* Bat (for hitting drills) */}
            {drill.category === "hitting" && <line x1="115" y1="65" x2="135" y2="50" className="bat" stroke="#d6a14a" strokeWidth="3" />}
            {/* Ball (for pitching drills) */}
            {drill.category === "pitching" && <circle cx="85" cy="65" r="3" fill="#ffffff" className="ball" />}
          </g>
          <text x="100" y="20" textAnchor="middle" fontFamily="'Oswald',sans-serif" fontSize="9" fill="#9aa6bf" letterSpacing="2">{drill.name.toUpperCase()}</text>
        </svg>
      </div>
    </div>
  );
}

function animKeyFor(id: string): string {
  // Group by category for animation variation
  if (id === "fence-drill" || id === "top-hand" || id === "no-hands-hip" || id === "towel-heel" || id === "colored-ball" || id === "sharpie-line" || id === "one-knee" || id === "walk-through" || id === "slow-motion" || id === "two-tee") return "swing";
  if (id === "target-practice" || id === "inside-outside" || id === "high-low" || id === "strike-ball-strike" || id === "towel-drill" || id === "balance" || id === "knee-throws" || id === "long-toss" || id === "pickoff" || id === "bullpen-sequence") return "pitch";
  return "cond";
}
