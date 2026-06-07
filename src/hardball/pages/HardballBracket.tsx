// HARDBALL -- single-elim 4-team bracket. Saves to localStorage.
// PLAY a match returns to /hardball/bracket?result=done&mid=X&a=N&h=N
// which we parse and advance.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TEAMS } from "../engine/match";
import { newBracket, recordResult, type BracketState } from "../engine/bracket";
import { uiClick, winFanfare } from "../engine/audio";

const KEY = "hardball-bracket-v1";

function load(): BracketState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BracketState) : null;
  } catch { return null; }
}
function save(b: BracketState) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {}
}
function clearSaved() {
  try { localStorage.removeItem(KEY); } catch {}
}

export default function HardballBracket() {
  const nav = useNavigate();
  const [b, setB] = useState<BracketState | null>(() => load());

  useEffect(() => {
    const u = new URL(window.location.href);
    const r = u.searchParams.get("result");
    const mid = u.searchParams.get("mid");
    const a = u.searchParams.get("a");
    const h = u.searchParams.get("h");
    if (r === "done" && mid && a != null && h != null && b) {
      const next = recordResult(b, mid, Number(a), Number(h));
      save(next);
      setB(next);
      if (next.champion) winFanfare();
      window.history.replaceState({}, "", "/hardball/bracket");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    uiClick();
    const ids = TEAMS.map(t => t.id).sort(() => Math.random() - 0.5).slice(0, 4);
    const fresh = newBracket(ids);
    save(fresh);
    setB(fresh);
  }
  function reset() { clearSaved(); setB(null); }
  function playMatch(matchId: string, awayId: string, homeId: string) {
    nav(`/hardball/play?away=${awayId}&home=${homeId}&innings=3&mid=${matchId}&ret=bracket`);
  }

  return (
    <div style={{
      minHeight: "100vh", padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0b1929 0%,#142847 60%,#0a1020 100%)",
      color: "white", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <h1 style={{ fontSize: 30, letterSpacing: 3, margin: "10px 0 4px", textShadow: "2px 2px 0 #000" }}>
        TOURNAMENT
      </h1>
      <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 18 }}>
        4-team single-elimination. Win two games for the trophy.
      </div>

      {!b && (
        <button onPointerDown={(e) => { e.preventDefault(); startNew(); }} style={primaryBtn("#fbbf24")}>
          START TOURNAMENT (random seeds)
        </button>
      )}

      {b && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {b.matches.map(m => {
            const away = TEAMS.find(t => t.id === m.awayId);
            const home = TEAMS.find(t => t.id === m.homeId);
            const isReady = away && home && m.awayId !== "?" && m.homeId !== "?";
            const done = m.winnerId !== undefined;
            const isCurrent = b.currentMatchId === m.id;
            return (
              <div key={m.id} style={{
                padding: 12, borderRadius: 8,
                background: done ? "rgba(34,197,94,0.12)" : isCurrent ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${done ? "#22c55e" : isCurrent ? "#fbbf24" : "rgba(255,255,255,0.14)"}`,
              }}>
                <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 2, marginBottom: 4 }}>
                  {m.round.toUpperCase()}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: away?.accent ?? "#94a3b8" }}>
                      {away?.shortName ?? "?"} {away?.name ?? "tbd"} {m.awayScore !== undefined && `(${m.awayScore})`}
                    </div>
                    <div style={{ opacity: 0.5, fontSize: 11, margin: "2px 0" }}>vs</div>
                    <div style={{ color: home?.accent ?? "#94a3b8" }}>
                      {home?.shortName ?? "?"} {home?.name ?? "tbd"} {m.homeScore !== undefined && `(${m.homeScore})`}
                    </div>
                  </div>
                  {done && (
                    <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 800 }}>
                      W: {TEAMS.find(t => t.id === m.winnerId)?.shortName}
                    </div>
                  )}
                  {!done && isCurrent && isReady && (
                    <button
                      onPointerDown={(e) => { e.preventDefault(); playMatch(m.id, m.awayId, m.homeId); }}
                      style={{
                        padding: "8px 14px", borderRadius: 6, background: "#fbbf24",
                        color: "#0a1622", fontWeight: 800, border: "none", cursor: "pointer",
                      }}>PLAY</button>
                  )}
                </div>
              </div>
            );
          })}
          {b.champion && (
            <div style={{ padding: 16, textAlign: "center", marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 3 }}>CHAMPIONS</div>
              <div style={{ fontSize: 28, color: b.champion.accent, fontWeight: 900, textShadow: "3px 3px 0 #000" }}>
                {b.champion.name}
              </div>
            </div>
          )}
          <button onPointerDown={(e) => { e.preventDefault(); reset(); }} style={{
            padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)", marginTop: 12,
          }}>RESET BRACKET</button>
        </div>
      )}

      <button onPointerDown={(e) => { e.preventDefault(); nav("/hardball"); }} style={{
        marginTop: 20, padding: "10px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
        color: "white", fontSize: 14,
      }}>BACK TO HARDBALL</button>
    </div>
  );
}

function primaryBtn(color: string): React.CSSProperties {
  return {
    padding: "16px 18px", borderRadius: 10, fontSize: 16, fontWeight: 800,
    letterSpacing: 1, textAlign: "left", background: color, color: "#0b1929",
    border: `1px solid ${color}`, cursor: "pointer", width: "100%",
  };
}
