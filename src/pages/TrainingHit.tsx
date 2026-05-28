// V3.1 — Practice Hitting: MLB The Show batter POV. One tap = full swing outcome.
// No quality buttons. Tap location IS the input.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { PitcherOnMound, generatePitcherHotZones } from "../components/PitcherOnMound";
import { ConfettiBurst } from "../components/ConfettiBurst";
import { CameraCoach } from "../components/CameraCoach";
import { logSwing } from "../engine/trainingCamp";
import { getHittingFeedback } from "../utils/aiCoach";
import type { Player } from "../store/types";
import { ArrowLeft, Undo2, Shuffle, Sparkles } from "lucide-react";

type SwingOutcome = { text: string; emoji: string; pitcherState: any; coach?: string; loadingCoach?: boolean; endsAtBat?: boolean };
type AtBatState = { balls: number; strikes: number; pitches: number };

export default function TrainingHit() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const t = league.training!;
  const [outcomeLog, setOutcomeLog] = useState<SwingOutcome[]>([]);
  const [pitcherIdx, setPitcherIdx] = useState<number>(0);
  const [pitcherState, setPitcherState] = useState<"idle" | "windup" | "release" | "followthrough" | "strike" | "hrAllowed">("idle");
  const [coachLine, setCoachLine] = useState<string>("");
  const [formScore, setFormScore] = useState<number | null>(null);
  const [atBat, setAtBat] = useState<AtBatState>({ balls: 0, strikes: 0, pitches: 0 });
  const [atBatStats, setAtBatStats] = useState({ k: 0, bb: 0, h: 0, hr: 0, outs: 0 });
  const [hrFlash, setHrFlash] = useState<number | null>(null);

  const lastSession = t.sessions.filter(s => s.kind === "hitting").slice(-1)[0];
  const sessionSwings = lastSession?.swings ?? [];
  const userTeam = league.teams.find(tm => tm.id === league.userTeamId) ?? league.teams.find(tm => tm.id === t.henryProfile.teamId) ?? null;

  const availablePitchers = useMemo(() => {
    const userTeamId = league.userTeamId ?? userTeam?.id;
    const opposing = league.players.filter(p => p.isPitcher && p.teamId && p.teamId !== userTeamId);
    return (opposing.length > 0 ? opposing : league.players.filter(p => p.isPitcher)).slice(0, 24);
  }, [league.players, league.userTeamId, userTeam]);

  const currentPitcher: Player | null = availablePitchers[pitcherIdx % Math.max(1, availablePitchers.length)] ?? null;
  const velo = currentPitcher?.ratings.pitches?.[0]?.velo ?? 88;
  const ctrl = currentPitcher?.ratings.pitches?.[0]?.ctrl ?? 60;

  const hotZones = useMemo(() => {
    if (!currentPitcher) return undefined;
    return generatePitcherHotZones(velo, ctrl, currentPitcher.portraitSeed);
  }, [currentPitcher?.id]);

  const nextPitcher = () => {
    setPitcherIdx(i => (i + 1) % Math.max(1, availablePitchers.length));
    setPitcherState("idle");
    setAtBat({ balls: 0, strikes: 0, pitches: 0 });
  };

  const onSwing = (zx: number, zy: number, inZone: boolean) => {
    let outcome: SwingOutcome;
    let quality: "crushed" | "okay" | "weak" | "whiff" = "okay";
    let endsAtBat = false;
    let resultStat: "k" | "bb" | "h" | "hr" | "out" | null = null;
    let nextBalls = atBat.balls;
    let nextStrikes = atBat.strikes;

    if (!inZone) {
      // Henry took it / let it go by — outside the strike zone is a ball
      outcome = { text: "Took it — ball off the plate.", emoji: "✋", pitcherState: "idle" };
      nextBalls = Math.min(4, atBat.balls + 1);
      quality = "okay";
    } else {
      // Inside zone — Henry swung. Tap location infers quality.
      const distFromCenter = Math.hypot(zx - 0.5, zy - 0.5);
      if (distFromCenter < 0.20) quality = "crushed";
      else if (distFromCenter < 0.36) quality = "okay";
      else quality = "weak";

      // Pitcher quality bumps whiff chance
      const pitcherDiff = (velo - 80) / 25 + (ctrl - 50) / 120;
      const luck = Math.random();
      if (luck < 0.10 + pitcherDiff * 0.12) quality = "whiff";

      if (quality === "whiff") {
        outcome = { text: swingMissNarration(), emoji: "💨", pitcherState: "strike" };
        nextStrikes = Math.min(3, atBat.strikes + 1);
      } else {
        // Foul ball chance — about 25% of contact in real ball
        const fouled = Math.random() < (quality === "weak" ? 0.35 : quality === "okay" ? 0.25 : 0.18);
        if (fouled) {
          outcome = { text: hitFoulNarration(zx), emoji: "🟫", pitcherState: "followthrough" };
          nextStrikes = atBat.strikes < 2 ? atBat.strikes + 1 : atBat.strikes;
        } else {
          // Ball in play — at-bat ends
          if (quality === "crushed") {
            const isHomer = zy < 0.45 && Math.random() < 0.55;
            if (isHomer) {
              outcome = { text: hrNarration(zx), emoji: "💥", pitcherState: "hrAllowed" };
              resultStat = "hr";
            } else if (Math.random() < 0.6) {
              outcome = { text: extraBaseNarration(zx, zy), emoji: "⚾", pitcherState: "followthrough" };
              resultStat = "h";
            } else {
              outcome = { text: singleNarration(zx, zy), emoji: "🟢", pitcherState: "followthrough" };
              resultStat = "h";
            }
          } else if (quality === "okay") {
            if (Math.random() < 0.45) {
              outcome = { text: singleNarration(zx, zy), emoji: "🟢", pitcherState: "followthrough" };
              resultStat = "h";
            } else {
              outcome = { text: groundOutNarration(zx, zy), emoji: "🪨", pitcherState: "strike" };
              resultStat = "out";
            }
          } else {
            outcome = zy > 0.65
              ? { text: weakGrounderNarration(), emoji: "🪨", pitcherState: "strike" }
              : { text: popOutNarration(), emoji: "🎈", pitcherState: "strike" };
            resultStat = "out";
          }
          endsAtBat = true;
        }
      }
    }

    // Strikeout?
    if (nextStrikes >= 3) {
      outcome = { ...outcome, text: outcome.text.includes("through") || outcome.text.includes("miss") ? "STRIKE THREE — swung through it. K." : "STRIKE THREE — caught looking!", emoji: "❌", pitcherState: "strike" };
      endsAtBat = true;
      resultStat = "k";
    }
    // Walk?
    if (nextBalls >= 4) {
      outcome = { text: "Ball four — Henry walks to first base.", emoji: "🚶", pitcherState: "idle" };
      endsAtBat = true;
      resultStat = "bb";
    }

    outcome.endsAtBat = endsAtBat;
    outcome.loadingCoach = true;

    // Stats
    setAtBat({ balls: endsAtBat ? 0 : nextBalls, strikes: endsAtBat ? 0 : nextStrikes, pitches: atBat.pitches + 1 });
    if (resultStat) {
      setAtBatStats(s => ({
        ...s,
        [resultStat === "h" ? "h" : resultStat === "hr" ? "hr" : resultStat === "k" ? "k" : resultStat === "bb" ? "bb" : "outs"]: (s as any)[resultStat === "h" ? "h" : resultStat === "hr" ? "hr" : resultStat === "k" ? "k" : resultStat === "bb" ? "bb" : "outs"] + 1
      }));
      if (resultStat === "hr") setHrFlash(Date.now());
    }

    // Log to engine
    mutate(lg => { logSwing(lg, { quality, netX: zx, netY: zy, formScore: formScore ?? undefined }); });

    setPitcherState(outcome.pitcherState);
    setOutcomeLog(prev => [outcome, ...prev].slice(0, 6));
    setCoachLine(coach(quality, zy));
    setFormScore(null);

    setTimeout(() => setPitcherState("idle"), 1200);
    if (endsAtBat) setTimeout(nextPitcher, 1800);

    // Fire AI coaching feedback
    const apiKey = t.settings.anthropicApiKey || "";
    const recentSwings = (sessionSwings.slice(-5).map(s => s.quality) as any);
    getHittingFeedback({
      netX: zx,
      netY: zy,
      zoneCol: Math.min(2, Math.max(0, Math.floor(zx * 3))),
      zoneRow: Math.min(2, Math.max(0, Math.floor(zy * 3))),
      heat: hotZones?.[Math.min(2, Math.max(0, Math.floor(zy * 3)))]?.[Math.min(2, Math.max(0, Math.floor(zx * 3)))] ?? 0.5,
      quality,
      pitcherVelo: velo,
      pitcherControl: ctrl,
      recentSwings,
      outcomeText: outcome.text,
      henryName: t.henryProfile.name,
    }, apiKey).then(coachLine => {
      setOutcomeLog(prev => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], coach: coachLine, loadingCoach: false };
        return next;
      });
    });
  };

  const undo = async () => {
    await mutate(lg => {
      const ls = lg.training?.sessions.filter(s => s.kind === "hitting").slice(-1)[0];
      if (ls?.swings?.length) {
        const removed = ls.swings.pop();
        if (removed?.quality === "crushed") lg.training!.totalCrushedHits -= 1;
        lg.training!.totalSwings = Math.max(0, lg.training!.totalSwings - 1);
      }
    });
    setOutcomeLog(l => l.slice(1));
  };

  return (
    <div className="space-y-4 pb-24">
      <ConfettiBurst trigger={hrFlash} showBanner={true} />
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Practice</div>
          <h1 className="font-display text-3xl">🏏 HITTING</h1>
        </div>
        <button onClick={nextPitcher} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1"><Shuffle size={14}/>New pitcher</button>
        <button onClick={undo} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1"><Undo2 size={14}/>Undo</button>
      </header>

      {coachLine && (
        <div className="glass rounded-xl p-3 text-sm border-l-4 border-accent">{coachLine}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <PitcherOnMound
          hotZones={hotZones}
          team={currentPitcher && league.teams.find(t => t.id === currentPitcher.teamId) || userTeam}
          throws={currentPitcher?.throws === "L" ? "L" : "R"}
          pitcherName={currentPitcher?.name}
          velo={velo}
          control={ctrl}
          onSwing={onSwing}
          spriteState={pitcherState}
        />

        <div className="space-y-3">
          {outcomeLog.length > 0 && (
            <div className="glass rounded-2xl p-4 card-elevated">
              <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-2">Play by play</div>
              <ul className="space-y-3">
                {outcomeLog.slice(0, 5).map((o, i) => (
                  <li key={i} className={`text-sm border-b border-white/5 last:border-b-0 pb-2 last:pb-0 ${i === 0 ? "" : "opacity-75"}`}>
                    <div className={`flex items-center gap-2 ${i === 0 ? "font-medium text-white" : "text-ink-200"}`}>
                      <span className="text-xl">{o.emoji}</span>
                      <span>{o.text}</span>
                    </div>
                    {i === 0 && (o.loadingCoach || o.coach) && (
                      <div className="flex items-start gap-1.5 mt-1.5 pl-7 text-[11px]">
                        <Sparkles size={12} className="text-accent mt-0.5 shrink-0" />
                        {o.coach
                          ? <span className="text-amber-200 leading-snug">{o.coach}</span>
                          : <span className="text-ink-300 italic">Coach Billy is thinking…</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AT-BAT COUNT */}
          <div className="glass rounded-xl p-3 card-elevated">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1.5 text-center">This at-bat</div>
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="text-[9px] text-emerald-300 uppercase tracking-widest">Balls</div>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < atBat.balls ? "bg-emerald-400" : "bg-white/10"}`} />
                  ))}
                </div>
              </div>
              <div className="font-display text-2xl text-ink-300">·</div>
              <div className="text-center">
                <div className="text-[9px] text-amber-300 uppercase tracking-widest">Strikes</div>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < atBat.strikes ? "bg-amber-400" : "bg-white/10"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SESSION SCOREBOARD */}
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest text-center mb-1">Session line</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div><div className="font-display text-lg">{atBatStats.h + atBatStats.hr}</div><div className="text-[9px] text-ink-300">H</div></div>
              <div><div className="font-display text-lg text-amber-300">{atBatStats.hr}</div><div className="text-[9px] text-ink-300">HR</div></div>
              <div><div className="font-display text-lg">{atBatStats.bb}</div><div className="text-[9px] text-ink-300">BB</div></div>
              <div><div className="font-display text-lg">{atBatStats.k}</div><div className="text-[9px] text-ink-300">K</div></div>
              <div><div className="font-display text-lg">{atBatStats.outs}</div><div className="text-[9px] text-ink-300">Out</div></div>
            </div>
            <div className="text-[10px] text-ink-300 text-center mt-1">{sessionSwings.length} swings • {sessionSwings.filter(s => s.quality === "crushed").length} crushed</div>
          </div>

          <CameraCoach mode="hitting" onRep={(s, fb) => { setFormScore(s); setCoachLine(fb); }} />
        </div>
      </div>
    </div>
  );
}

function coach(quality: string, zy: number): string {
  if (quality === "crushed" && zy > 0.4 && zy < 0.7) return "Crushed — line drive! 🔥";
  if (quality === "crushed") return "Crushed! Power swing.";
  if (quality === "whiff") return "Eyes on the ball next swing.";
  if (quality === "weak" && zy > 0.7) return "Weak grounder. Try the Two-Tee Drill to level your swing.";
  if (quality === "weak") return "Check your hands — Top Hand Drill might help.";
  return "Good rep. Keep building.";
}

// Narrator-voice helpers for the hitting screen
function hrNarration(zx: number): string {
  const side = zx < 0.4 ? "to deep right" : zx > 0.6 ? "to deep left" : "to dead center";
  return `Absolutely launched ${side} — HOME RUN! 💥`;
}
function extraBaseNarration(zx: number, zy: number): string {
  const side = zx < 0.4 ? "into the right-center gap" : zx > 0.6 ? "down the left-field line" : "off the wall in center";
  return `Smoked ${side} — Henry's standing up at second!`;
}
function singleNarration(zx: number, _zy: number): string {
  if (zx < 0.35) return "Lined into right field for a single.";
  if (zx > 0.65) return "Smacked into left for a single.";
  return "Up the middle — base hit!";
}
function groundOutNarration(zx: number, _zy: number): string {
  if (zx < 0.35) return "Grounded sharply to the right side — out at first.";
  if (zx > 0.65) return "Grounder to short — they get him at first.";
  return "Hit it back at the pitcher — out at first.";
}
function weakGrounderNarration(): string {
  const options = ["Roller back to the mound — easy out.", "Soft grounder to second — routine play.", "Chopper to third — out at first."];
  return options[Math.floor(Math.random() * options.length)];
}
function popOutNarration(): string {
  const options = ["Popped up in foul territory — caught.", "Lazy fly to short — easy out.", "Infield fly — out."];
  return options[Math.floor(Math.random() * options.length)];
}
function hitFoulNarration(zx: number): string {
  if (zx < 0.3) return "Fouled off down the third-base line.";
  if (zx > 0.7) return "Pushed foul down the first-base line.";
  return "Fouled straight back — full cut.";
}
function swingMissNarration(): string {
  const options = ["Swung through it.", "Whiffed on it.", "Got him swinging."];
  return options[Math.floor(Math.random() * options.length)];
}
