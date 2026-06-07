// Monster Forge — Hub. Lists saved monsters, opens the builder.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, FlaskConical } from "lucide-react";
import { deleteMonster, loadSaved } from "../engine";
import type { SavedMonster } from "../partsManifest";
import { STAT_LABELS, STAT_COLORS, STAT_ORDER, statTotal } from "../engine/stats";
import { getPotion } from "../data/potions";

export default function MonsterForgeHub() {
  const navigate = useNavigate();
  const [list, setList] = useState<SavedMonster[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { setList(loadSaved()); }, [refreshKey]);

  const remove = (id: string) => {
    if (!confirm("Delete this monster?")) return;
    deleteMonster(id);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(700px 500px at 25% 0%, rgba(180,80,80,0.20), transparent 60%), " +
          "radial-gradient(800px 600px at 80% 100%, rgba(80,40,160,0.20), transparent 60%), " +
          "linear-gradient(180deg, #150612 0%, #050308 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fda4af" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>MONSTER FORGE</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>Build, brew & customize 3D monsters</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        <section className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(180,80,80,0.12), rgba(10,5,10,0.85))",
            border: "1px solid rgba(180,80,80,0.40)",
          }}>
          <div className="flex items-start gap-3">
            <FlaskConical size={28} style={{ color: "#fda4af", flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: "#fda4af" }}>ABOUT</div>
              <p className="text-[12px] leading-relaxed">
                Pick a body, layer on horns, wings, tails, spikes & eyes, then brew up
                potions for stats, auras, mutations and craft recipes. Live 3D preview &mdash;
                rotate, zoom, save.
              </p>
            </div>
          </div>
        </section>

        <button
          onClick={() => navigate("/monster-forge/build")}
          className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.25em] pressable touch-target flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #b91c1c, #7e22ce)",
            color: "#fef3c7",
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 14,
          }}>
          <Plus size={18} />
          CREATE NEW MONSTER
        </button>

        <section>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>YOUR LAB ({list.length})</div>
          {list.length === 0 ? (
            <div className="rounded-2xl p-6 text-center text-[12px]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(229,231,235,0.6)" }}>
              No monsters yet. Tap <strong>CREATE NEW MONSTER</strong> to start.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map(m => (
                <div key={m.id} className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ background: "rgba(180,80,80,0.18)", border: "1px solid rgba(180,80,80,0.35)" }}>
                      👹
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display tracking-wide truncate text-[14px]" style={{ color: "#fde047" }}>{m.name}</div>
                      <div className="text-[10px] truncate" style={{ color: "rgba(229,231,235,0.55)" }}>
                        {m.config.body} · {m.config.eyes} eyes · {m.config.color}
                      </div>
                      <div className="text-[9px] mt-0.5" style={{ color: "rgba(254,243,199,0.45)" }}>
                        Power {statTotal(m.stats)} · {m.activePotions.length} potion{m.activePotions.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/monster-forge/build?id=${m.id}`)}
                      className="px-3 py-2 rounded-lg text-[11px] pressable touch-target font-display tracking-wider"
                      style={{ background: "rgba(125,80,180,0.25)", border: "1px solid rgba(180,80,200,0.4)", color: "#fef3c7" }}>
                      EDIT
                    </button>
                    <button onClick={() => remove(m.id)} aria-label="Delete"
                      className="w-9 h-9 rounded-lg flex items-center justify-center pressable touch-target"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Trash2 size={14} style={{ color: "#fda4af" }} />
                    </button>
                  </div>
                  {/* Stat sparkline */}
                  <div className="flex gap-1 mt-1">
                    {STAT_ORDER.map(k => {
                      const v = m.stats[k];
                      const pct = Math.max(0.05, Math.min(1, v / 30));
                      return (
                        <div key={k} className="flex-1 flex flex-col items-center">
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div style={{ width: `${pct * 100}%`, height: "100%", background: STAT_COLORS[k] }} />
                          </div>
                          <div className="text-[8px] font-display tracking-wider mt-0.5" style={{ color: STAT_COLORS[k] }}>
                            {STAT_LABELS[k]} {v}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Active potion icon row */}
                  {m.activePotions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {m.activePotions.map(pid => {
                        const p = getPotion(pid);
                        if (!p) return null;
                        return (
                          <div key={pid} title={p.name}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[12px]"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                            {p.emoji}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
