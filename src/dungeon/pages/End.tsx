// pages/End.tsx — Victory / defeat screen. Stats summary + restart.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDungeon } from "../state/store";
import { CLASSES } from "../content/classes";
import { QUEST_BEATS } from "../content/quests";

export default function DungeonEnd() {
  const navigate = useNavigate();
  const run = useDungeon(s => s.run);
  const heroes = useDungeon(s => s.heroes);
  const activeHeroId = useDungeon(s => s.activeHeroId);
  const startRun = useDungeon(s => s.startRun);
  const abandonRun = useDungeon(s => s.abandonRun);
  const hero = heroes.find(h => h.id === activeHeroId);

  if (!run || !hero) return null;
  const win = run.phase === "victory" || run.status === "won";
  const klass = CLASSES[hero.classId];
  const closingQuest = QUEST_BEATS.find(q => q.id === (win ? "qend_victory" : "q1_entry"));

  async function tryAgain() {
    await abandonRun();
    await startRun(hero!.id);
    // No nav — we're on /dungeon/run; phase resets to exploring.
  }

  async function backToHub() {
    await abandonRun();
    navigate("/dungeon");
  }

  return (
    <div
      className="min-h-screen p-4 flex items-center justify-center text-slate-100"
      style={{
        background: win
          ? "radial-gradient(900px 700px at 50% 0%, rgba(251,191,36,0.3), transparent 70%), linear-gradient(180deg, #0a0a14 0%, #050308 100%)"
          : "radial-gradient(900px 700px at 50% 0%, rgba(220,38,38,0.3), transparent 70%), linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full rounded-2xl p-6 sm:p-8 text-center"
        style={{
          background: "rgba(15,12,28,0.9)",
          border: `1px solid ${win ? "#fbbf24" : "#dc2626"}`,
          boxShadow: `0 0 60px ${win ? "rgba(251,191,36,0.3)" : "rgba(220,38,38,0.3)"}`,
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: win ? "#fde047" : "#fca5a5" }}>
          {win ? "Victory" : "Defeat"}
        </div>
        <h1 className="font-display text-4xl sm:text-6xl tracking-[0.15em] mb-4" style={{ color: win ? "#fbbf24" : "#dc2626" }}>
          {win ? "THE CROWN" : "FALLEN"}
        </h1>
        <div className="text-5xl mb-3">{klass.emoji}</div>
        <div className="font-display tracking-wider text-xl">{hero.name}</div>
        <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1">
          Level {hero.level} {klass.name}
        </div>

        {closingQuest && (
          <p className="text-[12px] sm:text-sm leading-relaxed mt-5 mx-auto max-w-md italic" style={{ color: "#c4b5fd" }}>
            "{closingQuest.beat}"
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 text-center">
          <Stat label="Floor" v={run.floor} />
          <Stat label="Turns" v={run.turn} />
          <Stat label="Kills" v={hero.totals.kills} />
          <Stat label="Gold" v={hero.gold} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-7">
          <button
            onClick={tryAgain}
            className="flex-1 py-3 rounded-md font-display tracking-widest text-sm"
            style={{ background: "rgba(251,191,36,0.18)", border: "1px solid #fbbf24", color: "#fde047" }}
          >
            ⟲ DESCEND AGAIN
          </button>
          <button
            onClick={backToHub}
            className="flex-1 py-3 rounded-md font-display tracking-widest text-sm"
            style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.45)", color: "#c4b5fd" }}
          >
            ⌂ DUNGEON HUB
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[9px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display text-2xl tracking-wider mt-0.5" style={{ color: "#fde047" }}>{v}</div>
    </div>
  );
}
