// Monster Forge - Hub.
//
// Tabs: LAB / BATTLE ARENA / DEX
//   LAB        - saved monsters list, CREATE NEW, SURPRISE MONSTER (random gen),
//                Crystal Shards display, Achievements bell.
//   BATTLE ARENA - pick your monster + FIGHT CPU / FIGHT FRIEND.
//   DEX        - sortable + filterable list, search bar.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, FlaskConical, Dices, Sword, Search, Sparkles, Trophy } from "lucide-react";
import { deleteMonster, loadSaved, upsertMonster, newId } from "../engine";
import type { Manifest, SavedMonster, Rarity } from "../partsManifest";
import { loadManifest } from "../partsManifest";
import { STAT_LABELS, STAT_COLORS, STAT_ORDER, statTotal, computeStats } from "../engine/stats";
import { getPotion, POTIONS } from "../data/potions";
import { loadUnlocks, isUnlocked, costFor, unlockBody } from "../engine/shards";
import { getRecord } from "../engine/records";
import { ACHIEVEMENTS, loadUnlocked as loadAchUnlocked, onAchievement, drainPending, unlockAchievement, type AchievementDef } from "../engine/achievements";
import { loadDiscovered } from "../engine/crafting";

type Tab = "lab" | "battle" | "dex";
type SortKey = "date" | "level" | "powers" | "wins";
type RarityFilter = "all" | Rarity;

const NAME_POOL = [
  "Ziggy", "Snorp", "Blibble", "Munchy", "Twixie", "Snug", "Glomp", "Pip",
  "Wobble", "Crumby", "Mookie", "Doot", "Zorp", "Bizz", "Fuzzlet", "Snapper",
  "Spurg", "Wibble", "Boop", "Glow-Glow", "Borg", "Sneezy", "Pebble", "Marbles",
];

export default function MonsterForgeHub() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [list, setList] = useState<SavedMonster[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<Tab>("lab");
  const [shards, setShards] = useState<number>(0);
  const [toast, setToast] = useState<string>("");
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementBanner, setAchievementBanner] = useState<AchievementDef | null>(null);
  // Battle arena
  const [battlePlayerId, setBattlePlayerId] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<"cpu" | "friend">("cpu");
  const [battleOpponentId, setBattleOpponentId] = useState<string | null>(null);
  // Dex toolbar
  const [sort, setSort] = useState<SortKey>("date");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadManifest().then(setManifest).catch(e => console.error("[monster-forge:hub] manifest", e));
  }, []);

  useEffect(() => {
    setList(loadSaved());
    setShards(loadUnlocks().shards);
  }, [refreshKey]);

  // Achievement banner subscriber
  useEffect(() => {
    drainPending().forEach(setAchievementBanner);
    return onAchievement(a => {
      setAchievementBanner(a);
      setTimeout(() => setAchievementBanner(null), 3200);
    });
  }, []);

  const remove = (id: string) => {
    if (!confirm("Delete this monster?")) return;
    deleteMonster(id);
    setRefreshKey(k => k + 1);
  };

  // ── Surprise Monster: random body + 2-4 random potions ──
  const surprise = () => {
    if (!manifest) return;
    const bodies = manifest.parts.body.filter(b => isUnlocked(b.id, b.rarity));
    const bodyDef = bodies[Math.floor(Math.random() * bodies.length)] ?? manifest.parts.body[0];
    const pool = POTIONS.filter(p => !p.crafted);
    const numPotions = 2 + Math.floor(Math.random() * 3);
    const chosen: string[] = [];
    while (chosen.length < numPotions && chosen.length < pool.length) {
      const pid = pool[Math.floor(Math.random() * pool.length)].id;
      if (!chosen.includes(pid)) chosen.push(pid);
    }
    const id = newId();
    const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] + " " + Math.floor(Math.random() * 99);
    const stats = computeStats(bodyDef.id, chosen);
    const m: SavedMonster = {
      id, name,
      config: {
        body: bodyDef.id, headOverlay: "none",
        horns: Math.random() < 0.5 ? pick(["devil","ram","unicorn","twin"]) : "none",
        wings: Math.random() < 0.35 ? pick(["bat","feathered","butterfly","dragon"]) : "none",
        tail: Math.random() < 0.45 ? pick(["spike","fluff","lizard","fork"]) : "none",
        spikes: Math.random() < 0.35 ? pick(["row","crown","full"]) : "none",
        eyes: pick(["normal","angry","cute","cyclops","three","glow"]),
        color: pick(["none","ember","violet","ocean","forest","gold","rose","shadow","frost"]),
      },
      activePotions: chosen, stats,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    upsertMonster(m);
    if (loadSaved().length === 1) unlockAchievement("first_build");
    if (loadSaved().length >= 5) unlockAchievement("mad_scientist");
    setToast(`✨ DISCOVERED! ${name}`);
    setTimeout(() => setToast(""), 2400);
    setRefreshKey(k => k + 1);
  };

  // ── Try to unlock a body with shards ──
  const tryUnlock = (bodyId: string, rarity: Rarity | undefined) => {
    if (!rarity) return;
    const cost = costFor(rarity);
    if (cost <= 0) return;
    if (!confirm(`Unlock ${bodyId} for ${cost} shards?`)) return;
    const r = unlockBody(bodyId, cost);
    if (!r.ok) {
      setToast(r.reason ?? "Could not unlock.");
      setTimeout(() => setToast(""), 2000);
      return;
    }
    if (rarity === "legendary") unlockAchievement("legendary_unlock");
    setToast(`🔓 ${bodyId} unlocked!`);
    setTimeout(() => setToast(""), 2000);
    setRefreshKey(k => k + 1);
  };

  // ── Sorted+filtered list for Dex tab ──
  const dexList = useMemo(() => {
    let arr = [...list];
    if (rarityFilter !== "all" && manifest) {
      arr = arr.filter(m => {
        const bd = manifest.parts.body.find(b => b.id === m.config.body);
        return (bd?.rarity ?? "common") === rarityFilter;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter(m => m.name.toLowerCase().includes(q));
    switch (sort) {
      case "date":   arr.sort((a, b) => b.updatedAt - a.updatedAt); break;
      case "level":  arr.sort((a, b) => getRecord(b.id).level - getRecord(a.id).level); break;
      case "powers": arr.sort((a, b) => (b.activePotions?.length ?? 0) - (a.activePotions?.length ?? 0)); break;
      case "wins":   arr.sort((a, b) => getRecord(b.id).wins - getRecord(a.id).wins); break;
    }
    return arr;
  }, [list, rarityFilter, search, sort, manifest]);

  // ── Battle launch ──
  const launchBattle = () => {
    if (!battlePlayerId) return;
    if (battleMode === "friend" && !battleOpponentId) return;
    const q = new URLSearchParams();
    q.set("p", battlePlayerId);
    q.set("m", battleMode);
    if (battleMode === "friend" && battleOpponentId) q.set("o", battleOpponentId);
    navigate("/monster-forge/battle?" + q.toString());
  };

  const achievementUnlocks = loadAchUnlocked();
  const discovered = loadDiscovered();
  // Potion master unlock check (passive — once 10 recipes discovered)
  useEffect(() => { if (discovered.length >= 10) unlockAchievement("potion_master"); }, [discovered.length]);

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
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-display tracking-wider"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", color: "#fde047" }}>
            💎 {shards}
          </div>
          <button onClick={() => setShowAchievements(true)}
            aria-label="Achievements"
            className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Trophy size={14} style={{ color: "#fbbf24" }} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 max-w-3xl mx-auto w-full mb-2">
        <div className="grid grid-cols-3 gap-2 rounded-xl p-1"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {([["lab","Lab","🧪"],["battle","Battle","⚔️"],["dex","Dex","📖"]] as const).map(([id,label,emoji]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-3 py-2 rounded-lg font-display tracking-[0.2em] text-[10px] pressable touch-target"
              style={{
                background: tab === id ? "linear-gradient(135deg, rgba(180,80,80,0.4), rgba(125,80,180,0.4))" : "transparent",
                border: tab === id ? "1px solid rgba(180,80,200,0.5)" : "1px solid transparent",
                color: tab === id ? "#fde047" : "rgba(229,231,235,0.7)",
              }}>
              {emoji} {label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {tab === "lab" && (
          <>
            <section className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(180,80,80,0.12), rgba(10,5,10,0.85))",
                border: "1px solid rgba(180,80,80,0.40)",
              }}>
              <div className="flex items-start gap-3">
                <FlaskConical size={24} style={{ color: "#fda4af", flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: "#fda4af" }}>ABOUT</div>
                  <p className="text-[12px] leading-relaxed">
                    Pick a body, layer on horns, wings, tails, spikes & eyes, then brew up
                    potions for stats, auras, mutations and craft recipes. Live 3D preview —
                    rotate, zoom, save, battle.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/monster-forge/build")}
                className="px-5 py-4 rounded-2xl font-display tracking-[0.2em] pressable touch-target flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #b91c1c, #7e22ce)",
                  color: "#fef3c7", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12,
                }}>
                <Plus size={16} /> CREATE NEW
              </button>
              <button onClick={surprise}
                className="px-5 py-4 rounded-2xl font-display tracking-[0.2em] pressable touch-target flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #7e22ce, #2563eb)",
                  color: "#fef3c7", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12,
                }}>
                <Dices size={16} /> SURPRISE 🎲
              </button>
            </div>

            <section>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>YOUR LAB ({list.length})</div>
              <MonsterList list={list} manifest={manifest} navigate={navigate} onRemove={remove} onSendToDungeon={(m) => sendToDungeon(m, setToast, () => setRefreshKey(k=>k+1))} />
            </section>

            {/* Rarity unlock shop */}
            {manifest && (
              <section>
                <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>RARE BODIES ({shards} 💎)</div>
                <div className="grid grid-cols-2 gap-2">
                  {manifest.parts.body.filter(b => costFor(b.rarity) > 0).map(b => {
                    const unlocked = isUnlocked(b.id, b.rarity);
                    const cost = costFor(b.rarity);
                    return (
                      <div key={b.id} className="rounded-xl p-2 flex items-center gap-2"
                        style={{
                          background: unlocked ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${unlocked ? "rgba(34,197,94,0.4)" : RARITY_BORDER[b.rarity ?? "common"]}`,
                        }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-[12px] tracking-wide truncate" style={{ color: "#fde047" }}>{b.label}</div>
                          <div className="text-[9px] uppercase tracking-widest" style={{ color: RARITY_TEXT[b.rarity ?? "common"] }}>
                            {b.rarity ?? "common"}
                          </div>
                        </div>
                        {unlocked ? (
                          <div className="text-[10px] font-display tracking-wider px-2 py-1" style={{ color: "#34d399" }}>✓ OWNED</div>
                        ) : (
                          <button onClick={() => tryUnlock(b.id, b.rarity)}
                            className="px-2 py-1 rounded-lg text-[10px] font-display tracking-wider pressable touch-target"
                            style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }}>
                            💎 {cost}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "battle" && (
          <section className="space-y-4">
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(180,80,80,0.08)", border: "1px solid rgba(180,80,80,0.3)" }}>
              <div className="flex items-start gap-3">
                <Sword size={24} style={{ color: "#fda4af", flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: "#fda4af" }}>BATTLE ARENA</div>
                  <p className="text-[12px] leading-relaxed">
                    Pick your monster, choose an opponent, and battle. Winners earn 💎5 shards
                    and XP. Power charges reset every fight.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>YOUR MONSTER</div>
              {list.length === 0 ? (
                <div className="rounded-2xl p-6 text-center text-[12px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(229,231,235,0.6)" }}>
                  No monsters yet. Build one in the Lab first.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {list.map(m => (
                    <button key={m.id} onClick={() => setBattlePlayerId(m.id)}
                      className="rounded-xl p-3 text-left pressable touch-target"
                      style={{
                        background: battlePlayerId === m.id ? "rgba(125,80,180,0.30)" : "rgba(255,255,255,0.04)",
                        border: battlePlayerId === m.id ? "2px solid #c084fc" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      <div className="font-display tracking-wide truncate text-[13px]" style={{ color: "#fde047" }}>{m.name}</div>
                      <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.55)" }}>
                        Lv {getRecord(m.id).level} · Power {statTotal(m.stats)}
                      </div>
                      <div className="text-[9px]" style={{ color: "rgba(254,243,199,0.45)" }}>
                        {getRecord(m.id).wins}W / {getRecord(m.id).losses}L
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fda4af" }}>OPPONENT</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => { setBattleMode("cpu"); setBattleOpponentId(null); }}
                  className="px-4 py-3 rounded-xl font-display tracking-wider text-[11px] pressable touch-target"
                  style={{
                    background: battleMode === "cpu" ? "rgba(180,80,80,0.30)" : "rgba(255,255,255,0.04)",
                    border: battleMode === "cpu" ? "2px solid #fda4af" : "1px solid rgba(255,255,255,0.08)",
                    color: "#fef3c7",
                  }}>
                  🤖 FIGHT CPU
                </button>
                <button onClick={() => setBattleMode("friend")}
                  className="px-4 py-3 rounded-xl font-display tracking-wider text-[11px] pressable touch-target"
                  style={{
                    background: battleMode === "friend" ? "rgba(125,80,180,0.30)" : "rgba(255,255,255,0.04)",
                    border: battleMode === "friend" ? "2px solid #c084fc" : "1px solid rgba(255,255,255,0.08)",
                    color: "#fef3c7",
                  }}>
                  🧑‍🤝‍🧑 FIGHT FRIEND
                </button>
              </div>
              {battleMode === "friend" && (
                <div>
                  <div className="text-[10px] mb-2" style={{ color: "rgba(229,231,235,0.6)" }}>
                    Pick another saved monster (same device — passing the iPad back and forth):
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {list.filter(m => m.id !== battlePlayerId).map(m => (
                      <button key={m.id} onClick={() => setBattleOpponentId(m.id)}
                        className="rounded-xl p-3 text-left pressable touch-target"
                        style={{
                          background: battleOpponentId === m.id ? "rgba(180,80,80,0.30)" : "rgba(255,255,255,0.04)",
                          border: battleOpponentId === m.id ? "2px solid #f87171" : "1px solid rgba(255,255,255,0.08)",
                        }}>
                        <div className="font-display tracking-wide truncate text-[13px]" style={{ color: "#fde047" }}>{m.name}</div>
                        <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.55)" }}>
                          Lv {getRecord(m.id).level} · Power {statTotal(m.stats)}
                        </div>
                      </button>
                    ))}
                  </div>
                  {list.filter(m => m.id !== battlePlayerId).length === 0 && (
                    <div className="rounded-2xl p-4 text-center text-[11px]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(229,231,235,0.55)" }}>
                      Need at least 2 saved monsters for FIGHT FRIEND.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={launchBattle}
              disabled={!battlePlayerId || (battleMode === "friend" && !battleOpponentId)}
              className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.25em] pressable touch-target flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #b91c1c, #7e22ce)",
                color: "#fef3c7", border: "1px solid rgba(255,255,255,0.15)", fontSize: 14,
                opacity: (!battlePlayerId || (battleMode === "friend" && !battleOpponentId)) ? 0.45 : 1,
                pointerEvents: (!battlePlayerId || (battleMode === "friend" && !battleOpponentId)) ? "none" : "auto",
              }}>
              <Sparkles size={18} /> BATTLE!
            </button>
          </section>
        )}

        {tab === "dex" && (
          <section className="space-y-3">
            <div className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Search size={14} style={{ color: "rgba(229,231,235,0.55)" }} />
              <input type="text" placeholder="Search by name…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[12px]"
                style={{ color: "#fef3c7" }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all","common","uncommon","rare","legendary"] as const).map(r => (
                <button key={r} onClick={() => setRarityFilter(r)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: rarityFilter === r ? RARITY_FILTER_BG[r] : "rgba(255,255,255,0.04)",
                    border: `1px solid ${rarityFilter === r ? RARITY_BORDER[r] : "rgba(255,255,255,0.08)"}`,
                    color: rarityFilter === r ? RARITY_TEXT[r] : "rgba(229,231,235,0.7)",
                  }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["date","level","powers","wins"] as const).map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: sort === s ? "rgba(125,80,180,0.3)" : "rgba(255,255,255,0.04)",
                    border: sort === s ? "1px solid rgba(180,80,200,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: sort === s ? "#fde047" : "rgba(229,231,235,0.7)",
                  }}>
                  {SORT_LABEL[s]}
                </button>
              ))}
            </div>
            <MonsterList list={dexList} manifest={manifest} navigate={navigate} onRemove={remove} onSendToDungeon={(m) => sendToDungeon(m, setToast, () => setRefreshKey(k=>k+1))} />
          </section>
        )}
      </main>

      {/* Achievements modal */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowAchievements(false)}>
          <div className="w-full max-w-md rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(180,80,80,0.18), rgba(10,5,10,0.95))",
              border: "1px solid rgba(180,80,80,0.4)",
            }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-lg tracking-wider" style={{ color: "#fde047" }}>ACHIEVEMENTS</div>
              <button onClick={() => setShowAchievements(false)} className="w-8 h-8 rounded-full flex items-center justify-center pressable touch-target"
                style={{ background: "rgba(255,255,255,0.05)" }}>✕</button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {ACHIEVEMENTS.map(a => {
                const got = achievementUnlocks.includes(a.id);
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg"
                    style={{
                      background: got ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${got ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                      opacity: got ? 1 : 0.6,
                    }}>
                    <div className="text-2xl">{a.emoji}</div>
                    <div className="flex-1">
                      <div className="font-display text-[12px] tracking-wide" style={{ color: got ? "#fde047" : "rgba(229,231,235,0.65)" }}>{a.label}</div>
                      <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.55)" }}>{a.desc}</div>
                    </div>
                    {got && <div className="text-[10px] font-display" style={{ color: "#34d399" }}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-[12px] font-display tracking-wider z-40 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.85)", color: "#fde047", border: "1px solid rgba(255,255,255,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Achievement banner */}
      {achievementBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl flex items-center gap-3 z-40 animate-banner pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(217,119,6,0.95))",
            border: "1px solid rgba(254,240,138,0.5)", color: "#1a1a1a",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}>
          <div className="text-3xl">{achievementBanner.emoji}</div>
          <div>
            <div className="text-[10px] tracking-[0.2em] font-display">ACHIEVEMENT!</div>
            <div className="font-display text-base tracking-wider">{achievementBanner.label}</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes banner {
          0%   { opacity: 0; transform: translate(-50%, -20px) scale(0.85); }
          15%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          90%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -10px) scale(0.95); }
        }
        .animate-banner { animation: banner 3.2s ease-out forwards; }
      `}</style>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

const RARITY_BORDER: Record<string, string> = {
  all: "rgba(255,255,255,0.08)",
  common: "rgba(180,180,180,0.4)",
  uncommon: "rgba(34,197,94,0.4)",
  rare: "rgba(96,165,250,0.5)",
  legendary: "rgba(251,191,36,0.5)",
};
const RARITY_TEXT: Record<string, string> = {
  all: "#fef3c7",
  common: "#cbd5e1",
  uncommon: "#34d399",
  rare: "#60a5fa",
  legendary: "#fbbf24",
};
const RARITY_FILTER_BG: Record<string, string> = {
  all: "rgba(180,80,80,0.20)",
  common: "rgba(180,180,180,0.15)",
  uncommon: "rgba(34,197,94,0.15)",
  rare: "rgba(96,165,250,0.15)",
  legendary: "rgba(251,191,36,0.15)",
};
const SORT_LABEL: Record<SortKey, string> = {
  date: "BY DATE", level: "BY LEVEL", powers: "BY POWERS", wins: "BY WINS",
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function sendToDungeon(m: SavedMonster, setToast: (s: string) => void, refresh: () => void) {
  try {
    window.localStorage.setItem(
      "henry-arcade-monster-companion-v1",
      JSON.stringify({ id: m.id, name: m.name, body: m.config.body, stats: m.stats, sentAt: Date.now() }),
    );
    setToast(`🗡 ${m.name} sent to Dungeon!`);
    setTimeout(() => setToast(""), 2000);
    refresh();
  } catch {
    setToast("Could not send (storage full)");
    setTimeout(() => setToast(""), 2000);
  }
}

function isInDungeon(id: string): boolean {
  try {
    const raw = window.localStorage.getItem("henry-arcade-monster-companion-v1");
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj?.id === id;
  } catch { return false; }
}

// ─── Inner monster list (used by Lab + Dex) ─────────────────────────

function MonsterList({ list, manifest, navigate, onRemove, onSendToDungeon }:{
  list: SavedMonster[]; manifest: Manifest | null;
  navigate: (s: string) => void;
  onRemove: (id: string) => void;
  onSendToDungeon: (m: SavedMonster) => void;
}) {
  if (list.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-[12px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(229,231,235,0.6)" }}>
        No monsters here yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {list.map(m => {
        const bodyDef = manifest?.parts.body.find(b => b.id === m.config.body);
        const rarity = bodyDef?.rarity ?? "common";
        const rec = getRecord(m.id);
        const inDungeon = isInDungeon(m.id);
        return (
          <div key={m.id} className="rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${RARITY_BORDER[rarity]}` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl relative"
                style={{ background: "rgba(180,80,80,0.18)", border: "1px solid rgba(180,80,80,0.35)" }}>
                👹
                {m.evolved && (
                  <div className="absolute -top-1 -right-1 text-xs">✨</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <div className="font-display tracking-wide truncate text-[14px]" style={{ color: "#fde047" }}>{m.name}</div>
                  <div className="text-[8px] uppercase tracking-widest font-display px-1 py-0.5 rounded"
                    style={{ background: `${RARITY_FILTER_BG[rarity]}`, color: RARITY_TEXT[rarity] }}>
                    {rarity.slice(0,3)}
                  </div>
                </div>
                <div className="text-[10px] truncate" style={{ color: "rgba(229,231,235,0.55)" }}>
                  Lv {rec.level} · {m.config.body} · {m.config.eyes} eyes
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(254,243,199,0.45)" }}>
                  Power {statTotal(m.stats)} · {rec.wins}W/{rec.losses}L
                  {inDungeon && " · 🗡 In Dungeon"}
                </div>
              </div>
              <button
                onClick={() => navigate(`/monster-forge/build?id=${m.id}`)}
                className="px-3 py-2 rounded-lg text-[11px] pressable touch-target font-display tracking-wider"
                style={{ background: "rgba(125,80,180,0.25)", border: "1px solid rgba(180,80,200,0.4)", color: "#fef3c7" }}>
                EDIT
              </button>
              <button onClick={() => onRemove(m.id)} aria-label="Delete"
                className="w-9 h-9 rounded-lg flex items-center justify-center pressable touch-target"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Trash2 size={14} style={{ color: "#fda4af" }} />
              </button>
            </div>
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
            <div className="mt-2">
              <button onClick={() => onSendToDungeon(m)}
                className="w-full px-2 py-1.5 rounded-lg text-[10px] font-display tracking-wider pressable touch-target"
                style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", color: "#93c5fd" }}>
                🗡 SEND TO DUNGEON
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
