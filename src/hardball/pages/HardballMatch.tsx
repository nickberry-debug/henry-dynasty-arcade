// HARDBALL match — canvas + touch controls + pitch tracer + scoreboard.
// The whole core loop lives here.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  initMatch, applyHit, ball as callBall, strike as callStrike, foulStrike,
  contactToBases, battingTeam, pitchingTeam, TEAMS,
  type MatchState,
} from "../engine/match";
import { PITCHES, ballPositionAt, type PitchType, type PitchAim } from "../engine/pitch";
import { resolveSwing, contactLabel, type SwingResult } from "../engine/swing";
import { makeBallInPlay, ballAt, landingPoint, type BallInPlay } from "../engine/field";
import {
  unlockAudio, batCrack, glovePop, whiff, umpCall,
  crowdCheer, startCrowdAmbience, stopCrowdAmbience, organJingle, pitchWhoosh, uiClick,
} from "../engine/audio";
import { Sprites } from "../sprites";

type Phase =
  | "setup"      // pick pitch type + aim
  | "thrown"     // pitch in flight, swing window armed
  | "in_play"    // ball was hit, waiting for fielding
  | "between"   // toast between pitches
  | "final";

interface Toast { text: string; color: string; until: number; }


export default function HardballMatch() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const awayId = sp.get("away") ?? TEAMS[0].id;
  const homeId = sp.get("home") ?? TEAMS[1].id;
  const innings = Number(sp.get("innings") ?? 3);

  const [state, setState] = useState<MatchState>(() => initMatch(awayId, homeId, innings));
  const [phase, setPhase] = useState<Phase>("setup");
  const [pitch, setPitch] = useState<PitchType>("fastball");
  const [aim, setAim] = useState<PitchAim>({ x: 0, y: 0 });
  const [toast, setToast] = useState<Toast | null>(null);

  // refs for the in-flight animation
  const releaseTimeRef = useRef<number>(0);
  const ballInPlayRef = useRef<BallInPlay | null>(null);
  const swingTimeRef = useRef<number | null>(null);
  const lastResultRef = useRef<SwingResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shakeRef = useRef<number>(0); // px shake amplitude
  const flashRef = useRef<number>(0); // 0..1 opacity for white flash
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);

  // start crowd ambience on first user gesture
  useEffect(() => {
    const onTap = () => { unlockAudio(); startCrowdAmbience(); window.removeEventListener("pointerdown", onTap); };
    window.addEventListener("pointerdown", onTap, { passive: true });
    return () => { stopCrowdAmbience(); window.removeEventListener("pointerdown", onTap); };
  }, []);


  // ── canvas world coords ───────────────────────────────────────────
  // We use a 320x420 world; the canvas DOM size scales to fit.
  const WORLD_W = 320;
  const WORLD_H = 420;
  // mound + plate in world coords
  const MOUND = { x: WORLD_W / 2, y: 160 };
  const PLATE = { x: WORLD_W / 2, y: 360 };

  // ── pitch flow ────────────────────────────────────────────────────
  function throwPitch() {
    if (phase !== "setup") return;
    pitchWhoosh();
    releaseTimeRef.current = performance.now();
    swingTimeRef.current = null;
    lastResultRef.current = null;
    setPhase("thrown");
    // after pitch arrival window, if no swing → strike or ball
    const spec = PITCHES[pitch];
    const arrival = spec.travelMs;
    const watchOver = arrival + 240; // grace period for missed swings
    setTimeout(() => {
      if (swingTimeRef.current !== null) return;
      // no swing — call ball or strike based on aim location
      const inZone = Math.abs(aim.x) < 0.6 && Math.abs(aim.y) < 0.7;
      if (inZone) {
        umpCall("strike");
        bump(callStrike, "STRIKE", "#fbbf24");
      } else {
        umpCall("ball");
        bump(callBall, "BALL", "#60a5fa");
      }
    }, watchOver);
  }

  function bump(fn: (s: MatchState) => MatchState, msg: string, color: string) {
    setState(prev => {
      const next = fn(prev);
      setPhase(next.phase === "final" ? "final" : "between");
      setToast({ text: msg, color, until: performance.now() + 1100 });
      // after toast, return to setup unless game over
      setTimeout(() => {
        setToast(null);
        setPhase(p => (p === "final" ? p : "setup"));
        if (next.phase === "final") organJingle();
      }, 1200);
      return next;
    });
  }


  function swing() {
    if (phase !== "thrown" || swingTimeRef.current !== null) return;
    const t = performance.now() - releaseTimeRef.current;
    swingTimeRef.current = t;
    const spec = PITCHES[pitch];
    const result = resolveSwing(spec, aim, spec.travelMs, t);
    lastResultRef.current = result;

    if (result.kind === "whiff") {
      whiff();
      setTimeout(() => bump(callStrike, "WHIFF · STRIKE", "#ef4444"), 80);
      return;
    }

    // contact!
    batCrack(result.kind === "homerun" ? 1.4 : 1);
    flashRef.current = 1;
    shakeRef.current = result.kind === "homerun" ? 14 : 6;
    // particles
    for (let i = 0; i < (result.kind === "homerun" ? 20 : 10); i++) {
      particlesRef.current.push({
        x: PLATE.x, y: PLATE.y - 16,
        vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 4,
        life: 600 + Math.random() * 300,
        color: ["#fbbf24", "#fde68a", "#ffffff"][Math.floor(Math.random() * 3)],
      });
    }

    if (result.kind === "foul") {
      setTimeout(() => bump(foulStrike, "FOUL", "#f97316"), 120);
      return;
    }

    // launch the ball
    const bip = makeBallInPlay(PLATE.x, PLATE.y - 10, result, performance.now());
    ballInPlayRef.current = bip;
    setPhase("in_play");
    // delayed crowd roar for fly balls
    if (result.kind === "fly" || result.kind === "homerun") {
      setTimeout(() => crowdCheer(result.kind === "homerun" ? 1.3 : 0.8), 200);
    }
  }


  /** Player tapped the catch ring during in_play. */
  function tryCatch() {
    const bip = ballInPlayRef.current;
    const result = lastResultRef.current;
    if (!bip || !result || phase !== "in_play") return;
    const now = performance.now();
    const land = landingPoint(bip, WORLD_W, WORLD_H);
    if (land.gone) return; // HR
    const tFrac = (now - bip.t0) / bip.airMs;
    const distFromPeak = Math.abs(tFrac - 1); // 0 at landing
    if (distFromPeak < 0.18 && (result.kind === "fly" || result.kind === "liner")) {
      glovePop();
      ballInPlayRef.current = null;
      setTimeout(() => bump(s => applyHit(s, 0), "CAUGHT · OUT", "#22d3ee"), 80);
    }
  }

  /** When ball lands without being caught, auto-resolve based on kind. */
  function resolveBallInPlay() {
    const bip = ballInPlayRef.current;
    const result = lastResultRef.current;
    if (!bip || !result) return;
    ballInPlayRef.current = null;
    if (result.kind === "homerun") {
      crowdCheer(1.4);
      organJingle();
      bump(s => applyHit(s, 4), "HOME RUN!!", "#fbbf24");
      return;
    }
    const bases = contactToBases(result.kind);
    const label =
      bases === 0 ? "OUT" :
      bases === 1 ? "SINGLE!" :
      bases === 2 ? "DOUBLE!" :
      bases === 3 ? "TRIPLE!" : "HOMERUN!";
    if (bases > 0) crowdCheer(bases >= 2 ? 1 : 0.55);
    bump(s => applyHit(s, bases), label, bases > 0 ? "#86efac" : "#fca5a5");
  }


  // ── canvas render loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let resolved = false; // guard so resolveBallInPlay fires once

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / WORLD_W;
      const scaleY = rect.height / WORLD_H;
      const s = Math.min(scaleX, scaleY);
      const offsetX = (rect.width - WORLD_W * s) / 2 + (Math.random() - 0.5) * shakeRef.current;
      const offsetY = (rect.height - WORLD_H * s) / 2 + (Math.random() - 0.5) * shakeRef.current;
      shakeRef.current *= 0.88;

      // background field
      ctx.save();
      ctx.fillStyle = "#0a1622";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.translate(offsetX, offsetY);
      ctx.scale(s, s);

      drawField(ctx);
      drawBases(ctx, state.bases);
      drawPitcher(ctx);
      drawBatter(ctx, state);
      drawFielders(ctx, state);
      drawTracerAndBall(ctx);
      drawParticles(ctx);
      drawAimReticle(ctx);

      ctx.restore();
      // white flash overlay
      if (flashRef.current > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${flashRef.current})`;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.restore();
        flashRef.current *= 0.78;
      }

      // step ball-in-play
      const bip = ballInPlayRef.current;
      if (bip) {
        const now = performance.now();
        if (now - bip.t0 >= bip.airMs && !resolved) {
          resolved = true;
          resolveBallInPlay();
          setTimeout(() => { resolved = false; }, 100);
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phase, aim, pitch]);


  // ── draw helpers ──────────────────────────────────────────────────
  function drawField(ctx: CanvasRenderingContext2D) {
    // outfield grass
    ctx.fillStyle = "#1a5d2a";
    ctx.beginPath();
    ctx.moveTo(WORLD_W / 2, WORLD_H);
    ctx.arc(WORLD_W / 2, WORLD_H, WORLD_H * 0.82, -Math.PI * 0.92, -Math.PI * 0.08, false);
    ctx.closePath();
    ctx.fill();
    // infield dirt
    ctx.fillStyle = "#7a4b2a";
    ctx.beginPath();
    ctx.moveTo(WORLD_W / 2, WORLD_H - 30);
    ctx.arc(WORLD_W / 2, WORLD_H - 30, 140, -Math.PI * 0.85, -Math.PI * 0.15, false);
    ctx.closePath();
    ctx.fill();
    // mound
    ctx.fillStyle = "#8a5a32";
    ctx.beginPath();
    ctx.ellipse(MOUND.x, MOUND.y, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // foul lines
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(PLATE.x, PLATE.y);
    ctx.lineTo(20, 60);
    ctx.moveTo(PLATE.x, PLATE.y);
    ctx.lineTo(WORLD_W - 20, 60);
    ctx.stroke();
  }

  function drawBases(ctx: CanvasRenderingContext2D, b: { first: boolean; second: boolean; third: boolean }) {
    const first  = { x: PLATE.x + 70, y: PLATE.y - 70 };
    const second = { x: PLATE.x,      y: PLATE.y - 140 };
    const third  = { x: PLATE.x - 70, y: PLATE.y - 70 };
    [
      { p: first,  on: b.first  },
      { p: second, on: b.second },
      { p: third,  on: b.third  },
    ].forEach(({ p, on }) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = on ? "#fbbf24" : "#f3f4f6";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    });
    // home plate
    ctx.fillStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.moveTo(PLATE.x - 9, PLATE.y);
    ctx.lineTo(PLATE.x + 9, PLATE.y);
    ctx.lineTo(PLATE.x + 9, PLATE.y + 5);
    ctx.lineTo(PLATE.x, PLATE.y + 11);
    ctx.lineTo(PLATE.x - 9, PLATE.y + 5);
    ctx.closePath();
    ctx.fill();
  }


  function drawPitcher(ctx: CanvasRenderingContext2D) {
    const accent = pitchingTeam(state).accent;
    const t = (performance.now() - releaseTimeRef.current) / Math.max(1, PITCHES[pitch].travelMs);
    const frame: "windup" | "release" | "follow" =
      phase === "thrown" ? (t < 0.1 ? "release" : "follow")
      : phase === "in_play" ? "follow"
      : "windup";
    const sp = Sprites.pitcher(accent, frame) as CanvasImageSource;
    ctx.drawImage(sp, MOUND.x - 10, MOUND.y - 26);
  }

  function drawBatter(ctx: CanvasRenderingContext2D, s: MatchState) {
    const accent = battingTeam(s).accent;
    const frame: "idle" | "swing" | "follow" =
      swingTimeRef.current !== null
        ? (performance.now() - releaseTimeRef.current - swingTimeRef.current < 180 ? "swing" : "follow")
        : "idle";
    const sp = Sprites.batter("#1f2937", accent, frame) as CanvasImageSource;
    ctx.drawImage(sp, PLATE.x - 24, PLATE.y - 30);
    // catcher
    ctx.fillStyle = "#374151";
    ctx.fillRect(PLATE.x - 4, PLATE.y + 4, 12, 14);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(PLATE.x - 2, PLATE.y + 2, 8, 6);
  }

  function drawFielders(ctx: CanvasRenderingContext2D, s: MatchState) {
    const accent = pitchingTeam(s).accent;
    const sp = Sprites.fielder(accent) as CanvasImageSource;
    // outfield three + infield three (skip pitcher)
    const spots = [
      { x: 60,  y: 90  }, // LF
      { x: 160, y: 60  }, // CF
      { x: 260, y: 90  }, // RF
      { x: 110, y: 210 }, // 3B-ish
      { x: 210, y: 210 }, // 1B-ish
      { x: 160, y: 230 }, // SS
    ];
    spots.forEach(p => ctx.drawImage(sp, p.x - 10, p.y - 12));
  }


  function drawTracerAndBall(ctx: CanvasRenderingContext2D) {
    if (phase === "thrown") {
      const spec = PITCHES[pitch];
      const now = performance.now();
      const t = now - releaseTimeRef.current;
      // tracer dots — past positions, fading
      for (let i = 0; i < 14; i++) {
        const ti = t - i * 28;
        if (ti <= 0) continue;
        const pos = ballPositionAt(spec, aim, ti, MOUND, PLATE);
        const alpha = Math.max(0, 1 - i / 14);
        ctx.fillStyle = hexToRgba(spec.color, alpha * 0.5);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2 + (1 - i / 14) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // active ball
      const pos = ballPositionAt(spec, aim, t, MOUND, PLATE);
      const sp = Sprites.ball() as CanvasImageSource;
      ctx.drawImage(sp, pos.x - 4, pos.y - 4);
    }
    if (phase === "in_play") {
      const bip = ballInPlayRef.current;
      if (bip) {
        const now = performance.now();
        const pos = ballAt(bip, now, WORLD_W, WORLD_H);
        const sp = Sprites.ball() as CanvasImageSource;
        ctx.drawImage(sp, pos.x - 4, pos.y - 4);
        // landing ring (only for catchable balls)
        const land = landingPoint(bip, WORLD_W, WORLD_H);
        if (!land.gone && (bip.kind === "fly" || bip.kind === "liner")) {
          const tFrac = (now - bip.t0) / bip.airMs;
          const ringAlpha = Math.min(1, tFrac * 1.3);
          ctx.strokeStyle = `rgba(251,191,36,${ringAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(land.x, land.y, 18, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }


  function drawParticles(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const next: typeof particlesRef.current = [];
    for (const p of particlesRef.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.life -= 16;
      if (p.life > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 700);
        ctx.fillRect(p.x, p.y, 2, 2);
        next.push(p);
      }
    }
    ctx.globalAlpha = 1;
    particlesRef.current = next;
    void now;
  }

  function drawAimReticle(ctx: CanvasRenderingContext2D) {
    if (phase !== "setup") return;
    const x = PLATE.x + aim.x * 32;
    const y = PLATE.y - 24 + aim.y * 14;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(PLATE.x - 22, PLATE.y - 36, 44, 28);
    ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function hexToRgba(hex: string, a: number) {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }


  // ── handle aim taps on canvas ─────────────────────────────────────
  function onCanvasPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== "setup") return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = rect.width / WORLD_W;
    const scaleY = rect.height / WORLD_H;
    const s = Math.min(scaleX, scaleY);
    const offsetX = (rect.width - WORLD_W * s) / 2;
    const offsetY = (rect.height - WORLD_H * s) / 2;
    const wx = (e.clientX - rect.left - offsetX) / s;
    const wy = (e.clientY - rect.top - offsetY) / s;
    // only count taps in the strike zone reticle
    if (wx < PLATE.x - 30 || wx > PLATE.x + 30) return;
    if (wy < PLATE.y - 40 || wy > PLATE.y - 4) return;
    setAim({
      x: Math.max(-1, Math.min(1, (wx - PLATE.x) / 28)),
      y: Math.max(-1, Math.min(1, (wy - (PLATE.y - 22)) / 14)),
    });
  }

  // ── render ────────────────────────────────────────────────────────
  const at = battingTeam(state);
  const pt = pitchingTeam(state);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      background: "#0a1622", color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
      touchAction: "manipulation",
    }}>
      <Scoreboard state={state} />

      <div style={{ flex: 1, position: "relative", minHeight: 280 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onCanvasPointer}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
        {toast && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              padding: "10px 20px", fontSize: 26, fontWeight: 900, letterSpacing: 2,
              color: toast.color,
              textShadow: "2px 2px 0 #000",
              background: "rgba(0,0,0,0.55)",
              border: `2px solid ${toast.color}`, borderRadius: 8,
            }}>{toast.text}</div>
          </div>
        )}
      </div>


      <Controls
        phase={phase}
        pitch={pitch}
        setPitch={setPitch}
        onThrow={throwPitch}
        onSwing={swing}
        onCatch={tryCatch}
        onExit={() => nav("/hardball")}
        finalText={
          state.phase === "final"
            ? `${state.awayScore > state.homeScore ? at.name : pt.name} WIN — ${state.awayScore}-${state.homeScore}`
            : ""
        }
      />
    </div>
  );
}


// ── Scoreboard ──────────────────────────────────────────────────────
function Scoreboard({ state }: { state: MatchState }) {
  const at = battingTeam(state);
  return (
    <div style={{
      background: "#000", color: "#fbbf24", padding: "8px 10px",
      borderBottom: "2px solid #fbbf24",
      fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 800,
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, lineHeight: 1.3,
    }}>
      <div>
        <div style={{ fontSize: 10, opacity: 0.7 }}>AWAY</div>
        <div style={{ color: state.away.accent, fontSize: 16 }}>{state.away.shortName} {state.awayScore}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>
          {state.half === "top" ? "▲" : "▼"} INN {state.inning}/{state.maxInnings}
        </div>
        <div style={{ fontSize: 15 }}>
          B {state.balls} · S {state.strikes} · O {state.outs}
        </div>
        <div style={{ fontSize: 9, opacity: 0.6 }}>at bat: {at.shortName}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>HOME</div>
        <div style={{ color: state.home.accent, fontSize: 16 }}>{state.homeScore} {state.home.shortName}</div>
      </div>
    </div>
  );
}


// ── Touch controls (press-based, not click) ────────────────────────
function Controls({ phase, pitch, setPitch, onThrow, onSwing, onCatch, onExit, finalText }: {
  phase: Phase;
  pitch: PitchType;
  setPitch: (p: PitchType) => void;
  onThrow: () => void;
  onSwing: () => void;
  onCatch: () => void;
  onExit: () => void;
  finalText: string;
}) {
  // press handler that fires on pointerdown for snappy feel
  const press = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
  };

  if (phase === "final") {
    return (
      <div style={{ padding: 16, borderTop: "2px solid #fbbf24", background: "#000" }}>
        <div style={{ fontSize: 18, color: "#fbbf24", fontWeight: 900, marginBottom: 10, textAlign: "center" }}>
          🏆 FINAL · {finalText}
        </div>
        <button onPointerDown={press(onExit)} style={mainBtn("#fbbf24")}>
          ← BACK TO HARDBALL
        </button>
      </div>
    );
  }


  return (
    <div style={{
      padding: "10px 12px 16px", borderTop: "2px solid rgba(251,191,36,0.5)",
      background: "rgba(0,0,0,0.55)",
    }}>
      {phase === "setup" && (
        <>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textAlign: "center" }}>
            TAP STRIKE ZONE TO AIM · CHOOSE PITCH · THROW
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
            {(["fastball", "curve", "slider", "changeup"] as PitchType[]).map(pt => (
              <button key={pt}
                onPointerDown={press(() => { uiClick(); setPitch(pt); })}
                style={{
                  padding: "8px 4px", fontSize: 11, fontWeight: 800, letterSpacing: 1,
                  borderRadius: 6, border: `1px solid ${PITCHES[pt].color}`,
                  background: pitch === pt ? PITCHES[pt].color : "rgba(255,255,255,0.06)",
                  color: pitch === pt ? "#0a1622" : PITCHES[pt].color,
                  cursor: "pointer",
                }}>
                {pt === "fastball" ? "FAST" : pt === "changeup" ? "CHNG" : pt.slice(0, 4).toUpperCase()}
              </button>
            ))}
          </div>
          <button onPointerDown={press(onThrow)} style={mainBtn("#fbbf24")}>
            ▶ PITCH · {pitch.toUpperCase()}
          </button>
        </>
      )}
      {phase === "thrown" && (
        <button onPointerDown={press(onSwing)} style={mainBtn("#22d3ee")}>
          🏏 SWING!
        </button>
      )}
      {phase === "in_play" && (
        <button onPointerDown={press(onCatch)} style={mainBtn("#86efac")}>
          🧤 CATCH!
        </button>
      )}
      {phase === "between" && (
        <button disabled style={mainBtn("#94a3b8", true)}>
          …
        </button>
      )}
      <button onPointerDown={press(onExit)} style={{
        marginTop: 8, width: "100%", padding: 8, fontSize: 12,
        background: "transparent", color: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(255,255,255,0.16)", borderRadius: 6,
      }}>EXIT</button>
    </div>
  );
}

function mainBtn(color: string, disabled = false): React.CSSProperties {
  return {
    width: "100%", padding: "18px 16px", fontSize: 18, fontWeight: 900, letterSpacing: 2,
    borderRadius: 10,
    background: disabled ? "rgba(255,255,255,0.06)" : color,
    color: disabled ? "#6b7280" : "#0a1622",
    border: `2px solid ${disabled ? "rgba(255,255,255,0.1)" : color}`,
    cursor: disabled ? "not-allowed" : "pointer",
    touchAction: "manipulation",
  };
}
