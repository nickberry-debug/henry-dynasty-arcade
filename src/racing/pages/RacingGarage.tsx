// Turbo Racers -- Turbo Garage. Pick a car, view its stat triangle, spend
// coins to level up the four stat axes (cap 5 per axis). Coins persist via
// localStorage (src/racing/store.ts).

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CARS } from "../engine/cars";
import {
  UPGRADE_CAP, UPGRADE_COST,
  effectiveStats, emptyLevels, type StatKey, type UpgradeLevels,
} from "../engine/stats";
import {
  getCoins, addCoins, getSelectedCar, setSelectedCar,
  getUpgrades, setUpgrades,
} from "../store";

const STAT_LABELS: Record<StatKey, string> = {
  topSpeed: "TOP SPEED",
  accel: "ACCELERATION",
  grip: "GRIP",
  handling: "HANDLING",
};

export default function RacingGarage() {
  const nav = useNavigate();
  const [carId, setCarId] = useState(getSelectedCar());
  const [coins, setCoins] = useState(getCoins());
  const [levels, setLevelsState] = useState<UpgradeLevels>(() => getUpgrades(carId));

  useEffect(() => {
    setLevelsState(getUpgrades(carId));
    setSelectedCar(carId);
  }, [carId]);

  const car = useMemo(() => CARS.find(c => c.id === carId) ?? CARS[0], [carId]);
  const eff = useMemo(() => effectiveStats(car.stats, levels), [car, levels]);

  function buyUpgrade(k: StatKey) {
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

  function startRace() {
    nav(`/racing/play?car=${encodeURIComponent(carId)}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0a0a18 0%,#1b0a2c 60%,#06030f 100%)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 30, letterSpacing: 4, margin: 0, textShadow: "2px 2px 0 #000" }}>TURBO GARAGE</h1>
        <div style={{
          background: "linear-gradient(135deg,#facc15,#f59e0b)", color: "#0a0510",
          padding: "8px 14px", borderRadius: 12, fontWeight: 900, fontSize: 16,
          letterSpacing: 1,
        }}>
          {coins} <span style={{ fontSize: 11, opacity: 0.75 }}>COINS</span>
        </div>
      </div>
      <div style={{ opacity: 0.75, fontSize: 12, margin: "4px 0 18px" }}>
        Pick a car, spend coins to bump its stat triangle. Win races to earn more coins.
      </div>

      {/* Car picker carousel */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
        {CARS.map(c => {
          const sel = c.id === carId;
          const lvls = getUpgrades(c.id);
          const upgradeSum = lvls.topSpeed + lvls.accel + lvls.grip + lvls.handling;
          return (
            <button key={c.id} onClick={() => setCarId(c.id)} style={{
              flex: "0 0 auto",
              padding: "10px 10px 8px",
              borderRadius: 12,
              background: sel ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${sel ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
              color: "white", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              minWidth: 96,
            }}>
              <img src={c.sprite} alt={c.name} style={{ width: 40, height: 70, imageRendering: "pixelated" }} />
              <div style={{ fontSize: 11, fontWeight: 800 }}>{c.name}</div>
              <div style={{ fontSize: 9, opacity: 0.65 }}>{c.tagline}</div>
              {upgradeSum > 0 && (
                <div style={{ fontSize: 9, color: "#facc15", fontWeight: 800 }}>+{upgradeSum} UPG</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected car panel */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: `2px solid ${car.accent}55`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <img src={car.sprite} alt="" style={{ width: 56, height: 96, imageRendering: "pixelated" }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: car.accent }}>{car.name}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{car.tagline}</div>
          </div>
        </div>

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
                    {/* base bar */}
                    <div style={{ position: "absolute", inset: 0, width: `${baseVal}%`, background: "rgba(255,255,255,0.25)" }} />
                    {/* effective bar (over base) */}
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
                    {lvl >= UPGRADE_CAP ? "MAX" : `+ ${nextCost} c`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset upgrades */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => {
            const lvls = levels;
            const refund = lvls.topSpeed + lvls.accel + lvls.grip + lvls.handling;
            if (refund === 0) return;
            // Refund 70% of total spent.
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
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={startRace} style={{
          flex: "1 1 200px", padding: "16px 18px", borderRadius: 12, fontSize: 16, fontWeight: 900,
          background: "#fbbf24", color: "#1a0a25", border: "1px solid #fbbf24", cursor: "pointer",
          letterSpacing: 1,
        }}>RACE NOW</button>
        <button onClick={() => nav("/racing/tracks")} style={{
          flex: "1 1 140px", padding: "16px 18px", borderRadius: 12, fontSize: 14, fontWeight: 800,
          background: "rgba(255,255,255,0.08)", color: "white",
          border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
        }}>PICK TRACK</button>
        <button onClick={() => nav("/racing")} style={{
          flex: "0 1 100px", padding: "16px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: "rgba(255,255,255,0.05)", color: "white",
          border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
        }}>← Hub</button>
      </div>

      <div style={{ marginTop: 22, opacity: 0.6, fontSize: 11, lineHeight: 1.55 }}>
        <strong>Coin rewards:</strong> finish 1st = 60 c · finish vs CPU at all = 25 c · new best lap = +20 c · new best race = +40 c.
        Reset refunds 70% of spend so experimentation is cheap.
      </div>
    </div>
  );
}
