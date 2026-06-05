// Creature Keeper — training mini-game. 30-second tap-rhythm: targets
// pulse up on the screen at random positions, tap them before they fade.
// Accuracy + count → XP award (capped). Creature's energy drops a bit.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { useCreature } from "../store";
import { getSpecies } from "../catalog";
import { TYPE_INFO } from "../types";
import { CreatureSprite } from "../CreatureSprite";

const DURATION_MS = 30_000;
const TARGET_LIFETIME_MS = 1300;
const SPAWN_INTERVAL_MS = 700;
const MAX_TARGETS = 4;

interface Target {
  id: number;
  x: number;  // 0..1
  y: number;  // 0..1
  bornAt: number;
}

export default function CreatureTraining() {
  const navigate = useNavigate();
  const c = useCreature();
  const [selectedId, setSelectedId] = useState<string | null>(c.activeCreatures[0]?.id ?? null);
  const selected = c.save.archive.find(x => x.id === selectedId) ?? null;

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const nextIdRef = useRef(0);
  const [reward, setReward] = useState<{ xp: number } | null>(null);

  // Spawn + expire loop
  useEffect(() => {
    if (phase !== "play") return;
    const start = Date.now();
    setStartedAt(start);
    const tick = setInterval(() => {
      const now = Date.now();
      const t = now - start;
      setElapsed(t);
      // expire old
      setTargets(prev => {
        const next = prev.filter(x => now - x.bornAt < TARGET_LIFETIME_MS);
        const expired = prev.length - next.length;
        if (expired > 0) setMisses(m => m + expired);
        return next;
      });
      if (t >= DURATION_MS) {
        setPhase("done");
        return;
      }
    }, 80);
    const spawn = setInterval(() => {
      setTargets(prev => {
        if (prev.length >= MAX_TARGETS) return prev;
        const id = nextIdRef.current++;
        return [...prev, {
          id,
          x: 0.10 + Math.random() * 0.80,
          y: 0.10 + Math.random() * 0.80,
          bornAt: Date.now(),
        }];
      });
    }, SPAWN_INTERVAL_MS);
    return () => { clearInterval(tick); clearInterval(spawn); };
  }, [phase]);

  // Award XP on completion.
  useEffect(() => {
    if (phase !== "done" || !selected || reward) return;
    const accuracy = hits / Math.max(1, hits + misses);
    const xp = Math.round(20 + hits * 4 + accuracy * 30);
    setReward({ xp });
    c.train(selected.id, xp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hits, misses, selected?.id]);

  function start() {
    if (!selected) return;
    setHits(0); setMisses(0); setTargets([]); setElapsed(0); setReward(null);
    nextIdRef.current = 0;
    setPhase("play");
  }

  function onTargetTap(id: number) {
    setTargets(prev => {
      if (!prev.find(x => x.id === id)) return prev;
      return prev.filter(x => x.id !== id);
    });
    setHits(h => h + 1);
  }

  const remaining = Math.max(0, DURATION_MS - elapsed);

  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center"
        style={{ background: "#08130a", color: "#fef3c7" }}>
        <div>
          <div className="font-display text-lg mb-2" style={{ color: "#fde047" }}>No creature to train.</div>
          <button onClick={() => navigate("/creature")}
            className="px-4 py-2 rounded-full"
            style={{ background: "#86efac22", border: "1px solid #86efac55", color: "#86efac" }}>
            Back to hub
          </button>
        </div>
      </div>
    );
  }

  const sp = getSpecies(selected.speciesId);
  const t = sp ? TYPE_INFO[sp.type] : TYPE_INFO.stone;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, ${t.color}22, transparent 60%), ` +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: t.color }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>TRAINING</h1>
        </div>
        {phase === "play" && (
          <div className="text-right">
            <div className="text-[10px] tracking-widest" style={{ color: "#fde047" }}>TIME</div>
            <div className="font-display text-base" style={{ color: "#fef3c7" }}>{Math.ceil(remaining / 1000)}s</div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full flex flex-col">
        {phase === "setup" && (
          <>
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(229,231,235,0.78)" }}>
              Tap glowing orbs as they pop up. Faster taps + higher accuracy = more XP for your creature.
            </p>
            <section className="rounded-2xl p-3 mb-3 flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${t.color}1f, rgba(10,10,20,0.85))`,
                border: `1.5px solid ${t.color}66`,
              }}>
              <CreatureSprite creature={selected} size={84} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-widest" style={{ color: t.color }}>TRAINEE</div>
                <div className="font-display text-base truncate" style={{ color: "#fef3c7" }}>
                  {selected.nickname} · L{selected.level}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.7)" }}>
                  Energy: {selected.needs.energy.toFixed(0)} / 100
                </div>
              </div>
            </section>
            <section className="rounded-2xl p-3 mb-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: t.color }}>SWITCH TRAINEE</div>
              <div className="grid grid-cols-3 gap-2">
                {c.activeCreatures.map(cr => (
                  <button key={cr.id} onClick={() => setSelectedId(cr.id)}
                    aria-label={cr.nickname}
                    className="rounded-xl p-2 text-center pressable touch-target"
                    style={{
                      background: cr.id === selectedId ? `${t.color}33` : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${cr.id === selectedId ? t.color : "rgba(255,255,255,0.10)"}`,
                    }}>
                    <div className="flex justify-center"><CreatureSprite creature={cr} size={48} /></div>
                    <div className="font-display text-[10px] mt-0.5 truncate" style={{ color: "#fef3c7" }}>{cr.nickname}</div>
                  </button>
                ))}
              </div>
            </section>
            <button onClick={start} disabled={selected.needs.energy < 25}
              className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
              style={{
                background: selected.needs.energy < 25 ? "rgba(255,255,255,0.05)" : t.color,
                color: selected.needs.energy < 25 ? "#9aa6bf" : "#0a0a14",
                minHeight: 56,
              }}>
              {selected.needs.energy < 25 ? "Need more energy — rest first" : (<><Zap size={14} className="inline mr-1" />START TRAINING</>)}
            </button>
          </>
        )}

        {phase === "play" && (
          <div
            className="relative flex-1 rounded-2xl overflow-hidden mt-2"
            style={{
              background: `radial-gradient(700px 400px at 50% 50%, ${t.color}22, transparent 60%), rgba(10,10,20,0.85)`,
              border: `1.5px solid ${t.color}66`,
              minHeight: 420,
              touchAction: "manipulation",
            }}>
            <div className="absolute top-2 left-3 right-3 flex justify-between text-[11px] tracking-widest font-display z-10">
              <span style={{ color: "#86efac" }}>HITS · {hits}</span>
              <span style={{ color: "#fca5a5" }}>MISS · {misses}</span>
            </div>
            <AnimatePresence>
              {targets.map(tg => (
                <motion.button
                  key={tg.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0.7, 1.1, 1.0], opacity: 1 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => onTargetTap(tg.id)}
                  aria-label="Tap target"
                  className="absolute pressable touch-target"
                  style={{
                    left: `${tg.x * 100}%`, top: `${tg.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: 56, height: 56,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${t.color} 0%, ${t.color}55 70%, transparent 100%)`,
                    border: `2px solid ${t.color}`,
                    boxShadow: `0 0 20px ${t.color}88`,
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {phase === "done" && reward && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 text-center mt-4"
            style={{
              background: `linear-gradient(135deg, ${t.color}1f, rgba(10,10,20,0.92))`,
              border: `1.5px solid ${t.color}`,
            }}>
            <div className="text-3xl mb-1">⚡</div>
            <div className="font-display text-xl tracking-wider" style={{ color: "#fde047" }}>TRAINING COMPLETE</div>
            <div className="text-[12px] mt-1" style={{ color: "rgba(229,231,235,0.85)" }}>
              {hits} hits · {misses} misses · {Math.round(100 * hits / Math.max(1, hits + misses))}% accuracy
            </div>
            <div className="font-display text-lg mt-2" style={{ color: "#86efac" }}>+{reward.xp} XP</div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => setPhase("setup")}
                className="px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
                style={{ background: t.color, color: "#0a0a14" }}>
                Train again
              </button>
              <button onClick={() => navigate("/creature")}
                className="px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                Back to hub
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
