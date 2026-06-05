// ⚡ Survivor — hub. Pick a hero, optionally pick a biome, optionally
// spend meta-currency on permanent boosts, then start a run.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Coins, Skull } from "lucide-react";
import { useSurvivor, META_UPGRADES } from "../store";
import { HEROES, BIOMES } from "../catalog";
import { SyncIndicator } from "../../components/SyncIndicator";

export default function SurvivorHub() {
  const navigate = useNavigate();
  const { save, buyMeta } = useSurvivor();
  const [heroId, setHeroId] = useState<string>(HEROES[0].id);
  const [biomeId, setBiomeId] = useState<string>(BIOMES[0].id);

  function start() {
    sessionStorage.setItem("dd_survivor_run", JSON.stringify({ heroId, biomeId }));
    navigate("/survivor/run");
  }

  const heroBest = save.bestTimeByHero[heroId] ?? 0;
  const lvlBest = save.bestLevelByHero[heroId] ?? 0;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 20% 0%, rgba(253,224,71,0.16), transparent 60%), " +
          "radial-gradient(900px 600px at 80% 100%, rgba(167,139,250,0.14), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>⚡ SURVIVOR</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
            One thumb. Pick upgrades each level. Last as long as you can.
          </div>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {/* Currency + stats row */}
        <section className="grid grid-cols-3 gap-2">
          <Resource emoji="🪙" label="COINS"  value={save.coins} accent="#fde047" />
          <Resource emoji="💀" label="KILLS"  value={save.totalKills} accent="#fca5a5" />
          <Resource emoji="🏁" label="RUNS"   value={save.totalRuns} accent="#86efac" />
        </section>

        {/* Hero picker */}
        <section>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fde047" }}>PICK YOUR HERO</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HEROES.map(h => {
              const sel = h.id === heroId;
              return (
                <button key={h.id} onClick={() => setHeroId(h.id)}
                  aria-pressed={sel}
                  className="rounded-xl p-3 text-left pressable touch-target"
                  style={{
                    background: sel ? `linear-gradient(135deg, ${h.color}22, rgba(10,10,20,0.85))` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${sel ? h.color : "rgba(255,255,255,0.10)"}`,
                    boxShadow: sel ? `0 4px 18px -4px ${h.color}88` : undefined,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl" aria-hidden="true">{h.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm tracking-wide" style={{ color: sel ? h.color : "#fef3c7" }}>{h.name}</div>
                      <div className="text-[10px] opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
                        {h.base.hp} HP · {h.base.speed} spd
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] mt-1.5 leading-snug" style={{ color: "rgba(229,231,235,0.65)" }}>{h.flavor}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Biome picker */}
        <section>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fde047" }}>BIOME</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {BIOMES.map(b => {
              const sel = b.id === biomeId;
              return (
                <button key={b.id} onClick={() => setBiomeId(b.id)}
                  aria-pressed={sel}
                  className="rounded-lg px-3 py-2 text-[11px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: sel ? `${b.ground}55` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${sel ? b.ground : "rgba(255,255,255,0.10)"}`,
                    color: sel ? "#fef3c7" : "#e5e7eb",
                    minHeight: 36,
                  }}>{b.name}</button>
              );
            })}
          </div>
        </section>

        {/* Start button */}
        <button onClick={start}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-display tracking-widest text-base pressable touch-target"
          style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "#1a0505", minHeight: 56 }}>
          <Play size={18} aria-hidden="true" /> START RUN
        </button>

        {heroBest > 0 && (
          <div className="text-[11px] text-center opacity-80" style={{ color: "#86efac" }}>
            Best with this hero: lvl {lvlBest} · {Math.round(heroBest)}s survived
          </div>
        )}

        {/* Meta-progression shop */}
        <section className="rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} style={{ color: "#fde047" }} aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#fde047" }}>Permanent Upgrades</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {META_UPGRADES.map(u => {
              const lvl = save.meta[u.id] ?? 0;
              const max = lvl >= u.maxLevel;
              const cost = u.cost(lvl);
              const can = !max && save.coins >= cost;
              return (
                <button key={u.id} disabled={max || !can}
                  onClick={() => buyMeta(u.id, cost)}
                  className="rounded-lg p-2.5 text-left pressable touch-target"
                  style={{
                    background: max ? "rgba(134,239,172,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${max ? "#86efac" : "rgba(255,255,255,0.10)"}`,
                    opacity: !can && !max ? 0.55 : 1,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-display" style={{ color: "#fef3c7" }}>
                      {u.emoji} {u.name}
                    </div>
                    <div className="text-[10px]" style={{ color: "#fde047" }}>
                      {lvl}/{u.maxLevel}
                    </div>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
                    {u.desc}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: max ? "#86efac" : can ? "#fde047" : "rgba(229,231,235,0.5)" }}>
                    {max ? "MAX" : `${cost} coins`}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {save.totalRuns === 0 && (
          <div className="rounded-xl p-3 text-[12px]"
            style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.3)", color: "rgba(229,231,235,0.85)" }}>
            <Skull size={12} aria-hidden="true" style={{ display: "inline", marginRight: 4 }} />
            One thumb to move. Your hero attacks on her own. Pick the right upgrades each level.
          </div>
        )}
      </main>
    </div>
  );
}

function Resource({ emoji, label, value, accent }: { emoji: string; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: `${accent}1f`, border: `1px solid ${accent}55` }}>
      <div className="text-[9px] tracking-[0.2em] uppercase" style={{ color: accent }}>{emoji} {label}</div>
      <div className="font-display text-base mt-0.5 tabular-nums" style={{ color: "#fef3c7" }}>{value.toLocaleString()}</div>
    </div>
  );
}
