// Scrapyard Kings — Shop (v1.10.79).
//
// Four tabs:
//   PARTS   — every part visible w/ stats + buy/owned/locked badges
//   WEAPONS — every weapon w/ sprite + stats; buy or already-owned
//   REPAIR  — pay to restore the active bot's HP after damage
//   SALVAGE — convert owned parts to scrap; sell scrap for cash
//
// Cash/scrap pulled from useMech save; purchases route through the
// existing store actions (buyPart, new buyWeapon, repairActiveBot,
// salvagePart, sellScrap). Doesn't touch the Builder or engine.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Coins, Recycle, Wrench, Lock, Check, ShoppingBag,
  Heart, Shield, Zap, Crosshair,
} from "lucide-react";
import { useMech, ownsWeapon, activeBotHpFrac } from "../store";
import {
  PARTS, WEAPONS, priceFor, priceForWeapon, scrapValue, repairCost,
  isPartLeagueLocked, isWeaponLocked, STARTER_WEAPON_IDS,
} from "../parts";
import { LEAGUE_INFO, RARITY_COLOR } from "../types";
import type { BotPart, Weapon, SlotId } from "../types";
import { WeaponIcon } from "../WeaponIcon";

type Tab = "parts" | "weapons" | "repair" | "salvage";

const SLOT_LABELS: Record<SlotId, string> = {
  head: "Head", leftArm: "Left Arm", rightArm: "Right Arm", chest: "Chest", legs: "Legs",
};

export default function MechShop() {
  const navigate = useNavigate();
  const mech = useMech();
  const { save, activeBot } = mech;
  const [tab, setTab] = useState<Tab>("parts");
  const [slotFilter, setSlotFilter] = useState<SlotId | "all">("all");
  const [flash, setFlash] = useState<string | null>(null);

  function ping(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 18% 0%, rgba(252,165,165,0.16), transparent 60%), " +
          "radial-gradient(900px 600px at 82% 100%, rgba(251,191,36,0.14), transparent 60%), " +
          "linear-gradient(180deg, #1a0808 0%, #0a0a08 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/mech")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>SCRAPYARD KINGS</div>
          <h1 className="font-display text-xl tracking-wider flex items-center gap-2" style={{ color: "#fde047" }}>
            <ShoppingBag size={18} aria-hidden="true" /> SHOP
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] flex items-center justify-end gap-1" style={{ color: "#fbbf24" }}>
            <Coins size={11} /> ${save.money}
          </div>
          <div className="text-[10px] flex items-center justify-end gap-1" style={{ color: "#86efac" }}>
            <Recycle size={11} /> {save.scrap}
          </div>
        </div>
      </header>

      {/* Flash */}
      {flash && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-md text-xs"
          style={{ background: "rgba(251,191,36,0.95)", color: "#1a0505" }}>
          {flash}
        </div>
      )}

      {/* Tab bar */}
      <div className="px-4 flex gap-1 max-w-3xl mx-auto w-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {(["parts", "weapons", "repair", "salvage"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-2 rounded-t-md text-[11px] uppercase tracking-wider whitespace-nowrap pressable touch-target"
            style={{
              background: tab === t ? "rgba(251,146,60,0.30)" : "rgba(255,255,255,0.04)",
              border: tab === t ? "1px solid #fb923c" : "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              color: tab === t ? "#fef3c7" : "rgba(229,231,235,0.65)",
              minHeight: 38,
            }}>
            {t === "repair" ? "Repair Bay" : t === "salvage" ? "Salvage" : t}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        <div className="rounded-b-md rounded-tr-md p-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {tab === "parts"   && <PartsTab   save={save} slotFilter={slotFilter} setSlotFilter={setSlotFilter} onBuy={id => { mech.buyPart(id); ping("Part purchased"); }} />}
          {tab === "weapons" && <WeaponsTab save={save} onBuy={id => { mech.buyWeapon(id); ping("Weapon purchased"); }} />}
          {tab === "repair"  && <RepairTab  save={save} activeBot={activeBot} onRepair={() => { mech.repairActiveBot(); ping("Bot repaired"); }} />}
          {tab === "salvage" && <SalvageTab save={save} onSalvage={id => { mech.salvagePart(id); ping("Salvaged"); }} onSellScrap={n => { mech.sellScrap(n); ping("Scrap sold"); }} />}
        </div>
      </main>
    </div>
  );
}

// ── PARTS tab ────────────────────────────────────────────────────────

function PartsTab({ save, slotFilter, setSlotFilter, onBuy }: {
  save: import("../types").MechSave;
  slotFilter: SlotId | "all";
  setSlotFilter: (s: SlotId | "all") => void;
  onBuy: (id: string) => void;
}) {
  const visible = PARTS.filter(p => slotFilter === "all" || p.slot === slotFilter);
  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap text-[10px]">
        <FilterChip active={slotFilter === "all"} onClick={() => setSlotFilter("all")}>ALL</FilterChip>
        {(["head","chest","leftArm","rightArm","legs"] as SlotId[]).map(s => (
          <FilterChip key={s} active={slotFilter === s} onClick={() => setSlotFilter(s)}>
            {SLOT_LABELS[s]}
          </FilterChip>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map(p => (
          <PartCard key={p.id} part={p} save={save} onBuy={() => onBuy(p.id)} />
        ))}
      </div>
    </div>
  );
}

function PartCard({ part, save, onBuy }: { part: BotPart; save: import("../types").MechSave; onBuy: () => void }) {
  const owned = save.ownedPartIds.includes(part.id);
  const leagueLocked = isPartLeagueLocked(part, save.league);
  const price = priceFor(part);
  const canAfford = save.money >= price;
  const rarityColor = RARITY_COLOR[part.rarity];

  return (
    <div className="rounded-md p-3 flex flex-col gap-2"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: `1px solid ${owned ? "#86efac55" : rarityColor + "55"}`,
        opacity: leagueLocked ? 0.65 : 1,
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-sm tracking-wide" style={{ color: "#fef3c7" }}>{part.name}</div>
          <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: rarityColor }}>
            {part.rarity} · {part.tier}
          </div>
        </div>
        <div className="text-right">
          {owned ? (
            <div className="text-[10px] flex items-center gap-1" style={{ color: "#86efac" }}>
              <Check size={11} /> OWNED
            </div>
          ) : leagueLocked ? (
            <div className="text-[10px] flex items-center gap-1" style={{ color: "#fca5a5" }}>
              <Lock size={11} /> {LEAGUE_INFO[save.league].label}
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: canAfford ? "#fbbf24" : "#9ca3af" }}>${price}</div>
          )}
        </div>
      </div>
      <div className="text-[10px] leading-snug" style={{ color: "rgba(229,231,235,0.75)" }}>{part.flavor}</div>
      <div className="grid grid-cols-4 gap-1 text-[9px]">
        {part.stats.hp     > 0 && <StatChip icon={<Heart size={9} />}      v={part.stats.hp}     c="#86efac" />}
        {part.stats.armor  > 0 && <StatChip icon={<Shield size={9} />}     v={part.stats.armor}  c="#7dd3fc" />}
        {part.stats.power  > 0 && <StatChip icon={<Crosshair size={9} />}  v={part.stats.power}  c="#fbbf24" />}
        {part.stats.energy > 0 && <StatChip icon={<Zap size={9} />}        v={part.stats.energy} c="#a78bfa" />}
      </div>
      {!owned && !leagueLocked && (
        <button onClick={onBuy} disabled={!canAfford}
          className="mt-1 px-3 py-1.5 rounded-md text-[11px] tracking-wider pressable touch-target"
          style={{
            background: canAfford ? "#fb923c" : "rgba(255,255,255,0.05)",
            color: canAfford ? "#1a0505" : "#9ca3af",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}>
          {canAfford ? "BUY" : `NEED $${price - save.money}`}
        </button>
      )}
    </div>
  );
}

// ── WEAPONS tab ──────────────────────────────────────────────────────

function WeaponsTab({ save, onBuy }: {
  save: import("../types").MechSave;
  onBuy: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] mb-2" style={{ color: "rgba(229,231,235,0.75)" }}>
        Higher rarities unlock as you climb leagues. Mount size must match the arm — Builder enforces fit.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {WEAPONS.map(w => (
          <WeaponCard key={w.id} weapon={w} save={save} onBuy={() => onBuy(w.id)} />
        ))}
      </div>
    </div>
  );
}

function WeaponCard({ weapon, save, onBuy }: { weapon: Weapon; save: import("../types").MechSave; onBuy: () => void }) {
  const owned = ownsWeapon(save, weapon.id);
  const leagueLocked = isWeaponLocked(weapon.id, save.league);
  const price = priceForWeapon(weapon);
  const canAfford = save.money >= price;
  const rarityColor = RARITY_COLOR[weapon.tier];

  return (
    <div className="rounded-md p-3 flex flex-col gap-2"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: `1px solid ${owned ? "#86efac55" : rarityColor + "55"}`,
        opacity: leagueLocked ? 0.65 : 1,
      }}>
      <div className="flex items-start gap-2">
        <div className="rounded-md p-1 flex items-center justify-center"
          style={{ background: weapon.color + "22", border: `1px solid ${weapon.color}88` }}>
          <WeaponIcon weapon={weapon} size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-wide" style={{ color: "#fef3c7" }}>{weapon.name}</div>
          <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: rarityColor }}>
            {weapon.tier} · {weapon.kind} · {weapon.mount}-mount
          </div>
        </div>
        <div className="text-right">
          {owned ? (
            <div className="text-[10px] flex items-center gap-1" style={{ color: "#86efac" }}>
              <Check size={11} /> OWNED
            </div>
          ) : leagueLocked ? (
            <div className="text-[10px] flex items-center gap-1" style={{ color: "#fca5a5" }}>
              <Lock size={11} /> {LEAGUE_INFO[save.league].label}
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: canAfford ? "#fbbf24" : "#9ca3af" }}>${price}</div>
          )}
        </div>
      </div>
      <div className="text-[10px] leading-snug" style={{ color: "rgba(229,231,235,0.75)" }}>{weapon.flavor}</div>
      <div className="grid grid-cols-4 gap-1 text-[9px]">
        <StatChip label="DMG" v={weapon.damage} c="#fb923c" />
        <StatChip label="RATE" v={weapon.fireRate} c="#fbbf24" />
        <StatChip label="RNG" v={weapon.range} c="#7dd3fc" />
        <StatChip label="NRG" v={weapon.energyCost} c="#a78bfa" />
      </div>
      {!owned && !leagueLocked && (
        <button onClick={onBuy} disabled={!canAfford}
          className="mt-1 px-3 py-1.5 rounded-md text-[11px] tracking-wider pressable touch-target"
          style={{
            background: canAfford ? "#fb923c" : "rgba(255,255,255,0.05)",
            color: canAfford ? "#1a0505" : "#9ca3af",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}>
          {canAfford ? "BUY" : `NEED $${price - save.money}`}
        </button>
      )}
    </div>
  );
}

// ── REPAIR tab ───────────────────────────────────────────────────────

function RepairTab({ save, activeBot, onRepair }: {
  save: import("../types").MechSave;
  activeBot: import("../types").Bot | null;
  onRepair: () => void;
}) {
  if (!activeBot) return <div className="text-sm opacity-75">No active bot.</div>;
  const frac = activeBotHpFrac(save);
  const pct = Math.round(frac * 100);
  const cost = repairCost(frac, save.league);
  const canAfford = save.money >= cost;
  const needsRepair = frac < 0.99;
  return (
    <div className="space-y-3">
      <div className="rounded-md p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid #fb923c55" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "#fca5a5" }}>Active Bot</div>
        <div className="font-display text-base" style={{ color: "#fef3c7" }}>{activeBot.name}</div>
        <div className="text-[11px] mt-2">
          HP integrity: <span style={{ color: pct >= 70 ? "#86efac" : pct >= 40 ? "#fbbf24" : "#fca5a5" }}>{pct}%</span>
        </div>
        {/* HP bar */}
        <div className="mt-1.5 h-2 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: pct >= 70 ? "#86efac" : pct >= 40 ? "#fbbf24" : "#fca5a5",
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>
      {!needsRepair ? (
        <div className="rounded-md p-3 text-center text-[12px]"
          style={{ background: "rgba(134,239,172,0.10)", border: "1px solid #86efac55" }}>
          ✓ Bot at full integrity — no repair needed.
        </div>
      ) : (
        <div className="rounded-md p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="text-[11px] mb-2">Pay <span style={{ color: "#fbbf24" }}>${cost}</span> to restore to 100%.</div>
          <button onClick={onRepair} disabled={!canAfford}
            className="w-full px-3 py-2.5 rounded-md text-[12px] tracking-widest pressable touch-target flex items-center justify-center gap-2"
            style={{
              background: canAfford ? "linear-gradient(135deg, #fb923c, #f97316)" : "rgba(255,255,255,0.05)",
              color: canAfford ? "#1a0505" : "#9ca3af",
              cursor: canAfford ? "pointer" : "not-allowed",
              minHeight: 44,
            }}>
            <Wrench size={14} /> {canAfford ? "REPAIR BOT" : `NEED $${cost - save.money}`}
          </button>
        </div>
      )}
      <div className="text-[10px] leading-relaxed opacity-70">
        Bots carry residual damage between fights. Walk into a Champion-tier
        brawl at 30% HP and you'll be scrap before the second volley.
      </div>
    </div>
  );
}

// ── SALVAGE tab ──────────────────────────────────────────────────────

function SalvageTab({ save, onSalvage, onSellScrap }: {
  save: import("../types").MechSave;
  onSalvage: (id: string) => void;
  onSellScrap: (n: number) => void;
}) {
  // Show only parts the player owns that aren't currently equipped on
  // any bot AND aren't starter parts (preserve the floor).
  const STARTER_PART_IDS = ["h_recon", "c_scrap", "la_basic", "ra_basic", "l_sprinter"];
  const equipped = new Set<string>();
  for (const b of save.bots) {
    for (const slot of Object.keys(b.parts) as SlotId[]) {
      const p = b.parts[slot];
      if (p) equipped.add(p.id);
    }
  }
  const sellable = PARTS.filter(p =>
    save.ownedPartIds.includes(p.id)
    && !equipped.has(p.id)
    && !STARTER_PART_IDS.includes(p.id)
  );

  return (
    <div className="space-y-3">
      {/* Scrap conversion */}
      <div className="rounded-md p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid #86efac55" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "#86efac" }}>Sell Scrap</div>
        <div className="text-[11px] mb-2">
          You have <span style={{ color: "#86efac" }}>{save.scrap}</span> scrap.
          Sells for <span style={{ color: "#fbbf24" }}>$2</span> each.
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSellScrap(10)} disabled={save.scrap < 10}
            className="flex-1 px-3 py-2 rounded-md text-[11px] pressable touch-target"
            style={{ background: save.scrap >= 10 ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.04)", border: "1px solid #86efac66", color: "#86efac", minHeight: 38, opacity: save.scrap >= 10 ? 1 : 0.4 }}>
            Sell 10 → $20
          </button>
          <button onClick={() => onSellScrap(save.scrap)} disabled={save.scrap < 1}
            className="flex-1 px-3 py-2 rounded-md text-[11px] pressable touch-target"
            style={{ background: save.scrap >= 1 ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.04)", border: "1px solid #86efac66", color: "#86efac", minHeight: 38, opacity: save.scrap >= 1 ? 1 : 0.4 }}>
            Sell all → ${save.scrap * 2}
          </button>
        </div>
      </div>

      {/* Part salvage list */}
      <div className="rounded-md p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "#86efac" }}>Salvage Owned Parts</div>
        {sellable.length === 0 ? (
          <div className="text-[10px] opacity-65 leading-snug">
            No spare parts to salvage. Buy duplicates, swap them off your bot, then come back. Starter parts can't be salvaged.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {sellable.map(p => {
              const v = scrapValue(p);
              return (
                <li key={p.id} className="flex items-center gap-2 text-[11px]">
                  <div className="flex-1 min-w-0">
                    <span style={{ color: RARITY_COLOR[p.rarity] }}>{p.name}</span>
                    <span className="opacity-60 ml-1 text-[10px]">{SLOT_LABELS[p.slot]}</span>
                  </div>
                  <button onClick={() => onSalvage(p.id)}
                    className="px-2 py-1 rounded-md text-[10px] tracking-wider pressable touch-target"
                    style={{ background: "rgba(134,239,172,0.20)", border: "1px solid #86efac66", color: "#86efac" }}>
                    +{v} SCRAP
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Tiny components ──────────────────────────────────────────────────

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-full"
      style={{
        background: active ? "rgba(251,146,60,0.30)" : "rgba(255,255,255,0.05)",
        border: active ? "1px solid #fb923c" : "1px solid rgba(255,255,255,0.1)",
        color: active ? "#fef3c7" : "rgba(229,231,235,0.65)",
      }}>
      {children}
    </button>
  );
}

function StatChip({ icon, label, v, c }: { icon?: React.ReactNode; label?: string; v: number; c: string }) {
  return (
    <div className="rounded px-1.5 py-0.5 flex items-center gap-1 justify-center"
      style={{ background: c + "1a", color: c }}>
      {icon}{label && <span className="opacity-80 text-[8px]">{label}</span>}
      <span style={{ color: "#fef3c7" }}>{v}</span>
    </div>
  );
}
