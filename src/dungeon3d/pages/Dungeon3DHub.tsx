// Dungeon 3D — hub. Session 1 minimal.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Skull, Layers, Swords } from "lucide-react";
import { useDungeon3D } from "../store";
import { preloadCriticalModels } from "../modelCache";
import { useEffect } from "react";

export default function Dungeon3DHub() {
  const navigate = useNavigate();
  const { save } = useDungeon3D();
  useEffect(() => { preloadCriticalModels().catch(() => {}); }, []);
  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(700px 500px at 25% 0%, rgba(140,80,200,0.18), transparent 60%), " +
          "radial-gradient(800px 600px at 80% 100%, rgba(80,40,140,0.20), transparent 60%), " +
          "linear-gradient(180deg, #0a0510 0%, #050308 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c084fc" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>DUNGEON CRAWLER 3D</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>Isometric Three.js · real Kenney dungeon models</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        <section className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(140,80,200,0.12), rgba(10,5,10,0.85))",
            border: "1px solid rgba(140,80,200,0.40)",
          }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#c084fc" }}>ABOUT</div>
          <p className="text-[12px] leading-relaxed">
            Top-down isometric action-RPG. Real Kenney modular-dungeon-kit
            GLBs build the rooms, corridors, and stairs.
            Tap and drag (left half) to move; red button to swing.
            WASD + Space on desktop. Classes, gear, and bosses arrive
            in later sessions on this 3D foundation.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <Stat icon={<Layers size={14} />} label="DEEPEST" value={save.deepestLevel} color="#a78bfa" />
          <Stat icon={<Skull size={14} />} label="KILLS" value={save.totalKills} color="#f87171" />
          <Stat icon={<Coins size={14} />} label="COINS" value={save.totalCoins} color="#fbbf24" />
        </section>

        <button
          onClick={() => navigate("/dungeon3d/run")}
          className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.25em] pressable touch-target flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #7e22ce, #4c1d95)",
            color: "#fef3c7",
            minHeight: 60, fontSize: 15,
            boxShadow: "0 8px 24px -6px #7e22ce55",
          }}>
          <Swords size={16} aria-hidden="true" /> ENTER DUNGEON
        </button>

        <details className="text-[11px] rounded-md mt-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <summary className="px-3 py-2 cursor-pointer font-display tracking-widest text-[10px]"
            style={{ color: "#c084fc" }}>WHAT'S NEXT</summary>
          <div className="px-3 pb-3 leading-relaxed opacity-80">
            <div className="mt-1.5"><strong style={{ color: "#fbbf24" }}>Now (Session 1):</strong> 3D scene, iso camera, modular dungeon, basic combat + loot.</div>
            <div className="mt-1.5"><strong style={{ color: "#86efac" }}>Soon:</strong> hero classes, gear w/ rarities, bosses, more enemy types.</div>
            <div className="mt-1.5"><strong style={{ color: "#7dd3fc" }}>Later:</strong> biomes, meta-progression, companion tie-in, multiplayer.</div>
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
