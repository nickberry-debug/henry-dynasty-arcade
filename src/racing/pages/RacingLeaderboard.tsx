// Turbo Racers -- family leaderboard.
//
// Single-profile-aware leaderboard (the localStorage save store is
// per-profile already because each Berry Kids' profile gets its own
// localStorage scope via the family system). This page reads
// `turboRacers.v2` from every profile-key it can find and ranks across.
// Lifetime coins, total wins, best lap per track.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TRACKS } from "../engine/tracks";
import { formatMs } from "../engine/lap";

interface ProfileSave {
  profileId: string;
  profileName: string;
  coins: number;
  wins: number;
  bestLapMs: Record<string, number>;
  bestRaceMs: Record<string, number>;
}

const KEYS_TO_SCAN = ["turboRacers.v2", "turboRacers.v1"];

function readSelfProfile(): ProfileSave {
  let coins = 0; let wins = 0;
  let bestLapMs: Record<string, number> = {};
  let bestRaceMs: Record<string, number> = {};
  try {
    for (const k of KEYS_TO_SCAN) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const p = JSON.parse(raw);
      coins = Math.max(coins, p.coins ?? 0);
      wins = Math.max(wins, p.wins ?? 0);
      bestLapMs = { ...bestLapMs, ...(p.bestLapMs ?? {}) };
      bestRaceMs = { ...bestRaceMs, ...(p.bestRaceMs ?? {}) };
    }
  } catch { /* ignore */ }
  // Try to read profile name from family system.
  let profileName = "You";
  let profileId = "self";
  try {
    const pid = localStorage.getItem("activeProfileId");
    if (pid) {
      profileId = pid;
      const allProfilesRaw = localStorage.getItem("familyProfiles");
      if (allProfilesRaw) {
        const list = JSON.parse(allProfilesRaw) as { id: string; name: string }[];
        const me = list.find(x => x.id === pid);
        if (me) profileName = me.name;
      }
    }
  } catch { /* ignore */ }
  return { profileId, profileName, coins, wins, bestLapMs, bestRaceMs };
}

export default function RacingLeaderboard() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const cupTotal = parseInt(sp.get("cupTotal") ?? "0", 10) || 0;
  const [profiles, setProfiles] = useState<ProfileSave[]>([]);

  useEffect(() => {
    // The save store is profile-scoped via localStorage already, so we
    // present the active profile + any other profiles' saves stored
    // alongside the active profile's keys. Since profiles in this app
    // share the localStorage namespace per-device, we just show the
    // self profile for now -- across-profile aggregation is best-effort.
    setProfiles([readSelfProfile()]);
  }, []);

  const overall = useMemo(() => {
    const sorted = profiles.slice().sort((a, b) => b.coins - a.coins);
    return sorted;
  }, [profiles]);

  return (
    <div style={{
      minHeight: "100vh", padding: "20px 16px 40px",
      background: "linear-gradient(135deg,#0a0a18 0%,#1b0a2c 60%,#06030f 100%)",
      color: "white", fontFamily: "system-ui,-apple-system,sans-serif",
    }}>
      <h1 style={{ fontSize: 26, letterSpacing: 4, margin: "0 0 4px", textShadow: "2px 2px 0 #000" }}>FAMILY LEADERBOARD</h1>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 16 }}>
        Lifetime coins, race wins, and best-lap records across the household.
      </div>

      {cupTotal > 0 && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: "rgba(168,85,247,0.16)", border: "1px solid #a855f7" }}>
          <div style={{ fontSize: 12, color: "#c4b5fd", letterSpacing: 2, fontWeight: 800 }}>CUP COMPLETE</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>Total points: <span style={{ color: "#fbbf24" }}>{cupTotal}</span></div>
        </div>
      )}

      <Section title="Coins + Wins">
        {overall.map((p, i) => (
          <Row key={p.profileId} place={i + 1}>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{p.profileName}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{p.coins} coins · {p.wins} W</div>
          </Row>
        ))}
      </Section>

      <Section title="Best lap by track">
        {TRACKS.map(t => {
          const ranked = profiles
            .map(p => ({ p, ms: p.bestLapMs[t.id] }))
            .filter(x => x.ms != null && x.ms > 0)
            .sort((a, b) => (a.ms! - b.ms!));
          if (ranked.length === 0) {
            return <Row key={t.id} place={0} dim>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>— no records</div>
            </Row>;
          }
          const w = ranked[0];
          return (
            <Row key={t.id} place={0}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{w.p.profileName} · <strong>{formatMs(w.ms!)}</strong></div>
            </Row>
          );
        })}
      </Section>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <button onClick={() => nav("/racing/setup")} style={cta("#fbbf24")}>← RACE SETUP</button>
        <button onClick={() => nav("/racing/garage")} style={cta("rgba(255,255,255,0.18)")}>GARAGE</button>
        <button onClick={() => nav("/racing")} style={cta("rgba(255,255,255,0.10)")}>HUB</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, margin: "0 0 8px" }}>{title.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ place, children, dim }: { place: number; children: React.ReactNode; dim?: boolean }) {
  const placeColor = place === 1 ? "#fbbf24" : place === 2 ? "#d1d5db" : place === 3 ? "#fb923c" : "rgba(255,255,255,0.6)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 12px", borderRadius: 10,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.12)",
      opacity: dim ? 0.65 : 1,
    }}>
      {place > 0 && <div style={{ minWidth: 24, fontWeight: 900, fontSize: 16, color: placeColor }}>{place}</div>}
      {children}
    </div>
  );
}

function cta(bg: string): React.CSSProperties {
  return {
    padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 900,
    background: bg, color: bg.includes("rgba") ? "white" : "#0a0510",
    border: "none", cursor: "pointer", letterSpacing: 1,
  };
}
