// Grimoire — recipe book. Known recipes always visible. Secret +
// easter-egg recipes show as ??? until the player has brewed them.

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, BookOpen } from "lucide-react";
import { PotionLabShell, LAB_PURPLE, LAB_AMBER } from "../components/PotionLabShell";
import { PotionBottle } from "../components/PotionBottle";
import { KNOWN_RECIPES, SECRET_RECIPES, HARRY_POTTER_RECIPES, GREEK_RECIPES, SKYRIM_RECIPES, SCHOOLYARD_RECIPES, EASTER_EGGS, type Recipe } from "../data/recipes";
import { INGREDIENTS } from "../data/ingredients";
import { usePotionSave } from "../store";

type Tab = "known" | "secret" | "potter" | "greek" | "skyrim" | "school" | "easter";

export default function Grimoire() {
  const { state } = usePotionSave();
  const [tab, setTab] = useState<Tab>("known");

  const list =
    tab === "known"  ? KNOWN_RECIPES :
    tab === "secret" ? SECRET_RECIPES :
    tab === "potter" ? HARRY_POTTER_RECIPES :
    tab === "greek"  ? GREEK_RECIPES :
    tab === "skyrim" ? SKYRIM_RECIPES :
    tab === "school" ? SCHOOLYARD_RECIPES :
    EASTER_EGGS;
  const counter = (recipes: Recipe[]) =>
    `${recipes.filter(r => state.discovered.includes(r.id)).length}/${recipes.length}`;

  return (
    <PotionLabShell title="The Grimoire" subtitle={`${state.discovered.length} recipes unlocked`} backTo="/potion-lab" emoji="📖">
      <div className="space-y-4">
        {/* Tabs — horizontally scrollable to fit the new schools */}
        <nav aria-label="Grimoire sections" className="overflow-x-auto -mx-3 px-3">
          <div className="flex gap-1.5 w-max pb-1">
            <Tab active={tab === "known"}  onClick={() => setTab("known")}  label={`Known · ${counter(KNOWN_RECIPES)}`}        color={LAB_PURPLE} />
            <Tab active={tab === "secret"} onClick={() => setTab("secret")} label={`Secret · ${counter(SECRET_RECIPES)}`}      color={LAB_AMBER} />
            <Tab active={tab === "potter"} onClick={() => setTab("potter")} label={`Potter · ${counter(HARRY_POTTER_RECIPES)}`} color="#fbbf24" />
            <Tab active={tab === "greek"}  onClick={() => setTab("greek")}  label={`Olympus · ${counter(GREEK_RECIPES)}`}     color="#fde68a" />
            <Tab active={tab === "skyrim"} onClick={() => setTab("skyrim")} label={`Nordic · ${counter(SKYRIM_RECIPES)}`}      color="#67e8f9" />
            <Tab active={tab === "school"} onClick={() => setTab("school")} label={`Schoolyard · ${counter(SCHOOLYARD_RECIPES)}`} color="#86efac" />
            <Tab active={tab === "easter"} onClick={() => setTab("easter")} label={`Easter Eggs · ${counter(EASTER_EGGS)}`}    color="#f472b6" />
          </div>
        </nav>

        {/* Recipe list */}
        <div className="space-y-2">
          {list.map(r => {
            const discovered = state.discovered.includes(r.id);
            const isSecret = tab !== "known" && !discovered;
            return <RecipeRow key={r.id} recipe={r} discovered={discovered} isSecret={isSecret} />;
          })}
        </div>

        {tab === "easter" && (
          <div className="rounded-xl p-3" style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.30)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: "#f472b6" }}>EASTER EGGS</div>
            <div className="text-[12px] text-violet-100/85 leading-relaxed">
              These need 3+ specific rare ingredients in exactly the right combo. The Brewmaster gets extra excited when you find one.
            </div>
          </div>
        )}
      </div>
    </PotionLabShell>
  );
}

function Tab({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick}
      aria-pressed={active}
      className="flex-1 px-3 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target"
      style={{
        background: active ? `${color}33` : "rgba(255,255,255,0.04)",
        color: active ? color : "#ede9fe",
        border: `1px solid ${active ? color : "rgba(255,255,255,0.07)"}`,
        minHeight: 44,
      }}>{label}</button>
  );
}

function RecipeRow({ recipe, discovered, isSecret }: { recipe: Recipe; discovered: boolean; isSecret: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 flex items-start gap-3"
      style={{
        background: discovered
          ? `linear-gradient(135deg, ${recipe.color}22, rgba(10,6,18,0.92))`
          : "rgba(0,0,0,0.45)",
        border: `1px solid ${discovered ? `${recipe.color}66` : "rgba(255,255,255,0.07)"}`,
      }}>
      {discovered ? (
        <PotionBottle color={recipe.color} size={56} />
      ) : (
        <div className="w-14 h-14 flex items-center justify-center rounded" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Lock size={20} className="text-violet-300/60" aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-display text-base text-violet-50 truncate">
            {discovered ? `${recipe.emoji} ${recipe.name}` : isSecret ? "???" : recipe.name}
          </div>
          {recipe.kind === "easter" && discovered && <Sparkles size={11} style={{ color: "#f472b6" }} aria-hidden="true" />}
        </div>
        {discovered ? (
          <>
            <div className="text-[11px] text-violet-100/85 mt-1">{recipe.effect}</div>
            <div className="text-[11px] text-violet-200/70 italic mt-1">{recipe.lore}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.ingredients.map(id => {
                const ing = INGREDIENTS.find(i => i.id === id);
                if (!ing) return null;
                return (
                  <span key={id} className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded"
                    style={{ background: `${ing.color}22`, border: `1px solid ${ing.color}55`, color: "#fef9c3" }}>
                    <span aria-hidden="true">{ing.emoji}</span>{ing.name}
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-violet-200/70 italic mt-1">
            {isSecret ? "Brew the exact combo to unlock." : recipe.lore}
          </div>
        )}
      </div>
    </motion.div>
  );
}
