// Turbo Racers -- track select. Pick from 5 difficulty-scaled tracks.

import { useNavigate } from "react-router-dom";
import { TRACKS } from "../engine/tracks";
import { CARS } from "../engine/cars";
import { getSelectedCar, getBestRace, getBestLap } from "../store";
import { formatMs } from "../engine/lap";

export default function RacingTrackSelect() {
  const nav = useNavigate();
  const carId = getSelectedCar();
  const car = CARS.find(c => c.id === carId) ?? CARS[0];

  return (
    <div style={{
      minHeight: "100vh", padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0a0a18 0%,#1b0a2c 60%,#06030f 100%)",
      color: "white", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <h1 style={{ fontSize: 30, letterSpacing: 4, margin: "0 0 4px", textShadow: "2px 2px 0 #000" }}>
        TRACK SELECT
      </h1>
      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 18 }}>
        Five tracks, easiest to expert. Driving as <strong style={{ color: car.accent }}>{car.name}</strong>.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TRACKS.map(t => {
          const bestR = getBestRace(t.id);
          const bestL = getBestLap(t.id);
          return (
            <button key={t.id}
              onClick={() => nav(`/racing/play?car=${encodeURIComponent(carId)}&track=${encodeURIComponent(t.id)}`)}
              style={{
                textAlign: "left", padding: 14, borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: `2px solid ${difficultyAccent(t.difficulty)}66`,
                color: "white", cursor: "pointer",
                display: "flex", gap: 12, alignItems: "center",
              }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: difficultyAccent(t.difficulty), color: "#0a0510",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 22,
              }}>
                {t.difficulty}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{t.name}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{t.blurb}</div>
                <div style={{ fontSize: 10, marginTop: 6, opacity: 0.7 }}>
                  {bestR != null ? <>Best race: <strong>{formatMs(bestR)}</strong></> : <>Unraced</>}
                  {bestL != null && <> Â· best lap <strong>{formatMs(bestL)}</strong></>}
                </div>
              </div>
              <div style={{ fontSize: 22, opacity: 0.55 }}>{"›"}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
        <button onClick={() => nav("/racing/garage")} style={{
          flex: 1, padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 800,
          background: "rgba(255,255,255,0.08)", color: "white",
          border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
        }}>{"← Garage"}</button>
        <button onClick={() => nav("/racing")} style={{
          flex: 1, padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 800,
          background: "rgba(255,255,255,0.08)", color: "white",
          border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
        }}>Hub</button>
      </div>
    </div>
  );
}

function difficultyAccent(d: number): string {
  if (d <= 1) return "#22c55e";
  if (d === 2) return "#84cc16";
  if (d === 3) return "#facc15";
  if (d === 4) return "#fb923c";
  return "#ef4444";
}