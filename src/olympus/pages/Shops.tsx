// Olympus Shops hub — three storefronts visitable from the home base
// between adventures. Each shop greets the hero, shows rotating stock,
// purchases apply immediately to the hero (drachma deducted, equipment
// swapped, cosmetics applied, stat boosts banked).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useOlympus } from "../store";
import { HeroSprite } from "../components/HeroSprite";
import { getShopStock, purchaseItem, SHOP_INFO, type ShopKind, type ShopItem } from "../shops";
import { ArrowLeft, Coins, Check, X } from "lucide-react";

export default function OlympusShops() {
  const navigate = useNavigate();
  const activeHero = useOlympus(s => s.heroes.find(h => h.id === s.activeHeroId));
  const patchHero = useOlympus(s => s.patchHero);
  const [openShop, setOpenShop] = useState<ShopKind | null>(null);
  const [confirming, setConfirming] = useState<ShopItem | null>(null);
  const [recentPurchase, setRecentPurchase] = useState<string | null>(null);

  if (!activeHero) {
    return (
      <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>
        Pick a hero first.{" "}
        <button onClick={() => navigate("/olympus")} className="underline" style={{ color: "#DAA520" }}>Back to roster</button>
      </div>
    );
  }

  if (activeHero.archived) {
    return (
      <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>
        Archived heroes can't shop. Unarchive {activeHero.name} first.
      </div>
    );
  }

  const stock = openShop ? getShopStock(activeHero, openShop) : [];

  const buy = async (item: ShopItem) => {
    if (activeHero.drachma < item.cost) return;
    let result: { ok: boolean; reason?: string } = { ok: false };
    await patchHero(activeHero.id, h => {
      result = purchaseItem(h, item);
    });
    if (result.ok) {
      setRecentPurchase(item.name);
      setTimeout(() => setRecentPurchase(null), 2500);
    }
    setConfirming(null);
  };

  // Shop interior view
  if (openShop) {
    const info = SHOP_INFO[openShop];
    return (
      <div className="max-w-3xl mx-auto pb-12 space-y-4">
        <header className="flex items-center gap-3">
          <button onClick={() => setOpenShop(null)} className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>{info.tagline}</div>
            <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>
              {info.emoji} {info.name.toUpperCase()}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.6)" }}>Purse</div>
            <div className="font-display text-xl flex items-center gap-1" style={{ color: "#DAA520" }}>
              <Coins size={16} /> {activeHero.drachma}
            </div>
          </div>
        </header>

        <p className="text-sm italic px-3 py-2 rounded-xl" style={{ color: "rgba(233,227,210,0.85)", background: "rgba(15,27,45,0.5)", borderLeft: "2px solid #DAA520" }}>
          "{info.greeting}"
        </p>

        {recentPurchase && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl px-3 py-2 text-sm flex items-center gap-2" style={{ background: "rgba(63,204,106,0.15)", border: "1px solid rgba(63,204,106,0.3)", color: "#3fcc6a" }}>
            <Check size={14} /> Acquired: {recentPurchase}
          </motion.div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {stock.map(item => {
            const tooExpensive = activeHero.drachma < item.cost;
            return (
              <button
                key={item.id}
                onClick={() => setConfirming(item)}
                disabled={tooExpensive}
                className="text-left p-3 rounded-2xl pressable touch-target disabled:opacity-50"
                style={{
                  background: "rgba(15,27,45,0.5)",
                  border: "1px solid rgba(218,165,32,0.2)",
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-display text-sm tracking-wide" style={{ fontFamily: "'Cinzel', serif", color: "#e9e3d2" }}>{item.name}</div>
                  <div className="flex items-center gap-1 text-sm font-display" style={{ color: tooExpensive ? "rgba(199,80,80,0.85)" : "#DAA520" }}>
                    <Coins size={12} /> {item.cost}
                  </div>
                </div>
                <div className="text-[11px]" style={{ color: "rgba(233,227,210,0.65)" }}>{item.effect}</div>
                <div className="text-[9px] uppercase tracking-widest mt-1.5" style={{ color: "rgba(218,165,32,0.55)" }}>
                  {item.kind}{item.tier ? ` · tier ${item.tier}` : ""}
                </div>
              </button>
            );
          })}
        </div>

        {confirming && (
          <ConfirmPurchaseModal item={confirming} hero={activeHero} onCancel={() => setConfirming(null)} onConfirm={() => buy(confirming)} />
        )}
      </div>
    );
  }

  // Shop selector hub
  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/olympus" className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Home Base · Athens</div>
          <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>SHOPS</h1>
        </div>
      </header>

      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.25)" }}>
        <HeroSprite hero={activeHero} size={56} />
        <div className="flex-1 min-w-0">
          <div className="font-display tracking-wide truncate" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{activeHero.name}</div>
          <div className="text-[11px]" style={{ color: "rgba(233,227,210,0.65)" }}>
            Level {activeHero.level} · HP {activeHero.hp}/{activeHero.hpMax}
          </div>
        </div>
        <div className="flex items-center gap-1 font-display text-xl" style={{ color: "#DAA520" }}>
          <Coins size={18} /> {activeHero.drachma}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {(["smithy", "apothecary", "bazaar"] as ShopKind[]).map(k => {
          const info = SHOP_INFO[k];
          return (
            <motion.button
              key={k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => setOpenShop(k)}
              className="text-left p-4 rounded-2xl pressable touch-target"
              style={{
                background: "linear-gradient(135deg, rgba(15,27,45,0.6), rgba(5,10,18,0.6))",
                border: "1px solid rgba(218,165,32,0.3)",
                minHeight: 160,
              }}
            >
              <div className="text-5xl mb-2">{info.emoji}</div>
              <div className="font-display tracking-wide" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{info.name}</div>
              <div className="text-[11px] mt-1" style={{ color: "rgba(233,227,210,0.65)" }}>{info.tagline}</div>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center text-[10px] mt-2" style={{ color: "rgba(233,227,210,0.5)" }}>
        Smithy and Apothecary stock rotates between adventures.
      </div>
    </div>
  );
}

function ConfirmPurchaseModal({ item, hero, onCancel, onConfirm }: { item: ShopItem; hero: any; onCancel: () => void; onConfirm: () => void }) {
  // Show what the purchase replaces, if anything.
  let replacing: string | null = null;
  if (item.kind === "weapon" && hero.equipment.weapon) {
    replacing = `Currently wielding: ${hero.equipment.weapon.name}`;
  } else if (item.kind === "armor" && hero.equipment.armor) {
    replacing = `Currently wearing: ${hero.equipment.armor.name}`;
  } else if (item.kind === "accessory" && hero.equipment.accessory) {
    replacing = `Currently equipped: ${hero.equipment.accessory.name}`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5"
        style={{ background: "linear-gradient(180deg, #0F1B2D 0%, #07101E 100%)", border: "1px solid rgba(218,165,32,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg tracking-wide" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>Confirm Purchase</div>
          <button onClick={onCancel} className="p-2 rounded-lg bg-white/5"><X size={16} /></button>
        </div>
        <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.2)" }}>
          <div className="font-display tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>{item.name}</div>
          <div className="text-[11px] mt-1" style={{ color: "rgba(233,227,210,0.65)" }}>{item.effect}</div>
        </div>
        {replacing && <div className="text-[11px] italic mb-3" style={{ color: "rgba(218,165,32,0.65)" }}>{replacing} — will be replaced.</div>}
        <div className="flex items-center justify-between text-sm mb-4">
          <span style={{ color: "rgba(233,227,210,0.65)" }}>Cost</span>
          <span className="font-display flex items-center gap-1" style={{ color: "#DAA520" }}><Coins size={14} /> {item.cost}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-5">
          <span style={{ color: "rgba(233,227,210,0.65)" }}>Purse after</span>
          <span className="font-mono" style={{ color: hero.drachma - item.cost >= 0 ? "#3fcc6a" : "#c75050" }}>
            {hero.drachma - item.cost} dr
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 pressable touch-target">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={hero.drachma < item.cost}
            className="flex-1 px-4 py-3 rounded-xl font-display tracking-wider text-sm pressable touch-target disabled:opacity-40"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
