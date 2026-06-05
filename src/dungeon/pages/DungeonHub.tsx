// Dungeon Crawler — hub. Session 1 minimal: shows the player's
// totals + ENTER DUNGEON button. Class/gear selection comes later.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Skull, Layers, Swords } from "lucide-react";
import { useDungeon } from "../store";
import { preloadDungeonSprites } from "../sprites";
import { useEffect } from "react";

export default function DungeonHub() {
  const navigate = useNavigate();
  const { save } = useDungeon();
  useEffect(() => { preloadDungeonSprites(); }, []);
  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(700px 500px at 25% 0%, rgba(180,60,90,0.15), transparent 60%), " +
          "radial-gradient(800px 600px at 80% 100%, rgba(80,40,140,0.18), transparent 60%), " +
          "linear-gradient(180deg, #0a0508 0%, #050308 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>DUNGEON CRAWLER</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>Top-down action-RPG · go deep, get loot</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        <section className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(248,113,113,0.10), rgba(10,5,5,0.85))",
            border: "1px solid rgba(248,113,113,0.40)",
          }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fca5a5" }}>ABOUT</div>
          <p className="text-[12px] leading-relaxed">
            Move with the on-screen stick (or WASD/arrows). Tap the red button to attack (Space/J on desktop).
            Defeat foes, scoop coins, find the glowing stairs to descend deeper.
            Each level gets meaner. Session 1 of an ongoing build — classes,
            gear, bosses, and meta progression land in later passes.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <Stat icon={<Layers size={14} />} label="DEEPEST"  value={save.deepestLevel} color="#a78bfa" />
          <Stat icon={<Skull size={14} />}  label="KILLS"    value={save.totalKills}   color="#f87171" />
          <Stat icon={<Coins size={14} />}  label="COINS"    value={save.totalCoins}   color="#fbbf24" />
        </section>

        <button
          onClick={() => navigate("/dungeon/run")}
          className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.25em] pressable touch-target flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fef3c7",
            minHeight: 60, fontSize: 15,
            boxShadow: "0 8px 20px -6px #ef444466",
          }}>
          <Swords size={16} aria-hidden="true" /> ENTER DUNGEON
        </button>

        {save.runsCompleted > 0 && (
          <div className="text-center text-[10px] opacity-70 tracking-widest">
            {save.runsCompleted} run{save.runsCompleted === 1 ? "" : "s"} completed.
          </div>
        )}

        {/* Roadmap — explicit foundation vs deferred so kids can see what's coming. */}
        <details className="text-[11px] rounded-md mt-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <summary className="px-3 py-2 cursor-pointer font-display tracking-widest text-[10px]"
            style={{ color: "#c084fc" }}>WHAT'S NEXT</summary>
          <div className="px-3 pb-3 leading-relaxed opacity-80">
            <div className="mt-1.5"><strong style={{ color: "#fbbf24" }}>Now (Session 1):</strong> movement, dungeon, basic combat, basic loot.</div>
            <div className="mt-1.5"><strong style={{ color: "#86efac" }}>Soon:</strong> hero classes, gear w/ rarities, bosses on every 3rd floor.</div>
            <div className="mt-1.5"><strong style={{ color: "#7dd3fc" }}>Later:</strong> meta-progression between runs, biomes, companions.</div>
          </div>
        </details>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: `${color}1f`, border: `1px solid ${color}55` }}>
      <div className="flex items-center justify-center gap-1 text-[9px] tracking-[0.2em] uppercase" style={{ color }}>
        {icon}<span>{label}</span>
      </div>
      <div className="font-display text-base mt-1" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}
