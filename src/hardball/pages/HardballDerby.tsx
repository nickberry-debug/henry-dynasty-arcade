// HARDBALL -- Home Run Derby
// One batter, pitching machine, count HR. Big arcade fun.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TEAMS } from "../engine/match";
import { initDerby, recordPitch, type DerbyState } from "../engine/derby";
import { PITCHES, ballPositionAt, type PitchSpec, type PitchAim } from "../engine/pitch";
import { resolveSwing, type SwingResult } from "../engine/swing";
import {
  unlockAudio, batCrack, whiff, crowdCheer, organJingle, pitchWhoosh,
  startCrowdAmbience, stopCrowdAmbience, walkUp, winFanfare,
} from "../engine/audio";
import { Sprites } from "../sprites";

type Phase = "ready" | "thrown" | "done";

const WORLD_W = 320;
const WORLD_H = 420;
const MOUND = { x: WORLD_W / 2, y: 160 };
const PLATE = { x: WORLD_W / 2, y: 360 };

export default function HardballDerby() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const teamId = sp.get("team") ?? TEAMS[0].id;
  const totalPitches = Number(sp.get("pitches") ?? 10);
  const team = TEAMS.find(t => t.id === teamId) ?? TEAMS[0];

  const [state, setState] = useState<DerbyState>(() => initDerby(team, totalPitches));
  const [phase, setPhase] = useState<Phase>("ready");
  const [toast, setToast] = useState<string | null>(null);
  const [pitchSpec, setPitchSpec] = useState<PitchSpec>(PITCHES.fastball);
  const aim = useRef<PitchAim>({ x: 0, y: 0 });
  const releaseTimeRef = useRef(0);
  const swingTimeRef = useRef<number | null>(null);
  const lastResultRef = useRef<SwingResult | null>(null);
  const ballPosRef = useRef<{ x: number; y: number; vx: number; vy: number; airMs: number; t0: number; isHR: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashRef = useRef(0);
  const shakeRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);

  useEffect(() => {
    const onTap = () => { unlockAudio(); startCrowdAmbience(); window.removeEventListener("pointerdown", onTap); };
    window.addEventListener("pointerdown", onTap, { passive: true });
    walkUp("organ_jingle");
    return () => { stopCrowdAmbience(); window.removeEventListener("pointerdown", onTap); };
  }, []);

  function pickPitchType(): PitchSpec {
    const i = state.totalPitches - state.remainingPitches;
    if (i % 4 === 3) return PITCHES.curve;
    if (i % 3 === 2) return PITCHES.changeup;
    return PITCHES.fastball;
  }

  function startPitch() {
    if (phase !== "ready" || state.finished) return;
    const spec = pickPitchType();
    setPitchSpec(spec);
    aim.current = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.3 };
    pitchWhoosh();
    releaseTimeRef.current = performance.now();
    swingTimeRef.current = null;
    lastResultRef.current = null;
    setPhase("thrown");
    setTimeout(() => {
      if (swingTimeRef.current === null) { whiff(); finishPitch(false, 0, "MISSED"); }
    }, spec.travelMs + 250);
  }

  function swing() {
    if (phase !== "thrown" || swingTimeRef.current !== null) return;
    const t = performance.now() - releaseTimeRef.current;
    swingTimeRef.current = t;
    const result = resolveSwing(pitchSpec, aim.current, pitchSpec.travelMs, t);
    lastResultRef.current = result;

    if (result.kind === "whiff" || result.kind === "foul") {
      whiff();
      finishPitch(false, 0, result.kind === "whiff" ? "WHIFF" : "FOUL");
      return;
    }
    batCrack(result.kind === "homerun" ? 1.4 : 1);
    flashRef.current = 1;
    shakeRef.current = result.kind === "homerun" ? 14 : 6;
    for (let i = 0; i < (result.kind === "homerun" ? 24 : 10); i++) {
      particlesRef.current.push({
        x: PLATE.x, y: PLATE.y - 16,
        vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 4,
        life: 600 + Math.random() * 300,
        color: ["#fbbf24", "#fde68a", "#ffffff"][Math.floor(Math.random() * 3)],
      });
    }
    const isHR = result.kind === "homerun";
    ballPosRef.current = {
      x: PLATE.x, y: PLATE.y - 10,
      vx: result.spray * 6,
      vy: -Math.max(5, result.speedPx * 0.012),
      airMs: isHR ? 1400 : 800,
      t0: performance.now(),
      isHR,
    };
    if (isHR) { crowdCheer(1.3); setTimeout(() => organJingle(), 300); }
    setTimeout(() => {
      const distance = Math.round((result.speedPx / 100) * (isHR ? 38 : 18));
      finishPitch(isHR, distance, isHR ? `HOMER ${distance} ft` : result.kind.toUpperCase());
    }, isHR ? 1400 : 800);
  }

  function finishPitch(isHR: boolean, distance: number, label: string) {
    setToast(label);
    setState(prev => {
      const next = recordPitch(prev, isHR, distance);
      setTimeout(() => {
        setToast(null);
        if (next.finished) { setPhase("done"); winFanfare(); } else setPhase("ready");
      }, 1100);
      return next;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
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

      ctx.fillStyle = "#0a1622";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(s, s);

      ctx.fillStyle = "#1a5d2a";
      ctx.beginPath();
      ctx.moveTo(WORLD_W / 2, WORLD_H);
      ctx.arc(WORLD_W / 2, WORLD_H, WORLD_H * 0.82, -Math.PI * 0.92, -Math.PI * 0.08, false);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WORLD_W / 2, WORLD_H - 30, 160, -Math.PI * 0.95, -Math.PI * 0.05, false);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(PLATE.x, PLATE.y); ctx.lineTo(20, 60);
      ctx.moveTo(PLATE.x, PLATE.y); ctx.lineTo(WORLD_W - 20, 60);
      ctx.stroke();
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(PLATE.x - 9, PLATE.y - 2, 18, 8);

      ctx.fillStyle = "#6b7280";
      ctx.fillRect(MOUND.x - 8, MOUND.y - 10, 16, 14);
      const bf: "idle" | "swing" | "follow" = (swingTimeRef.current !== null && (performance.now() - releaseTimeRef.current - swingTimeRef.current < 220)) ? "swing" : "idle";
      const sp = Sprites.batter("#1f2937", team.accent, bf) as CanvasImageSource;
      ctx.drawImage(sp, PLATE.x - 24, PLATE.y - 30);

      if (phase === "thrown" && swingTimeRef.current === null) {
        const now = performance.now();
        const t = now - releaseTimeRef.current;
        for (let i = 0; i < 14; i++) {
          const ti = t - i * 28;
          if (ti <= 0) continue;
          const pos = ballPositionAt(pitchSpec, aim.current, ti, MOUND, PLATE);
          ctx.fillStyle = hexA(pitchSpec.color, Math.max(0, 1 - i / 14) * 0.5);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2 + (1 - i / 14) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        const pos = ballPositionAt(pitchSpec, aim.current, t, MOUND, PLATE);
        ctx.drawImage(Sprites.ball() as CanvasImageSource, pos.x - 4, pos.y - 4);
      }

      if (ballPosRef.current) {
        const b = ballPosRef.current;
        const t = (performance.now() - b.t0) / b.airMs;
        const x = b.x + b.vx * (b.airMs / 16) * t;
        const peak = b.isHR ? 180 : 80;
        const arc = -4 * peak * t * (1 - t);
        const y = b.y - (b.airMs / 16) * Math.abs(b.vy) * t * 0.7 + arc;
        ctx.drawImage(Sprites.ball() as CanvasImageSource, x - 4, y - 4);
      }

      const np: typeof particlesRef.current = [];
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 16;
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life / 700);
          ctx.fillRect(p.x, p.y, 2, 2);
          np.push(p);
        }
      }
      ctx.globalAlpha = 1;
      particlesRef.current = np;

      ctx.restore();
      if (flashRef.current > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${flashRef.current})`;
        ctx.fillRect(0, 0, rect.width, rect.height);
        flashRef.current *= 0.78;
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [phase, pitchSpec, team]);

  function hexA(hex: string, a: number) {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  const press = (fn: () => void) => (e: React.PointerEvent) => { e.preventDefault(); fn(); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#0a1622", color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
      touchAction: "manipulation",
    }}>
      <div style={{
        background: "#000", color: "#fbbf24", padding: "8px 10px",
        borderBottom: `2px solid ${team.accent}`,
        fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 800,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>DERBY {team.shortName}</div>
          <div style={{ color: team.accent, fontSize: 16 }}>{team.name}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, opacity: 0.7 }}>HOMERS</div>
          <div style={{ fontSize: 22, color: "#fbbf24" }}>{state.homers}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, opacity: 0.7 }}>PITCHES LEFT</div>
          <div style={{ fontSize: 22 }}>{state.remainingPitches}/{state.totalPitches}</div>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 280 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
        {toast && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
          }}>
            <div style={{
              padding: "10px 20px", fontSize: 26, fontWeight: 900, letterSpacing: 2,
              color: toast.includes("HOMER") ? "#fbbf24" : "#fca5a5",
              textShadow: "2px 2px 0 #000",
              background: "rgba(0,0,0,0.55)",
              border: `2px solid ${toast.includes("HOMER") ? "#fbbf24" : "#fca5a5"}`,
              borderRadius: 8,
            }}>{toast}</div>
          </div>
        )}
        {state.finished && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
            background: "rgba(0,0,0,0.7)",
          }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#fbbf24", textShadow: "3px 3px 0 #000" }}>
              FINAL: {state.homers} HR
            </div>
            <div style={{ fontSize: 16, opacity: 0.85, marginTop: 8 }}>
              Longest blast: {state.longestPx} ft
            </div>
          </div>
        )}
      </div>
      <div style={{
        padding: "10px 12px 16px", borderTop: "2px solid rgba(251,191,36,0.5)",
        background: "rgba(0,0,0,0.55)",
      }}>
        {phase === "ready" && !state.finished && (
          <button onPointerDown={press(startPitch)} style={mainBtn("#fbbf24")}>
            PITCH IN ({state.remainingPitches} left)
          </button>
        )}
        {phase === "thrown" && (
          <button onPointerDown={press(swing)} style={mainBtn("#22d3ee")}>SWING!</button>
        )}
        {state.finished && (
          <button onPointerDown={press(() => nav("/hardball"))} style={mainBtn("#fbbf24")}>
            BACK TO HARDBALL
          </button>
        )}
        <button onPointerDown={press(() => nav("/hardball"))} style={{
          marginTop: 8, width: "100%", padding: 8, fontSize: 12,
          background: "transparent", color: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.16)", borderRadius: 6,
        }}>EXIT</button>
      </div>
    </div>
  );
}

function mainBtn(color: string): React.CSSProperties {
  return {
    width: "100%", padding: "18px 16px", fontSize: 18, fontWeight: 900, letterSpacing: 2,
    borderRadius: 10, background: color, color: "#0a1622",
    border: `2px solid ${color}`, cursor: "pointer", touchAction: "manipulation",
  };
}
