// Football Versus — Tecmo-style play-calling. Offense and defense
// each lock in their pick privately; both reveal; the engine resolves
// to a yardage outcome. Drives end on turnover-on-downs, score, or
// turnover. Match ends when the clock hits 0 in the final quarter.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { playSfx, unlockAudio } from "../../art";
import type {
  VersusPlayer, FootballState, FootballPickOffense, FootballPickDefense,
  FootballOutcome, OffensePlay, DefensePlay, Seat,
} from "../types";
import { getFootballTeam } from "../teams";
import { resolvePlay } from "../engine";
import { Handoff } from "../components/Handoff";
import { PickTimer } from "../components/PickTimer";
import { useVersusStats } from "../store";

interface Setup {
  sport: "football";
  mode: "passplay";
  quarters: number;
  pickTimerSec?: number;
  playerA: VersusPlayer;
  playerB: VersusPlayer;
}

type Phase =
  | "handoff_offense" | "offense_pick"
  | "handoff_defense" | "defense_pick"
  | "reveal" | "between" | "done";

const OFFENSE_PLAYS: { id: OffensePlay; emoji: string; label: string; flavor: string }[] = [
  { id: "run_inside",  emoji: "🏃", label: "INSIDE RUN",  flavor: "Power through the middle." },
  { id: "run_outside", emoji: "🏃‍♂️", label: "OUTSIDE RUN", flavor: "Around the edge." },
  { id: "pass_short",  emoji: "📡", label: "SHORT PASS",  flavor: "Quick, safe." },
  { id: "pass_long",   emoji: "🎯", label: "LONG PASS",   flavor: "Big yards, slow developing." },
  { id: "play_action", emoji: "🎭", label: "PLAY-ACTION", flavor: "Fake the run, throw deep." },
  { id: "screen",      emoji: "🪝", label: "SCREEN",      flavor: "Burn the blitz." },
];

const DEFENSE_PLAYS: { id: DefensePlay; emoji: string; label: string; flavor: string }[] = [
  { id: "run_stuff",  emoji: "🛡️", label: "RUN STUFF",   flavor: "Stack the box." },
  { id: "blitz",      emoji: "💥", label: "BLITZ",       flavor: "Send the heat." },
  { id: "zone_short", emoji: "🕸️", label: "SHORT ZONE",  flavor: "Take away the quick pass." },
  { id: "zone_deep",  emoji: "☁️", label: "DEEP ZONE",   flavor: "No long balls." },
  { id: "balanced",   emoji: "⚖️", label: "BALANCED",    flavor: "Solid all around." },
];

const QUARTER_LENGTH_SEC = 90;

export default function FootballVersus() {
  const navigate = useNavigate();
  const { recordMatch } = useVersusStats();

  const setup = useMemo<Setup | null>(() => {
    try {
      const raw = sessionStorage.getItem("dd_versus_setup");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.sport !== "football") return null;
      return s as Setup;
    } catch { return null; }
  }, []);

  const [state, setState] = useState<FootballState>(() => ({
    quarter: 1, quarters: setup?.quarters ?? 2,
    clock: QUARTER_LENGTH_SEC,
    possession: "A" as Seat,
    ballOn: 25, down: 1, togo: 10,
    score: [0, 0],
  }));
  const [phase, setPhase] = useState<Phase>("handoff_offense");
  const [offPick, setOffPick] = useState<FootballPickOffense | null>(null);
  const [defPick, setDefPick] = useState<FootballPickDefense | null>(null);
  const [revealOutcome, setRevealOutcome] = useState<FootballOutcome | null>(null);
  const [tdsA, setTdsA] = useState(0);
  const [tdsB, setTdsB] = useState(0);
  const [recorded, setRecorded] = useState(false);

  const offenseSeat: Seat = state.possession;
  const defenseSeat: Seat = offenseSeat === "A" ? "B" : "A";
  const offensePlayer = offenseSeat === "A" ? setup?.playerA : setup?.playerB;
  const defensePlayer = defenseSeat === "A" ? setup?.playerA : setup?.playerB;
  const offTeam = offensePlayer ? getFootballTeam(offensePlayer.teamId) : undefined;
  const defTeam = defensePlayer ? getFootballTeam(defensePlayer.teamId) : undefined;

  useEffect(() => {
    if (phase !== "done" || recorded || !setup) return;
    setRecorded(true);
    if (state.score[0] === state.score[1]) return;
    const aWon = state.score[0] > state.score[1];
    recordMatch({
      sport: "football", youWon: aWon,
      opponentProfileId: setup.playerB.profileId,
      touchdownsScored: tdsA,
    });
    recordMatch({
      sport: "football", youWon: !aWon,
      opponentProfileId: setup.playerA.profileId,
      touchdownsScored: tdsB,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorded]);

  if (!setup || !offensePlayer || !defensePlayer || !offTeam || !defTeam) {
    return <NoSetupFallback onBack={() => navigate("/versus")} />;
  }

  function lockOffense(p: FootballPickOffense) {
    setOffPick(p);
    setPhase("handoff_defense");
  }
  function lockDefense(p: FootballPickDefense) {
    setDefPick(p);
    const outcome = resolvePlay(offPick!, p, offTeam!, defTeam!, state.ballOn, state.togo);
    setRevealOutcome(outcome);
    setPhase("reveal");
    setTimeout(() => applyOutcome(outcome), 1400);
  }

  function applyOutcome(o: FootballOutcome) {
    setState(prev => {
      const next: FootballState = { ...prev };
      const offIdx = next.possession === "A" ? 0 : 1;
      let possessionChange = false;
      // Clock ticks ~ play length.
      next.clock = Math.max(0, next.clock - 6);

      switch (o.kind) {
        case "touchdown": {
          next.score[offIdx] += 7;
          if (next.possession === "A") setTdsA(t => t + 1); else setTdsB(t => t + 1);
          next.lastEvent = "🏈 TOUCHDOWN! +7";
          playSfx("crowdCheer", { volume: 0.7 });
          playSfx("ding", { volume: 0.7, pitch: 1.6 });
          possessionChange = true;
          break;
        }
        case "gain": {
          next.ballOn = Math.min(99, next.ballOn + o.yards);
          if (o.firstDown) {
            next.down = 1;
            next.togo = 10;
          } else {
            next.down = (next.down + 1) as 1 | 2 | 3 | 4;
            next.togo = Math.max(1, next.togo - o.yards);
          }
          next.lastEvent = `+${o.yards} yards${o.firstDown ? " — FIRST DOWN" : ""}`;
          break;
        }
        case "loss":
        case "sack": {
          next.ballOn = Math.max(1, next.ballOn + o.yards);
          next.down = (next.down + 1) as 1 | 2 | 3 | 4;
          next.togo = Math.min(40, next.togo - o.yards);
          next.lastEvent = o.kind === "sack" ? `🛡️ SACK ${o.yards}` : `Loss of ${Math.abs(o.yards)}`;
          break;
        }
        case "incomplete":
          next.down = (next.down + 1) as 1 | 2 | 3 | 4;
          next.lastEvent = "Incomplete pass";
          break;
        case "interception":
          next.lastEvent = "🎯 INTERCEPTION!";
          possessionChange = true;
          break;
        case "fumble":
          next.lastEvent = "💥 FUMBLE!";
          possessionChange = true;
          break;
        case "fieldgoal_made":
          next.score[offIdx] += 3;
          next.lastEvent = "FIELD GOAL IS GOOD! +3";
          possessionChange = true;
          break;
        case "fieldgoal_miss":
          next.lastEvent = "Field goal MISSED";
          possessionChange = true;
          break;
        case "punt":
          next.lastEvent = `Punt — ${o.netYards} net`;
          next.ballOn = 100 - (next.ballOn + o.netYards);
          possessionChange = true;
          break;
      }

      // 4th down turnover-on-downs.
      if (!possessionChange && next.down > 4) {
        next.lastEvent = (next.lastEvent ?? "") + " · TURNOVER ON DOWNS";
        possessionChange = true;
      }

      if (possessionChange) {
        next.possession = next.possession === "A" ? "B" : "A";
        next.down = 1;
        next.togo = 10;
        next.ballOn = next.lastEvent?.startsWith("Punt") ? Math.min(80, next.ballOn) : 25;
      }

      // Quarter / match end.
      if (next.clock <= 0) {
        if (next.quarter >= next.quarters) {
          setPhase("done");
        } else {
          next.quarter = (next.quarter + 1);
          next.clock = QUARTER_LENGTH_SEC;
          next.lastEvent = `End of Q${next.quarter - 1}`;
        }
      }
      return next;
    });

    setOffPick(null);
    setDefPick(null);
    setRevealOutcome(null);
    setTimeout(() => {
      setState(curr => {
        if (curr.clock <= 0 && curr.quarter >= curr.quarters) {
          setPhase("done");
        } else {
          setPhase("handoff_offense");
        }
        return curr;
      });
    }, 900);
  }

  const aLabel = setup.playerA.profileName;
  const bLabel = setup.playerB.profileName;
  const aTeam = offenseSeat === "A" ? offTeam : defTeam;
  const bTeam = offenseSeat === "B" ? offTeam : defTeam;
  // Actually we want fixed-by-player team display:
  const aT = setup.playerA.teamId === offTeam.id ? offTeam : defTeam;
  const bT = setup.playerB.teamId === offTeam.id ? offTeam : defTeam;
  // (The above mapping is brittle if A and B picked same team — guard:)
  const playerATeam = getFootballTeam(setup.playerA.teamId)!;
  const playerBTeam = getFootballTeam(setup.playerB.teamId)!;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, ${offTeam.primary}22, transparent 60%), ` +
          "linear-gradient(180deg, #0a1408 0%, #050a03 100%)",
      }}>
      {/* Stadium turf — bottom-fade tiled field */}
      <div aria-hidden="true" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, height: 240, zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `url("/assets/kenney/sports-pack/Tilesheet/groundGrass_mownWide.png")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 64px",
        imageRendering: "pixelated",
        opacity: 0.32,
        maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 100%)",
      }} />
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/versus")} aria-label="Quit match"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>FOOTBALL VERSUS</div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>
            {playerATeam.abbr} {state.score[0]} · {playerBTeam.abbr} {state.score[1]}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        <FieldScoreboard state={state}
          aLabel={aLabel} aTeam={playerATeam.abbr}
          bLabel={bLabel} bTeam={playerBTeam.abbr} />

        {phase === "offense_pick" && (
          <OffensePickScreen
            playerName={offensePlayer.profileName}
            playerColor={offensePlayer.profileColor}
            onLock={lockOffense}
            pickTimerSec={setup.pickTimerSec}
            resetKey={`o_${state.quarter}_${state.down}_${state.togo}_${state.ballOn}`}
          />
        )}
        {phase === "defense_pick" && (
          <DefensePickScreen
            playerName={defensePlayer.profileName}
            playerColor={defensePlayer.profileColor}
            onLock={lockDefense}
            pickTimerSec={setup.pickTimerSec}
            resetKey={`d_${state.quarter}_${state.down}_${state.togo}_${state.ballOn}`}
          />
        )}
        {phase === "reveal" && offPick && defPick && revealOutcome && (
          <RevealCardFB offPick={offPick} defPick={defPick} outcome={revealOutcome} />
        )}
        {phase === "done" && (
          <FinalCardFB state={state}
            aName={aLabel} aTeam={playerATeam.abbr}
            bName={bLabel} bTeam={playerBTeam.abbr}
            onPlayAgain={() => {
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(setup)); } catch {}
              location.reload();
            }}
            onSwitchSides={() => {
              const swapped = { ...setup, playerA: setup.playerB, playerB: setup.playerA };
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(swapped)); } catch {}
              location.reload();
            }}
            onHome={() => navigate("/versus")}
          />
        )}
      </main>

      <AnimatePresence>
        {phase === "handoff_offense" && (
          <Handoff
            toName={offensePlayer.profileName}
            toColor={offensePlayer.profileColor}
            prompt="Pick your play. Run it, throw it, trick them."
            onReady={() => setPhase("offense_pick")} />
        )}
        {phase === "handoff_defense" && (
          <Handoff
            toName={defensePlayer.profileName}
            toColor={defensePlayer.profileColor}
            prompt="Read your gut. Blitz? Cover? Stuff the run?"
            onReady={() => setPhase("defense_pick")} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldScoreboard({ state, aLabel, aTeam, bLabel, bTeam }: {
  state: FootballState; aLabel: string; aTeam: string; bLabel: string; bTeam: string;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,184,28,0.30)" }}>
      <div className="grid grid-cols-3 items-center gap-2">
        <div className="text-center" style={{ opacity: state.possession === "A" ? 1 : 0.6 }}>
          <div className="text-[9px] tracking-widest" style={{ color: state.possession === "A" ? "#86efac" : "#9aa6bf" }}>
            {state.possession === "A" ? "🏈 OFFENSE" : "DEFENSE"}
          </div>
          <div className="font-display text-base" style={{ color: "#fef3c7" }}>{aLabel}</div>
          <div className="text-[10px] opacity-70">{aTeam}</div>
          <div className="font-display text-3xl mt-1" style={{ color: "#fde047" }}>{state.score[0]}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] tracking-[0.3em]" style={{ color: "#FFB81C" }}>
            Q{state.quarter} · {Math.floor(state.clock / 60)}:{String(state.clock % 60).padStart(2, "0")}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "#fef3c7" }}>
            {state.down === 1 ? "1st" : state.down === 2 ? "2nd" : state.down === 3 ? "3rd" : "4th"} &amp; {state.togo}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
            ball on {state.ballOn}
          </div>
        </div>
        <div className="text-center" style={{ opacity: state.possession === "B" ? 1 : 0.6 }}>
          <div className="text-[9px] tracking-widest" style={{ color: state.possession === "B" ? "#86efac" : "#9aa6bf" }}>
            {state.possession === "B" ? "🏈 OFFENSE" : "DEFENSE"}
          </div>
          <div className="font-display text-base" style={{ color: "#fef3c7" }}>{bLabel}</div>
          <div className="text-[10px] opacity-70">{bTeam}</div>
          <div className="font-display text-3xl mt-1" style={{ color: "#fde047" }}>{state.score[1]}</div>
        </div>
      </div>
      {/* Field visualization — ball position bar */}
      <div className="relative h-3 rounded-full mt-3" style={{ background: "rgba(22,101,52,0.55)", border: "1px solid rgba(255,184,28,0.30)" }}>
        <div className="absolute inset-y-0 left-0 right-0 flex justify-between px-2 text-[8px] opacity-70" style={{ color: "#fde047" }}>
          {[10,20,30,40,50,40,30,20,10].map((y, i) => <span key={i}>{y}</span>)}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded"
          style={{
            left: `${state.possession === "A" ? state.ballOn : 100 - state.ballOn}%`,
            background: "#fef3c7",
          }} />
      </div>
      {state.lastEvent && (
        <div className="text-[11px] text-center mt-2 italic" style={{ color: "#fde047" }}>
          {state.lastEvent}
        </div>
      )}
    </section>
  );
}

function OffensePickScreen({ playerName, playerColor, onLock, pickTimerSec, resetKey }: {
  playerName: string; playerColor: string; onLock: (p: FootballPickOffense) => void;
  pickTimerSec?: number;
  resetKey: string | number;
}) {
  const [play, setPlay] = useState<OffensePlay>("run_inside");
  useEffect(() => { setPlay("run_inside"); }, [resetKey]);
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${playerColor}22, rgba(10,10,20,0.95))`,
        border: `1.5px solid ${playerColor}`,
      }}>
      {pickTimerSec && pickTimerSec > 0 && (
        <PickTimer durationSec={pickTimerSec} resetKey={resetKey}
          onExpire={() => onLock({ play })} />
      )}
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: playerColor }}>{playerName.toUpperCase()} · OFFENSE</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {OFFENSE_PLAYS.map(o => (
          <button key={o.id} onClick={() => setPlay(o.id)}
            className="rounded-lg p-2 pressable touch-target text-left"
            style={{
              background: play === o.id ? `${playerColor}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${play === o.id ? playerColor : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{o.emoji}</span>
              <span className="font-display tracking-widest text-[11px]" style={{ color: "#fef3c7" }}>{o.label}</span>
            </div>
            <div className="text-[9px] mt-0.5 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>{o.flavor}</div>
          </button>
        ))}
      </div>
      <button onClick={() => onLock({ play })}
        className="w-full py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: playerColor, color: "#0a0a14", minHeight: 52 }}>
        🔒 LOCK PLAY
      </button>
    </section>
  );
}

function DefensePickScreen({ playerName, playerColor, onLock, pickTimerSec, resetKey }: {
  playerName: string; playerColor: string; onLock: (p: FootballPickDefense) => void;
  pickTimerSec?: number;
  resetKey: string | number;
}) {
  const [play, setPlay] = useState<DefensePlay>("balanced");
  useEffect(() => { setPlay("balanced"); }, [resetKey]);
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${playerColor}22, rgba(10,10,20,0.95))`,
        border: `1.5px solid ${playerColor}`,
      }}>
      {pickTimerSec && pickTimerSec > 0 && (
        <PickTimer durationSec={pickTimerSec} resetKey={resetKey}
          onExpire={() => onLock({ play })} />
      )}
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: playerColor }}>{playerName.toUpperCase()} · DEFENSE</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {DEFENSE_PLAYS.map(d => (
          <button key={d.id} onClick={() => setPlay(d.id)}
            className="rounded-lg p-2 pressable touch-target text-left"
            style={{
              background: play === d.id ? `${playerColor}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${play === d.id ? playerColor : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{d.emoji}</span>
              <span className="font-display tracking-widest text-[11px]" style={{ color: "#fef3c7" }}>{d.label}</span>
            </div>
            <div className="text-[9px] mt-0.5 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>{d.flavor}</div>
          </button>
        ))}
      </div>
      <button onClick={() => onLock({ play })}
        className="w-full py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: playerColor, color: "#0a0a14", minHeight: 52 }}>
        🔒 LOCK CALL
      </button>
    </section>
  );
}

function RevealCardFB({ offPick, defPick, outcome }: {
  offPick: FootballPickOffense; defPick: FootballPickDefense; outcome: FootballOutcome;
}) {
  const big = outcome.kind === "touchdown" || outcome.kind === "interception" || outcome.kind === "fumble" || (outcome.kind === "gain" && outcome.yards >= 15);
  return (
    <motion.section initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 text-center"
      style={{
        background: big
          ? "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))"
          : "rgba(0,0,0,0.55)",
        border: `1.5px solid ${big ? "#fde047" : "rgba(255,255,255,0.15)"}`,
        boxShadow: big ? "0 0 30px rgba(253,224,71,0.4)" : undefined,
      }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#fde047" }}>REVEAL!</div>
      <div className="grid grid-cols-2 gap-3 text-[12px] mb-2">
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#86efac" }}>OFFENSE CALLED</div>
          <div style={{ color: "#fef3c7" }}>
            {OFFENSE_PLAYS.find(o => o.id === offPick.play)?.emoji}{" "}
            {OFFENSE_PLAYS.find(o => o.id === offPick.play)?.label}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#fca5a5" }}>DEFENSE CALLED</div>
          <div style={{ color: "#fef3c7" }}>
            {DEFENSE_PLAYS.find(d => d.id === defPick.play)?.emoji}{" "}
            {DEFENSE_PLAYS.find(d => d.id === defPick.play)?.label}
          </div>
        </div>
      </div>
      <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }}
        className="font-display text-2xl tracking-wider mt-2"
        style={{ color: big ? "#fde047" : "#fef3c7" }}>
        {outcomeLabelFB(outcome)}
      </motion.div>
    </motion.section>
  );
}

function outcomeLabelFB(o: FootballOutcome): string {
  switch (o.kind) {
    case "touchdown": return "🏈 TOUCHDOWN!";
    case "interception": return "🎯 INTERCEPTION!";
    case "fumble": return "💥 FUMBLE!";
    case "gain": return `+${o.yards} yards${o.firstDown ? " · FIRST DOWN" : ""}`;
    case "loss": return `Loss of ${Math.abs(o.yards)}`;
    case "sack": return `🛡️ SACK · ${o.yards}`;
    case "incomplete": return "Incomplete";
    case "fieldgoal_made": return "FIELD GOAL!";
    case "fieldgoal_miss": return "MISSED";
    case "punt": return `Punt · ${o.netYards}`;
  }
}

function FinalCardFB({ state, aName, aTeam, bName, bTeam, onPlayAgain, onSwitchSides, onHome }: {
  state: FootballState; aName: string; aTeam: string; bName: string; bTeam: string;
  onPlayAgain: () => void; onSwitchSides: () => void; onHome: () => void;
}) {
  const tied = state.score[0] === state.score[1];
  const aWon = state.score[0] > state.score[1];
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))",
        border: "2px solid #fde047",
      }}>
      <Trophy size={32} style={{ color: "#fde047", margin: "0 auto" }} />
      <div className="font-display text-2xl tracking-wider mt-2" style={{ color: "#fde047" }}>
        {tied ? "TIE GAME" : `${aWon ? aName : bName} WINS!`}
      </div>
      <div className="text-[14px] mt-1" style={{ color: "#fef3c7" }}>
        {aTeam} {state.score[0]} — {state.score[1]} {bTeam}
      </div>
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
        <button onClick={onPlayAgain}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "#fde047", color: "#0a0a14" }}>
          🔁 REMATCH
        </button>
        <button onClick={onSwitchSides}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(167,139,250,0.30)", border: "1px solid #a78bfa", color: "#a78bfa" }}>
          🔄 SWITCH SIDES
        </button>
        <button onClick={onHome}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
          HOME
        </button>
      </div>
    </motion.section>
  );
}

function NoSetupFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center"
      style={{ background: "#050308", color: "#fef3c7" }}>
      <div>
        <div className="font-display text-lg mb-2" style={{ color: "#fde047" }}>No match set up.</div>
        <button onClick={onBack}
          className="px-4 py-2 rounded-full"
          style={{ background: "#FFB81C", color: "#0a0a14" }}>
          Pick teams &amp; players
        </button>
      </div>
    </div>
  );
}
