// pages/Shop.tsx — Merchant interface (rendered inside Run when phase=shopping).

import { useMemo } from "react";
import { useDungeon } from "../state/store";
import { rollShop } from "../engine/loot";
import { RNG } from "../rng";
import { RARITY_COLOR } from "../content/items";
import type { Item } from "../types";

export default function DungeonShop() {
  const run = useDungeon(s => s.run);
  const heroes = useDungeon(s => s.heroes);
  const activeHeroId = useDungeon(s => s.activeHeroId);
  const buyItem = useDungeon(s => s.buyItem);
  const sellItem = useDungeon(s => s.sellItem);
  const purchasePotion = useDungeon(s => s.purchasePotion);
  const leaveShop = useDungeon(s => s.leaveShop);
  const hero = heroes.find(h => h.id === activeHeroId);

  const stock = useMemo<Item[]>(() => {
    if (!run || !hero) return [];
    const rng = new RNG(run.seed ^ (run.floor * 0xa731c8ff));
    return rollShop(rng, run.floor, hero.classId);
  }, [run?.floor, hero?.classId, run?.seed]);

  if (!run || !hero) return null;

  return (
    <div className="rounded-lg p-4 sm:p-6 mt-2"
      style={{ background: "radial-gradient(800px 400px at 50% 0%, rgba(251,191,36,0.12), transparent 70%), rgba(15,12,28,0.85)", border: "1px solid rgba(251,191,36,0.3)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "#fbbf24" }}>Merchant · Floor {run.floor}</div>
          <h2 className="font-display text-2xl tracking-widest mt-1">An Old Friend</h2>
          <p className="text-[11px] opacity-70 mt-1 max-w-md">"You look tired. Spend a coin or three." His smile is too wide.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest opacity-70">Gold</div>
          <div className="font-display text-xl tracking-wider" style={{ color: "#fde047" }}>{hero.gold}g</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="STOCK">
          <div className="space-y-1.5">
            {stock.map((it, i) => (
              <ShopRow
                key={i}
                item={it}
                buy
                canAfford={hero.gold >= it.price}
                locked={!!(it.classLock && it.classLock !== hero.classId)}
                onAction={() => buyItem(it)}
              />
            ))}
            <PotionRow
              label="Healing Potion (+40 HP)"
              cost={20}
              canAfford={hero.gold >= 20}
              onBuy={() => purchasePotion("heal", 20)}
            />
            <PotionRow
              label="Mana Vial (+30 MP)"
              cost={20}
              canAfford={hero.gold >= 20}
              onBuy={() => purchasePotion("mana", 20)}
            />
          </div>
        </Section>

        <Section title="YOUR PACK">
          {hero.inventory.length === 0 ? (
            <div className="text-[10px] opacity-60 text-center py-4">No items to sell.</div>
          ) : (
            <div className="space-y-1.5">
              {hero.inventory.map(it => (
                <ShopRow
                  key={it.id}
                  item={it}
                  onAction={() => sellItem(it.id)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="text-right mt-4">
        <button
          onClick={leaveShop}
          className="px-5 py-2 rounded-md font-display tracking-widest text-[11px]"
          style={{ background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.45)", color: "#c4b5fd" }}
        >
          LEAVE SHOP
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[10px] uppercase tracking-[0.3em] opacity-70 mb-2">{title}</div>
      {children}
    </div>
  );
}

function ShopRow({ item, buy, canAfford, locked, onAction }: { item: Item; buy?: boolean; canAfford?: boolean; locked?: boolean; onAction: () => void }) {
  const sellPrice = Math.max(1, Math.floor(item.price / 3));
  const disabled = (buy && !canAfford) || locked;
  return (
    <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${RARITY_COLOR[item.rarity]}44` }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[11px] truncate" style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</div>
          <div className="text-[9px] opacity-70 truncate">
            {item.damage ? `Dmg ${item.damage[0]}–${item.damage[1]}` : item.armor ? `Armor ${item.armor}` : ""}
            {item.affixes.map(a => ` · ${a.label}`).join("")}
            {locked && " · LOCKED"}
          </div>
        </div>
        <button
          onClick={onAction}
          disabled={disabled}
          className="px-2 py-1 rounded text-[10px] font-display tracking-widest shrink-0 ml-2"
          style={{
            background: buy ? "rgba(251,191,36,0.18)" : "rgba(192,132,252,0.15)",
            border: `1px solid ${buy ? "rgba(251,191,36,0.5)" : "rgba(192,132,252,0.4)"}`,
            color: buy ? "#fde047" : "#c4b5fd",
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {buy ? `BUY ${item.price}g` : `SELL ${sellPrice}g`}
        </button>
      </div>
    </div>
  );
}

function PotionRow({ label, cost, canAfford, onBuy }: { label: string; cost: number; canAfford: boolean; onBuy: () => void }) {
  return (
    <div className="rounded p-2 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}>
      <div className="text-[11px]">{label}</div>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        className="px-2 py-1 rounded text-[10px] font-display tracking-widest shrink-0 ml-2"
        style={{
          background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.4)",
          color: "#86efac", opacity: canAfford ? 1 : 0.4,
        }}
      >
        BUY {cost}g
      </button>
    </div>
  );
}

