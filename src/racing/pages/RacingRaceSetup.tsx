// Turbo Racers -- race-setup screen. Customizable race: track / laps / CPU
// count / difficulty / weapons on-off / direction (mirror if unlocked).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TRACKS } from "../engine/tracks";
import { CARS } from "../engine/cars";
import { getSelectedCar, isOwned, isMirrorUnlocked, getBestLap, getBestRace } from "../store";
import { formatMs } from "../engine/lap";

type Difficulty = "easy" | "medium" | "hard" | "expert";

export default function RacingRaceSetup() {
  const nav = useNavigate();
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [laps, setLaps] = useState(3);
  const [cpu, setCpu] = useState(3);
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [weapons, setWeapons] = useState(true);
  const [reverse, setReverse] = useState(false);
  const [mode, setMode] = useState<"race" | "tt" | "2p">("race");
  const carId = getSelectedCar();
  const car = CARS.find(c => c.id === carId) ?? CARS[0];
  const owns = isOwned(carId);

  function start() {
    const cpuC = mode === "tt" ? 0 : cpu;
    const params = new URLSearchParams({
      car: carId, track: trackId, laps: String(laps),
      cpu: String(cpuC), diff, weapons: weapons ? "1" : "0",
      reverse: reverse ? "1" : "0",
      mode, slot: "1",
    });
    nav(`/racing/race?${params.toString()}`);
  }

  function startCup() {
    // Pick 4 tracks at random/ordered.
    const cupTracks = TRACKS.slice(0, 4).map(t => t.id);
    const params = new URLSearchParams({
      car: carId, track: cupTracks[0], laps: String(laps),
      cpu: String(Math.max(3, cpu)), diff, weapons: weapons ? "1" : "0",
      mode: "cup", cupRound: "0", cupTracks: cupTracks.join(","), cupPts: "",
    });
    nav(`/racing/race?${params.toString()}`);
  }

  return (
    <div style={{
      minHeight: "100vh", padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0a0a18 0%,#1b0a2c 60%,#06030f 100%)",
      color: "white", fontFamily: "system-ui,-apple-system,sans-serif",
    }}>
      <h1 style={{ fontSize: 28, letterSpacing: 4, margin: "0 0 4px", textShadow: "2px 2px 0 #000" }}>RACE SETUP</h1>
      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 16 }}>
        Driving as <strong style={{ color: car.accent }}>{car.name}</strong>. {!owns && <span style={{ color: "#ef4444" }}>(not unlocked!)</span>}
      </div>

      <Section title="Track">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TRACKS.map(t => {
            const sel = t.id === trackId;
            const mirror = isMirrorUnlocked(t.id);
            const bestL = getBestLap(t.id);
            const bestR = getBestRace(t.id);
            return (
              <button key={t.id} onClick={() => setTrackId(t.id)} style={{
                textAlign: "left", padding: "10px 12px", borderRadius: 10,
                background: sel ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                border: `2px solid ${sel ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
                color: "white", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{t.name} <span style={{ opacity: 0.7, fontSize: 11 }}>· difficulty {t.difficulty}</span></div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{t.blurb}</div>
                  {(bestL || bestR) && <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                    {bestR && <>best race {formatMs(bestR)} · </>}
                    {bestL && <>best lap {formatMs(bestL)}</>}
                  </div>}
                </div>
                {mirror && <span style={{ fontSize: 10, color: "#a855f7", fontWeight: 800 }}>MIRROR ✓</span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Race rules">
        <Row label="Laps">
          {[1, 3, 5, 10].map(n => (
            <Pill key={n} sel={laps === n} onClick={() => setLaps(n)}>{n}</Pill>
          ))}
        </Row>
        <Row label="CPU racers">
          {[1, 3, 5, 7].map(n => (
            <Pill key={n} sel={cpu === n} onClick={() => setCpu(n)}>{n}</Pill>
          ))}
        </Row>
        <Row label="Difficulty">
          {(["easy", "medium", "hard", "expert"] as Difficulty[]).map(d => (
            <Pill key={d} sel={diff === d} onClick={() => setDiff(d)}>{d.toUpperCase()}</Pill>
          ))}
        </Row>
        <Row label="Weapons">
          <Pill sel={weapons} onClick={() => setWeapons(true)}>ON</Pill>
          <Pill sel={!weapons} onClick={() => setWeapons(false)}>OFF</Pill>
        </Row>
        <Row label="Mirror">
          <Pill sel={!reverse} onClick={() => setReverse(false)}>FWD</Pill>
          <Pill sel={reverse} onClick={() => setReverse(true)} disabled={!isMirrorUnlocked(trackId)}>
            MIRROR {!isMirrorUnlocked(trackId) && "🔒"}
          </Pill>
        </Row>
        <Row label="Mode">
          <Pill sel={mode === "race"} onClick={() => setMode("race")}>QUICK</Pill>
          <Pill sel={mode === "tt"} onClick={() => setMode("tt")}>TIME TRIAL</Pill>
          <Pill sel={mode === "2p"} onClick={() => setMode("2p")}>2P HOT-SEAT</Pill>
        </Row>
      </Section>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <button onClick={start} disabled={!owns} style={cta("#fbbf24", !owns)}>
          {mode === "tt" ? "START TIME TRIAL" : mode === "2p" ? "START 2P RACE (Player 1 first)" : "START RACE"}
        </button>
        <button onClick={startCup} disabled={!owns} style={cta("#a855f7", !owns)}>
          START CHAMPIONSHIP CUP (4 races)
        </button>
        <button onClick={() => nav("/racing/leaderboard")} style={cta("rgba(255,255,255,0.18)")}>FAMILY LEADERBOARD</button>
        <button onClick={() => nav("/racing/garage")} style={cta("rgba(255,255,255,0.10)")}>← GARAGE</button>
        <button onClick={() => nav("/racing")} style={cta("rgba(255,255,255,0.06)")}>← HUB</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, margin: "0 0 8px" }}>{title.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ minWidth: 90, fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Pill({ sel, onClick, disabled, children }: { sel: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 12px", borderRadius: 16, fontSize: 11, fontWeight: 800,
      background: sel ? "#fbbf24" : "rgba(255,255,255,0.08)",
      color: sel ? "#0a0510" : "white",
      border: `1px solid ${sel ? "#fbbf24" : "rgba(255,255,255,0.18)"}`,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  );
}

function cta(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 900,
    background: disabled ? "rgba(255,255,255,0.06)" : bg,
    color: disabled ? "rgba(255,255,255,0.4)" : (bg.includes("rgba") ? "white" : "#0a0510"),
    border: `1px solid ${disabled ? "rgba(255,255,255,0.12)" : bg}`,
    cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 1,
  };
}
