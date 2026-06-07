// Turbo Racers -- hub. Phase 1 ships QUICK PLAY (vs ghost CPU on the test
// track). Phase 2 adds car selection + upgrades. Phase 4 adds weapons.
//
// Original IP -- no Mario Kart / Micro Machines names.

import { useNavigate } from "react-router-dom";
import { CARS } from "../engine/cars";
import { useState } from "react";
import { unlockAudio } from "../engine/audio";

export default function RacingHub() {
  const nav = useNavigate();
  const [carId, setCarId] = useState(CARS[0].id);

  function start() {
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
      <h1 style={{ fontSize: 36, letterSpacing: 4, margin: "10px 0 4px", textShadow: "2px 2px 0 #000" }}>
        TURBO RACERS
      </h1>
      <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 22 }}>
        Top-down arcade racing - drift boost, slipstream, lap times.
      </div>

      <Section title="Pick your car">
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {CARS.map(c => {
            const sel = c.id === carId;
            return (
              <button key={c.id} onClick={() => setCarId(c.id)}
                style={{
                  flex: "0 0 auto",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: sel ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${sel ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 84,
                }}>
                <img src={c.sprite} alt={c.name} style={{ width: 36, height: 64, imageRendering: "pixelated" }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>{c.name}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Mode">
        <button onClick={start} style={primaryBtn("#fbbf24")}>
          QUICK PLAY - 3 laps vs ghost CPU
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          TURBO GARAGE - Phase 2 (upgrades)
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          GRAND PRIX - Phase 3 (5 tracks)
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          BATTLE - Phase 4 (weapons)
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          ONLINE VERSUS - Phase 6
        </button>
      </Section>

      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12, lineHeight: 1.55 }}>
        <strong>How to play:</strong> Steering pad on the left, GAS / BRAKE / DRIFT
        on the right. Hold DRIFT through corners to charge a mini-turbo, then
        release to slingshot out. Tuck behind another car to build a slipstream,
        then steer out to fire the draft boost.
        <br /><br />
        Keyboard: <kbd>Arrow keys</kbd> or <kbd>WASD</kbd> + <kbd>Space</kbd> for drift.
      </div>

      <button onClick={() => nav("/")} style={{
        marginTop: 22, padding: "10px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
        color: "white", fontSize: 14, cursor: "pointer",
      }}>{"← Home"}</button>
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
