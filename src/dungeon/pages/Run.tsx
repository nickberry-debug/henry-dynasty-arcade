// pages/Run.tsx — The playable screen. Canvas + HUD + keyboard input.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDungeon } from "../state/store";
import { TileMap } from "../components/TileMap";
import { HUD } from "../components/HUD";
import DungeonShop from "./Shop";
import DungeonEnd from "./End";

export default function DungeonRun() {
  const navigate = useNavigate();
  const run = useDungeon(s => s.run);
  const heroes = useDungeon(s => s.heroes);
  const activeHeroId = useDungeon(s => s.activeHeroId);
  const moveHero = useDungeon(s => s.moveHero);
  const useAbility = useDungeon(s => s.useAbility);
  const setAiming = useDungeon(s => s.setAiming);
  const drinkPotion = useDungeon(s => s.drinkPotion);
  const equipItem = useDungeon(s => s.equipItem);
  const descend = useDungeon(s => s.descend);
  const abandonRun = useDungeon(s => s.abandonRun);
  const heroStatuses = useDungeon(s => s.heroStatuses);

  const hero = heroes.find(h => h.id === activeHeroId) ?? null;

  // Keyboard input
  useEffect(() => {
    if (!run || !hero) return;
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (!run || !hero) return;
      // Movement (works during exploration + combat).
      if (run.phase === "exploring" || run.phase === "combat") {
        if (k === "w" || k === "arrowup") { e.preventDefault(); moveHero(0, -1); return; }
        if (k === "s" || k === "arrowdown") { e.preventDefault(); moveHero(0, 1); return; }
        if (k === "a" || k === "arrowleft") { e.preventDefault(); moveHero(-1, 0); return; }
        if (k === "d" && !e.shiftKey && !(run.map && run.map.tiles[run.py * run.map.width + run.px].kind === "stairsDown")) {
          e.preventDefault(); moveHero(1, 0); return;
        }
        // Period = wait one turn
        if (k === ".") { e.preventDefault(); moveHero(0, 0); return; }
      }
      // Abilities 1–5
      const idx = ["1", "2", "3", "4", "5"].indexOf(k);
      if (idx >= 0 && hero.abilities[idx]) {
        e.preventDefault(); useAbility(idx); setAiming(null); return;
      }
      if (k === "h") { e.preventDefault(); drinkPotion("heal"); return; }
      if (k === "m") { e.preventDefault(); drinkPotion("mana"); return; }
      if (k === "escape") { e.preventDefault(); setAiming(null); return; }
      // Descend on stairs (D when on stairs).
      const onStairs = run.map && run.map.tiles[run.py * run.map.width + run.px].kind === "stairsDown";
      if ((k === "d" && onStairs) || k === ">") {
        e.preventDefault(); descend(); return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, hero, moveHero, useAbility, setAiming, drinkPotion, descend]);

  // Redirect if no run.
  useEffect(() => {
    if (!run || !hero) {
      const t = setTimeout(() => navigate("/dungeon"), 50);
      return () => clearTimeout(t);
    }
  }, [run, hero, navigate]);

  if (!run || !hero) return null;

  // Show overlay screens when phase changes.
  if (run.phase === "victory" || run.phase === "defeat") {
    return <DungeonEnd />;
  }

  return (
    <div className="min-h-screen p-3 sm:p-5 text-slate-100"
      style={{ background: "radial-gradient(900px 700px at 15% 0%, rgba(124, 58, 237, 0.18), transparent 60%), linear-gradient(180deg, #0a0a14 0%, #050308 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate("/dungeon")} className="text-[10px] uppercase tracking-[0.3em] opacity-60 hover:opacity-100">
            ← Dungeon
          </button>
          <div className="text-[10px] uppercase tracking-widest opacity-70">
            Turn {run.turn} · {run.phase}
          </div>
        </div>

        {run.phase === "shopping" ? (
          <DungeonShop />
        ) : (
          <>
            <TileMap
              run={run}
              hero={hero}
              onTileClick={(x, y) => {
                if (run.aiming === null) return;
                // Click confirms ability target.
                const enemy = run.enemies.find(e => e.x === x && e.y === y && e.hp > 0);
                useAbility(run.aiming, { x, y, enemyId: enemy?.id });
                setAiming(null);
              }}
            />
            <HUD
              hero={hero}
              run={run}
              heroStatuses={heroStatuses}
              onAbility={(idx) => useAbility(idx)}
              onAiming={(idx) => setAiming(idx)}
              aimingIdx={run.aiming}
              onDrinkPotion={drinkPotion}
              onEquip={equipItem}
              onDescend={descend}
              onAbandon={async () => {
                await abandonRun();
                navigate("/dungeon");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
