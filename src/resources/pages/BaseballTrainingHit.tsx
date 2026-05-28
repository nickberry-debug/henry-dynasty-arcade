import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shuffle, Undo2, Sparkles } from "lucide-react";
import { PitcherOnMound, generatePitcherHotZones } from "../../components/PitcherOnMound";
import { ConfettiBurst } from "../../components/ConfettiBurst";
import { StandaloneCameraCoach } from "../components/StandaloneCameraCoach";
import { getHittingFeedback } from "../../utils/aiCoach";
import { getAnthropicKey } from "../../arcade/keys";

const ACCENT = "#34D399";

interface StatsStore { swings: number; pitches: number; crushed: number; painted: number }

function loadStats(): StatsStore {
  try { const r = localStorage.getItem("dd_standalone_training_stats"); return r ? JSON.parse(r) : { swings: 0, pitches: 0, crushed: 0, painted: 0 }; } catch { return { swings: 0, pitches: 0, crushed: 0, painted: 0 }; }
}
function saveStats(s: StatsStore) {
  try { localStorage.setItem("dd_standalone_training_stats", JSON.stringify(s)); } catch {}
}

const PITCHERS = [
  { name: "Fastball Freddie", velo: 88, ctrl: 60, seed: 111 },
  { name: "Crafty Carlos",    velo: 72, ctrl: 84, seed: 222 },
  { name: "Power Pete",       velo: 95, ctrl: 52, seed: 333 },
  { name: "Slider Sam",       velo: 80, ctrl: 76, seed: 444 },
  { name: "Coach's Pitch",    velo: 68, ctrl: 90, seed: 555 },
  { name: "The Rookie",       velo: 78, ctrl: 65, seed: 666 },
];

type SwingOutcome = { text: string; emoji: string; coach?: string; loadingCoach?: boolean };
type Count = { balls: number; strikes: number };
type SessionStats = { h: number; hr: number; bb: number; k: number; outs: number };

function swingMiss(): string { return ["Swung through it.", "Whiffed!", "Got him swinging."][Math.floor(Math.random()*3)]; }
function hitFoul(zx: number): string { return zx < 0.3 ? "Fouled off down third." : zx > 0.7 ? "Pushed foul down first." : "Fouled straight back."; }
function hrLine(zx: number): string { const s = zx < 0.4 ? "to deep right" : zx > 0.6 ? "to deep left" : "to dead center"; return `Absolutely launched ${s} — HOME RUN! 💥`; }
function xtraBase(zx: number): string { const s = zx < 0.4 ? "right-center gap" : zx > 0.6 ? "left-field line" : "off the wall"; return `Smoked into the ${s} — standing double!`; }
function single(zx: number): string { return zx < 0.35 ? "Lined into right — single!" : zx > 0.65 ? "Smacked into left — single!" : "Up the middle — base hit!"; }
function groundOut(zx: number): string { return zx < 0.35 ? "Grounded to the right side — out." : zx > 0.65 ? "Grounder to short — out at first." : "Hit it back at the pitcher — out."; }
function weakGrounder(): string { return ["Roller to the mound — easy out.", "Chopper to third — out.", "Soft grounder to second."][Math.floor(Math.random()*3)]; }
function popOut(): string { return ["Popped up in foul — caught.", "Lazy fly — easy out.", "Infield fly — out."][Math.floor(Math.random()*3)]; }

export default function BaseballTrainingHit() {
  const navigate = useNavigate();
  const [pitcherIdx, setPitcherIdx] = useState(0);
  const [spriteState, setSpriteState] = useState<"idle"|"windup"|"release"|"followthrough"|"strike"|"hrAllowed">("idle");
  const [outcomeLog, setOutcomeLog] = useState<SwingOutcome[]>([]);
  const [count, setCount] = useState<Count>({ balls: 0, strikes: 0 });
  const [session, setSession] = useState<SessionStats>({ h: 0, hr: 0, bb: 0, k: 0, outs: 0 });
  const [totalSwings, setTotalSwings] = useState(0);
  const [totalCrushed, setTotalCrushed] = useState(0);
  const [hrFlash, setHrFlash] = useState<number | null>(null);
  const [formScore, setFormScore] = useState<number | null>(null);

  const pitcher = PITCHERS[pitcherIdx % PITCHERS.length];
  const hotZones = useMemo(() => generatePitcherHotZones(pitcher.velo, pitcher.ctrl, pitcher.seed), [pitcher.seed]);

  const nextPitcher = () => {
    setPitcherIdx(i => (i + 1) % PITCHERS.length);
    setSpriteState("idle");
    setCount({ balls: 0, strikes: 0 });
  };

  const onSwing = (zx: number, zy: number, inZone: boolean) => {
    let quality: "crushed"|"okay"|"weak"|"whiff" = "okay";
    let outcome: SwingOutcome;
    let nextBalls = count.balls;
    let nextStrikes = count.strikes;
    let endsAtBat = false;
    let resultStat: "h"|"hr"|"bb"|"k"|"outs"|null = null;

    if (!inZone) {
      outcome = { text: "Took it — ball off the plate.", emoji: "✋" };
      nextBalls = Math.min(4, count.balls + 1);
      quality = "okay";
    } else {
      const dist = Math.hypot(zx - 0.5, zy - 0.5);
      if (dist < 0.20) quality = "crushed";
      else if (dist < 0.36) quality = "okay";
      else quality = "weak";
      const pitcherDiff = (pitcher.velo - 80) / 25 + (pitcher.ctrl - 50) / 120;
      if (Math.random() < 0.10 + pitcherDiff * 0.12) quality = "whiff";

      if (quality === "whiff") {
        outcome = { text: swingMiss(), emoji: "💨" };
        nextStrikes = Math.min(3, count.strikes + 1);
      } else {
        const fouled = Math.random() < (quality === "weak" ? 0.35 : quality === "okay" ? 0.25 : 0.18);
        if (fouled) {
          outcome = { text: hitFoul(zx), emoji: "🟫" };
          nextStrikes = count.strikes < 2 ? count.strikes + 1 : count.strikes;
        } else {
          endsAtBat = true;
          if (quality === "crushed") {
            if (zy < 0.45 && Math.random() < 0.55) { outcome = { text: hrLine(zx), emoji: "💥" }; resultStat = "hr"; }
            else if (Math.random() < 0.6) { outcome = { text: xtraBase(zx), emoji: "⚾" }; resultStat = "h"; }
            else { outcome = { text: single(zx), emoji: "🟢" }; resultStat = "h"; }
          } else if (quality === "okay") {
            if (Math.random() < 0.45) { outcome = { text: single(zx, ), emoji: "🟢" }; resultStat = "h"; }
            else { outcome = { text: groundOut(zx), emoji: "🪨" }; resultStat = "outs"; }
          } else {
            outcome = zy > 0.65 ? { text: weakGrounder(), emoji: "🪨" } : { text: popOut(), emoji: "🎈" };
            resultStat = "outs";
          }
        }
      }
    }

    if (nextStrikes >= 3) { outcome = { text: "STRIKE THREE!", emoji: "❌" }; endsAtBat = true; resultStat = "k"; }
    if (nextBalls >= 4) { outcome = { text: "Ball four — Henry walks!", emoji: "🚶" }; endsAtBat = true; resultStat = "bb"; }

    outcome.loadingCoach = true;
    setCount({ balls: endsAtBat ? 0 : nextBalls, strikes: endsAtBat ? 0 : nextStrikes });
    if (resultStat) {
      setSession(s => ({ ...s, [resultStat!]: s[resultStat!] + 1 }));
      if (resultStat === "hr") { setHrFlash(Date.now()); setTotalCrushed(n => n + 1); }
    }
    if (quality === "crushed") setTotalCrushed(n => n + 1);

    const newSwings = totalSwings + 1;
    setTotalSwings(newSwings);
    const stored = loadStats();
    stored.swings = (stored.swings ?? 0) + 1;
    if (quality === "crushed") stored.crushed = (stored.crushed ?? 0) + 1;
    saveStats(stored);

    setSpriteState(resultStat === "hr" ? "hrAllowed" : quality === "whiff" || resultStat === "k" ? "strike" : endsAtBat ? "followthrough" : "idle");
    setOutcomeLog(prev => [outcome, ...prev].slice(0, 6));
    setFormScore(null);
    setTimeout(() => setSpriteState("idle"), 1200);
    if (endsAtBat) setTimeout(nextPitcher, 1800);

    const apiKey = getAnthropicKey() || "";
    getHittingFeedback({
      netX: zx, netY: zy,
      zoneCol: Math.min(2, Math.max(0, Math.floor(zx * 3))),
      zoneRow: Math.min(2, Math.max(0, Math.floor(zy * 3))),
      heat: hotZones?.[Math.min(2, Math.max(0, Math.floor(zy * 3)))]?.[Math.min(2, Math.max(0, Math.floor(zx * 3)))] ?? 0.5,
      quality,
      pitcherVelo: pitcher.velo,
      pitcherControl: pitcher.ctrl,
      recentSwings: outcomeLog.slice(0, 5).map(() => quality),
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
    setTotalSwings(n => Math.max(0, n - 1));
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #020d08 0%, #030c15 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
      }}
    >
      <ConfettiBurst trigger={hrFlash} showBanner={true} />

      <header className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => navigate("/resources/baseball-training")} className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <div className="text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>PRACTICE</div>
          <div className="font-display text-2xl" style={{ color: ACCENT }}>🥎 HITTING</div>
        </div>
        <button onClick={nextPitcher} className="px-3 py-2 rounded-xl text-xs pressable touch-target flex items-center gap-1" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><Shuffle size={14}/>New pitcher</button>
        <button onClick={undo} className="px-3 py-2 rounded-xl text-xs pressable touch-target flex items-center gap-1" style={{ background: "rgba(255,255,255,0.05)", touchAction: "manipulation" }}><Undo2 size={14}/>Undo</button>
      </header>

      {/* Pitcher card */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <span className="text-base">⚾</span>
          <div>
            <div className="font-display text-sm" style={{ color: ACCENT }}>{pitcher.name}</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{pitcher.velo} mph · {pitcher.ctrl} ctrl</div>
          </div>
        </div>
      </div>

      <div className="px-4 grid lg:grid-cols-2 gap-4">
        <PitcherOnMound
          hotZones={hotZones}
          team={null}
          throws="R"
          pitcherName={pitcher.name}
          velo={pitcher.velo}
          control={pitcher.ctrl}
          onSwing={onSwing}
          spriteState={spriteState}
        />

        <div className="space-y-3">
          {/* Count */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] tracking-widest text-center mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>THIS AT-BAT</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-[9px] tracking-widest mb-1" style={{ color: "#34d399" }}>BALLS</div>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < count.balls ? "#34d399" : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] tracking-widest mb-1" style={{ color: "#fbbf24" }}>STRIKES</div>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < count.strikes ? "#fbbf24" : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Session line */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] tracking-widest text-center mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>SESSION LINE</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.h + session.hr}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>H</div></div>
              <div><div className="font-display text-lg" style={{ color: "#fbbf24" }}>{session.hr}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>HR</div></div>
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.bb}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>BB</div></div>
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.k}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>K</div></div>
              <div><div className="font-display text-lg" style={{ color: "white" }}>{session.outs}</div><div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Out</div></div>
            </div>
            <div className="text-[10px] text-center mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{totalSwings} swings · {totalCrushed} crushed</div>
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

          <StandaloneCameraCoach mode="hitting" onRep={(s, fb) => { setFormScore(s); }} />
        </div>
      </div>
    </div>
  );
}
