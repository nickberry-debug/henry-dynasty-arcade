// HARDBALL hub — pick a quick game.
// 2P pass-device + Home Run Derby are queued for Phase 2.

import { useNavigate } from "react-router-dom";
import { TEAMS } from "../engine/match";
import { useState } from "react";
import { unlockAudio, uiClick } from "../engine/audio";

export default function HardballHub() {
  const nav = useNavigate();
  const [away, setAway] = useState(TEAMS[0].id);
  const [home, setHome] = useState(TEAMS[1].id);
  const [innings, setInnings] = useState(3);

  function start() {
    unlockAudio();
    uiClick();
    const a = encodeURIComponent(away);
    const h = encodeURIComponent(home);
    nav(`/hardball/play?away=${a}&home=${h}&innings=${innings}`);
  }

  return (
    <div style={{
      minHeight: "100vh", padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0b1929 0%,#142847 60%,#0a1020 100%)",
      color: "white", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <h1 style={{ fontSize: 36, letterSpacing: 4, margin: "10px 0 4px", textShadow: "2px 2px 0 #000" }}>
        ⚾ HARDBALL
      </h1>
      <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 18 }}>
        Arcade-action baseball — pitch, swing, run. Quick games.
      </div>


      <Section title="Pick teams">
        <TeamPicker label="Away" value={away} onChange={setAway} avoid={home} />
        <TeamPicker label="Home" value={home} onChange={setHome} avoid={away} />
      </Section>

      <Section title="Innings">
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 3, 5, 9].map(n => (
            <button key={n} onClick={() => setInnings(n)}
              style={chip(innings === n)}>{n}</button>
          ))}
        </div>
      </Section>

      <Section title="Mode">
        <button onClick={start} style={primaryBtn("#fbbf24")}>
          ▶ QUICK PLAY · 1P vs CPU
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          🆚 2P PASS-DEVICE · Phase 2
        </button>
        <button disabled style={primaryBtn("#94a3b8", true)}>
          🏟 HOME RUN DERBY · Phase 2
        </button>
      </Section>

      <div style={{ marginTop: 24, opacity: 0.65, fontSize: 12, lineHeight: 1.5 }}>
        Original teams. Original players. Distinct from the full Baseball season-sim
        at <code>/baseball</code> — Hardball is short, arcade, juicy.
      </div>

      <button onClick={() => nav("/")} style={{
        marginTop: 20, padding: "10px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
        color: "white", fontSize: 14,
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

function TeamPicker({ label, value, onChange, avoid }: {
  label: string; value: string; onChange: (id: string) => void; avoid: string;
}) {
  const t = TEAMS.find(x => x.id === value)!;
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TEAMS.map(team => {
          const dis = team.id === avoid;
          const sel = team.id === value;
          return (
            <button key={team.id} disabled={dis} onClick={() => onChange(team.id)}
              style={{
                padding: "8px 10px", borderRadius: 8, fontSize: 12,
                background: sel ? team.accent : "rgba(255,255,255,0.06)",
                color: sel ? "#0b1929" : (dis ? "#6b7280" : "white"),
                border: `1px solid ${sel ? team.accent : "rgba(255,255,255,0.14)"}`,
                fontWeight: sel ? 800 : 500,
                opacity: dis ? 0.4 : 1, cursor: dis ? "not-allowed" : "pointer",
              }}>
              {team.shortName} · {team.name}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        Selected: <strong style={{ color: t.accent }}>{t.name}</strong>
      </div>
    </div>
  );
}


function chip(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700,
    background: active ? "#fbbf24" : "rgba(255,255,255,0.06)",
    color: active ? "#0b1929" : "white",
    border: `1px solid ${active ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
    cursor: "pointer", minWidth: 50,
  };
}

function primaryBtn(color: string, disabled = false): React.CSSProperties {
  return {
    padding: "16px 18px", borderRadius: 10, fontSize: 16, fontWeight: 800,
    letterSpacing: 1, textAlign: "left",
    background: disabled ? "rgba(255,255,255,0.04)" : color,
    color: disabled ? "#6b7280" : "#0b1929",
    border: `1px solid ${disabled ? "rgba(255,255,255,0.1)" : color}`,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
