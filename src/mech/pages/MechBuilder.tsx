// Mech Combat — Bot Builder. Pick parts for each of the 5 slots and
// optionally attach weapons to either arm. Live silhouette preview at
// the top so the player sees the result as they swap parts.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useMech, partsBySlot } from "../store";
import { WEAPONS, isWeaponLocked, BOT_PRESETS, priceFor, isPartLeagueLocked } from "../parts";
import { LEAGUE_INFO } from "../types";
import { WeaponIcon } from "../WeaponIcon";
import { RARITY_COLOR, type SlotId } from "../types";

const SLOTS: { id: SlotId; label: string }[] = [
  { id: "head",     label: "Head" },
  { id: "leftArm",  label: "Left Arm" },
  { id: "rightArm", label: "Right Arm" },
  { id: "chest",    label: "Chest / Core" },
  { id: "legs",     label: "Legs / Feet" },
];

export default function MechBuilder() {
  const navigate = useNavigate();
  const mech = useMech();
  const bot = mech.activeBot;
  const [tab, setTab] = useState<SlotId | "weapons">("chest");

  if (!bot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #1a0808 0%, #050308 100%)", color: "#fef3c7" }}>
        <div className="font-display text-xl mb-2">No bot selected</div>
        <button onClick={() => navigate("/mech")} className="px-4 py-2 rounded-full pressable touch-target"
          style={{ background: "#fb923c", color: "#1a0505", minHeight: 44 }}>Back to Hub</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 18% 0%, rgba(252,165,165,0.16), transparent 60%), " +
          "linear-gradient(180deg, #1a0808 0%, #0a0a08 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/mech")} aria-label="Back to mech hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>BOT BUILDER</div>
          <input
            value={bot.name}
            onChange={e => mech.customize({ name: e.target.value })}
            aria-label="Bot name"
            className="font-display text-xl tracking-wider bg-transparent w-full outline-none"
            style={{ color: "#fde047" }}
          />
        </div>
      </header>

      <main className="flex-1 px-4 pb-12 max-w-3xl mx-auto w-full space-y-4">
        {/* Bot archetype presets — quick-start templates */}
        <section className="rounded-xl p-3"
          style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.30)" }}>
          <div className="text-[9px] tracking-[0.3em] mb-2" style={{ color: "#fb923c" }}>BOT TEMPLATES</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BOT_PRESETS.map(p => (
              <button key={p.id}
                onClick={() => {
                  if (window.confirm(`Apply the ${p.name} template? This replaces every part on your bot. Weapons that aren't unlocked yet stay empty.`)) {
                    mech.applyPreset(p.id);
                  }
                }}
                aria-label={`Apply ${p.name} template`}
                className="shrink-0 rounded-xl p-2 pressable touch-target text-left"
                style={{
                  background: `linear-gradient(135deg, ${p.paint}1f, rgba(10,5,5,0.85))`,
                  border: `1px solid ${p.paint}66`,
                  minWidth: 130,
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base" aria-hidden="true">{p.emoji}</span>
                  <span className="font-display text-[12px] tracking-wide" style={{ color: p.paint }}>{p.name}</span>
                </div>
                <div className="text-[9px] mt-1 leading-snug" style={{ color: "rgba(229,231,235,0.7)" }}>{p.flavor}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Live stats summary */}
        <section className="rounded-xl p-3 grid grid-cols-4 gap-1.5"
          style={{ background: `linear-gradient(135deg, ${bot.paint}1f, rgba(10,5,5,0.85))`, border: `1px solid ${bot.paint}55` }}>
          <Stat label="HP"     value={bot.derived.hp}     accent="#86efac" />
          <Stat label="ARMOR"  value={bot.derived.armor}  accent="#7dd3fc" />
          <Stat label="POWER"  value={bot.derived.power}  accent="#fbbf24" />
          <Stat label="ENERGY" value={bot.derived.energy} accent="#a78bfa" />
          <Stat label="WEIGHT" value={bot.derived.weight} accent="#fb923c" />
          <Stat label="SPEED"  value={bot.derived.speed}  accent="#67e8f9" />
          <Stat label="BALANCE"value={bot.derived.balance} accent="#fde047" />
          <Stat label="PAINT"  value={<input
            type="color" value={bot.paint}
            onChange={e => mech.customize({ paint: e.target.value })}
            className="w-full h-5 bg-transparent border-0 cursor-pointer p-0"
            aria-label="Paint color" />} accent="#fff" />
        </section>

        {/* Slot tabs */}
        <div className="flex gap-1 flex-wrap">
          {SLOTS.map(s => {
            const sel = tab === s.id;
            return (
              <button key={s.id} onClick={() => setTab(s.id)}
                aria-pressed={sel}
                className="px-3 py-2 rounded-lg pressable touch-target text-[11px] font-display tracking-wider uppercase"
                style={{
                  background: sel ? "#fb923c" : "rgba(255,255,255,0.05)",
                  color: sel ? "#1a0505" : "#fef3c7",
                  border: `1px solid ${sel ? "#fb923c" : "rgba(255,255,255,0.10)"}`,
                  minHeight: 36,
                }}>{s.label}</button>
            );
          })}
          <button onClick={() => setTab("weapons")}
            aria-pressed={tab === "weapons"}
            className="px-3 py-2 rounded-lg pressable touch-target text-[11px] font-display tracking-wider uppercase"
            style={{
              background: tab === "weapons" ? "#fb923c" : "rgba(255,255,255,0.05)",
              color: tab === "weapons" ? "#1a0505" : "#fef3c7",
              border: `1px solid ${tab === "weapons" ? "#fb923c" : "rgba(255,255,255,0.10)"}`,
              minHeight: 36,
            }}>Weapons</button>
        </div>

        {/* Slot grid */}
        {tab !== "weapons" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {partsBySlot(tab).map(p => {
              const equipped = bot.parts[tab].id === p.id;
              const rcol = RARITY_COLOR[p.rarity];
              const owned = mech.save.ownedPartIds.includes(p.id);
              const leagueLocked = isPartLeagueLocked(p, mech.save.league);
              const price = priceFor(p);
              const canBuy = !owned && !leagueLocked && mech.save.money >= price;
              return (
                <button key={p.id}
                  onClick={() => {
                    if (leagueLocked) return;
                    if (owned) mech.swapPart(tab, p.id);
                    else if (canBuy) mech.buyPart(p.id);
                  }}
                  aria-pressed={equipped}
                  disabled={leagueLocked || (!owned && !canBuy)}
                  aria-label={
                    leagueLocked ? `${p.name} locked — climb to a higher league` :
                    !owned ? `Buy ${p.name} for ${price} cash` :
                    `Equip ${p.name}`
                  }
                  className="text-left rounded-xl p-3 pressable touch-target"
                  style={{
                    background: equipped
                      ? `linear-gradient(135deg, ${rcol}22, rgba(10,5,5,0.85))`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${equipped ? rcol : "rgba(255,255,255,0.10)"}`,
                    opacity: leagueLocked || (!owned && !canBuy) ? 0.55 : 1,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-sm tracking-wide flex items-center gap-1.5" style={{ color: leagueLocked || !owned ? "#9aa6bf" : "#fef3c7" }}>
                      {leagueLocked && <span aria-hidden="true">🔒</span>}
                      {!leagueLocked && !owned && <span aria-hidden="true">🛒</span>}
                      {p.name}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest" style={{ color: rcol }}>{p.rarity}</div>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>{p.flavor}</div>
                  <div className="text-[10px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: rcol }}>
                    {Object.entries(p.stats).filter(([, v]) => v !== 0).map(([k, v]) => (
                      <span key={k}>{k.toUpperCase()} {(v as number) > 0 ? "+" : ""}{v as number}</span>
                    ))}
                  </div>
                  <div className="text-[10px] mt-1.5 flex items-center gap-2">
                    {equipped && (
                      <span className="inline-flex items-center gap-1" style={{ color: "#86efac" }}>
                        <Check size={10} aria-hidden="true" /> EQUIPPED
                      </span>
                    )}
                    {!equipped && owned && (
                      <span style={{ color: "#86efac" }}>OWNED — tap to equip</span>
                    )}
                    {!owned && leagueLocked && (
                      <span style={{ color: "#fbbf24" }}>Unlocks at higher league</span>
                    )}
                    {!owned && !leagueLocked && (
                      <span style={{ color: canBuy ? "#fde047" : "#fca5a5" }}>
                        {canBuy ? `BUY · $${price}` : `Need $${price}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Weapons */}
        {tab === "weapons" && (
          <section className="space-y-3">
            {(["left", "right"] as const).map(arm => {
              const mounted = bot.weapons[arm];
              const armPart = bot.parts[arm === "left" ? "leftArm" : "rightArm"];
              const mountSize = armPart.weaponMount?.size;
              return (
                <div key={arm} className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div className="font-display text-sm uppercase tracking-widest mb-1.5" style={{ color: "#fca5a5" }}>
                    {arm} arm {mountSize ? `(${mountSize} mount)` : "(no mount)"}
                  </div>
                  {!mountSize && (
                    <div className="text-[11px]" style={{ color: "rgba(229,231,235,0.6)" }}>
                      Swap to an arm part with a weapon mount to equip a weapon here.
                    </div>
                  )}
                  {mountSize && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button onClick={() => mech.setWeapon(arm, null)}
                        aria-pressed={!mounted}
                        className="rounded-md p-2 text-left pressable touch-target"
                        style={{
                          background: !mounted ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${!mounted ? "#f87171" : "rgba(255,255,255,0.10)"}`,
                        }}>
                        <div className="text-[12px] font-display" style={{ color: "#fef3c7" }}>Unarmed</div>
                        <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.6)" }}>No weapon mounted — punches only.</div>
                      </button>
                      {WEAPONS.filter(w => w.mount === mountSize).map(w => {
                        const equipped = mounted?.id === w.id;
                        const rcol = RARITY_COLOR[w.tier];
                        const locked = isWeaponLocked(w.id, mech.save.league);
                        const unlockLeague = w.tier === "uncommon"  ? "amateur"
                                          : w.tier === "rare"       ? "pro"
                                          : w.tier === "legendary"  ? "champion"
                                          : "rookie";
                        return (
                          <button key={w.id} onClick={() => !locked && mech.setWeapon(arm, w.id)}
                            aria-pressed={equipped}
                            disabled={locked}
                            aria-label={locked ? `${w.name} (locked — reach ${LEAGUE_INFO[unlockLeague].label})` : w.name}
                            className="rounded-md p-2 text-left pressable touch-target"
                            style={{
                              background: locked
                                ? "rgba(255,255,255,0.02)"
                                : equipped
                                  ? `linear-gradient(135deg, ${rcol}22, rgba(10,5,5,0.85))`
                                  : "rgba(255,255,255,0.04)",
                              border: `1px solid ${equipped ? rcol : "rgba(255,255,255,0.10)"}`,
                              opacity: locked ? 0.45 : 1,
                            }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[12px] font-display flex items-center gap-1.5" style={{ color: locked ? "#9aa6bf" : w.color }}>
                                {locked
                                  ? <span aria-hidden="true">🔒</span>
                                  : <WeaponIcon weapon={w} size={22} />}
                                {w.name}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest" style={{ color: rcol }}>{w.tier}</div>
                            </div>
                            <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.65)" }}>{w.flavor}</div>
                            {locked ? (
                              <div className="text-[10px] mt-1" style={{ color: "#fbbf24" }}>
                                Unlocks at {LEAGUE_INFO[unlockLeague].label}
                              </div>
                            ) : (
                              <div className="text-[10px] mt-1" style={{ color: rcol }}>
                                {w.damage} DMG · {w.fireRate.toFixed(1)}/s · range {w.range} · {w.energyCost}E
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <p className="text-[10px] text-center opacity-60 pt-2" style={{ color: "#fef3c7" }}>
          Stats update live. Battles arrive in a follow-up build.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-md py-1.5 px-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[8px] tracking-widest uppercase opacity-70" style={{ color: accent }}>{label}</div>
      <div className="font-display text-sm mt-0.5" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}
