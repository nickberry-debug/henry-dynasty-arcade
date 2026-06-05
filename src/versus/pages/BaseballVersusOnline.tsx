// Baseball Versus — ONLINE mode. State lives in the Firestore room
// doc; each client subscribes to it. The HOST is the only client that
// resolves picks (when both pickA and pickB are present) and writes
// the new shared state. Guests just submit picks and wait.
//
// Privacy: each side only sees its OWN pick UI until both have been
// submitted. Picks themselves are stored in the room doc but the UI
// hides the opponent's choice until reveal.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Wifi, WifiOff } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import { useMatchRoom } from "../../multiplayer/useMatchRoom";
import { submitPick, advanceRound, endMatch, leaveRoom } from "../../multiplayer/match";
import type {
  BaseballState, PitcherPick, BatterPick, PitchType, PitchZone, BatType, SwingChoice, PitchOutcome,
} from "../types";
import { getBaseballTeam } from "../teams";
import { resolvePitch } from "../engine";
import { useVersusStats } from "../store";

const PITCHES: { id: PitchType; emoji: string; label: string }[] = [
  { id: "fastball", emoji: "⚡", label: "Fastball" },
  { id: "curve",    emoji: "🌀", label: "Curve" },
  { id: "changeup", emoji: "🐢", label: "Changeup" },
  { id: "slider",   emoji: "↗️", label: "Slider" },
];
const ZONES: PitchZone[] = ["high", "in", "middle", "out", "low"];
const SWINGS: { id: SwingChoice; emoji: string; label: string }[] = [
  { id: "take",    emoji: "🧘", label: "Take" },
  { id: "contact", emoji: "🎯", label: "Contact" },
  { id: "power",   emoji: "💥", label: "Power" },
];

export default function BaseballVersusOnline() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const profile = useActiveProfile();
  const { room, seat, hydrated } = useMatchRoom(code, profile?.id ?? null);
  const { recordMatch } = useVersusStats();
  const [recorded, setRecorded] = useState(false);
  const [batChoice, setBatChoice] = useState<BatType>("balanced");

  const state = room?.sharedState as BaseballState | undefined;
  const hostTeam = room?.host?.teamId ? getBaseballTeam(room.host.teamId) : undefined;
  const guestTeam = room?.guest?.teamId ? getBaseballTeam(room.guest.teamId) : undefined;

  // Roles: top half — host's team bats (host=A). bottom — guest bats.
  // The pitcher for the half is whichever side is NOT batting.
  const isHostBatting = state?.topHalf === true;
  const myRole: "pitching" | "batting" | "spectator" =
    !seat ? "spectator" :
    (seat === "host" && isHostBatting) ? "batting" :
    (seat === "guest" && !isHostBatting) ? "batting" :
    "pitching";

  // Which seat the current pitcher/batter are (for picks).
  const pitcherSeat: "host" | "guest" = isHostBatting ? "guest" : "host";
  const batterSeat: "host" | "guest" = isHostBatting ? "host" : "guest";

  const pitcherPickRaw = pitcherSeat === "host" ? room?.pickA : room?.pickB;
  const batterPickRaw = batterSeat === "host" ? room?.pickA : room?.pickB;
  const myPickRaw = seat === "host" ? room?.pickA : room?.pickB;
  const mySubmitted = !!myPickRaw;
  const bothSubmitted = !!room?.pickA && !!room?.pickB;

  // ── Host: resolve when both picks are in ───────────────────────────
  useEffect(() => {
    if (!room || !code || seat !== "host" || !bothSubmitted) return;
    if (room.status !== "playing" || !state) return;
    const pitcherTeam = pitcherSeat === "host" ? hostTeam : guestTeam;
    const batterTeam = batterSeat === "host" ? hostTeam : guestTeam;
    if (!pitcherTeam || !batterTeam) return;

    const pp = pitcherPickRaw as PitcherPick;
    const bp = batterPickRaw as BatterPick;
    const outcome = resolvePitch(pp, bp, pitcherTeam, batterTeam);

    // Wait a beat so both clients see the reveal phase before state advances.
    const t = setTimeout(() => {
      const { newState, ended, label } = applyOutcomeBaseball(state, outcome);
      if (ended) {
        endMatch(code, newState, label);
      } else {
        advanceRound(code, (room.round ?? 0) + 1, newState, label);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothSubmitted, room?.round, seat]);

  // Record match result once.
  useEffect(() => {
    if (!room || room.status !== "done" || recorded || !profile) return;
    setRecorded(true);
    if (!room.guest || !state) return;
    const aWon = state.score[0] > state.score[1];
    if (state.score[0] === state.score[1]) return;
    const youWon =
      (seat === "host" && aWon) || (seat === "guest" && !aWon);
    const opponentProfileId =
      seat === "host" ? room.guest.profileId : room.host.profileId;
    recordMatch({
      sport: "baseball",
      youWon,
      opponentProfileId,
    });
  }, [room?.status, recorded, profile?.id]);

  if (!profile) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  }
  if (!code) return <NotInRoom onBack={() => navigate("/versus")} />;
  if (!hydrated) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Connecting…</div>;
  }
  if (!room) return <NotInRoom onBack={() => navigate("/versus")} />;
  if (!state || !hostTeam || !guestTeam || !room.guest) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Loading match…</div>;
  }

  // ── Submit handlers ────────────────────────────────────────────────
  function submitPitcher(pick: PitcherPick) {
    if (!code || !seat) return;
    void submitPick(code, seat, room!.round ?? 0, pick);
  }
  function submitBatter(pick: BatterPick) {
    if (!code || !seat) return;
    void submitPick(code, seat, room!.round ?? 0, pick);
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(251,191,36,0.18), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
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
          bName={room.guest.profileName} bTeam={guestTeam.abbr}
          batterIsA={isHostBatting} />

        {/* Status / opponent-pick-status banner */}
        <StatusBanner mySubmitted={mySubmitted} bothSubmitted={bothSubmitted} myRole={myRole} />

        {/* My pick UI — only show if I haven't submitted yet AND the match is playing */}
        {room.status === "playing" && !mySubmitted && myRole !== "spectator" && (
          myRole === "pitching"
            ? <PitcherPicker color={profile.color} onLock={submitPitcher} />
            : <BatterPicker color={profile.color} bat={batChoice} onChangeBat={setBatChoice} onLock={submitBatter} />
        )}

        {/* Reveal — both picks visible */}
        {bothSubmitted && room.status === "playing" && (
          <RevealCardOnline
            pitcherPick={pitcherPickRaw as PitcherPick}
            batterPick={batterPickRaw as BatterPick}
          />
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

// ── Resolution: identical to the pass-and-play applyOutcome path but
//    pure (returns the new state instead of mutating React state). ────

function applyOutcomeBaseball(prev: BaseballState, o: PitchOutcome): { newState: BaseballState; ended: boolean; label: string } {
  const next: BaseballState = { ...prev, bases: [...prev.bases] as [boolean, boolean, boolean] };
  let label = "";
  let halfEnded = false;
  const battingTeamIdx = next.topHalf ? 0 : 1;

  function advance(bases: number): { newBases: [boolean, boolean, boolean]; scored: number } {
    let scored = 0;
    const nb: [boolean, boolean, boolean] = [false, false, false];
    const cur: number[] = [];
    for (let i = 0; i < 3; i++) if (next.bases[i]) cur.push(i + 1);
    for (const sb of cur) {
      const tgt = sb + bases;
      if (tgt >= 4) scored += 1; else nb[tgt - 1] = true;
    }
    if (bases >= 1 && bases <= 3) nb[bases - 1] = true;
    else if (bases >= 4) scored += 1;
    return { newBases: nb, scored };
  }
  function recordOut() {
    next.outs += 1;
    if (next.outs >= 3) halfEnded = true;
  }

  switch (o.kind) {
    case "ball":
      next.balls += 1;
      if (next.balls >= 4) {
        const { newBases, scored } = advance(1);
        next.bases = newBases; next.score[battingTeamIdx] += scored;
        next.balls = 0; next.strikes = 0;
        label = "Walk!";
      } else label = `Ball ${next.balls}`;
      break;
    case "strike-looking": case "strike-swinging":
      next.strikes += 1;
      if (next.strikes >= 3) {
        recordOut();
        next.balls = 0; next.strikes = 0;
        label = o.kind === "strike-looking" ? "Strikeout looking!" : "Strikeout swinging!";
      } else label = o.kind === "strike-looking" ? "Called strike" : "Swing and miss";
      break;
    case "foul":
      if (next.strikes < 2) next.strikes += 1;
      label = "Foul ball";
      break;
    case "out":
      recordOut();
      next.balls = 0; next.strikes = 0;
      label = o.flavor === "fly" ? "Fly out" : o.flavor === "ground" ? "Ground out" : "Lineout";
      break;
    case "single": case "double": case "triple": {
      const n = o.kind === "single" ? 1 : o.kind === "double" ? 2 : 3;
      const { newBases, scored } = advance(n);
      next.bases = newBases; next.score[battingTeamIdx] += scored;
      next.balls = 0; next.strikes = 0;
      label = `${o.kind[0].toUpperCase() + o.kind.slice(1)}${scored ? ` — ${scored} run${scored > 1 ? "s" : ""}!` : "!"}`;
      break;
    }
    case "homer": {
      let scored = 1;
      for (let i = 0; i < 3; i++) if (next.bases[i]) scored += 1;
      next.score[battingTeamIdx] += scored;
      next.bases = [false, false, false];
      next.balls = 0; next.strikes = 0;
      label = `🚀 HOME RUN! ${scored} runs!`;
      break;
    }
    case "hbp": {
      const { newBases, scored } = advance(1);
      next.bases = newBases; next.score[battingTeamIdx] += scored;
      next.balls = 0; next.strikes = 0;
      label = "Hit by pitch!";
      break;
    }
  }
  if (halfEnded) {
    if (!next.topHalf) { next.inning += 1; next.topHalf = true; }
    else { next.topHalf = false; }
    next.outs = 0; next.balls = 0; next.strikes = 0;
    next.bases = [false, false, false];
  }
  next.lastEvent = label;
  const ended = next.inning >= next.innings && next.topHalf && next.outs === 0 && next.balls === 0 && next.strikes === 0;
  return { newState: next, ended, label };
}

// ── Sub-components ────────────────────────────────────────────────────

function Scoreboard({ state, aName, aTeam, bName, bTeam, batterIsA }: {
  state: BaseballState; aName: string; aTeam: string; bName: string; bTeam: string; batterIsA: boolean;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center justify-between gap-2">
        <Cell label={aName} team={aTeam} score={state.score[0]} active={batterIsA} />
        <div className="text-center">
          <div className="text-[9px] tracking-[0.3em]" style={{ color: "#fbbf24" }}>
            INN {state.inning + 1}{state.topHalf ? " ▲" : " ▼"} · {state.outs} OUT
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.85)" }}>
            {state.balls}-{state.strikes}
          </div>
        </div>
        <Cell label={bName} team={bTeam} score={state.score[1]} active={!batterIsA} />
      </div>
      {state.lastEvent && (
        <div className="text-[11px] text-center mt-2 italic" style={{ color: "#fde047" }}>{state.lastEvent}</div>
      )}
    </section>
  );
}
function Cell({ label, team, score, active }: { label: string; team: string; score: number; active: boolean }) {
  return (
    <div className="text-center" style={{ opacity: active ? 1 : 0.7 }}>
      <div className="text-[9px] tracking-widest" style={{ color: active ? "#86efac" : "#9aa6bf" }}>
        {active ? "AT BAT" : "PITCHING"}
      </div>
      <div className="font-display text-base" style={{ color: "#fef3c7" }}>{label}</div>
      <div className="text-[10px] opacity-70">{team}</div>
      <div className="font-display text-3xl mt-1" style={{ color: "#fde047" }}>{score}</div>
    </div>
  );
}

function StatusBanner({ mySubmitted, bothSubmitted, myRole }: {
  mySubmitted: boolean; bothSubmitted: boolean; myRole: "pitching" | "batting" | "spectator";
}) {
  if (myRole === "spectator") {
    return <Banner color="#9aa6bf" label="Watching" sub="You're not seated in this match." />;
  }
  if (bothSubmitted) return <Banner color="#fde047" label="Both locked — revealing…" sub="Resolving the pitch." />;
  if (mySubmitted) return <Banner color="#86efac" label="Pick LOCKED ✓" sub="Waiting on opponent…" />;
  return <Banner color={myRole === "pitching" ? "#fca5a5" : "#7dd3fc"}
    label={myRole === "pitching" ? "YOU'RE PITCHING" : "YOU'RE AT BAT"}
    sub="Make your pick — they can't see it." />;
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

function PitcherPicker({ color, onLock }: { color: string; onLock: (p: PitcherPick) => void }) {
  const [pitch, setPitch] = useState<PitchType>("fastball");
  const [zone, setZone] = useState<PitchZone>("middle");
  const [iball, setIball] = useState(false);
  return (
    <section className="rounded-2xl p-3"
      style={{ background: `linear-gradient(135deg, ${color}22, rgba(10,10,20,0.95))`, border: `1.5px solid ${color}` }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>PITCH TYPE</div>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PITCHES.map(p => (
          <button key={p.id} onClick={() => setPitch(p.id)}
            className="rounded-lg p-2 pressable touch-target"
            style={{
              background: pitch === p.id ? `${color}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${pitch === p.id ? color : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="text-xl">{p.emoji}</div>
            <div className="text-[9px] tracking-widest font-display mt-0.5" style={{ color: "#fef3c7" }}>{p.label}</div>
          </button>
        ))}
      </div>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>LOCATION</div>
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {ZONES.map(z => (
          <button key={z} onClick={() => { setZone(z); setIball(false); }}
            className="rounded-lg p-2 text-center pressable touch-target"
            style={{
              background: (!iball && zone === z) ? color : "rgba(255,255,255,0.04)",
              border: `1px solid ${(!iball && zone === z) ? color : "rgba(255,255,255,0.10)"}`,
              color: (!iball && zone === z) ? "#0a0a14" : "#fef3c7",
              fontSize: 10,
            }}>{z}</button>
        ))}
      </div>
      <button onClick={() => setIball(v => !v)}
        className="w-full mt-1 px-3 py-2 rounded-full text-[10px] tracking-widest pressable touch-target"
        style={{
          background: iball ? "#fbbf24" : "rgba(255,255,255,0.05)",
          color: iball ? "#0a0a14" : "#fef3c7",
          border: `1px solid ${iball ? "#fbbf24" : "rgba(255,255,255,0.12)"}`,
        }}>{iball ? "🚫 INTENTIONAL BALL · ON" : "Pitch out of zone? Tap for intentional ball"}
      </button>
      <button onClick={() => onLock({ pitch, zone, intentionalBall: iball })}
        className="w-full mt-3 py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: color, color: "#0a0a14", minHeight: 52 }}>
        🔒 LOCK PITCH
      </button>
    </section>
  );
}

function BatterPicker({ color, bat, onChangeBat, onLock }: {
  color: string; bat: BatType; onChangeBat: (b: BatType) => void; onLock: (p: BatterPick) => void;
}) {
  const [swing, setSwing] = useState<SwingChoice>("contact");
  const [guess, setGuess] = useState<PitchZone>("middle");
  return (
    <section className="rounded-2xl p-3"
      style={{ background: `linear-gradient(135deg, ${color}22, rgba(10,10,20,0.95))`, border: `1.5px solid ${color}` }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>BAT</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {(["contact", "balanced", "power"] as BatType[]).map(b => (
          <button key={b} onClick={() => onChangeBat(b)}
            className="rounded-lg p-2 pressable touch-target text-center"
            style={{
              background: bat === b ? `${color}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${bat === b ? color : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="font-display tracking-widest text-[11px]" style={{ color: "#fef3c7" }}>{b.toUpperCase()}</div>
          </button>
        ))}
      </div>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>SWING</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {SWINGS.map(s => (
          <button key={s.id} onClick={() => setSwing(s.id)}
            className="rounded-lg p-2 pressable touch-target"
            style={{
              background: swing === s.id ? `${color}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${swing === s.id ? color : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="text-xl">{s.emoji}</div>
            <div className="text-[10px] tracking-widest font-display mt-0.5" style={{ color: "#fef3c7" }}>{s.label}</div>
          </button>
        ))}
      </div>
      {swing !== "take" && (
        <>
          <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color }}>GUESS THE ZONE</div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {ZONES.map(z => (
              <button key={z} onClick={() => setGuess(z)}
                className="rounded-lg p-2 text-center pressable touch-target"
                style={{
                  background: guess === z ? color : "rgba(255,255,255,0.04)",
                  border: `1px solid ${guess === z ? color : "rgba(255,255,255,0.10)"}`,
                  color: guess === z ? "#0a0a14" : "#fef3c7",
                  fontSize: 10,
                }}>{z}</button>
            ))}
          </div>
        </>
      )}
      <button onClick={() => onLock({ swing, guess, bat })}
        className="w-full mt-1 py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: color, color: "#0a0a14", minHeight: 52 }}>
        🔒 LOCK SWING
      </button>
    </section>
  );
}

function RevealCardOnline({ pitcherPick, batterPick }: { pitcherPick: PitcherPick; batterPick: BatterPick }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 text-center"
      style={{ background: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(253,224,71,0.5)" }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#fde047" }}>BOTH LOCKED · REVEAL!</div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#fca5a5" }}>PITCH</div>
          <div style={{ color: "#fef3c7" }}>
            {pitcherPick.pitch}{pitcherPick.intentionalBall ? " · 🚫 outside" : ` · ${pitcherPick.zone}`}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#86efac" }}>SWING</div>
          <div style={{ color: "#fef3c7" }}>
            {batterPick.swing}{batterPick.swing !== "take" && ` · ${batterPick.guess}`}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FinalCard({ state, aName, aTeam, bName, bTeam, onBack }: {
  state: BaseballState; aName: string; aTeam: string; bName: string; bTeam: string; onBack: () => void;
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
          style={{ background: "#fbbf24", color: "#0a0a14" }}>
          Versus Home
        </button>
      </div>
    </div>
  );
}
