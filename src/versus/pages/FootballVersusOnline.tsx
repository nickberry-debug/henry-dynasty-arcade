// Football Versus — ONLINE. Same multiplayer pattern as the baseball
// online page: state lives in the room doc, host resolves picks.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Wifi, WifiOff } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import { useMatchRoom } from "../../multiplayer/useMatchRoom";
import { submitPick, advanceRound, endMatch, leaveRoom } from "../../multiplayer/match";
import type {
  FootballState, FootballPickOffense, FootballPickDefense, FootballOutcome,
  OffensePlay, DefensePlay,
} from "../types";
import { getFootballTeam } from "../teams";
import { resolvePlay } from "../engine";
import { useVersusStats } from "../store";

const QUARTER_LENGTH_SEC = 90;

const OFF: { id: OffensePlay; emoji: string; label: string }[] = [
  { id: "run_inside",  emoji: "🏃",  label: "INSIDE RUN" },
  { id: "run_outside", emoji: "🏃‍♂️", label: "OUTSIDE RUN" },
  { id: "pass_short",  emoji: "📡",  label: "SHORT PASS" },
  { id: "pass_long",   emoji: "🎯",  label: "LONG PASS" },
  { id: "play_action", emoji: "🎭",  label: "PLAY-ACTION" },
  { id: "screen",      emoji: "🪝",  label: "SCREEN" },
];
const DEF: { id: DefensePlay; emoji: string; label: string }[] = [
  { id: "run_stuff",  emoji: "🛡️", label: "RUN STUFF" },
  { id: "blitz",      emoji: "💥", label: "BLITZ" },
  { id: "zone_short", emoji: "🕸️", label: "SHORT ZONE" },
  { id: "zone_deep",  emoji: "☁️", label: "DEEP ZONE" },
  { id: "balanced",   emoji: "⚖️", label: "BALANCED" },
];

export default function FootballVersusOnline() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const profile = useActiveProfile();
  const { room, seat, hydrated } = useMatchRoom(code, profile?.id ?? null);
  const { recordMatch } = useVersusStats();
  const [recorded, setRecorded] = useState(false);

  const state = room?.sharedState as FootballState | undefined;
  const hostTeam = room?.host?.teamId ? getFootballTeam(room.host.teamId) : undefined;
  const guestTeam = room?.guest?.teamId ? getFootballTeam(room.guest.teamId) : undefined;

  // Possession in the shared state is "A" or "B". We map A=host, B=guest.
  const offenseSeat: "host" | "guest" = state?.possession === "A" ? "host" : "guest";
  const defenseSeat: "host" | "guest" = offenseSeat === "host" ? "guest" : "host";
  const myRole: "offense" | "defense" | "spectator" =
    !seat ? "spectator" :
    seat === offenseSeat ? "offense" : "defense";

  const offPick = (offenseSeat === "host" ? room?.pickA : room?.pickB) as FootballPickOffense | undefined;
  const defPick = (defenseSeat === "host" ? room?.pickA : room?.pickB) as FootballPickDefense | undefined;
  const myPick = seat === "host" ? room?.pickA : room?.pickB;
  const mySubmitted = !!myPick;
  const bothSubmitted = !!room?.pickA && !!room?.pickB;

  // Host resolves when both picks land.
  useEffect(() => {
    if (!room || !code || seat !== "host" || !bothSubmitted || room.status !== "playing" || !state) return;
    const oTeam = offenseSeat === "host" ? hostTeam : guestTeam;
    const dTeam = defenseSeat === "host" ? hostTeam : guestTeam;
    if (!oTeam || !dTeam || !offPick || !defPick) return;
    const outcome = resolvePlay(offPick, defPick, oTeam, dTeam, state.ballOn, state.togo);
    const t = setTimeout(() => {
      const { newState, ended, label } = applyOutcomeFootball(state, outcome);
      if (ended) endMatch(code, newState, label);
      else advanceRound(code, (room.round ?? 0) + 1, newState, label);
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothSubmitted, room?.round, seat]);

  // Record once on done.
  useEffect(() => {
    if (!room || room.status !== "done" || recorded || !profile) return;
    setRecorded(true);
    if (!room.guest || !state) return;
    if (state.score[0] === state.score[1]) return;
    const aWon = state.score[0] > state.score[1];
    const youWon = (seat === "host" && aWon) || (seat === "guest" && !aWon);
    const opponentProfileId = seat === "host" ? room.guest.profileId : room.host.profileId;
    recordMatch({ sport: "football", youWon, opponentProfileId });
  }, [room?.status, recorded, profile?.id]);

  if (!profile) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  if (!code) return <NotInRoom onBack={() => navigate("/versus")} />;
  if (!hydrated) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Connecting…</div>;
  if (!room) return <NotInRoom onBack={() => navigate("/versus")} />;
  if (!state || !hostTeam || !guestTeam || !room.guest) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Loading match…</div>;
  }

  function submit(p: FootballPickOffense | FootballPickDefense) {
    if (!code || !seat) return;
    void submitPick(code, seat, room!.round ?? 0, p);
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(255,184,28,0.18), transparent 60%), " +
          "linear-gradient(180deg, #0a1408 0%, #050a03 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => { if (code) void leaveRoom(code); navigate("/versus"); }}
          aria-label="Quit match"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display flex items-center gap-1" style={{ color: "#86efac" }}>
            <Wifi size={11} /> ONLINE · ROOM {room.code}
          </div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>
            {hostTeam.abbr} {state.score[0]} · {guestTeam.abbr} {state.score[1]}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-md mx-auto w-full space-y-3">
        <Scoreboard state={state}
          aName={room.host.profileName} aTeam={hostTeam.abbr}
          bName={room.guest.profileName} bTeam={guestTeam.abbr} />

        <StatusBanner mySubmitted={mySubmitted} bothSubmitted={bothSubmitted} myRole={myRole} />

        {room.status === "playing" && !mySubmitted && myRole === "offense" && (
          <PlayPicker color={profile.color} label="OFFENSE" options={OFF}
            onLock={p => submit({ play: p } as FootballPickOffense)} />
        )}
        {room.status === "playing" && !mySubmitted && myRole === "defense" && (
          <PlayPicker color={profile.color} label="DEFENSE" options={DEF}
            onLock={p => submit({ play: p } as FootballPickDefense)} />
        )}

        {bothSubmitted && room.status === "playing" && offPick && defPick && (
          <RevealCardFB offPick={offPick} defPick={defPick} />
        )}

        {room.status === "done" && (
          <FinalCard state={state}
            aName={room.host.profileName} aTeam={hostTeam.abbr}
            bName={room.guest.profileName} bTeam={guestTeam.abbr}
            onBack={() => navigate("/versus")} />
        )}
      </main>
    </div>
  );
}

function applyOutcomeFootball(prev: FootballState, o: FootballOutcome): { newState: FootballState; ended: boolean; label: string } {
  const next: FootballState = { ...prev };
  const offIdx = next.possession === "A" ? 0 : 1;
  let possessionChange = false;
  let label = "";
  next.clock = Math.max(0, next.clock - 6);
  switch (o.kind) {
    case "touchdown":
      next.score[offIdx] += 7; label = "🏈 TOUCHDOWN! +7"; possessionChange = true; break;
    case "gain":
      next.ballOn = Math.min(99, next.ballOn + o.yards);
      if (o.firstDown) { next.down = 1; next.togo = 10; }
      else { next.down = (next.down + 1) as 1 | 2 | 3 | 4; next.togo = Math.max(1, next.togo - o.yards); }
      label = `+${o.yards} yards${o.firstDown ? " — FIRST DOWN" : ""}`;
      break;
    case "loss": case "sack":
      next.ballOn = Math.max(1, next.ballOn + o.yards);
      next.down = (next.down + 1) as 1 | 2 | 3 | 4;
      next.togo = Math.min(40, next.togo - o.yards);
      label = o.kind === "sack" ? `🛡️ SACK ${o.yards}` : `Loss of ${Math.abs(o.yards)}`;
      break;
    case "incomplete":
      next.down = (next.down + 1) as 1 | 2 | 3 | 4; label = "Incomplete"; break;
    case "interception": label = "🎯 INTERCEPTION!"; possessionChange = true; break;
    case "fumble":       label = "💥 FUMBLE!"; possessionChange = true; break;
    case "fieldgoal_made": next.score[offIdx] += 3; label = "FIELD GOAL!"; possessionChange = true; break;
    case "fieldgoal_miss": label = "Field goal MISSED"; possessionChange = true; break;
    case "punt":
      next.ballOn = 100 - Math.min(99, next.ballOn + o.netYards);
      label = `Punt · ${o.netYards}`; possessionChange = true; break;
  }
  if (!possessionChange && next.down > 4) {
    label += " · TURNOVER ON DOWNS";
    possessionChange = true;
  }
  if (possessionChange) {
    next.possession = next.possession === "A" ? "B" : "A";
    next.down = 1; next.togo = 10;
    if (!label.startsWith("Punt")) next.ballOn = 25;
  }
  let ended = false;
  if (next.clock <= 0) {
    if (next.quarter >= next.quarters) ended = true;
    else { next.quarter += 1; next.clock = QUARTER_LENGTH_SEC; }
  }
  next.lastEvent = label;
  return { newState: next, ended, label };
}

function Scoreboard({ state, aName, aTeam, bName, bTeam }: {
  state: FootballState; aName: string; aTeam: string; bName: string; bTeam: string;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,184,28,0.30)" }}>
      <div className="grid grid-cols-3 items-center gap-2">
        <Cell label={aName} team={aTeam} score={state.score[0]} active={state.possession === "A"} />
        <div className="text-center">
          <div className="text-[9px] tracking-[0.3em]" style={{ color: "#FFB81C" }}>
            Q{state.quarter} · {Math.floor(state.clock / 60)}:{String(state.clock % 60).padStart(2, "0")}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "#fef3c7" }}>
            {state.down === 1 ? "1st" : state.down === 2 ? "2nd" : state.down === 3 ? "3rd" : "4th"} &amp; {state.togo}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>ball on {state.ballOn}</div>
        </div>
        <Cell label={bName} team={bTeam} score={state.score[1]} active={state.possession === "B"} />
      </div>
      {state.lastEvent && (
        <div className="text-[11px] text-center mt-2 italic" style={{ color: "#fde047" }}>{state.lastEvent}</div>
      )}
    </section>
  );
}
function Cell({ label, team, score, active }: { label: string; team: string; score: number; active: boolean }) {
  return (
    <div className="text-center" style={{ opacity: active ? 1 : 0.6 }}>
      <div className="text-[9px] tracking-widest" style={{ color: active ? "#86efac" : "#9aa6bf" }}>
        {active ? "🏈 OFFENSE" : "DEFENSE"}
      </div>
      <div className="font-display text-base" style={{ color: "#fef3c7" }}>{label}</div>
      <div className="text-[10px] opacity-70">{team}</div>
      <div className="font-display text-3xl mt-1" style={{ color: "#fde047" }}>{score}</div>
    </div>
  );
}

function StatusBanner({ mySubmitted, bothSubmitted, myRole }: {
  mySubmitted: boolean; bothSubmitted: boolean; myRole: "offense" | "defense" | "spectator";
}) {
  if (myRole === "spectator") return <Banner color="#9aa6bf" label="Watching" sub="You're not seated in this match." />;
  if (bothSubmitted) return <Banner color="#fde047" label="Both locked — revealing…" sub="Resolving the play." />;
  if (mySubmitted) return <Banner color="#86efac" label="Call LOCKED ✓" sub="Waiting on opponent…" />;
  return <Banner
    color={myRole === "offense" ? "#7dd3fc" : "#fca5a5"}
    label={myRole === "offense" ? "🏈 OFFENSE — CALL YOUR PLAY" : "🛡️ DEFENSE — READ THE PLAY"}
    sub="Hidden from your opponent until both lock in." />;
}
function Banner({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center"
      style={{ background: `${color}1a`, border: `1px solid ${color}55` }}>
      <div className="text-[10px] tracking-[0.3em] font-display" style={{ color }}>{label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.78)" }}>{sub}</div>
    </div>
  );
}

function PlayPicker<P extends string>({ color, label, options, onLock }: {
  color: string; label: string; options: { id: P; emoji: string; label: string }[]; onLock: (id: P) => void;
}) {
  const [pick, setPick] = useState<P>(options[0].id);
  return (
    <section className="rounded-2xl p-3"
      style={{ background: `linear-gradient(135deg, ${color}22, rgba(10,10,20,0.95))`, border: `1.5px solid ${color}` }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>{label}</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {options.map(o => (
          <button key={o.id} onClick={() => setPick(o.id)}
            className="rounded-lg p-2 pressable touch-target text-left"
            style={{
              background: pick === o.id ? `${color}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${pick === o.id ? color : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{o.emoji}</span>
              <span className="font-display tracking-widest text-[11px]" style={{ color: "#fef3c7" }}>{o.label}</span>
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => onLock(pick)}
        className="w-full py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: color, color: "#0a0a14", minHeight: 52 }}>
        🔒 LOCK
      </button>
    </section>
  );
}

function RevealCardFB({ offPick, defPick }: { offPick: FootballPickOffense; defPick: FootballPickDefense }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 text-center"
      style={{ background: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(253,224,71,0.5)" }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#fde047" }}>BOTH LOCKED · REVEAL!</div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#86efac" }}>OFFENSE</div>
          <div style={{ color: "#fef3c7" }}>
            {OFF.find(o => o.id === offPick.play)?.emoji} {OFF.find(o => o.id === offPick.play)?.label}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#fca5a5" }}>DEFENSE</div>
          <div style={{ color: "#fef3c7" }}>
            {DEF.find(d => d.id === defPick.play)?.emoji} {DEF.find(d => d.id === defPick.play)?.label}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FinalCard({ state, aName, aTeam, bName, bTeam, onBack }: {
  state: FootballState; aName: string; aTeam: string; bName: string; bTeam: string; onBack: () => void;
}) {
  const tied = state.score[0] === state.score[1];
  const aWon = state.score[0] > state.score[1];
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-center"
      style={{ background: "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))", border: "2px solid #fde047" }}>
      <Trophy size={32} style={{ color: "#fde047", margin: "0 auto" }} />
      <div className="font-display text-2xl tracking-wider mt-2" style={{ color: "#fde047" }}>
        {tied ? "TIE GAME" : `${aWon ? aName : bName} WINS!`}
      </div>
      <div className="text-[14px] mt-1" style={{ color: "#fef3c7" }}>
        {aTeam} {state.score[0]} — {state.score[1]} {bTeam}
      </div>
      <button onClick={onBack}
        className="mt-4 px-5 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
        style={{ background: "#fde047", color: "#0a0a14" }}>
        BACK TO VERSUS
      </button>
    </motion.section>
  );
}

function NotInRoom({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center"
      style={{ background: "#050308", color: "#fef3c7" }}>
      <div>
        <WifiOff size={28} style={{ color: "#fca5a5", margin: "0 auto" }} />
        <div className="font-display text-lg mt-2" style={{ color: "#fde047" }}>Not in a match.</div>
        <button onClick={onBack}
          className="mt-4 px-4 py-2 rounded-full font-display tracking-widest text-[11px]"
          style={{ background: "#FFB81C", color: "#0a0a14" }}>
          Versus Home
        </button>
      </div>
    </div>
  );
}
