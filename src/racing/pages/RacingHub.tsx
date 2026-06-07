// Turbo Racers -- hub. Phase 5 ships all major modes:
//   QUICK PLAY      (1 CPU, no weapons) -- original phase 1 vs ghost CPU
//   TURBO GARAGE    (20-car roster + upgrades)
//   GRAND RACE      (full Phase 4 -- weapons + 3 CPU + race results)
//   CHAMPIONSHIP    (4 races, cup points, leaderboard)
//   TIME TRIAL      (solo + best-lap ghost)
//   2P HOT-SEAT     (pass-device best-lap challenge)
//   FAMILY LB       (records across profiles)

import { useNavigate } from "react-router-dom";
import { CARS } from "../engine/cars";
import { useState } from "react";
import { unlockAudio } from "../engine/audio";
import { getSelectedCar, setSelectedCar, isOwned, getCoins, getWins } from "../store";

export default function RacingHub() {
  const nav = useNavigate();
  const [carId, _setCarId] = useState(getSelectedCar());
  const setCarId = (id: string) => { _setCarId(id); setSelectedCar(id); };
  const coins = getCoins();
  const wins = getWins();
  const ownedCars = CARS.filter(c => isOwned(c.id));

  function quickStart() {
    unlockAudio();
    nav(`/racing/play?car=${encodeURIComponent(carId)}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#1a0a25 0%,#3b0f4d 60%,#0a0512 100%)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 32, letterSpacing: 4, margin: "10px 0 4px", textShadow: "2px 2px 0 #000" }}>
          TURBO RACERS
        </h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <div style={{ background: "linear-gradient(135deg,#facc15,#f59e0b)", color: "#0a0510", padding: "6px 12px", borderRadius: 10, fontWeight: 900, fontSize: 13 }}>
            {coins} <span style={{ fontSize: 10, opacity: 0.75 }}>COINS</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.85 }}>{wins} WINS · {ownedCars.length}/{CARS.length} CARS</div>
        </div>
      </div>
      <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 22 }}>
        Top-down arcade racing. 20 cars · 5 tracks · 7 weapons.
      </div>

      <Section title="Pick your car">
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {ownedCars.map(c => {
            const sel = c.id === carId;
            return (
              <button key={c.id} onClick={() => setCarId(c.id)}
                style={{
                  flex: "0 0 auto",
                  padding: "10px 12px", borderRadius: 12,
                  background: sel ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${sel ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
                  color: "white", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  minWidth: 84,
                }}>
                <img src={c.sprite} alt={c.name} style={{ width: 36, height: 64, imageRendering: "pixelated" }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>{c.name}</div>
              </button>
            );
          })}
          <button onClick={() => nav("/racing/garage")} style={{
            flex: "0 0 auto", padding: "10px 12px", borderRadius: 12,
            background: "rgba(168,85,247,0.18)", border: "2px solid #a855f7",
            color: "white", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            minWidth: 84,
          }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>+</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>UNLOCK</div>
          </button>
        </div>
      </Section>

      <Section title="Mode">
        <button onClick={quickStart} style={primaryBtn("#fbbf24")}>
          QUICK PLAY · 3 laps vs ghost CPU
        </button>
        <button onClick={() => nav("/racing/setup")} style={primaryBtn("#a78bfa")}>
          GRAND RACE · weapons + CPU field
        </button>
        <button onClick={() => nav("/racing/garage")} style={primaryBtn("#22c55e")}>
          TURBO GARAGE · 20 cars + upgrades
        </button>
        <button onClick={() => nav("/racing/leaderboard")} style={primaryBtn("#22d3ee")}>
          FAMILY LEADERBOARD
        </button>
      </Section>

      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12, lineHeight: 1.55 }}>
        <strong>How to play:</strong> Steering pad on the left, GAS / BRAKE / DRIFT / ITEM on the right.
        Hold DRIFT through corners to charge a mini-turbo. Tuck behind another car to build a slipstream.
        Drive over a glowing yellow box to grab a weapon, then tap ITEM to fire it.
        <br /><br />
        Keyboard: <kbd>Arrows</kbd> or <kbd>WASD</kbd> · <kbd>Space</kbd> drift · <kbd>Shift</kbd> or <kbd>F</kbd> fire item.
      </div>

      <button onClick={() => nav("/")} style={{
        marginTop: 22, padding: "10px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
        color: "white", fontSize: 14, cursor: "pointer",
      }}>← Home</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 2, margin: "0 0 8px" }}>{title.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function primaryBtn(color: string, disabled = false): React.CSSProperties {
  return {
    padding: "16px 18px", borderRadius: 10, fontSize: 16, fontWeight: 800,
    letterSpacing: 1, textAlign: "left",
    background: disabled ? "rgba(255,255,255,0.04)" : color,
    color: disabled ? "#6b7280" : "#1a0a25",
    border: `1px solid ${disabled ? "rgba(255,255,255,0.1)" : color}`,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
