// V3.1 — Practice Pitching: MLB The Show pitcher POV. One tap = full at-bat.
// No quality buttons, no result buttons. The tap location IS the input.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { BatterAtPlate, generateHotZones } from "../components/BatterAtPlate";
import { ConfettiBurst } from "../components/ConfettiBurst";
import { CameraCoach } from "../components/CameraCoach";
import { SpeedGun } from "../components/SpeedGun";
import { logPitch } from "../engine/trainingCamp";
import { getPitchingFeedback } from "../utils/aiCoach";
import type { Player } from "../store/types";
import { ArrowLeft, Undo2, Shuffle, Sparkles } from "lucide-react";

const PITCH_TYPES = ["4-Seam", "2-Seam", "Changeup", "Curve", "Slider", "Other"];

type PitchOutcome = { text: string; emoji: string; spriteState: any; coach?: string; loadingCoach?: boolean; endsAtBat?: boolean };
type AtBatState = { balls: number; strikes: number; pitches: number };

export default function TrainingPitch() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const t = league.training!;
  const [pitchType, setPitchType] = useState<string>(PITCH_TYPES[0]);
  const [outcomeLog, setOutcomeLog] = useState<PitchOutcome[]>([]);
  const [batterIdx, setBatterIdx] = useState<number>(0);
  const [spriteState, setSpriteState] = useState<"idle" | "swing" | "whiff" | "homer" | "take">("idle");
  const [formScore, setFormScore] = useState<number | null>(null);
  const [atBat, setAtBat] = useState<AtBatState>({ balls: 0, strikes: 0, pitches: 0 });
  const [atBatStats, setAtBatStats] = useState({ k: 0, bb: 0, h: 0, hr: 0, outs: 0 });
  const [hrFlash, setHrFlash] = useState<number | null>(null);
  const PITCH_LIMIT = 75; // youth arm-safety cap
  const lastSession = t.sessions.filter(s => s.kind === "pitching").slice(-1)[0];
  const sessionPitches = lastSession?.pitches ?? [];
  const userTeam = league.teams.find(tm => tm.id === league.userTeamId) ?? league.teams.find(tm => tm.id === t.henryProfile.teamId) ?? null;

  const availableBatters = useMemo(() => {
    const userTeamId = league.userTeamId ?? userTeam?.id;
    const opposing = league.players.filter(p => !p.isPitcher && p.teamId && p.teamId !== userTeamId);
    return (opposing.length > 0 ? opposing : league.players.filter(p => !p.isPitcher)).slice(0, 24);
  }, [league.players, league.userTeamId, userTeam]);

  const currentBatter: Player | null = availableBatters[batterIdx % Math.max(1, availableBatters.length)] ?? null;

  const hotZones = useMemo(() => {
    if (!currentBatter) return undefined;
    const contact = Math.round((currentBatter.ratings.contactL + currentBatter.ratings.contactR) / 2);
    const power = Math.round((currentBatter.ratings.powerL + currentBatter.ratings.powerR) / 2);
    return generateHotZones(contact, power, currentBatter.portraitSeed);
  }, [currentBatter?.id]);

  const nextBatter = () => {
    setBatterIdx(i => (i + 1) % Math.max(1, availableBatters.length));
    setSpriteState("idle");
    setAtBat({ balls: 0, strikes: 0, pitches: 0 });
  };

  // Single-tap handler — resolves ONE PITCH inside an at-bat. At-bat ends on
  // K, BB, or contact-in-play (hit or out).
  const onPitch = (zx: number, zy: number, inZone: boolean) => {
    // Map (zx, zy) into 3x3 zone column / row for stat logging
    const col = Math.min(2, Math.max(0, Math.floor(zx * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(zy * 3)));
    // Real baseball: MIDDLE-MIDDLE is the HOTTEST zone for hitters; corners are coldest.
    // Apply that as a center-bias on top of the per-batter heatmap.
    const baseHeat = hotZones?.[row]?.[col] ?? 0.5;
    const isMiddle = col === 1 && row === 1;
    const isCorner = (col === 0 || col === 2) && (row === 0 || row === 2);
    const heat = Math.max(0.1, Math.min(0.95, baseHeat + (isMiddle ? 0.18 : isCorner ? -0.15 : 0)));

    // Determine pitch result. Painted-corner pitches get called strikes ~75% of the time;
    // the rest get called balls (umpire bias). This is real MLB ump behavior.
    let result: "strike" | "painted" | "close" | "ball";
    if (!inZone) {
      result = "ball";
    } else if (isCorner) {
      result = Math.random() < 0.75 ? "painted" : "ball";
    } else {
      result = "strike";
    }

    // Pitch-type swing chance modifier — changeups + breakers harder to commit to;
    // fastballs in zone = swing-happy
    const pitchTypeSwingMod = pitchType === "Changeup" ? -0.10 : pitchType === "Curve" ? -0.07 : pitchType === "Slider" ? -0.05 : pitchType === "4-Seam" ? 0.05 : 0;

    // Lefty/righty matchup heuristic: SAME-HAND batters are 5% more comfortable;
    // platoon-disadvantage batters 5% less effective. (Henry throws R by default.)
    const batBats = currentBatter?.bats === "L" ? "L" : currentBatter?.bats === "S" ? "S" : "R";
    const pitcherThrows = t.henryProfile.throws;
    const platoonMod = batBats === "S" ? 0 : batBats === pitcherThrows ? -0.04 : 0.04;

    // Log to training stats
    mutate(lg => {
      const schemaCol = inZone ? col + 1 : (zx < 0.5 ? 0 : 3);
      const schemaRow = inZone ? row + 1 : (zy < 0.5 ? 0 : 3);
      logPitch(lg, { zoneCol: schemaCol, zoneRow: schemaRow, result, pitchType, formScore: formScore ?? undefined });
    });

    // ── Compute outcome + count progression ──
    const batContact = currentBatter ? (currentBatter.ratings.contactL + currentBatter.ratings.contactR) / 2 : 60;
    const batPower = currentBatter ? (currentBatter.ratings.powerL + currentBatter.ratings.powerR) / 2 : 60;
    const batDiscipline = currentBatter?.ratings.discipline ?? 50;

    let outcome: PitchOutcome = { text: "Ball", emoji: "🟡", spriteState: "take" };
    let endsAtBat = false;
    let resultStat: "k" | "bb" | "h" | "hr" | "out" | null = null;
    let nextBalls = atBat.balls;
    let nextStrikes = atBat.strikes;

    const swingBase = inZone ? (0.45 + heat * 0.50) : 0.18 + heat * 0.25 + (60 - batDiscipline) / 200;
    const swingChance = Math.max(0.05, Math.min(0.95, swingBase + pitchTypeSwingMod + platoonMod));
    const swung = Math.random() < swingChance;

    if (swung) {
      // Contact roll
      const contactRoll = Math.random() * 100 + (batContact - 50) * 0.5 + (heat - 0.5) * 40 - (result === "painted" ? 20 : 0);
      if (contactRoll < 25) {
        // Swing and miss
        outcome = { text: "Swing and a miss!", emoji: "💨", spriteState: "whiff" };
        nextStrikes = Math.min(3, atBat.strikes + 1);
      } else if (contactRoll < 40) {
        // Foul
        outcome = { text: foulNarration(zx), emoji: "🟫", spriteState: "swing" };
        nextStrikes = atBat.strikes < 2 ? atBat.strikes + 1 : atBat.strikes;
      } else {
        // Contact in play — at-bat ends here
        const powerRoll = Math.random() * 100 + (batPower - 50) * 0.6 + (heat - 0.5) * 30 - (result === "painted" ? 15 : 0);
        if (powerRoll > 95 && (heat > 0.55 || isMiddle)) {
          outcome = { text: hrNarration(zx, zy), emoji: "💥", spriteState: "homer" };
          resultStat = "hr";
        } else if (powerRoll > 80) {
          outcome = { text: "Drilled to the gap — extra bases!", emoji: "⚾", spriteState: "swing" };
          resultStat = "h";
        } else if (powerRoll > 55) {
          outcome = { text: hitNarration(zx, zy), emoji: "🟢", spriteState: "swing" };
          resultStat = "h";
        } else if (powerRoll > 35) {
          outcome = { text: outNarration(zx, zy, "weak"), emoji: "🪨", spriteState: "swing" };
          resultStat = "out";
        } else {
          outcome = { text: outNarration(zx, zy, "easy"), emoji: "🎈", spriteState: "swing" };
          resultStat = "out";
        }
        endsAtBat = true;
      }
    } else {
      // Took the pitch
      if (inZone) {
        outcome = result === "painted"
          ? { text: "Painted! Called strike on the black.", emoji: "🔥", spriteState: "take" }
          : { text: "Called strike. Caught looking.", emoji: "✋", spriteState: "take" };
        nextStrikes = Math.min(3, atBat.strikes + 1);
      } else {
        outcome = { text: "Off the plate — ball.", emoji: "🟡", spriteState: "take" };
        nextBalls = Math.min(4, atBat.balls + 1);
      }
    }

    // Strikeout?
    if (nextStrikes >= 3) {
      outcome = { ...outcome, text: outcome.text.includes("miss") ? "STRIKE THREE — swinging K! 🔥" : "STRIKE THREE — caught looking!", emoji: "❌", spriteState: outcome.spriteState };
      endsAtBat = true;
      resultStat = "k";
    }
    // Walk?
    if (nextBalls >= 4) {
      outcome = { text: "Ball four — walks the batter.", emoji: "🚶", spriteState: "take" };
      endsAtBat = true;
      resultStat = "bb";
    }

    outcome.endsAtBat = endsAtBat;

    // Apply count + stats
    setAtBat({ balls: endsAtBat ? 0 : nextBalls, strikes: endsAtBat ? 0 : nextStrikes, pitches: atBat.pitches + 1 });
    if (resultStat) {
      setAtBatStats(s => ({
        ...s,
        [resultStat === "h" ? "h" : resultStat === "hr" ? "hr" : resultStat === "k" ? "k" : resultStat === "bb" ? "bb" : "outs"]: (s as any)[resultStat === "h" ? "h" : resultStat === "hr" ? "hr" : resultStat === "k" ? "k" : resultStat === "bb" ? "bb" : "outs"] + 1
      }));
      if (resultStat === "hr") setHrFlash(Date.now());
    }

    // Mark as loading AI coach line. We'll fill it in async.
    outcome.loadingCoach = true;
    setSpriteState(outcome.spriteState);
    setOutcomeLog(prev => [outcome, ...prev].slice(0, 6));
    setFormScore(null);
    setTimeout(() => setSpriteState("idle"), 1200);
    // Only rotate to next batter when the at-bat is over. Otherwise stay on
    // the same batter so the count progresses.
    if (endsAtBat) setTimeout(nextBatter, 1800);

    // Fire AI coaching feedback (async — falls back to local rule-based line)
    const apiKey = t.settings.anthropicApiKey || "";
    const recentResults = (sessionPitches.slice(-5).map(p => p.result) as any);
    getPitchingFeedback({
      pitchType,
      zoneCol: inZone ? col : -1,
      zoneRow: inZone ? row : -1,
      inZone,
      heat,
      result,
      batterContact: Math.round(batContact),
      batterPower: Math.round(batPower),
      pitcherFocus: ["elbow up", "balance through release", "consistent arm slot"],
      recentResults,
      outcomeText: outcome.text,
      henryName: t.henryProfile.name,
    }, apiKey).then(coachLine => {
      setOutcomeLog(prev => {
        const next = [...prev];
        if (next[0]) {
          next[0] = { ...next[0], coach: coachLine, loadingCoach: false };
        }
        return next;
      });
    });
  };

  const undo = async () => {
    await mutate(lg => {
      const ls = lg.training?.sessions.filter(s => s.kind === "pitching").slice(-1)[0];
      if (ls?.pitches?.length) {
        const removed = ls.pitches.pop();
        if (removed?.result === "strike" || removed?.result === "painted") lg.training!.totalStrikes -= 1;
        if (removed?.result === "painted") lg.training!.totalPaintedCorners -= 1;
        lg.training!.totalPitches = Math.max(0, lg.training!.totalPitches - 1);
      }
    });
    setOutcomeLog(l => l.slice(1));
  };

  return (
    <div className="space-y-4 pb-24">
      <ConfettiBurst trigger={hrFlash} showBanner={false} />
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Practice</div>
          <h1 className="font-display text-3xl">⚾ PITCHING</h1>
        </div>
        <button onClick={nextBatter} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1"><Shuffle size={14}/>New batter</button>
        <button onClick={undo} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1"><Undo2 size={14}/>Undo</button>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* MAIN: pitcher POV */}
        <div className="space-y-3">
          <BatterAtPlate
            hotZones={hotZones}
            team={currentBatter && league.teams.find(t => t.id === currentBatter.teamId) || userTeam}
            bats={currentBatter?.bats === "L" ? "L" : "R"}
            batterName={currentBatter?.name}
            contact={currentBatter ? Math.round((currentBatter.ratings.contactL + currentBatter.ratings.contactR) / 2) : undefined}
            power={currentBatter ? Math.round((currentBatter.ratings.powerL + currentBatter.ratings.powerR) / 2) : undefined}
            onPitch={onPitch}
            spriteState={spriteState}
          />
          <div className="flex gap-1 flex-wrap justify-center">
            {PITCH_TYPES.map(p => (
              <button key={p} onClick={() => setPitchType(p)} className={`px-3 py-2 rounded-lg text-xs pressable touch-target ${pitchType === p ? "bg-accent text-ink-950 font-medium" : "bg-white/5"}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* SIDE: outcome + speed gun + camera */}
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

          {/* SESSION TOTALS */}
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest text-center mb-1">Session</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div><div className="font-display text-lg">{atBatStats.k}</div><div className="text-[9px] text-ink-300">K</div></div>
              <div><div className="font-display text-lg">{atBatStats.bb}</div><div className="text-[9px] text-ink-300">BB</div></div>
              <div><div className="font-display text-lg">{atBatStats.h + atBatStats.hr}</div><div className="text-[9px] text-ink-300">H</div></div>
              <div><div className="font-display text-lg text-amber-300">{atBatStats.hr}</div><div className="text-[9px] text-ink-300">HR</div></div>
            </div>
          </div>

          {/* PITCH COUNT / ARM SAFETY */}
          <div className={`glass rounded-xl p-3 ${atBat.pitches >= PITCH_LIMIT ? "border border-red-500/50 bg-red-500/5" : atBat.pitches >= PITCH_LIMIT * 0.7 ? "border border-amber-500/50" : ""}`}>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest text-center mb-1">
              {atBat.pitches >= PITCH_LIMIT ? "⚠ Arm should rest" : atBat.pitches >= PITCH_LIMIT * 0.7 ? "Pitch count — getting tired" : "Pitch count"}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${atBat.pitches >= PITCH_LIMIT ? "bg-red-500" : atBat.pitches >= PITCH_LIMIT * 0.7 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, (atBat.pitches / PITCH_LIMIT) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono font-bold">{atBat.pitches}/{PITCH_LIMIT}</span>
            </div>
          </div>

          {t.settings.speedGunEnabled ? <SpeedGun /> : (
            <button
              onClick={() => mutate(lg => { if (lg.training) lg.training.settings.speedGunEnabled = true; })}
              className="w-full px-3 py-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs pressable touch-target flex items-center justify-center gap-2"
            >
              ⚡ Turn on Speed Gun
            </button>
          )}

          <CameraCoach mode="pitching" onRep={(s) => setFormScore(s)} />
        </div>
      </div>
    </div>
  );
}

// Narration helpers — IGN-reviewer feedback: "use narrator voice, not flat strings"
function hrNarration(zx: number, zy: number): string {
  const side = zx < 0.4 ? "to deep left" : zx > 0.6 ? "to deep right" : "to dead center";
  const arc = zy < 0.5 ? "absolutely crushed" : "launched";
  return `${arc} ${side} — HOME RUN! 💥`;
}
function hitNarration(zx: number, zy: number): string {
  const side = zx < 0.4 ? "pulled into left" : zx > 0.6 ? "lined to right" : "shot up the middle";
  return zy < 0.5 ? `Line drive ${side} — base hit.` : `Ground ball ${side} — finds a hole, base hit.`;
}
function outNarration(zx: number, zy: number, kind: "weak" | "easy"): string {
  if (kind === "weak") {
    return zy > 0.65 ? "Weak grounder — easy out." : zx < 0.3 || zx > 0.7 ? "Lazy fly ball — corner outfielder camps under it." : "Routine fly — center has it.";
  }
  return zy > 0.7 ? "Chopper to the infield — out at first." : "Pop up — infielder calls for it.";
}
function foulNarration(zx: number): string {
  if (zx < 0.3) return "Fouled off down the third-base line.";
  if (zx > 0.7) return "Pushed foul down the first-base line.";
  return "Fouled straight back — full cut.";
}
