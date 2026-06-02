// components/HUD.tsx — Heads-up display for the active run.
//
// Renders: hero portrait + HP/MP bars + level, ability buttons (with
// cooldown/MP cost), inventory mini-panel, minimap, combat log, gold.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Hero, DungeonRun, Item, StatusEffect } from "../types";
import { ABILITIES } from "../content/abilities";
import { CLASSES } from "../content/classes";
import { Minimap } from "./TileMap";
import { RARITY_COLOR } from "../content/items";

interface HUDProps {
  hero: Hero;
  run: DungeonRun;
  heroStatuses: StatusEffect[];
  onAbility: (idx: number) => void;
  onAiming: (idx: number | null) => void;
  aimingIdx: number | null;
  onDrinkPotion: (kind: "heal" | "mana") => void;
  onEquip: (id: string) => void;
  onDescend: () => void;
  onAbandon: () => void;
}

export function HUD(props: HUDProps) {
  const { hero, run, heroStatuses, onAbility, onAiming, aimingIdx, onDrinkPotion, onEquip, onDescend, onAbandon } = props;
  const klass = CLASSES[hero.classId];
  const hpPct = (hero.hp / hero.maxHp) * 100;
  const mpPct = (hero.mp / hero.maxMp) * 100;
  const xpPct = (hero.xp / hero.xpToNext) * 100;
  const [tab, setTab] = useState<"inv" | "log">("inv");
  const onStairs = run.map && run.map.tiles[run.py * run.map.width + run.px].kind === "stairsDown";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 mt-3">
      {/* Left column — abilities + log + bottom bar */}
      <div className="space-y-3">
        {/* Hero bars */}
        <div
          className="rounded-lg p-3 flex items-center gap-3"
          style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(192,132,252,0.2)" }}
        >
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${hero.appearance.tint}33`, border: `1px solid ${hero.appearance.tint}` }}
            aria-label={klass.name}
          >
            {klass.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display tracking-wider truncate">{hero.name}</span>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "#c084fc" }}>
                L{hero.level} {klass.name} · {hero.gold}g
              </span>
            </div>
            <Bar label="HP" pct={hpPct} val={`${hero.hp}/${hero.maxHp}`} color="#dc2626" />
            <Bar label="MP" pct={mpPct} val={`${hero.mp}/${hero.maxMp}`} color="#3b82f6" />
            <Bar label="XP" pct={xpPct} val={`${hero.xp}/${hero.xpToNext}`} color="#fbbf24" small />
          </div>
        </div>

        {/* Statuses */}
        {heroStatuses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {heroStatuses.map((st, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full"
                style={{ background: "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.4)", color: "#c4b5fd" }}
              >
                {st.kind} {st.duration}t
              </span>
            ))}
          </div>
        )}

        {/* Ability bar */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {hero.abilities.map((abId, idx) => {
            const a = ABILITIES[abId]; if (!a) return null;
            const disabled = hero.mp < a.cost;
            const aiming = aimingIdx === idx;
            return (
              <button
                key={abId}
                onClick={() => {
                  if (a.target === "self") onAbility(idx);
                  else onAiming(aiming ? null : idx);
                }}
                className="relative rounded-md p-2 text-left pressable touch-target"
                style={{
                  background: aiming ? "rgba(192,132,252,0.3)" : "rgba(15,12,28,0.7)",
                  border: `1px solid ${aiming ? "#c084fc" : "rgba(255,255,255,0.1)"}`,
                  opacity: disabled ? 0.4 : 1,
                  minHeight: 60,
                }}
                disabled={disabled}
                title={a.description}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-lg">{a.emoji}</span>
                  <span className="opacity-70">{idx + 1}</span>
                </div>
                <div className="text-[10px] font-display tracking-wider truncate">{a.name}</div>
                <div className="text-[9px] opacity-60">
                  {a.cost > 0 && `${a.cost} MP`}{a.cost > 0 && a.cooldown > 0 ? " · " : ""}
                  {a.cooldown > 0 && `CD ${a.cooldown}`}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => onDrinkPotion("heal")}
            className="rounded-md p-2 text-left pressable touch-target"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", minHeight: 60 }}
            title="Quick heal (+40 HP)"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-lg">🧪</span>
              <span className="opacity-70">H</span>
            </div>
            <div className="text-[10px] font-display tracking-wider">Heal</div>
            <div className="text-[9px] opacity-60">+40 HP</div>
          </button>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
          <button
            onClick={onDescend}
            disabled={!onStairs && run.floor < 10}
            className="px-3 py-2 rounded-md pressable"
            style={{
              background: onStairs ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${onStairs ? "#fbbf24" : "rgba(255,255,255,0.1)"}`,
              opacity: onStairs ? 1 : 0.4,
              minHeight: 36,
            }}
            title="D — Descend stairs"
          >
            ⬇ Descend
          </button>
          <button
            onClick={onAbandon}
            className="px-3 py-2 rounded-md pressable"
            style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", minHeight: 36 }}
          >
            Abandon
          </button>
          <div
            className="px-3 py-2 rounded-md font-display tracking-widest"
            style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Floor {run.floor}/10
          </div>
        </div>

        {/* Log */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(255,255,255,0.1)", maxHeight: 180 }}
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest border-b border-white/10">Combat Log</div>
          <div className="overflow-y-auto" style={{ maxHeight: 150 }}>
            <AnimatePresence initial={false}>
              {run.log.slice(0, 20).map(l => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1 text-[11px] border-b border-white/5"
                  style={{ color: l.color }}
                >
                  {l.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right column — minimap + inventory */}
      <div className="space-y-3">
        {/* Minimap */}
        <div className="rounded-lg overflow-hidden p-2"
          style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="text-[10px] uppercase tracking-widest mb-1 opacity-80">Map · F{run.floor}</div>
          {run.map && <Minimap map={run.map} px={run.px} py={run.py} enemies={run.enemies} />}
        </div>

        {/* Tabs */}
        <div className="rounded-lg" style={{ background: "rgba(15,12,28,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex">
            <TabBtn active={tab === "inv"} onClick={() => setTab("inv")}>Inventory ({hero.inventory.length})</TabBtn>
            <TabBtn active={tab === "log"} onClick={() => setTab("log")}>Gear</TabBtn>
          </div>
          <div className="p-2 overflow-y-auto" style={{ maxHeight: 280 }}>
            {tab === "inv" ? (
              hero.inventory.length === 0 ? (
                <div className="text-[10px] opacity-60 text-center py-4">Empty.</div>
              ) : (
                <div className="space-y-1">
                  {hero.inventory.map(it => (
                    <InvRow key={it.id} item={it} hero={hero} onEquip={() => onEquip(it.id)} />
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <SlotRow label="Weapon" item={hero.equipment.weapon} />
                <SlotRow label="Armor" item={hero.equipment.armor} />
                <SlotRow label="Trinket" item={hero.equipment.trinket} />
              </div>
            )}
          </div>
        </div>

        <KeyHints />
      </div>
    </div>
  );
}

function Bar({ label, pct, val, color, small }: { label: string; pct: number; val: string; color: string; small?: boolean }) {
  return (
    <div className={small ? "mt-0.5" : "mt-1"}>
      <div className="flex justify-between text-[9px] uppercase tracking-widest opacity-70">
        <span>{label}</span><span>{val}</span>
      </div>
      <div className={`rounded-full overflow-hidden ${small ? "h-1" : "h-1.5"}`} style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-[10px] uppercase tracking-widest"
      style={{
        background: active ? "rgba(192,132,252,0.18)" : "transparent",
        color: active ? "#e9d5ff" : "#94a3b8",
        borderBottom: active ? "1px solid #c084fc" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function InvRow({ item, hero, onEquip }: { item: Item; hero: Hero; onEquip: () => void }) {
  const locked = item.classLock && item.classLock !== hero.classId;
  return (
    <button
      onClick={onEquip}
      disabled={!!locked}
      className="w-full text-left rounded p-1.5 pressable"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${RARITY_COLOR[item.rarity]}55`,
        opacity: locked ? 0.5 : 1,
      }}
      title={locked ? `Locked to ${item.classLock}` : "Equip"}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] truncate" style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</span>
        <span className="text-[9px] opacity-60">ilvl {item.ilvl}</span>
      </div>
      <div className="text-[9px] opacity-70 truncate">
        {item.damage ? `Dmg ${item.damage[0]}–${item.damage[1]}` : item.armor ? `Armor ${item.armor}` : "Trinket"}
        {item.affixes.map(a => ` · ${a.label}`).join("")}
      </div>
    </button>
  );
}

function SlotRow({ label, item }: { label: string; item?: Item }) {
  return (
    <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[9px] uppercase tracking-widest opacity-60">{label}</div>
      {item ? (
        <>
          <div className="text-[11px]" style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</div>
          <div className="text-[9px] opacity-70">
            {item.damage ? `Dmg ${item.damage[0]}–${item.damage[1]}` : item.armor ? `Armor ${item.armor}` : ""}
            {item.affixes.map(a => ` · ${a.label}`).join("")}
          </div>
        </>
      ) : (
        <div className="text-[10px] opacity-50">— empty —</div>
      )}
    </div>
  );
}

function KeyHints() {
  return (
    <div className="text-[9px] opacity-60 leading-relaxed px-1">
      <div className="uppercase tracking-widest mb-1">Controls</div>
      <div>WASD / Arrows — Move</div>
      <div>1–5 — Use ability</div>
      <div>H — Heal potion</div>
      <div>D — Descend on stairs</div>
      <div>Esc — Cancel aim</div>
    </div>
  );
}
