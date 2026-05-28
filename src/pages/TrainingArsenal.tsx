// Pitch Arsenal: 8 pitches with age-appropriate guidance. Critical safety guards.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PITCH_CARDS, type PitchCard } from "../data/pitchArsenal";
import { useScrollLock } from "../hooks/useScrollLock";
import { GripDiagram as NewGripDiagram } from "../components/GripDiagram";
import { ArrowLeft, X, Star, ShieldAlert, Check } from "lucide-react";

export default function TrainingArsenal() {
  const [open, setOpen] = useState<PitchCard | null>(null);
  useScrollLock(!!open);
  const safe = PITCH_CARDS.filter(p => p.ageStatus === "safe");
  const wait14 = PITCH_CARDS.filter(p => p.ageStatus === "wait14");
  const wait16 = PITCH_CARDS.filter(p => p.ageStatus === "wait16");

  return (
    <div className="space-y-5 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Practice</div>
          <h1 className="font-display text-3xl">🎯 PITCH ARSENAL</h1>
        </div>
      </header>

      {/* Your Pitching Path */}
      <div className="glass rounded-2xl p-5 card-elevated">
        <div className="font-display text-xl tracking-wide mb-2">Your Pitching Path</div>
        <div className="text-xs text-ink-200 mb-3">The right pitches for your age — based on MLB, USA Baseball, and pediatric sports medicine guidelines.</div>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <Path band="Ages 8–11 (You)" items={["✅ Four-seam fastball","✅ Two-seam fastball","✅ Changeup","✅ Knuckleball (optional)","❌ Curveball / slider / cutter / splitter — wait"]} highlight />
          <Path band="Ages 12–13" items={["✅ Continue above","✅ Begin learning cutter (with coach)"]} />
          <Path band="Age 14+" items={["✅ Curveball (proper coaching)","✅ Cutter"]} />
          <Path band="Age 16+" items={["✅ Slider","✅ Splitter"]} />
        </div>
        <div className="mt-3 text-xs text-amber-200 italic">The best young pitchers in the world dominate with just fastball + changeup. Location &gt; arsenal at your age.</div>
      </div>

      <PitchGroup title="✅ Safe at Your Age" pitches={safe} onOpen={setOpen} />
      <PitchGroup title="⚠️ Wait Until Age 14+" pitches={wait14} onOpen={setOpen} />
      <PitchGroup title="⚠️ Wait Until Age 16+" pitches={wait16} onOpen={setOpen} />

      <div className="glass rounded-2xl p-5 border border-amber-400/30 bg-amber-400/5">
        <div className="font-display text-lg tracking-wide mb-2">🦴 Why Wait? (the science, kid version)</div>
        <ul className="text-sm space-y-1.5 list-disc list-inside text-ink-100">
          <li>Your elbow has a special bone called a growth plate. It's where your bones grow longer.</li>
          <li>Curveballs and sliders twist your elbow hard, right where that growth plate is.</li>
          <li>If you throw them too young, you can hurt it. That hurt doesn't heal well — it can mess up your arm forever.</li>
          <li>Big-leaguers who threw too many curves as kids often need surgery as adults.</li>
          <li>Good news: you don't NEED those pitches yet. Fastball location and a sneaky changeup will strike out anyone your age.</li>
          <li>Trust the process. Get great at the safe pitches first. The rest will be there when you're ready.</li>
        </ul>
      </div>

      <AnimatePresence>
        {open && <PitchModal pitch={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Path({ band, items, highlight }: { band: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-emerald-500/10 border border-emerald-400/40" : "bg-white/3 border border-white/5"}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-300 mb-1">{band}</div>
      <ul className="text-xs space-y-0.5">{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
    </div>
  );
}

function PitchGroup({ title, pitches, onOpen }: { title: string; pitches: PitchCard[]; onOpen: (p: PitchCard) => void }) {
  if (pitches.length === 0) return null;
  return (
    <div>
      <h3 className="font-head text-base uppercase tracking-widest mb-2">{title}</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pitches.map(p => (
          <button key={p.id} onClick={() => onOpen(p)} className="glass rounded-2xl p-4 text-left pressable touch-target card-elevated">
            <div className="flex items-start gap-3">
              <div className="text-4xl">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base">{p.name}</div>
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < p.difficulty ? "fill-amber-400 text-amber-400" : "text-ink-500"} />
                  ))}
                </div>
              </div>
              {p.ageStatus === "safe" ? <Check size={18} className="text-emerald-400" /> : <ShieldAlert size={18} className="text-amber-400" />}
            </div>
            <div className="text-xs text-ink-200 mt-2 line-clamp-2">{p.whatItDoes}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PitchModal({ pitch, onClose }: { pitch: PitchCard; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-6xl">{pitch.emoji}</div>
            <div>
              <div className="font-display text-2xl tracking-wide">{pitch.name}</div>
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className={i < pitch.difficulty ? "fill-amber-400 text-amber-400" : "text-ink-500"} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><X size={18}/></button>
        </div>

        <NewGripDiagram pitch={pitch} />

        <div className={`rounded-xl p-3 mb-3 ${pitch.ageStatus === "safe" ? "bg-emerald-500/10 border border-emerald-400/30" : "bg-amber-400/10 border border-amber-400/50"}`}>
          <div className="flex items-start gap-2 text-sm">
            {pitch.ageStatus === "safe" ? <Check size={16} className="text-emerald-300 mt-0.5 shrink-0" /> : <ShieldAlert size={16} className="text-amber-300 mt-0.5 shrink-0" />}
            <div>
              <div className="font-display tracking-wide text-xs uppercase mb-0.5">{pitch.ageStatus === "safe" ? "Safe to Learn" : pitch.ageStatus === "wait14" ? "Wait Until Age 14+" : "Wait Until Age 16+"}</div>
              <div className="text-ink-100">{pitch.ageNote}</div>
            </div>
          </div>
        </div>

        <Section heading="What this pitch does">{pitch.whatItDoes}</Section>
        <Section heading="When to throw it">{pitch.whenToThrow}</Section>
        <Section heading="Grip">
          <ol className="list-decimal list-inside space-y-1">{pitch.gripSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Section>
        <Section heading="How to throw it">
          <ol className="list-decimal list-inside space-y-1">{pitch.throwSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Section>
        <Section heading="What it should feel like"><span className="text-emerald-300">{pitch.feel}</span></Section>
        <Section heading="Common mistakes"><span className="text-amber-300">{pitch.commonMistakes}</span></Section>
        {pitch.proTip && <Section heading="Pro Tip"><span className="text-sky-300">💡 {pitch.proTip}</span></Section>}
        {pitch.safetyNote && (
          <div className="mt-3 rounded-xl p-3 bg-red-500/10 border border-red-400/30 text-sm">
            <div className="font-display tracking-wide text-xs uppercase text-red-300 mb-1">⚕️ Safety Note</div>
            <div className="text-ink-100">{pitch.safetyNote}</div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] text-accent uppercase tracking-widest font-display mb-1">{heading}</div>
      <div className="text-sm text-ink-100 leading-relaxed">{children}</div>
    </div>
  );
}

function GripDiagram({ pitch }: { pitch: PitchCard }) {
  // Simple SVG showing a baseball with finger placements per pitch.
  // For each pitch we hardcode finger positions on the ball.
  const finger = (cx: number, cy: number, label: string, color = "#ffb302") => (
    <g>
      <circle cx={cx} cy={cy} r="9" fill={color} stroke="#0a0d13" strokeWidth="1.5" />
      <text x={cx} y={cy + 3} fontSize="8" textAnchor="middle" fill="#0a0d13" fontWeight="700">{label}</text>
    </g>
  );
  let fingers: React.ReactNode = null;
  const id = pitch.id;
  if (id === "four-seam") fingers = (<>{finger(75, 60, "I")}{finger(95, 60, "M")}{finger(85, 90, "T", "#9aa6bf")}</>);
  else if (id === "two-seam") fingers = (<>{finger(78, 65, "I")}{finger(92, 65, "M")}{finger(85, 90, "T", "#9aa6bf")}</>);
  else if (id === "changeup") fingers = (<>{finger(70, 60, "I", "#a78bfa")}{finger(85, 56, "M")}{finger(100, 60, "R")}{finger(85, 92, "T", "#9aa6bf")}</>);
  else if (id === "curveball") fingers = (<>{finger(85, 56, "M")}{finger(75, 60, "I")}{finger(95, 90, "T", "#9aa6bf")}</>);
  else if (id === "slider") fingers = (<>{finger(78, 58, "I")}{finger(93, 56, "M")}{finger(85, 92, "T", "#9aa6bf")}</>);
  else if (id === "cutter") fingers = (<>{finger(82, 58, "I")}{finger(97, 58, "M")}{finger(78, 92, "T", "#9aa6bf")}</>);
  else if (id === "knuckleball") fingers = (<>{finger(78, 58, "I")}{finger(92, 58, "M")}{finger(85, 92, "T", "#9aa6bf")}</>);
  else if (id === "splitter") fingers = (<>{finger(68, 60, "I")}{finger(102, 60, "M")}{finger(85, 92, "T", "#9aa6bf")}</>);
  return (
    <div className="my-3 rounded-2xl bg-gradient-to-br from-ink-700 to-ink-900 border border-white/5 p-4 flex items-center justify-center">
      <svg viewBox="0 0 170 130" width="100%" height="180">
        {/* Ball */}
        <circle cx="85" cy="65" r="42" fill="#fffaf0" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Seams */}
        <path d="M 50 50 Q 85 30 120 50" stroke="#dc2626" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
        <path d="M 50 80 Q 85 100 120 80" stroke="#dc2626" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
        {fingers}
        <text x="85" y="125" textAnchor="middle" fontFamily="'Oswald',sans-serif" fontSize="9" fill="#9aa6bf">I=Index · M=Middle · R=Ring · T=Thumb</text>
      </svg>
    </div>
  );
}
