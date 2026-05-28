import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shuffle, Undo2, Sparkles } from "lucide-react";
import { BatterAtPlate, generateHotZones } from "../../components/BatterAtPlate";
import { ConfettiBurst } from "../../components/ConfettiBurst";
import { StandaloneCameraCoach } from "../components/StandaloneCameraCoach";
import { getPitchingFeedback } from "../../utils/aiCoach";
import { getAnthropicKey } from "../../arcade/keys";

const ACCENT = "#60A5FA";
const PITCH_LIMIT = 75;

interface StatsStore { swings: number; pitches: number; crushed: number; painted: number }
function loadStats(): StatsStore { try { const r = localStorage.getItem("dd_standalone_training_stats"); return r ? JSON.parse(r) : { swings: 0, pitches: 0, crushed: 0, painted: 0 }; } catch { return { swings: 0, pitches: 0, crushed: 0, painted: 0 }; } }
function saveStats(s: StatsStore) { try { localStorage.setItem("dd_standalone_training_stats", JSON.stringify(s)); } catch {} }

const BATTERS = [
  { name: "Slugger Steve",   contact: 72, power: 82, seed: 101 },
  { name: "Speedy Sam",      contact: 83, power: 52, seed: 202 },
  { name: "Power Pete",      contact: 62, power: 90, seed: 303 },
  { name: "Contact Carl",    contact: 90, power: 58, seed: 404 },
  { name: "The Rookie",      contact: 52, power: 50, seed: 505 },
  { name: "Switch Hitter",   contact: 76, power: 68, seed: 606 },
];

const PITCH_TYPES = ["4-Seam", "2-Seam", "Changeup", "Curve", "Slider"];

type PitchOutcome = { text: string; emoji: string; coach?: string; loadingCoach?: boolean };
type Count = { balls: number; strikes: number; total: number };
type SessionStats = { k: number; bb: number; h: number; hr: number; outs: number };

function foulLine(zx: number): string { return zx < 0.3 ? "Fouled off down third." : zx > 0.7 ? "Pushed foul down first." : "Fouled straight back."; }
function hrLine(zx: number): string { const s = zx < 0.4 ? "to deep left" : zx > 0.6 ? "to deep right" : "dead center"; return `Absolutely launched ${s} — HOME RUN! 💥`; }
function hitLine(zx: number, zy: number): string { const s = zx < 0.4 ? "pulled into left" : zx > 0.6 ? "lined to right" : "up the middle"; return zy < 0.5 ? `Line drive ${s} — base hit.` : `Ground ball ${s} — finds a hole.`; }
function outLine(zy: number): string { return zy > 0.65 ? "Weak grounder — easy out." : "Routine fly — center has it."; }

export default function BaseballTrainingPitch() {
  const navigate = useNavigate();
  const [batterIdx, setBatterIdx] = useState(0);
  const [spriteState, setSpriteState] = useState<"idle"|"swing"|"whiff"|"homer"|"take">("idle");
  const [pitchType, setPitchType] = useState(PITCH_TYPES[0]);
  const [outcomeLog, setOutcomeLog] = useState<PitchOutcome[]>([]);
  const [count, setCount] = useState<Count>({ balls: 0, strikes: 0, total: 0 });
  const [session, setSession] = useState<SessionStats>({ k: 0, bb: 0, h: 0, hr: 0, outs: 0 });
  const [totalPitches, setTotalPitches] = useState(0);
  const [totalPainted, setTotalPainted] = useState(0);
  const [hrFlash, setHrFlash] = useState<number | null>(null);
  const [formScore, setFormScore] = useState<number | null>(null);

  const batter = BATTERS[batterIdx % BATTERS.length];
  const hotZones = useMemo(() => generateHotZones(batter.contact, batter.power, batter.seed), [batter.seed]);

  const nextBatter = () => {
    setBatterIdx(i => (i + 1) % BATTERS.length);
    setSpriteState("idle");
    setCount(c => ({ ...c, balls: 0, strikes: 0 }));
  };

  const onPitch = (zx: number, zy: number, inZone: boolean) => {
    const col = Math.min(2, Math.max(0, Math.floor(zx * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(zy * 3)));
    const isMiddle = col === 1 && row === 1;
    const isCorner = (col === 0 || col === 2) && (row === 0 || row === 2);
    const baseHeat = hotZones?.[row]?.[col] ?? 0.5;
    const heat = Math.max(0.1, Math.min(0.95, baseHeat + (isMiddle ? 0.18 : isCorner ? -0.15 : 0)));

    let result: "strike"|"painted"|"ball";
    if (!inZone) result = "ball";
    else if (isCorner) result = Math.random() < 0.75 ? "painted" : "ball";
    else result = "strike";

    const pitchMod = pitchType === "Changeup" ? -0.10 : pitchType === "Curve" ? -0.07 : pitchType === "4-Seam" ? 0.05 : 0;
    const swingBase = inZone ? 0.45 + heat * 0.50 : 0.18 + heat * 0.25;
    const swung = Math.random() < Math.max(0.05, Math.min(0.95, swingBase + pitchMod));

    let outcome: PitchOutcome = { text: "Ball", emoji: "🟡" };
    let endsAtBat = false;
    let resultStat: "k"|"bb"|"h"|"hr"|"outs"|null = null;
    let nextBalls = count.balls;
    let nextStrikes = count.strikes;

    if (swung) {
      const contactRoll = Math.random() * 100 + (batter.contact - 50) * 0.5 + (heat - 0.5) * 40 - (result === "painted" ? 20 : 0);
      if (contactRoll < 25) { outcome = { text: "Swing and a miss!", emoji: "💨" }; nextStrikes = Math.min(3, count.strikes + 1); setSpriteState("whiff"); }
      else if (contactRoll < 40) { outcome = { text: foulLine(zx), emoji: "🟫" }; nextStrikes = count.strikes < 2 ? count.strikes + 1 : count.strikes; setSpriteState("swing"); }
      else {
        endsAtBat = true;
        const powerRoll = Math.random() * 100 + (batter.power - 50) * 0.6 + (heat - 0.5) * 30 - (result === "painted" ? 15 : 0);
        if (powerRoll > 95 && (heat > 0.55 || isMiddle)) { outcome = { text: hrLine(zx), emoji: "💥" }; resultStat = "hr"; setSpriteState("homer"); }
        else if (powerRoll > 60) { outcome = { text: hitLine(zx, zy), emoji: "🟢" }; resultStat = "h"; setSpriteState("swing"); }
        else { outcome = { text: outLine(zy), emoji: "🪨" }; resultStat = "outs"; setSpriteState("swing"); }
      }
    } else {
      if (inZone) {
        outcome = result === "painted"
          ? { text: "Painted corner — called strike! 🔥", emoji: "🔥" }
          : { text: "Called strike — caught looking.", emoji: "✋" };
        nextStrikes = Math.min(3, count.strikes + 1);
        setSpriteState("take");
      } else {
        outcome = { text: "Off the plate — ball.", emoji: "🟡" };
        nextBalls = Math.min(4, count.balls + 1);
        setSpriteState("take");
      }
    }

    if (nextStrikes >= 3) { outcome = { text: "STRIKE THREE! 🔥", emoji: "❌" }; endsAtBat = true; resultStat = "k"; }
    if (nextBalls >= 4) { outcome = { text: "Ball four — walks the batter.", emoji: "🚶" }; endsAtBat = true; resultStat = "bb"; }

    const newTotal = count.total + 1;
    setCount({ balls: endsAtBat ? 0 : nextBalls, strikes: endsAtBat ? 0 : nextStrikes, total: newTotal });
    if (resultStat) {
      setSession(s => ({ ...s, [resultStat!]: s[resultStat!] + 1 }));
      if (resultStat === "hr") setHrFlash(Date.now());
    }
    if (result === "painted") setTotalPainted(n => n + 1);

    const np = totalPitches + 1;
    setTotalPitches(np);
    const stored = loadStats();
    stored.pitches = (stored.pitches ?? 0) + 1;
    if (result === "painted") stored.painted = (stored.painted ?? 0) + 1;
    saveStats(stored);

    outcome.loadingCoach = true;
    setOutcomeLog(prev => [outcome, ...prev].slice(0, 6));
    setFormScore(null);
    setTimeout(() => setSpriteState("idle"), 1200);
    if (endsAtBat) setTimeout(nextBatter, 1800);

    const apiKey = getAnthropicKey() || "";
    getPitchingFeedback({
      pitchType,
      zoneCol: inZone ? col : -1,
      zoneRow: inZone ? row : -1,
      inZone,
      heat,
      result,
      batterContact: batter.contact,
      batterPower: batter.power,
      pitcherFocus: ["elbow up", "balance through release", "consistent arm slot"],
      recentResults: [],
      outcomeText: outcome.text,
      henryName: "Player",
    }, apiKey).then(line => {
      setOutcomeLog(prev => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], coach: line, loadingCoach: false };
        return next;
      });
    });
  };

  const undo = () => {
    if (!outcomeLog.length) return;
    setOutcomeLog(l => l.slice(1));
    setTotalPitches(n => Math.max(0, n - 1));
  };

  const pctFull = Math.min(100, (count.total / PITCH_LIMIT) * 100);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #030c15 0%, #020d08 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
      }}
    >
      <ConfettiBurst trigger={null} showBanner={false} />

      <header className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => navigate("/resources/baseball-training")} className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <div className="text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>PRACTICE</div>
          <div className="font-display text-2xl" style={{ color: ACCENT }}>⚾ PITCHING</div>
        </div>
        <button onClick={nextBatter} className="px-3 py-2 rounded-xl text-xs pressable touch-target flex items-center gap-1" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><Shuffle size={14}/>New batter</button>
        <button onClick={undo} className="px-3 py-2 rounded-xl text-xs pressable touch-target flex items-center gap-1" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><Undo2 size={14}/>Undo</button>
      </header>

      {/* Batter card */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <span className="text-base">🏏</span>
          <div>
            <div className="font-display text-sm" style={{ color: ACCENT }}>{batter.name}</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Contact {batter.contact} · Power {batter.power}</div>
          </div>
        </div>
      </div>

      <div className="px-4 grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <BatterAtPlate
            hotZones={hotZones}
            team={null}
            bats="R"
            batterName={batter.name}
            contact={batter.contact}
            power={batter.power}
            onPitch={onPitch}
            spriteState={spriteState}
          />
          <div className="flex gap-1.5 flex-wrap justify-center">
            {PITCH_TYPES.map(p => (
              <button key={p} onClick={() => setPitchType(p)} className="px-3 py-2 rounded-lg text-xs pressable touch-target" style={{ background: pitchType === p ? ACCENT : "rgba(255,255,255,0.05)", color: pitchType === p ? "#030c15" : "rgba(255,255,255,0.7)", fontWeight: pitchType === p ? 600 : 400, touchAction: "manipulation" }}>{p}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Count */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] tracking-widest text-center mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>THIS AT-BAT</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-[9px] tracking-widest mb-1" style={{ color: "#34d399" }}>BALLS</div>
                <div className="flex gap-1">{Array.from({ length: 4 }).map((_, i) => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < count.balls ? "#34d399" : "rgba(255,255,255,0.1)" }} />)}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] tracking-widest mb-1" style={{ color: "#fbbf24" }}>STRIKES</div>
                <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < count.strikes ? "#fbbf24" : "rgba(255,255,255,0.1)" }} />)}</div>
              </div>
            </div>
          </div>

          {/* Arm safety bar */}
          <div className="rounded-xl p-3" style={{ background: count.total >= PITCH_LIMIT ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${count.total >= PITCH_LIMIT ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}` }}>
            <div className="text-[10px] tracking-widest text-center mb-2" style={{ color: count.total >= PITCH_LIMIT ? "#fca5a5" : "rgba(255,255,255,0.4)" }}>
              {count.total >= PITCH_LIMIT ? "⚠ ARM REST TIME" : "PITCH COUNT"}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pctFull}%`, background: count.total >= PITCH_LIMIT ? "#ef4444" : count.total >= PITCH_LIMIT * 0.7 ? "#f59e0b" : ACCENT }} />
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{count.total}/{PITCH_LIMIT}</span>
            </div>
          </div>

          {/* Session */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] tracking-widest text-center mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>SESSION</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.k}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>K</div></div>
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.bb}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>BB</div></div>
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.h + session.hr}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>H</div></div>
              <div><div className="font-display text-lg" style={{ color: "#fbbf24" }}>{session.hr}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>HR</div></div>
            </div>
            <div className="text-[10px] text-center mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{totalPitches} pitches · {totalPainted} painted</div>
          </div>

          {/* Play by play */}
          {outcomeLog.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[10px] tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>PLAY BY PLAY</div>
              <ul className="space-y-2">
                {outcomeLog.slice(0, 5).map((o, i) => (
                  <li key={i} className={`text-sm border-b last:border-b-0 pb-2 last:pb-0 ${i === 0 ? "" : "opacity-60"}`} style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className={`flex items-center gap-2 ${i === 0 ? "font-medium" : ""}`} style={{ color: i === 0 ? "white" : "rgba(255,255,255,0.7)" }}>
                      <span className="text-xl">{o.emoji}</span>
                      <span>{o.text}</span>
                    </div>
                    {i === 0 && (o.loadingCoach || o.coach) && (
                      <div className="flex items-start gap-1.5 mt-1.5 pl-7 text-[11px]">
                        <Sparkles size={12} style={{ color: ACCENT, marginTop: 2, flexShrink: 0 }} />
                        {o.coach
                          ? <span style={{ color: "#fde68a" }}>{o.coach}</span>
                          : <span style={{ color: "rgba(255,255,255,0.4)" }} className="italic">Coach Billy is thinking…</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <StandaloneCameraCoach mode="pitching" onRep={(s) => setFormScore(s)} />
        </div>
      </div>
    </div>
  );
}
