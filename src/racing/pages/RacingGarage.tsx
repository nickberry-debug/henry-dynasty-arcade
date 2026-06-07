// Turbo Racers -- Turbo Garage. Pick a car, view its stat triangle, spend
// coins to level up the four stat axes (cap 5 per axis), and UNLOCK cars
// from a 20-strong roster organised by rarity (starter/common/rare/epic/
// legendary). Coins persist via localStorage (src/racing/store.ts).

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CARS, RARITY_ACCENT, type CarRarity } from "../engine/cars";
import {
  UPGRADE_CAP, UPGRADE_COST,
  effectiveStats, emptyLevels, type StatKey, type UpgradeLevels,
} from "../engine/stats";
import {
  getCoins, addCoins, getSelectedCar, setSelectedCar,
  getUpgrades, setUpgrades, isOwned, purchaseCar,
} from "../store";

const STAT_LABELS: Record<StatKey, string> = {
  topSpeed: "TOP SPEED",
  accel: "ACCELERATION",
  grip: "GRIP",
  handling: "HANDLING",
};

const RARITY_ORDER: CarRarity[] = ["starter", "common", "rare", "epic", "legendary"];
const RARITY_LABEL: Record<CarRarity, string> = {
  starter: "STARTER",
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

export default function RacingGarage() {
  const nav = useNavigate();
  const [carId, setCarId] = useState(getSelectedCar());
  const [coins, setCoins] = useState(getCoins());
  const [levels, setLevelsState] = useState<UpgradeLevels>(() => getUpgrades(carId));
  // Force re-render after a purchase by bumping a tick.
  const [tick, setTick] = useState(0);
  const owned = useMemo(() => new Set(CARS.filter(c => isOwned(c.id)).map(c => c.id)), [tick]);

  useEffect(() => {
    setLevelsState(getUpgrades(carId));
    if (owned.has(carId)) setSelectedCar(carId);
  }, [carId, owned]);

  const car = useMemo(() => CARS.find(c => c.id === carId) ?? CARS[0], [carId]);
  const eff = useMemo(() => effectiveStats(car.stats, levels), [car, levels]);
  const carOwned = owned.has(car.id);

  function buyUpgrade(k: StatKey) {
    if (!carOwned) return;
    const lvl = levels[k];
    if (lvl >= UPGRADE_CAP) return;
    const cost = UPGRADE_COST[lvl + 1] - UPGRADE_COST[lvl];
    if (coins < cost) return;
    const newLevels: UpgradeLevels = { ...levels, [k]: lvl + 1 };
    setLevelsState(newLevels);
    setUpgrades(carId, newLevels);
    const remaining = addCoins(-cost);
    setCoins(remaining);
  }

  function tryUnlock() {
    if (carOwned) return;
    const ok = purchaseCar(car.id, car.unlockCost);
    if (ok) {
      setCoins(getCoins());
      setTick(t => t + 1);
      setSelectedCar(car.id);
    }
  }

  function startRace() {
    if (!carOwned) return;
    nav(`/racing/race?car=${encodeURIComponent(carId)}`);
  }

  // Group cars by rarity so the picker reads as a progression.
  const carsByRarity = useMemo(() => {
    const groups: Record<CarRarity, typeof CARS> = { starter: [], common: [], rare: [], epic: [], legendary: [] };
    for (const c of CARS) groups[c.rarity].push(c);
    return groups;
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0a0a18 0%,#1b0a2c 60%,#06030f 100%)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, letterSpacing: 4, margin: 0, textShadow: "2px 2px 0 #000" }}>TURBO GARAGE</h1>
        <div style={{
          background: "linear-gradient(135deg,#facc15,#f59e0b)", color: "#0a0510",
          padding: "8px 14px", borderRadius: 12, fontWeight: 900, fontSize: 16,
          letterSpacing: 1,
        }}>
          {coins} <span style={{ fontSize: 11, opacity: 0.75 }}>COINS</span>
        </div>
      </div>
      <div style={{ opacity: 0.75, fontSize: 12, margin: "4px 0 12px" }}>
        20 cars across 5 rarities. Win races, unlock + upgrade.
      </div>

      {/* Car picker, grouped by rarity */}
      {RARITY_ORDER.map(rarity => (
        <div key={rarity} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, color: RARITY_ACCENT[rarity], margin: "2px 0 4px" }}>
            {RARITY_LABEL[rarity]}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
            {carsByRarity[rarity].map(c => {
              const sel = c.id === carId;
              const isOwn = owned.has(c.id);
              const lvls = isOwn ? getUpgrades(c.id) : emptyLevels();
              const upgradeSum = lvls.topSpeed + lvls.accel + lvls.grip + lvls.handling;
              return (
                <button key={c.id} onClick={() => setCarId(c.id)} style={{
                  flex: "0 0 auto",
                  padding: "8px 8px 6px",
                  borderRadius: 12,
                  background: sel
                    ? "rgba(251,191,36,0.18)"
                    : isOwn ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.35)",
                  border: `2px solid ${sel ? "#fbbf24" : isOwn ? "rgba(255,255,255,0.14)" : RARITY_ACCENT[rarity] + "55"}`,
                  color: "white", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  minWidth: 88,
                  opacity: isOwn ? 1 : 0.55,
                  position: "relative",
                }}>
                  <img src={c.sprite} alt={c.name} style={{ width: 36, height: 64, imageRendering: "pixelated", filter: isOwn ? undefined : "grayscale(70%)" }} />
                  <div style={{ fontSize: 10, fontWeight: 800 }}>{c.name}</div>
                  {!isOwn && (
                    <div style={{ fontSize: 9, color: RARITY_ACCENT[rarity], fontWeight: 800 }}>
                      🔒 {c.unlockCost}c
                    </div>
                  )}
                  {isOwn && upgradeSum > 0 && (
                    <div style={{ fontSize: 9, color: "#facc15", fontWeight: 800 }}>+{upgradeSum} UPG</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected car panel */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: `2px solid ${car.accent}55`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <img src={car.sprite} alt="" style={{ width: 56, height: 96, imageRendering: "pixelated", filter: carOwned ? undefined : "grayscale(80%)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: car.accent }}>{car.name}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{car.tagline}</div>
            <div style={{ fontSize: 10, marginTop: 4, color: RARITY_ACCENT[car.rarity], letterSpacing: 2, fontWeight: 800 }}>
              {RARITY_LABEL[car.rarity]}
            </div>
          </div>
        </div>

        {!carOwned && (
          <div style={{ marginTop: 10 }}>
            <button onClick={tryUnlock} disabled={coins < car.unlockCost} style={{
              width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 900,
              background: coins >= car.unlockCost ? RARITY_ACCENT[car.rarity] : "rgba(255,255,255,0.06)",
              color: coins >= car.unlockCost ? "#0a0510" : "rgba(255,255,255,0.4)",
              border: `1px solid ${coins >= car.unlockCost ? RARITY_ACCENT[car.rarity] : "rgba(255,255,255,0.14)"}`,
              cursor: coins >= car.unlockCost ? "pointer" : "not-allowed",
              letterSpacing: 1,
            }}>
              {coins >= car.unlockCost ? `UNLOCK · ${car.unlockCost} COINS` : `Need ${car.unlockCost - coins} more coins`}
            </button>
          </div>
        )}

        {carOwned && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {(Object.keys(STAT_LABELS) as StatKey[]).map(k => {
              const baseVal = car.stats[k];
              const effVal = eff[k];
              const lvl = levels[k];
              const nextCost = lvl < UPGRADE_CAP ? UPGRADE_COST[lvl + 1] - UPGRADE_COST[lvl] : null;
              const canBuy = nextCost != null && coins >= nextCost;
              return (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.85 }}>
                    <span style={{ letterSpacing: 1, fontWeight: 700 }}>{STAT_LABELS[k]}</span>
                    <span>
                      <span style={{ opacity: 0.55 }}>{baseVal} → </span>
                      <span style={{ color: "#facc15", fontWeight: 800 }}>{effVal}</span>
                      <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.65 }}>LV {lvl}/{UPGRADE_CAP}</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${baseVal}%`, background: "rgba(255,255,255,0.25)" }} />
                      <div style={{ position: "absolute", inset: 0, width: `${effVal}%`, background: car.accent }} />
                    </div>
                    <button
                      onClick={() => buyUpgrade(k)}
                      disabled={!canBuy}
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: canBuy ? "#facc15" : "rgba(255,255,255,0.06)",
                        color: canBuy ? "#0a0510" : "rgba(255,255,255,0.4)",
                        border: `1px solid ${canBuy ? "#facc15" : "rgba(255,255,255,0.14)"}`,
                        cursor: canBuy ? "pointer" : "not-allowed",
                        minWidth: 70, textAlign: "center",
                      }}>
                      {lvl >= UPGRADE_CAP ? "MAX" : `+ ${nextCost}c`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {carOwned && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => {
              const lvls = levels;
              const refund = lvls.topSpeed + lvls.accel + lvls.grip + lvls.handling;
              if (refund === 0) return;
              const totalSpent =
                UPGRADE_COST[lvls.topSpeed] + UPGRADE_COST[lvls.accel] +
                UPGRADE_COST[lvls.grip] + UPGRADE_COST[lvls.handling];
              const refundCoins = Math.round(totalSpent * 0.7);
              const empty = emptyLevels();
              setLevelsState(empty);
              setUpgrades(carId, empty);
              const remaining = addCoins(refundCoins);
              setCoins(remaining);
            }} style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
            }}>RESET (70% refund)</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={startRace} disabled={!carOwned} style={{
          flex: "1 1 200px", padding: "16px 18px", borderRadius: 12, fontSize: 16, fontWeight: 900,
          background: carOwned ? "#fbbf24" : "rgba(255,255,255,0.08)",
          color: carOwned ? "#1a0a25" : "rgba(255,255,255,0.4)",
          border: `1px solid ${carOwned ? "#fbbf24" : "rgba(255,255,255,0.18)"}`,
          cursor: carOwned ? "pointer" : "not-allowed",
          letterSpacing: 1,
        }}>RACE NOW</button>
        <button onClick={() => nav("/racing/setup")} style={{
          flex: "1 1 140px", padding: "16px 18px", borderRadius: 12, fontSize: 14, fontWeight: 800,
          background: "rgba(255,255,255,0.08)", color: "white",
          border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
        }}>RACE SETUP</button>
        <button onClick={() => nav("/racing")} style={{
          flex: "0 1 100px", padding: "16px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: "rgba(255,255,255,0.05)", color: "white",
          border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
        }}>← Hub</button>
      </div>

      <div style={{ marginTop: 22, opacity: 0.6, fontSize: 11, lineHeight: 1.55 }}>
        <strong>Coins:</strong> 1st place = 200 · 2nd = 100 · 3rd = 50 · finish = 25 · new best lap +20 · new best race +40.
        Unlock costs scale by rarity: common 500c · rare 1500c · epic 3500c · legendary 7500c.
      </div>
    </div>
  );
}
