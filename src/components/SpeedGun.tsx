// V3 Section 9 — Speed gun. Pragmatic tap-based implementation.
// Self-contained: inline distance picker + on/off toggle right on the practice screen.
import { useState, useRef } from "react";
import { useStore } from "../store";
import { Zap, RefreshCw, Settings as Cog, Power } from "lucide-react";

export function SpeedGun() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const t = league?.training;
  const enabled = t?.settings.speedGunEnabled ?? false;
  const distFt = t?.settings.speedGunDistanceFt ?? 30;
  const [phase, setPhase] = useState<"idle" | "armed" | "result">("idle");
  const releaseRef = useRef<number>(0);
  const [lastMph, setLastMph] = useState<number | null>(null);
  const [todaysFastest, setTodaysFastest] = useState<number>(0);
  const [allTimeFastest, setAllTimeFastest] = useState<number>(() => {
    const stored = localStorage.getItem("dd_speedgun_alltime");
    return stored ? +stored : 0;
  });
  const [showDistPicker, setShowDistPicker] = useState(false);

  // Setting helpers (persist to store)
  const setEnabled = (on: boolean) => mutate(lg => { if (lg.training) lg.training.settings.speedGunEnabled = on; });
  const setDist = (n: number) => mutate(lg => { if (lg.training) lg.training.settings.speedGunDistanceFt = n; });

  const arm = () => {
    setPhase("armed");
    releaseRef.current = 0;
    setLastMph(null);
  };
  const onRelease = () => {
    if (releaseRef.current > 0) return;
    releaseRef.current = performance.now();
  };
  const onImpact = () => {
    if (releaseRef.current === 0) return;
    const elapsedSec = (performance.now() - releaseRef.current) / 1000;
    if (elapsedSec < 0.1 || elapsedSec > 4) {
      setLastMph(null);
      setPhase("idle");
      return;
    }
    const fps = distFt / elapsedSec;
    const mph = fps * 0.681818;
    const rounded = Math.round(mph);
    setLastMph(rounded);
    setPhase("result");
    if (rounded > todaysFastest) setTodaysFastest(rounded);
    if (rounded > allTimeFastest) {
      setAllTimeFastest(rounded);
      localStorage.setItem("dd_speedgun_alltime", String(rounded));
    }
    // Feed Henry's velocity rating
    mutate(lg => {
      const henry = lg.players.find(p => p.id === lg.training?.henryPlayerId) ?? lg.freeAgents.find(p => p.id === lg.training?.henryPlayerId);
      if (henry?.ratings.pitches?.length) {
        const avg = henry.ratings.pitches.reduce((s, p) => s + p.velo, 0) / henry.ratings.pitches.length;
        const ratingAvg = (avg - 86) * 5 + 65;
        const targetRating = Math.max(40, Math.min(99, 50 + (rounded - 30) * 2));
        if (targetRating > ratingAvg) {
          henry.ratings.pitches.forEach(p => { p.velo = Math.min(110, p.velo + 0.1); });
        }
      }
    });
  };

  // Compact "off" state — just a button to turn it on
  if (!enabled) {
    return (
      <div className="glass rounded-2xl p-3 border border-white/10 flex items-center gap-3">
        <Zap size={16} className="text-ink-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-display tracking-wide">Speed Gun</div>
          <div className="text-[10px] text-ink-300">Off — tap to enable</div>
        </div>
        <button
          onClick={() => setEnabled(true)}
          className="px-3 py-2 rounded-xl bg-amber-500 text-ink-950 text-xs font-display tracking-wider pressable touch-target flex items-center gap-1"
        >
          <Power size={12}/> Turn On
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-3 border border-amber-400/30 bg-amber-400/5 space-y-2">
      {/* Header row: status + distance + off */}
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-amber-400" />
        <span className="text-[10px] text-amber-300 uppercase tracking-widest font-display">Speed Gun</span>
        <button
          onClick={() => setShowDistPicker(s => !s)}
          className="ml-auto px-2 py-1 rounded-lg bg-white/5 text-[11px] pressable touch-target flex items-center gap-1"
          aria-label="Adjust distance"
        >
          <Cog size={11}/> {distFt} ft
        </button>
        <button
          onClick={() => { setEnabled(false); setPhase("idle"); }}
          className="px-2 py-1 rounded-lg bg-white/5 text-[11px] pressable touch-target flex items-center gap-1"
          aria-label="Turn off speed gun"
        >
          <Power size={11}/> Off
        </button>
      </div>

      {/* Inline distance picker — slides open */}
      {showDistPicker && (
        <div className="rounded-xl bg-black/30 p-2 space-y-2">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Distance from pitcher to net</div>
          <div className="flex gap-1.5 flex-wrap">
            {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(n => (
              <button
                key={n}
                onClick={() => { setDist(n); setShowDistPicker(false); }}
                className={`px-3 py-2 rounded-lg text-xs pressable touch-target font-mono ${distFt === n ? "bg-amber-500 text-ink-950 font-bold" : "bg-white/5"}`}
              >
                {n} ft
              </button>
            ))}
          </div>
          <div className="text-[10px] text-ink-300 italic">
            Tip: shorter distance = more accurate timing. Standard youth pitching mound is ~46 ft.
          </div>
        </div>
      )}

      {/* Action area */}
      {phase === "idle" && (
        <button onClick={arm} className="w-full px-3 py-3 rounded-xl bg-amber-500 text-ink-950 font-display tracking-wider pressable touch-target text-base">
          Arm Speed Gun
        </button>
      )}
      {phase === "armed" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRelease}
            disabled={releaseRef.current > 0}
            className="px-3 py-5 rounded-xl bg-sky-500 text-white font-display tracking-wider pressable touch-target disabled:opacity-40 active:scale-95 text-base"
          >
            {releaseRef.current > 0 ? "✓ Released" : "👋 RELEASE"}
          </button>
          <button
            onClick={onImpact}
            disabled={releaseRef.current === 0}
            className="px-3 py-5 rounded-xl bg-emerald-500 text-ink-950 font-display tracking-wider pressable touch-target disabled:opacity-40 active:scale-95 text-base"
          >
            🎯 IMPACT
          </button>
        </div>
      )}
      {phase === "result" && (
        <div className="text-center py-2">
          <div className="font-display text-6xl text-amber-300 leading-none">{lastMph} <span className="text-lg">mph</span></div>
          <div className="text-[10px] text-ink-300 mt-1">Estimated · ±3 mph at {distFt} ft</div>
          <div className="text-xs mt-2 flex items-center justify-center gap-3">
            <span>Today: <strong>{todaysFastest}</strong></span>
            {allTimeFastest > 0 && <span>All-time: <strong className="text-amber-300">{allTimeFastest} 🏆</strong></span>}
          </div>
          <button onClick={arm} className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-xs pressable touch-target flex items-center gap-1 mx-auto"><RefreshCw size={12}/> Next pitch</button>
        </div>
      )}
      <div className="text-[10px] text-ink-300 text-center italic">
        Tap RELEASE when ball leaves your hand, IMPACT when it hits the net.
      </div>
    </div>
  );
}
