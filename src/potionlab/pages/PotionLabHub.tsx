// Potion Lab — landing. Shows rank progress, three doors (Cauldron,
// Grimoire, Shelf), and total brews count. Welcoming intro for first
// visit.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FlaskConical, BookOpen, Sparkles, Trophy } from "lucide-react";
import { PotionLabShell, LAB_PURPLE, LAB_AMBER } from "../components/PotionLabShell";
import { usePotionSave, RANK_TITLES, RANK_THRESHOLDS, rankFor } from "../store";
import { ALL_RECIPES } from "../data/recipes";
import { useActiveProfile } from "../../profiles/store";

export default function PotionLabHub() {
  const navigate = useNavigate();
  const { state } = usePotionSave();
  const profile = useActiveProfile();
  const playerName = profile?.name ?? "friend";
  const rank = rankFor(state.discovered.length);
  const nextRankAt = RANK_THRESHOLDS[Math.min(rank + 1, RANK_THRESHOLDS.length - 1)];
  const pct = Math.min(100, Math.round((state.discovered.length / Math.max(1, nextRankAt)) * 100));

  return (
    <PotionLabShell title="The Potion Lab" subtitle={`Brewmaster ${RANK_TITLES[rank]} · ${state.discovered.length}/${ALL_RECIPES.length} recipes`} emoji="🧪">
      <div className="space-y-4">
        {/* Rank panel */}
        <section className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${LAB_PURPLE}22, rgba(10,6,18,0.9))`, border: `1px solid ${LAB_PURPLE}55` }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: LAB_AMBER }} aria-hidden="true" />
              <div className="font-display tracking-widest text-[12px]" style={{ color: LAB_AMBER }}>
                {RANK_TITLES[rank].toUpperCase()}
              </div>
            </div>
            <div className="text-[11px] text-violet-100/85">
              {rank < RANK_TITLES.length - 1
                ? `${state.discovered.length}/${nextRankAt} to ${RANK_TITLES[rank + 1]}`
                : "Top of the order — every brew is bragging rights."}
            </div>
          </div>
          <div className="h-2 rounded" style={{ background: "rgba(0,0,0,0.45)" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: `linear-gradient(90deg, ${LAB_PURPLE}, ${LAB_AMBER})`,
              borderRadius: 999,
              transition: "width 0.4s",
            }} role="progressbar" aria-valuenow={state.discovered.length} aria-valuemin={0} aria-valuemax={nextRankAt} aria-label="Brewmaster progress" />
          </div>
          <div className="flex flex-wrap justify-between text-[10px] tracking-widest text-violet-200/70 mt-2 gap-x-3">
            <span>{state.totalBrews} brews</span>
            <span>{state.shelf.length} bottled</span>
            <span style={{ color: "#fde047" }}>✦ {(state.hiddenDiscoveries ?? []).length} <span className="opacity-60">/ ??</span> discoveries</span>
          </div>
        </section>

        {/* Doors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Door
            to="/potion-lab/cauldron"
            emoji="🧪"
            label="THE CAULDRON"
            title="Brew something"
            desc="Pick 2–5 ingredients. See what happens."
            accent={LAB_PURPLE}
            icon={<FlaskConical size={22} style={{ color: LAB_PURPLE }} aria-hidden="true" />}
          />
          <Door
            to="/potion-lab/grimoire"
            emoji="📖"
            label="THE GRIMOIRE"
            title="Recipe book"
            desc="Known recipes. Secrets reveal as you brew them."
            accent={LAB_AMBER}
            icon={<BookOpen size={22} style={{ color: LAB_AMBER }} aria-hidden="true" />}
          />
          <Door
            to="/potion-lab/shelf"
            emoji="🍶"
            label="YOUR SHELF"
            title="Bottled potions"
            desc="Last 24 brews live here. Cork good ones for later."
            accent="#86efac"
            icon={<Sparkles size={22} style={{ color: "#86efac" }} aria-hidden="true" />}
          />
        </div>

        {/* Intro card (only shown on first visit / fresh slate) */}
        {state.totalBrews === 0 && (
          <section className="rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, ${LAB_AMBER}22, rgba(10,6,18,0.9))`, border: `1px solid ${LAB_AMBER}66` }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: LAB_AMBER }}>WELCOME, APPRENTICE</div>
            <p className="text-[13px] text-violet-50 leading-relaxed mb-2">
              Welcome to the lab, {playerName}. The cauldron is hot. The shelf is empty. The grimoire knows a few starter recipes — and lots of secrets.
            </p>
            <p className="text-[13px] text-violet-100/90 leading-relaxed">
              Tap <strong>The Cauldron</strong> to brew. Combine 2 to 5 ingredients. Some combos make known potions; others might be secrets nobody has tried. The Brewmaster will narrate every attempt.
            </p>
          </section>
        )}
      </div>
    </PotionLabShell>
  );
}

function Door({ to, emoji, label, title, desc, accent, icon }: {
  to: string; emoji: string; label: string; title: string; desc: string; accent: string; icon: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
      onClick={() => navigate(to)}
      aria-label={`${title}. ${desc}`}
      className="rounded-2xl p-4 text-left pressable touch-target flex flex-col gap-1"
      style={{
        background: `linear-gradient(135deg, ${accent}1c, rgba(10,6,18,0.85))`,
        border: `1px solid ${accent}55`,
        minHeight: 130,
      }}>
      <div className="flex items-center justify-between">
        <div className="text-3xl" aria-hidden="true">{emoji}</div>
        {icon}
      </div>
      <div className="text-[10px] tracking-[0.3em] font-display mt-1" style={{ color: accent }}>{label}</div>
      <div className="font-display text-lg text-violet-50">{title}</div>
      <div className="text-[11px] text-violet-100/85 leading-snug">{desc}</div>
    </motion.button>
  );
}
