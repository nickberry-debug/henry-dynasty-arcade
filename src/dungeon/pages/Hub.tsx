// pages/Hub.tsx — Dungeon entry point.
//
// Lists existing heroes, lets you continue / start fresh / create new.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDungeon } from "../state/store";
import { CLASSES } from "../content/classes";

export default function DungeonHub() {
  const navigate = useNavigate();
  const hydrate = useDungeon(s => s.hydrate);
  const heroes = useDungeon(s => s.heroes);
  const selectHero = useDungeon(s => s.selectHero);
  const continueRun = useDungeon(s => s.continueRun);
  const startRun = useDungeon(s => s.startRun);

  useEffect(() => { hydrate(); }, []);

  async function onContinue(heroId: string) {
    await selectHero(heroId);
    const had = await continueRun(heroId);
    if (!had) await startRun(heroId);
    navigate("/dungeon/run");
  }

  async function onFresh(heroId: string) {
    await selectHero(heroId);
    await startRun(heroId);
    navigate("/dungeon/run");
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-8 text-slate-100"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(124, 58, 237, 0.25), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(220, 38, 38, 0.15), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="text-[10px] uppercase tracking-[0.3em] opacity-60 hover:opacity-100 mb-4"
        >
          ← Arcade
        </button>

        <motion.header
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "#c084fc" }}>The Crawl</div>
          <h1
            className="font-display text-4xl sm:text-6xl tracking-[0.2em] mt-2"
            style={{ color: "#fbbf24", textShadow: "0 0 30px rgba(251,191,36,0.4)" }}
          >
            DUNGEON
          </h1>
          <p className="text-sm opacity-70 mt-3 max-w-md mx-auto">
            Ten floors. One way out. Pick a hero or forge a new one.
          </p>
        </motion.header>

        <div className="text-[10px] uppercase tracking-[0.3em] mb-3 opacity-70">Heroes</div>
        {heroes.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{ background: "rgba(15,12,28,0.7)", border: "1px dashed rgba(192,132,252,0.3)" }}
          >
            <div className="text-sm opacity-70">No heroes yet.</div>
            <button
              onClick={() => navigate("/dungeon/select")}
              className="mt-4 px-5 py-2 rounded-md font-display tracking-widest text-[11px]"
              style={{ background: "rgba(251,191,36,0.18)", border: "1px solid #fbbf24", color: "#fde047" }}
            >
              ⚔ FORGE FIRST HERO
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {heroes.map(h => {
              const klass = CLASSES[h.classId];
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg p-4"
                  style={{
                    background: `linear-gradient(135deg, ${h.appearance.tint}22, rgba(15,12,28,0.85))`,
                    border: `1px solid ${h.appearance.tint}55`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-md flex items-center justify-center text-3xl shrink-0"
                      style={{ background: `${h.appearance.tint}33`, border: `1px solid ${h.appearance.tint}` }}
                    >
                      {klass.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display tracking-wider text-lg truncate">{h.name}</div>
                      <div className="text-[10px] uppercase tracking-widest opacity-80" style={{ color: h.appearance.tint }}>
                        Level {h.level} {klass.name}
                      </div>
                      <div className="text-[10px] opacity-60 mt-0.5">
                        {h.totals.runs} runs · {h.totals.floorsCleared} floors · {h.totals.kills} kills · {h.totals.bossKills} bosses
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => onContinue(h.id)}
                      className="py-2 rounded-md font-display tracking-widest text-[10px] pressable"
                      style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.6)", color: "#fde047" }}
                    >
                      ▶ ENTER
                    </button>
                    <button
                      onClick={() => onFresh(h.id)}
                      className="py-2 rounded-md font-display tracking-widest text-[10px] pressable"
                      style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.4)", color: "#c4b5fd" }}
                    >
                      ⟲ NEW RUN
                    </button>
                  </div>
                </motion.div>
              );
            })}
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => navigate("/dungeon/select")}
              className="rounded-lg p-6 flex flex-col items-center justify-center min-h-[180px]"
              style={{ background: "rgba(15,12,28,0.5)", border: "1px dashed rgba(255,255,255,0.2)" }}
            >
              <div className="text-3xl mb-1">＋</div>
              <div className="text-[11px] font-display tracking-widest opacity-80">FORGE NEW HERO</div>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
