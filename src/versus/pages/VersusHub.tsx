// Versus Mode — match setup hub. Two-player match: pick the sport,
// the play mode (Pass & Play, vs CPU, or Online), each player's
// profile and team. Once locked in, route into the game.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users } from "lucide-react";
import type { Sport, PlayMode, VersusPlayer, CpuDifficulty } from "../types";
import { BASEBALL_TEAMS, FOOTBALL_TEAMS } from "../teams";
import { BOXING_FIGHTERS } from "../boxers";
import { WRESTLING_FIGHTERS } from "../wrestlers";
import { useProfiles } from "../../profiles/store";
import { SpriteBanner } from "../components/SpriteBanner";
import { FamilyLeaderboard } from "../components/FamilyLeaderboard";
import { unlockAudio, playFx } from "../audio";

interface Pending {
  sport: Sport;
  mode: PlayMode;
  innings: number;
  quarters: number;
  /** Optional pick timer (seconds). 0 = off. */
  pickTimerSec: number;
  /** Difficulty when mode === "cpu". */
  cpuDifficulty: CpuDifficulty;
  playerA?: VersusPlayer;
  playerB?: VersusPlayer;
}

export default function VersusHub() {
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  const [p, setP] = useState<Pending>({ sport: "baseball", mode: "passplay", innings: 3, quarters: 2, pickTimerSec: 0, cpuDifficulty: "normal" });

  const teams = p.sport === "baseball" ? BASEBALL_TEAMS
              : p.sport === "football" ? FOOTBALL_TEAMS
              : p.sport === "boxing"   ? BOXING_FIGHTERS
              :                          WRESTLING_FIGHTERS;
  const accent = p.sport === "baseball" ? "#fbbf24"
               : p.sport === "football" ? "#FFB81C"
               : p.sport === "boxing"   ? "#f87171"
               :                          "#a78bfa";

  const ready = p.mode === "online" || (p.mode === "cpu"
    ? !!p.playerA && !!p.playerA.teamId && !!p.playerB && !!p.playerB.teamId
    : !!p.playerA && !!p.playerB && p.playerA.profileId !== p.playerB.profileId && !!p.playerA.teamId && !!p.playerB.teamId);

  function start() {
    if (p.mode === "online") {
      // Boxing/Wrestling online not implemented — pass-play / vs CPU only.
      if (p.sport === "boxing" || p.sport === "wrestling") return;
      navigate("/versus/online");
      return;
    }
    if (!ready) return;
    // Phase 3: unlock Web Audio on this gesture so the first bell / hit
    // is actually audible (iOS Safari requires a user gesture to resume).
    try { unlockAudio(); if (p.sport === "boxing" || p.sport === "wrestling") playFx("bell"); } catch { /* ignore */ }
    // Pass & Play and vs-CPU both go through the local game pages,
    // reading the setup blob from sessionStorage.
    try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(p)); } catch { /* ignore */ }
    const route = p.sport === "baseball"  ? "/versus/baseball"
                : p.sport === "football"  ? "/versus/football"
                : p.sport === "boxing"    ? "/versus/boxing"
                :                           "/versus/wrestling";
    navigate(route);
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          `radial-gradient(900px 600px at 30% 0%, ${accent}22, transparent 60%), ` +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: accent }}>SPORTS · VERSUS MODE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>HEAD-TO-HEAD</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {/* Phase 3 honesty banner: combat sprites are still procedural placeholders. */}
        {(p.sport === "boxing" || p.sport === "wrestling") && (
          <SpriteBanner sport={p.sport} />
        )}

        {/* Sport */}
        <Section title="SPORT" accent={accent}>
          <div className="grid grid-cols-2 gap-2">
            <PickButton selected={p.sport === "baseball"} accent="#fbbf24" emoji="⚾"
              label="BASEBALL" sub="Batter vs Pitcher"
              onClick={() => setP(s => ({ ...s, sport: "baseball" }))} />
            <PickButton selected={p.sport === "football"} accent="#FFB81C" emoji="🏈"
              label="FOOTBALL" sub="Tecmo play-calling"
              onClick={() => setP(s => ({ ...s, sport: "football" }))} />
            <PickButton selected={p.sport === "boxing"} accent="#f87171" emoji="🥊"
              label="BOXING" sub="3 rounds · KO or judges"
              onClick={() => setP(s => ({ ...s, sport: "boxing", mode: s.mode === "online" ? "passplay" : s.mode }))} />
            <PickButton selected={p.sport === "wrestling"} accent="#a78bfa" emoji="🤼"
              label="WRESTLING" sub="Hype · pin · finisher"
              onClick={() => setP(s => ({ ...s, sport: "wrestling", mode: s.mode === "online" ? "passplay" : s.mode }))} />
          </div>
        </Section>

        {/* Mode */}
        <Section title="HOW ARE YOU PLAYING?" accent={accent}>
          <div className="grid grid-cols-3 gap-2">
            <PickButton selected={p.mode === "passplay"} accent="#86efac" emoji="🎮"
              label="PASS & PLAY" sub="One device · 2P"
              onClick={() => setP(s => ({ ...s, mode: "passplay" }))} />
            <PickButton selected={p.mode === "cpu"} accent="#fbbf24" emoji="🤖"
              label="VS CPU" sub="Adaptive AI"
              onClick={() => setP(s => ({ ...s, mode: "cpu" }))} />
            <PickButton selected={p.mode === "online"} accent="#86efac" emoji="🌐"
              label="ONLINE" sub={(p.sport === "boxing" || p.sport === "wrestling") ? "Coming soon" : "Two devices"}
              disabled={p.sport === "boxing" || p.sport === "wrestling"}
              onClick={() => setP(s => ({ ...s, mode: "online" }))} />
          </div>
        </Section>

        {/* CPU difficulty */}
        {p.mode === "cpu" && (
          <Section title="CPU DIFFICULTY" accent={accent}>
            <div className="grid grid-cols-3 gap-2">
              {(["easy","normal","hard"] as CpuDifficulty[]).map(d => (
                <PickButton key={d} selected={p.cpuDifficulty === d} accent={accent}
                  emoji={d === "easy" ? "🐣" : d === "normal" ? "🎯" : "🔥"}
                  label={d.toUpperCase()}
                  sub={d === "easy" ? "more random" : d === "normal" ? "reads patterns" : "studies you"}
                  onClick={() => setP(s => ({ ...s, cpuDifficulty: d }))} />
              ))}
            </div>
          </Section>
        )}

        {/* Match length — baseball uses innings, football uses quarters,
            boxing is fixed at 3 rounds (engine const). */}
        {(p.mode === "passplay" || p.mode === "cpu") && p.sport !== "boxing" && p.sport !== "wrestling" && (
          <Section title={p.sport === "baseball" ? "INNINGS" : "QUARTERS"} accent={accent}>
            <div className="grid grid-cols-3 gap-2">
              {(p.sport === "baseball" ? [3, 5, 9] : [1, 2, 4]).map(n => {
                const sel = p.sport === "baseball" ? p.innings === n : p.quarters === n;
                return (
                  <PickButton key={n} selected={sel} accent={accent}
                    emoji="" label={`${n}`} sub=""
                    onClick={() => setP(s => p.sport === "baseball" ? { ...s, innings: n } : { ...s, quarters: n })} />
                );
              })}
            </div>
          </Section>
        )}

        {/* Pick timer */}
        {(p.mode === "passplay" || p.mode === "cpu") && (
          <Section title="PICK TIMER (OPTIONAL)" accent={accent}>
            <div className="grid grid-cols-3 gap-2">
              {[0, 15, 30].map(n => (
                <PickButton key={n} selected={p.pickTimerSec === n} accent={accent}
                  emoji="" label={n === 0 ? "OFF" : `${n}s`} sub={n === 0 ? "no pressure" : n === 15 ? "fast" : "balanced"}
                  onClick={() => setP(s => ({ ...s, pickTimerSec: n }))} />
              ))}
            </div>
          </Section>
        )}

        {/* Players */}
        {(p.mode === "passplay" || p.mode === "cpu") && (
          <>
            <PlayerPickerCard
              label={p.mode === "cpu" ? "YOU" : "PLAYER A"}
              accent={p.playerA?.profileColor ?? "#fde047"}
              chosen={p.playerA}
              opponentProfileId={p.mode === "cpu" ? undefined : p.playerB?.profileId}
              profiles={profiles}
              teams={teams}
              teamLabel={p.sport === "boxing" ? "FIGHTER" : p.sport === "wrestling" ? "WRESTLER" : "TEAM"}
              onChange={pa => setP(s => ({ ...s, playerA: pa }))}
            />
            {p.mode === "cpu" ? (
              <CpuTeamPicker
                accent="#fbbf24"
                chosen={p.playerB}
                teams={teams}
                teamLabel={p.sport === "boxing" ? "CPU FIGHTER" : p.sport === "wrestling" ? "CPU WRESTLER" : "CPU OPPONENT"}
                onChange={pb => setP(s => ({ ...s, playerB: pb }))}
              />
            ) : (
              <PlayerPickerCard
                label="PLAYER B"
                accent={p.playerB?.profileColor ?? "#86efac"}
                chosen={p.playerB}
                opponentProfileId={p.playerA?.profileId}
                profiles={profiles}
                teams={teams}
                teamLabel={p.sport === "boxing" ? "FIGHTER" : p.sport === "wrestling" ? "WRESTLER" : "TEAM"}
                onChange={pb => setP(s => ({ ...s, playerB: pb }))}
              />
            )}
          </>
        )}
        {p.mode === "online" && p.sport !== "boxing" && p.sport !== "wrestling" && (
          <section className="rounded-2xl p-4"
            style={{ background: "rgba(134,239,172,0.06)", border: "1px solid rgba(134,239,172,0.30)" }}>
            <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: "#86efac" }}>NEXT STEP</div>
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(229,231,235,0.78)" }}>
              You'll create or join a room with a 6-character code. Each player picks their team from their own device — no pre-setup needed here.
            </p>
          </section>
        )}

        {/* Start */}
        <button onClick={start} disabled={!ready}
          className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
          style={{
            background: ready ? `linear-gradient(135deg, ${accent}, #f59e0b)` : "rgba(255,255,255,0.05)",
            color: ready ? "#0a0a14" : "#9aa6bf",
            border: ready ? "none" : "1px solid rgba(255,255,255,0.15)",
            minHeight: 56,
          }}>
          <Users size={16} className="inline mr-2" /> START MATCH
        </button>

        {!ready && p.mode !== "online" && (
          <div className="text-center text-[11px] opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
            {p.mode === "cpu"
              ? (p.sport === "boxing" ? "Pick your profile + fighter, then a CPU fighter."
                 : p.sport === "wrestling" ? "Pick your profile + wrestler, then a CPU wrestler."
                 : "Pick your profile + team, then a CPU team to play against.")
              : (p.sport === "boxing" ? "Pick a different profile + fighter for each player."
                 : p.sport === "wrestling" ? "Pick a different profile + wrestler for each player."
                 : "Pick a different profile + team for each player.")}
          </div>
        )}

        {/* Phase 3: family leaderboard — boxing + wrestling W/L + KOs/finishers. */}
        <FamilyLeaderboard />
      </main>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: accent }}>{title}</div>
      {children}
    </section>
  );
}

function PickButton({ selected, accent, emoji, label, sub, onClick, disabled }: {
  selected: boolean; accent: string; emoji: string; label: string; sub: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="rounded-xl p-3 text-center pressable touch-target"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accent}33, rgba(10,10,20,0.85))`
          : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.12)"}`,
        opacity: disabled ? 0.45 : 1,
        minHeight: 64,
      }}>
      {emoji && <div className="text-xl">{emoji}</div>}
      <div className="font-display tracking-wide text-[12px] mt-0.5" style={{ color: selected ? accent : "#fef3c7" }}>{label}</div>
      {sub && <div className="text-[10px] mt-0.5 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>{sub}</div>}
    </motion.button>
  );
}

interface PlayerPickerProps {
  label: string;
  accent: string;
  chosen?: VersusPlayer;
  opponentProfileId?: string;
  profiles: { id: string; handle: string; name: string; color: string }[];
  teams: { id: string; name: string; emoji: string; primary: string; abbr: string }[];
  /** Defaults to "TEAM"; boxing passes "FIGHTER". */
  teamLabel?: string;
  onChange: (p: VersusPlayer | undefined) => void;
}

function PlayerPickerCard({ label, accent, chosen, opponentProfileId, profiles, teams, teamLabel, onChange }: PlayerPickerProps) {
  function setProfile(profileId: string) {
    const prof = profiles.find(p => p.id === profileId);
    if (!prof) return;
    onChange({
      profileId: prof.id,
      profileName: prof.handle || prof.name,
      profileColor: prof.color,
      teamId: chosen?.teamId ?? teams[0].id,
    });
  }
  function setTeam(teamId: string) {
    if (!chosen) return;
    onChange({ ...chosen, teamId });
  }
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: chosen
          ? `linear-gradient(135deg, ${accent}1f, rgba(10,10,20,0.85))`
          : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${chosen ? accent : "rgba(255,255,255,0.12)"}`,
      }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: accent }}>{label}{teamLabel ? ` · ${teamLabel}` : ""}</div>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {profiles.map(p => {
          const sel = chosen?.profileId === p.id;
          const blocked = p.id === opponentProfileId;
          return (
            <button key={p.id} onClick={() => !blocked && setProfile(p.id)}
              disabled={blocked}
              aria-pressed={sel}
              className="px-2.5 py-1.5 rounded-full pressable touch-target text-[10px] font-display tracking-widest"
              style={{
                background: sel ? p.color : "rgba(255,255,255,0.05)",
                color: sel ? "#0a0a14" : "#fef3c7",
                border: `1px solid ${sel ? p.color : "rgba(255,255,255,0.12)"}`,
                opacity: blocked ? 0.35 : 1,
              }}>
              {(p.handle || p.name).toUpperCase()}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {teams.map(t => {
            const sel = chosen.teamId === t.id;
            return (
              <button key={t.id} onClick={() => setTeam(t.id)}
                aria-pressed={sel}
                className="shrink-0 rounded-lg px-2 py-1.5 pressable touch-target"
                style={{
                  background: sel ? t.primary : "rgba(255,255,255,0.04)",
                  border: `1px solid ${sel ? t.primary : "rgba(255,255,255,0.12)"}`,
                  color: sel ? "#fef3c7" : "rgba(229,231,235,0.78)",
                  minWidth: 64,
                }}>
                <div className="text-lg leading-none">{t.emoji}</div>
                <div className="text-[9px] tracking-widest mt-0.5 font-display">{t.abbr}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CpuTeamPicker({ accent, chosen, teams, teamLabel, onChange }: {
  accent: string;
  chosen?: VersusPlayer;
  teams: { id: string; name: string; emoji: string; primary: string; abbr: string }[];
  teamLabel?: string;
  onChange: (p: VersusPlayer | undefined) => void;
}) {
  function setTeam(teamId: string) {
    onChange({ profileId: "__cpu__", profileName: "CPU", profileColor: accent, teamId });
  }
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: chosen
          ? `linear-gradient(135deg, ${accent}1f, rgba(10,10,20,0.85))`
          : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${chosen ? accent : "rgba(255,255,255,0.12)"}`,
      }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: accent }}>{teamLabel ?? "CPU OPPONENT"}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-2xl">🤖</div>
        <div>
          <div className="font-display tracking-widest text-[12px]" style={{ color: "#fef3c7" }}>CPU</div>
          <div className="text-[10px] opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
            Adaptive AI — reads your patterns
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {teams.map(t => {
          const sel = chosen?.teamId === t.id;
          return (
            <button key={t.id} onClick={() => setTeam(t.id)}
              aria-pressed={sel}
              className="shrink-0 rounded-lg px-2 py-1.5 pressable touch-target"
              style={{
                background: sel ? t.primary : "rgba(255,255,255,0.04)",
                border: `1px solid ${sel ? t.primary : "rgba(255,255,255,0.12)"}`,
                color: sel ? "#fef3c7" : "rgba(229,231,235,0.78)",
                minWidth: 64,
              }}>
              <div className="text-lg leading-none">{t.emoji}</div>
              <div className="text-[9px] tracking-widest mt-0.5 font-display">{t.abbr}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
