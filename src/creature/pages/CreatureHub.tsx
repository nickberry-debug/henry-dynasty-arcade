// Creature Keeper — main hub. Shows the player's 3 active creatures
// with full care meters + care actions (feed / play / clean / rest /
// heal). Tap a creature card to see its details + rename + learned
// moves. Honest scope note: care + bonding + leveling are wired; the
// turn-based battle screen and breeding/items/tournaments are pending.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Cookie, Heart, Wind, Bed, Droplet, Swords, ShoppingBag, Trees, Egg, Zap, Link2 } from "lucide-react";
import { useOlympus } from "../../olympus/store";
import { useCreature, type CareAction } from "../store";
import { getSpecies, getMove, getHabitat, DEFAULT_HABITAT, SPECIES, hiddenSpeciesUnlocked } from "../catalog";
import { TYPE_INFO, CLASS_INFO, xpForLevel, type Creature } from "../types";
import { StarterPicker } from "./StarterPicker";
import { CreatureSprite } from "../CreatureSprite";
import { SyncIndicator } from "../../components/SyncIndicator";

const ACTIONS: { id: CareAction; label: string; icon: typeof Cookie; tint: string; statKey: keyof Creature["needs"] }[] = [
  { id: "feed",  label: "Feed",  icon: Cookie,  tint: "#fbbf24", statKey: "hunger" },
  { id: "play",  label: "Play",  icon: Wind,    tint: "#86efac", statKey: "happiness" },
  { id: "clean", label: "Clean", icon: Droplet, tint: "#7dd3fc", statKey: "cleanliness" },
  { id: "rest",  label: "Rest",  icon: Bed,     tint: "#a78bfa", statKey: "energy" },
  { id: "heal",  label: "Heal",  icon: Heart,   tint: "#f87171", statKey: "health" },
];

export default function CreatureHub() {
  const navigate = useNavigate();
  const c = useCreature();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = c.activeCreatures.find(x => x.id === selectedId) ?? c.activeCreatures[0] ?? null;
  const habitat = getHabitat(c.save.habitatId) ?? getHabitat(DEFAULT_HABITAT)!;

  // First-launch starter selection — gate the hub behind picking one of three.
  if (!c.save.pickedStarter) {
    return <StarterPicker onPicked={() => { /* state re-renders via store */ }} />;
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          `radial-gradient(900px 600px at 20% 0%, ${habitat.accent}22, transparent 60%), ` +
          "radial-gradient(900px 600px at 80% 100%, rgba(192,132,252,0.14), transparent 60%), " +
          habitat.bgGradient,
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: habitat.accent }}>
            {habitat.emoji} {habitat.name.toUpperCase()}
          </div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>CREATURE KEEPER</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
            {c.save.archive.length} in archive · {c.activeCreatures.length}/3 active · {c.save.berries} 🍒 · W{c.save.wins}/L{c.save.losses}
          </div>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {c.activeCreatures.length === 0 && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.3)" }}>
            <div className="font-display text-base mb-1" style={{ color: "#fef3c7" }}>No active creatures.</div>
            <div className="text-[12px]" style={{ color: "rgba(229,231,235,0.7)" }}>
              Tap an archived creature below to bring them to your active roster.
            </div>
          </div>
        )}

        {/* Active creature row */}
        {c.activeCreatures.length > 0 && (
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#86efac" }}>ACTIVE ROSTER</div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(slot => {
                const cr = c.activeCreatures[slot];
                if (!cr) {
                  return (
                    <div key={slot} className="rounded-xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", minHeight: 140 }}>
                      <div className="text-[10px] opacity-60" style={{ color: "#c4b5fd" }}>Empty slot</div>
                    </div>
                  );
                }
                const sp = getSpecies(cr.speciesId)!;
                const type = TYPE_INFO[sp.type];
                const isSel = selected?.id === cr.id;
                return (
                  <button key={cr.id} onClick={() => setSelectedId(cr.id)}
                    aria-pressed={isSel}
                    className="rounded-xl p-2 text-center pressable touch-target"
                    style={{
                      background: `linear-gradient(135deg, ${type.color}1a, rgba(10,15,10,0.85))`,
                      border: `1.5px solid ${isSel ? type.color : type.color + "55"}`,
                      boxShadow: isSel ? `0 4px 18px -4px ${type.color}88` : undefined,
                    }}>
                    <div className="flex justify-center"><CreatureSprite creature={cr} size={72} /></div>
                    <div className="font-display text-[12px] tracking-wide truncate mt-1" style={{ color: "#fef3c7" }}>{cr.nickname}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: type.color }}>{type.emoji} {sp.stageNames[cr.stage]} · L{cr.level}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Selected creature detail */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.section key={selected.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${TYPE_INFO[getSpecies(selected.speciesId)!.type].color}22, rgba(10,15,10,0.92))`,
                border: `1.5px solid ${TYPE_INFO[getSpecies(selected.speciesId)!.type].color}66`,
              }}>
              <div className="flex gap-3 items-start">
                <CreatureSprite creature={selected} size={84} />
                <div className="flex-1 min-w-0">
                  <input
                    value={selected.nickname}
                    onChange={e => c.renameCreature(selected.id, e.target.value)}
                    aria-label="Creature nickname"
                    className="font-display text-lg tracking-wide bg-transparent outline-none w-full"
                    style={{ color: "#fef3c7" }} />
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
                    {TYPE_INFO[getSpecies(selected.speciesId)!.type].emoji} {getSpecies(selected.speciesId)!.stageNames[selected.stage]}
                    {" · "}{CLASS_INFO[getSpecies(selected.speciesId)!.class].emoji} {CLASS_INFO[getSpecies(selected.speciesId)!.class].label}
                    {" · "}{selected.personality}{selected.variant ? " · ✨ variant" : ""}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.55)" }}>
                    L{selected.level} · Bond {selected.bond}/100 · Care streak {selected.careStreak}
                  </div>
                  {/* XP progress bar */}
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-[9px] tracking-widest" style={{ color: TYPE_INFO[getSpecies(selected.speciesId)!.type].color }}>
                      <span>XP</span>
                      <span>{selected.xp} / {xpForLevel(selected.level + 1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full mt-0.5 overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(100, (selected.xp / Math.max(1, xpForLevel(selected.level + 1))) * 100))}%`,
                          background: TYPE_INFO[getSpecies(selected.speciesId)!.type].color,
                        }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Needs bars */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {ACTIONS.map(a => (
                  <NeedBar key={a.id} label={a.label} value={selected.needs[a.statKey] as number} tint={a.tint} />
                ))}
              </div>

              {/* Care action buttons */}
              <div className="grid grid-cols-5 gap-1.5 mt-3">
                {ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} onClick={() => c.careFor(selected.id, a.id)}
                      aria-label={`${a.label} ${selected.nickname}`}
                      className="rounded-xl py-2.5 pressable touch-target flex flex-col items-center gap-0.5"
                      style={{ background: `${a.tint}1f`, border: `1px solid ${a.tint}66`, color: a.tint, minHeight: 56 }}>
                      <Icon size={16} aria-hidden="true" />
                      <span className="text-[9px] font-display tracking-widest uppercase">{a.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Olympus hero link */}
              <HeroLink creatureId={selected.id} linkedHeroId={selected.linkedHeroId} onLink={c.linkHero} />

              {/* Equipped moves */}
              <div className="mt-3">
                <div className="text-[9px] tracking-[0.3em] uppercase mb-1.5" style={{ color: "#86efac" }}>MOVES</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {selected.activeMoveIds.map(mid => {
                    const m = getMove(mid);
                    if (!m) return null;
                    const t = TYPE_INFO[m.type];
                    return (
                      <div key={mid} className="rounded-lg px-2 py-1.5"
                        style={{ background: `${t.color}14`, border: `1px solid ${t.color}44` }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-display" style={{ color: "#fef3c7" }}>{m.name}</span>
                          <span className="text-[10px]" style={{ color: t.color }}>{t.emoji}{m.power}</span>
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ color: "rgba(229,231,235,0.55)" }}>{m.flavor}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Action nav — Battle / Train / Breed / Shop / Habitats */}
        <section className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <NavTile
            color="#fca5a5" icon={Swords} label="WILD HUNT"
            subtitle="Pick a fight"
            onClick={() => navigate("/creature/wild")}
          />
          <NavTile
            color="#7dd3fc" icon={Zap} label="TRAINING"
            subtitle="Tap to XP"
            onClick={() => navigate("/creature/training")}
          />
          <NavTile
            color="#f9a8d4" icon={Egg} label="BREEDING"
            subtitle="Hatch a baby"
            onClick={() => navigate("/creature/breed")}
          />
          <NavTile
            color="#fde047" icon={ShoppingBag} label="BERRY STORE"
            subtitle={`${c.save.berries} 🍒`}
            onClick={() => navigate("/creature/shop")}
          />
          <NavTile
            color={habitat.accent} icon={Trees} label="HABITATS"
            subtitle={habitat.name}
            onClick={() => navigate("/creature/habitats")}
          />
        </section>

        {/* Catalog progress + hidden-species hint */}
        <CatalogProgress
          seen={c.save.seenSpeciesIds.length}
          hasHiddenUnlock={hasHidden(c.save.seenSpeciesIds)}
        />
      </main>
    </div>
  );
}

function hasHidden(seen: string[]): boolean {
  return hiddenSpeciesUnlocked(seen);
}

function CatalogProgress({ seen, hasHiddenUnlock }: { seen: number; hasHiddenUnlock: boolean }) {
  const totalVisible = SPECIES.filter(s => !s.hidden).length;
  // Hidden species count separately; if unlocked, the goal grows.
  const goal = hasHiddenUnlock ? SPECIES.length : totalVisible;
  return (
    <section className="rounded-2xl p-3 text-center"
      style={{ background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.22)" }}>
      <div className="text-[10px] tracking-[0.3em]" style={{ color: "#c084fc" }}>SPECIES DISCOVERED</div>
      <div className="font-display text-base mt-0.5" style={{ color: "#fef3c7" }}>
        {seen} / {goal}{!hasHiddenUnlock && " known"}
      </div>
      <div className="text-[10px] mt-0.5 opacity-65" style={{ color: "rgba(229,231,235,0.7)" }}>
        Fight new wild creatures to discover them. Win the variant (✨) for double rewards.
      </div>
      {!hasHiddenUnlock && (
        <div className="text-[10px] mt-1.5" style={{ color: "#fde047" }}>
          ✦ Rumor: battle the apex form of all three starters (Pyrekit · Tideling · Mossling) to reveal a hidden creature.
        </div>
      )}
      {hasHiddenUnlock && (
        <div className="text-[10px] mt-1.5" style={{ color: "#fde047" }}>
          ✦ A hidden creature now roams the wild — keep your eyes open during Wild Hunts.
        </div>
      )}
    </section>
  );
}

function NavTile({ color, icon: Icon, label, subtitle, onClick }: {
  color: string;
  icon: typeof Swords;
  label: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className="rounded-2xl p-3 pressable touch-target text-center"
      style={{
        background: `linear-gradient(135deg, ${color}1f, rgba(10,15,10,0.9))`,
        border: `1.5px solid ${color}66`,
        minHeight: 92,
      }}>
      <Icon size={22} style={{ color, margin: "0 auto" }} aria-hidden="true" />
      <div className="font-display text-[10px] tracking-[0.2em] mt-1.5" style={{ color }}>{label}</div>
      <div className="text-[10px] mt-0.5 opacity-75 truncate" style={{ color: "rgba(229,231,235,0.85)" }}>{subtitle}</div>
    </button>
  );
}

/** Cross-game bond: link this creature to one of the player's Olympus
 *  heroes so the two travel together across the arcade. Light flavor
 *  bonus (handled by the store's linkHero + finishBattle logic). */
function HeroLink({ creatureId, linkedHeroId, onLink }: {
  creatureId: string;
  linkedHeroId?: string;
  onLink: (creatureId: string, heroId: string | null) => void;
}) {
  const heroes = useOlympus(s => s.heroes);
  const safe = Array.isArray(heroes) ? heroes.filter(h => h && !h.archived) : [];
  const linked = linkedHeroId ? safe.find(h => h.id === linkedHeroId) : null;
  const [picking, setPicking] = useState(false);

  if (safe.length === 0) return null; // No Olympus heroes to bond yet.

  return (
    <div className="mt-3 rounded-xl p-2.5"
      style={{ background: "rgba(218,165,32,0.08)", border: "1px solid rgba(218,165,32,0.30)" }}>
      <div className="flex items-center gap-2">
        <Link2 size={12} style={{ color: "#DAA520" }} aria-hidden="true" />
        <div className="text-[9px] tracking-[0.3em]" style={{ color: "#DAA520" }}>OLYMPUS BOND</div>
      </div>
      {linked ? (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-[13px] truncate" style={{ color: "#fef3c7" }}>
              ⚔️ {linked.name}
            </div>
            <div className="text-[10px] opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
              L{linked.level} {linked.className} · linked bond
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setPicking(true)}
              className="text-[9px] tracking-widest px-2 py-1 rounded-full"
              style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.35)", color: "#DAA520" }}>
              SWAP
            </button>
            <button onClick={() => onLink(creatureId, null)}
              className="text-[9px] tracking-widest px-2 py-1 rounded-full"
              style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5" }}>
              UNLINK
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setPicking(true)}
          className="mt-1.5 w-full text-left py-1.5 text-[11px]"
          style={{ color: "rgba(229,231,235,0.85)" }}>
          Tap to bond with an Olympus hero — they'll travel together.
        </button>
      )}

      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <motion.div
              initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }}
              className="rounded-2xl p-4 max-w-md w-full max-h-[80vh] overflow-auto"
              style={{
                background: "linear-gradient(135deg, rgba(218,165,32,0.10), rgba(15,27,45,0.95))",
                border: "1.5px solid rgba(218,165,32,0.6)",
              }}>
              <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#DAA520" }}>PICK A HERO</div>
              <div className="space-y-1.5">
                {safe.map(h => (
                  <button key={h.id} onClick={() => { onLink(creatureId, h.id); setPicking(false); }}
                    className="w-full text-left rounded-lg px-3 py-2 pressable touch-target"
                    style={{ background: "rgba(218,165,32,0.10)", border: "1px solid rgba(218,165,32,0.30)" }}>
                    <div className="font-display text-[13px]" style={{ color: "#fef3c7" }}>
                      ⚔️ {h.name}
                    </div>
                    <div className="text-[10px] opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
                      L{h.level} {h.className}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(false)}
                className="mt-3 w-full px-3 py-2 rounded-full text-[10px] tracking-widest font-display"
                style={{ background: "rgba(255,255,255,0.06)", color: "#9aa6bf", border: "1px solid rgba(255,255,255,0.15)" }}>
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NeedBar({ label, value, tint }: { label: string; value: number; tint: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-[9px] uppercase tracking-widest" style={{ color: tint }}>
        <span>{label}</span>
        <span>{Math.round(pct)}</span>
      </div>
      <div className="h-1.5 rounded-full mt-0.5 overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tint }} />
      </div>
    </div>
  );
}
