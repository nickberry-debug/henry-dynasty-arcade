// pages/Select.tsx — Choose a class + name + stat allocation.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDungeon } from "../state/store";
import { CLASS_LIST, CREATION_POINTS, CLASSES } from "../content/classes";
import type { DungeonClassId, HeroStats } from "../types";

const DEFAULT_NAMES: Record<DungeonClassId, string[]> = {
  warrior: ["Korr", "Brand", "Mara", "Ulfgar"],
  ranger: ["Ysol", "Wren", "Kestrel", "Nyx"],
  mage: ["Vela", "Orin", "Sable", "Thren"],
};

export default function DungeonSelect() {
  const navigate = useNavigate();
  const createNewHero = useDungeon(s => s.createNewHero);
  const startRun = useDungeon(s => s.startRun);

  const [classId, setClassId] = useState<DungeonClassId>("warrior");
  const [name, setName] = useState(DEFAULT_NAMES.warrior[0]);
  const [alloc, setAlloc] = useState<HeroStats>({ strength: 0, intellect: 0, agility: 0, vitality: 0 });
  const spent = alloc.strength + alloc.intellect + alloc.agility + alloc.vitality;
  const left = CREATION_POINTS - spent;
  const klass = CLASSES[classId];

  function pickClass(id: DungeonClassId) {
    setClassId(id);
    setName(DEFAULT_NAMES[id][Math.floor(Math.random() * DEFAULT_NAMES[id].length)]);
  }

  function bump(stat: keyof HeroStats, by: number) {
    setAlloc(a => {
      const next = Math.max(0, a[stat] + by);
      const sum = Object.values({ ...a, [stat]: next }).reduce((s, v) => s + v, 0);
      if (sum > CREATION_POINTS) return a;
      return { ...a, [stat]: next };
    });
  }

  async function forge() {
    if (!name.trim()) return;
    const hero = await createNewHero(name.trim(), classId, alloc);
    await startRun(hero.id);
    navigate("/dungeon/run");
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 text-slate-100"
      style={{ background: "radial-gradient(900px 700px at 15% 0%, rgba(124, 58, 237, 0.25), transparent 60%), linear-gradient(180deg, #0a0a14 0%, #050308 100%)" }}
    >
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/dungeon")} className="text-[10px] uppercase tracking-[0.3em] opacity-60 hover:opacity-100 mb-4">
          ← Dungeon
        </button>
        <h1 className="font-display text-3xl sm:text-5xl tracking-[0.18em] mb-1" style={{ color: "#fbbf24" }}>FORGE A HERO</h1>
        <p className="text-sm opacity-70 mb-6">Choose your path. Each class plays differently.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {CLASS_LIST.map(c => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => pickClass(c.id)}
              className="rounded-lg p-4 text-left"
              style={{
                background: classId === c.id ? "rgba(192,132,252,0.18)" : "rgba(15,12,28,0.7)",
                border: `1px solid ${classId === c.id ? "#c084fc" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <div className="text-4xl">{c.emoji}</div>
              <div className="font-display tracking-wider text-xl mt-2">{c.name}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1">{c.tagline}</div>
              <div className="text-[11px] opacity-80 mt-3 leading-relaxed">{c.description}</div>
              <div className="grid grid-cols-4 gap-1 mt-3 text-[9px]">
                <Stat label="STR" v={c.baseStats.strength} />
                <Stat label="INT" v={c.baseStats.intellect} />
                <Stat label="AGI" v={c.baseStats.agility} />
                <Stat label="VIT" v={c.baseStats.vitality} />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="rounded-lg p-5 space-y-4" style={{ background: "rgba(15,12,28,0.8)", border: "1px solid rgba(192,132,252,0.25)" }}>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value.slice(0, 20))}
              className="w-full px-3 py-2 rounded-md bg-black/40 text-slate-100 outline-none focus:ring-1 focus:ring-amber-400"
              placeholder={`${klass.name} hero`}
              maxLength={20}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest opacity-70 mb-2">
              <span>Allocate Stats</span>
              <span style={{ color: left > 0 ? "#fde047" : "#94a3b8" }}>{left} left</span>
            </div>
            <div className="space-y-2">
              {(["strength", "intellect", "agility", "vitality"] as const).map(s => (
                <StatAlloc
                  key={s}
                  label={s}
                  base={klass.baseStats[s]}
                  added={alloc[s]}
                  canAdd={left > 0}
                  onAdd={() => bump(s, 1)}
                  onSub={() => bump(s, -1)}
                />
              ))}
            </div>
          </div>

          <button
            onClick={forge}
            disabled={!name.trim()}
            className="w-full py-3 rounded-md font-display tracking-widest text-sm"
            style={{ background: name.trim() ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${name.trim() ? "#fbbf24" : "rgba(255,255,255,0.1)"}`, color: name.trim() ? "#fde047" : "#94a3b8" }}
          >
            ⚔ FORGE &amp; DESCEND
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded px-1 py-0.5 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
      <div className="opacity-70">{label}</div>
      <div className="font-display tracking-wider">{v}</div>
    </div>
  );
}

function StatAlloc({ label, base, added, canAdd, onAdd, onSub }: { label: string; base: number; added: number; canAdd: boolean; onAdd: () => void; onSub: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-[11px] uppercase tracking-widest opacity-80">{label}</div>
      <button onClick={onSub} disabled={added === 0} className="w-8 h-8 rounded pressable" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", opacity: added > 0 ? 1 : 0.3 }}>–</button>
      <div className="flex-1 px-3 py-1.5 rounded text-center text-sm" style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {base} + {added}
      </div>
      <button onClick={onAdd} disabled={!canAdd} className="w-8 h-8 rounded pressable" style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.4)", opacity: canAdd ? 1 : 0.3, color: "#fde047" }}>+</button>
    </div>
  );
}
