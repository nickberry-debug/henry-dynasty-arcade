// Math Blaster — original educational arcade. Solve a math problem,
// then blast the asteroid carrying the matching answer. Difficulty
// auto-scales from profile (Everly = counting; Henry = multiplication;
// Mom/Dad = mixed). Adaptive: eases after misses, ramps with streaks.
//
// Modes: asteroid blaster, sprint, practice. Skills tracked per-profile
// for the parent report on My Stats.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Trophy, Pause, Play, Heart, Lightbulb } from "lucide-react";
import { getActiveProfileId, profileKey, recordGameSession, useActiveProfile } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { EffectsLibrary, stepEffectsParticles, drawEffectsParticles, clearEffectsParticles, playSfx, unlockAudio } from "../art";

type Tier = "prek" | "early" | "mid" | "advanced";
type Op = "add" | "sub" | "mul" | "div" | "frac" | "mixed";

const DEFAULT_TIER: Record<string, Tier> = {
  everly: "prek",
  beckett: "early",
  henry: "mid",
  mom: "advanced",
  dad: "advanced",
};

interface Problem { prompt: string; answer: number; op: Op; }
interface Asteroid { id: number; x: number; y: number; vy: number; r: number; value: number; rotation: number; rotationSpeed: number; }
interface Bullet { x: number; y: number; vy: number; targetId: number; }

interface Skill { attempts: number; correct: number; lastSeenAt: number; }
type SkillTrack = Partial<Record<Op, Skill>>;

const BASE_TIER_KEY = "dd_mathblaster_tier";
const BASE_SKILLS_KEY = "dd_mathblaster_skills";
const SKILLS_BLOB = "math_blaster_skills_v1";

function tierKey() { return profileKey(BASE_TIER_KEY); }
function skillsKey() { return profileKey(BASE_SKILLS_KEY); }

function loadTier(profileId?: string | null): Tier {
  if (!profileId) return "early";
  try {
    const raw = localStorage.getItem(tierKey());
    if (raw && ["prek", "early", "mid", "advanced"].includes(raw)) return raw as Tier;
  } catch { /* ignore */ }
  return DEFAULT_TIER[profileId] ?? "early";
}
function saveTier(t: Tier) {
  try { localStorage.setItem(tierKey(), t); } catch { /* ignore */ }
}
function loadSkills(): SkillTrack {
  try {
    const raw = localStorage.getItem(skillsKey());
    if (raw) return JSON.parse(raw) as SkillTrack;
  } catch { /* ignore */ }
  return {};
}
function persistSkills(s: SkillTrack) {
  try { localStorage.setItem(skillsKey(), JSON.stringify(s)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, SKILLS_BLOB, s); } catch { /* ignore */ }
}

// ── Problem generators ────────────────────────────────────────────────

function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

function genProblem(tier: Tier, op: Op): Problem {
  if (op === "mixed") {
    const choices: Op[] = tier === "prek" ? ["add", "sub"]
      : tier === "early" ? ["add", "sub"]
      : tier === "mid" ? ["add", "sub", "mul", "div"]
      : ["add", "sub", "mul", "div", "frac"];
    op = choices[Math.floor(Math.random() * choices.length)];
  }
  switch (op) {
    case "add": {
      const a = rand(...({ prek: [1, 9], early: [2, 20], mid: [10, 99], advanced: [50, 250] }[tier] as [number, number]));
      const b = rand(...({ prek: [1, 9], early: [2, 20], mid: [10, 99], advanced: [50, 250] }[tier] as [number, number]));
      return { prompt: `${a} + ${b}`, answer: a + b, op };
    }
    case "sub": {
      const lo = ({ prek: 1, early: 2, mid: 10, advanced: 50 }[tier]);
      const hi = ({ prek: 9, early: 20, mid: 99, advanced: 250 }[tier]);
      const a = rand(lo, hi), b = rand(lo, Math.min(hi, a));
      return { prompt: `${a} − ${b}`, answer: a - b, op };
    }
    case "mul": {
      const a = rand(...({ prek: [1, 5], early: [1, 6], mid: [2, 12], advanced: [3, 25] }[tier] as [number, number]));
      const b = rand(...({ prek: [1, 5], early: [1, 6], mid: [2, 12], advanced: [3, 15] }[tier] as [number, number]));
      return { prompt: `${a} × ${b}`, answer: a * b, op };
    }
    case "div": {
      const b = rand(...({ prek: [1, 3], early: [1, 5], mid: [2, 12], advanced: [3, 15] }[tier] as [number, number]));
      const q = rand(...({ prek: [1, 5], early: [1, 8], mid: [2, 12], advanced: [3, 15] }[tier] as [number, number]));
      return { prompt: `${b * q} ÷ ${b}`, answer: q, op };
    }
    case "frac": {
      // Simple fraction sums with like denominators → integer when possible.
      const d = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
      const a = rand(1, d - 1);
      const b = rand(1, d - a);
      // Render as "a/d + b/d" — answer is total numerator (kid-friendly variant).
      return { prompt: `${a}⁄${d} + ${b}⁄${d}`, answer: a + b, op };
    }
  }
  // Should be unreachable but TS flow needs it.
  return { prompt: "0", answer: 0, op };
}

function hintFor(p: Problem): string {
  if (p.op === "add") {
    const [a, b] = p.prompt.split(" + ").map(n => parseInt(n, 10));
    if (b <= 10) return `Start at ${a}, then count up ${b} more.`;
    return `Add the tens first: ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}, then the ones.`;
  }
  if (p.op === "sub") {
    const parts = p.prompt.split(" − ").map(n => parseInt(n, 10));
    return `What plus ${parts[1]} equals ${parts[0]}? Count from ${parts[1]} up to ${parts[0]}.`;
  }
  if (p.op === "mul") {
    const [a, b] = p.prompt.split(" × ").map(n => parseInt(n, 10));
    return `Think of it as ${a} groups of ${b}. Skip-count by ${b}, ${a} times.`;
  }
  if (p.op === "div") {
    const [whole, , divisor] = p.prompt.split(" ");
    return `How many ${divisor}s fit into ${whole}? Use the times table.`;
  }
  if (p.op === "frac") {
    return `Same bottom number means: just add the tops.`;
  }
  return "Take it step by step. You've got this.";
}

// ── Distractor answers (for the asteroids) ────────────────────────────

function makeChoices(answer: number, n = 3): number[] {
  const out = new Set<number>([answer]);
  while (out.size < n + 1) {
    const dist = answer + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * Math.max(2, Math.abs(answer) / 4 + 3)));
    if (dist >= 0 && dist !== answer) out.add(dist);
  }
  const list = Array.from(out);
  // Shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ── Engine ────────────────────────────────────────────────────────────

const W = 480, H = 720;
const SHIP_Y = H - 60;

interface Game {
  problem: Problem;
  asteroids: Asteroid[];
  bullets: Bullet[];
  shipX: number;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  elapsed: number;
  paused: boolean;
  state: "playing" | "lost";
  spawnT: number;
  combo: number;
  hintShown: boolean;
  missAt: number;
  stars: Array<{ x: number; y: number; v: number; s: number }>;
}

let _id = 1;

function newGame(tier: Tier, op: Op): Game {
  const stars: Game["stars"] = [];
  for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 60, s: 0.5 + Math.random() * 1.4 });
  return {
    problem: genProblem(tier, op),
    asteroids: [], bullets: [],
    shipX: W / 2, score: 0, streak: 0, bestStreak: 0, lives: 3,
    elapsed: 0, paused: false, state: "playing",
    spawnT: 0, combo: 1, hintShown: false, missAt: 0,
    stars,
  };
}

function spawnSet(g: Game, tier: Tier, op: Op) {
  // Generate a fresh problem and spawn one correct + N distractor asteroids.
  g.problem = genProblem(tier, op);
  g.hintShown = false;
  const choices = makeChoices(g.problem.answer, 3);
  const usedXs: number[] = [];
  for (const v of choices) {
    let x: number;
    let tries = 0;
    do {
      x = 40 + Math.random() * (W - 80);
      tries++;
    } while (tries < 5 && usedXs.some(ux => Math.abs(ux - x) < 60));
    usedXs.push(x);
    g.asteroids.push({
      id: _id++, x, y: -30 - Math.random() * 60,
      vy: 28 + Math.random() * 18 + Math.min(40, g.score * 0.08),
      r: 22, value: v,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
    });
  }
}

function step(g: Game, dt: number, tier: Tier, op: Op, onCorrect: (p: Problem) => void, onWrong: (p: Problem) => void) {
  if (g.state !== "playing" || g.paused) return;
  g.elapsed += dt;
  // Stars
  for (const s of g.stars) { s.y += s.v * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }

  // Spawn new problem set if no asteroids remain
  if (g.asteroids.length === 0 && g.bullets.length === 0) {
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      spawnSet(g, tier, op);
      g.spawnT = 0.8;
    }
  }

  // Asteroids
  for (let i = g.asteroids.length - 1; i >= 0; i--) {
    const a = g.asteroids[i];
    a.y += a.vy * dt;
    a.rotation += a.rotationSpeed * dt;
    if (a.y - a.r > H + 30) {
      // Asteroid escaped — if it was the correct answer, count as a miss
      if (a.value === g.problem.answer) {
        g.lives -= 1;
        g.streak = 0; g.combo = 1;
        g.asteroids.splice(i, 1);
        // Clear remaining asteroids of this set
        g.asteroids = [];
        onWrong(g.problem);
        if (g.lives <= 0) g.state = "lost";
        return;
      }
      g.asteroids.splice(i, 1);
    }
  }
  // Bullets
  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i];
    b.y += b.vy * dt;
    if (b.y < -20) { g.bullets.splice(i, 1); continue; }
    // Collide with target asteroid
    const target = g.asteroids.find(a => a.id === b.targetId);
    if (target && Math.hypot(target.x - b.x, target.y - b.y) < target.r + 6) {
      g.bullets.splice(i, 1);
      const correct = target.value === g.problem.answer;
      if (correct) {
        g.score += 100 * g.combo;
        g.streak += 1;
        if (g.streak > g.bestStreak) g.bestStreak = g.streak;
        g.combo = Math.min(5, 1 + Math.floor(g.streak / 3));
        EffectsLibrary.explosion(_dummy(), target.x, target.y, { scale: 1.1, color: "#86efac" });
        playSfx(g.combo >= 3 ? "streak" : "ding", { volume: 0.7 });
        g.asteroids = [];
        onCorrect(g.problem);
      } else {
        g.lives -= 1;
        g.streak = 0; g.combo = 1;
        g.missAt = g.elapsed;
        EffectsLibrary.explosion(_dummy(), target.x, target.y, { scale: 0.9, color: "#f87171" });
        playSfx("fizz", { volume: 0.5 });
        g.asteroids = g.asteroids.filter(a => a.id !== target.id);
        onWrong(g.problem);
        if (g.lives <= 0) g.state = "lost";
      }
    }
  }
}

function _dummy(): CanvasRenderingContext2D {
  return document.createElement("canvas").getContext("2d")!;
}

// ── Component ─────────────────────────────────────────────────────────

export default function MathBlaster() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [tier, setTier] = useState<Tier>(() => loadTier(profile?.id));
  const [op, setOp] = useState<Op>("mixed");
  const [mode, setMode] = useState<"asteroid" | "sprint" | "practice" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const skillsRef = useRef<SkillTrack>(loadSkills());
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);

  useEffect(() => { setTier(loadTier(profile?.id)); }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    return cloudSubscribe<SkillTrack>(profile.id, SKILLS_BLOB, remote => {
      if (!remote || typeof remote !== "object") return;
      skillsRef.current = remote;
      try { localStorage.setItem(skillsKey(), JSON.stringify(remote)); } catch { /* ignore */ }
    });
  }, [profile?.id]);

  function start(m: "asteroid" | "sprint" | "practice") {
    unlockAudio();
    setMode(m);
    gameRef.current = newGame(tier, op);
    setEndShown(false);
    clearEffectsParticles();
  }

  // Game loop
  useEffect(() => {
    if (!mode) return;
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current; if (!g) return;
      step(g, dt, tier, op,
        (p) => recordSkill(p.op, true),
        (p) => {
          recordSkill(p.op, false);
          if (mode === "practice") {
            // In practice, restore life so kid never gets stuck
            g.lives = Math.max(g.lives, 3);
            g.state = "playing";
          }
        }
      );
      stepEffectsParticles(dt);
      draw();
      force(n => n + 1);
      if (g.state === "lost" && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "mathblaster", {
          sessions: 1,
          seconds: Math.round(g.elapsed),
          level: g.score,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function recordSkill(o: Op, correct: boolean) {
    const s = skillsRef.current[o] ?? { attempts: 0, correct: 0, lastSeenAt: 0 };
    s.attempts += 1;
    if (correct) s.correct += 1;
    s.lastSeenAt = Date.now();
    skillsRef.current[o] = s;
    persistSkills(skillsRef.current);
  }

  function fireAt(a: Asteroid) {
    const g = gameRef.current; if (!g || g.paused || g.state !== "playing") return;
    g.bullets.push({ x: g.shipX, y: SHIP_Y - 16, vy: -520, targetId: a.id });
    EffectsLibrary.muzzleFlash(_dummy(), g.shipX, SHIP_Y - 14, -Math.PI / 2, 0.6, "#86efac");
    playSfx("laserSmall", { volume: 0.4, pitch: 0.95 + Math.random() * 0.1 });
  }

  function onCanvasTap(e: React.PointerEvent) {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const g = gameRef.current; if (!g) return;
    // Find closest asteroid to tap point (within 40px)
    let best: Asteroid | null = null; let bestD = Infinity;
    for (const a of g.asteroids) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < a.r + 30 && d < bestD) { bestD = d; best = a; }
    }
    if (best) {
      g.shipX = Math.max(30, Math.min(W - 30, best.x));
      fireAt(best);
    } else {
      g.shipX = Math.max(30, Math.min(W - 30, x));
    }
  }

  function draw() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
      c.width = Math.floor(rect.width * dpr); c.height = Math.floor(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = rect.width / W, sy = rect.height / H;
    ctx.scale(sx, sy);
    const g = gameRef.current; if (!g) return;
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1e1b4b"); sky.addColorStop(1, "#020617");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Stars
    for (const s of g.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + s.s * 0.3})`;
      ctx.fillRect(s.x, s.y, s.s, s.s + 0.5);
    }
    // Nebula glow
    const n = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, 220);
    n.addColorStop(0, "rgba(167,139,250,0.18)");
    n.addColorStop(1, "rgba(167,139,250,0)");
    ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);

    // Problem banner (top center)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(W / 2 - 100, 16, 200, 56);
    ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 100, 16, 200, 56);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.problem.prompt + " = ?", W / 2, 44);

    // Combo + streak
    if (g.combo > 1) {
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(`COMBO ×${g.combo}`, W / 2, 84);
    }

    // Asteroids
    for (const a of g.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      // Body
      ctx.fillStyle = "#57534e";
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Bumpy circle
      const sides = 8;
      for (let i = 0; i <= sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        const r2 = a.r + Math.sin(i * 1.3 + a.id) * 4;
        const px = Math.cos(ang) * r2, py = Math.sin(ang) * r2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Craters
      ctx.fillStyle = "#3f3f46";
      ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-a.rotation);
      // Value text — never rotates
      ctx.fillStyle = "#fef3c7";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(a.value), 0, 1);
      ctx.restore();
    }

    // Bullets
    for (const b of g.bullets) {
      ctx.fillStyle = "#86efac";
      ctx.fillRect(b.x - 2, b.y - 10, 4, 12);
      ctx.strokeStyle = "rgba(134,239,172,0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 16); ctx.stroke();
    }

    // Ship
    ctx.save();
    ctx.translate(g.shipX, SHIP_Y);
    ctx.fillStyle = "#86efac";
    ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-14, 10); ctx.lineTo(-6, 6); ctx.lineTo(0, 10); ctx.lineTo(6, 6); ctx.lineTo(14, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#67e8f9";
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();
    // Engine glow
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(0, 14 + Math.random() * 3); ctx.lineTo(4, 10); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Effects layer
    drawEffectsParticles(ctx);

    // Lives (top-left)
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.moveTo(18 + i * 22, 22);
      ctx.bezierCurveTo(18 + i * 22, 16, 10 + i * 22, 16, 10 + i * 22, 24);
      ctx.bezierCurveTo(10 + i * 22, 32, 18 + i * 22, 36, 18 + i * 22, 36);
      ctx.bezierCurveTo(18 + i * 22, 36, 26 + i * 22, 32, 26 + i * 22, 24);
      ctx.bezierCurveTo(26 + i * 22, 16, 18 + i * 22, 16, 18 + i * 22, 22);
      ctx.fill();
    }
    // Score top-right
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`${g.score}`, W - 16, 28);
    ctx.font = "10px system-ui";
    ctx.fillStyle = "#86efac";
    ctx.fillText(`STREAK ${g.streak} · BEST ${g.bestStreak}`, W - 16, 46);
  }

  // Setup screen
  if (mode === null) {
    const skills = skillsRef.current;
    return (
      <div className="min-h-screen flex flex-col items-center p-4"
        style={{ background: "radial-gradient(800px 500px at 50% 0%, rgba(167,139,250,0.18), transparent), #0a0814" }}>
        <button onClick={() => navigate("/")} aria-label="Back"
          className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={16} />
        </button>
        <div className="max-w-md w-full space-y-3 mt-12">
          <div className="text-center">
            <div className="text-5xl mb-2">🚀</div>
            <h1 className="font-display text-2xl tracking-widest" style={{ color: "#a78bfa" }}>MATH BLASTER</h1>
            <p className="text-[12px] mt-2" style={{ color: "rgba(229,231,235,0.8)" }}>
              Tap the asteroid with the right answer. Faster you go, bigger the combo.
            </p>
          </div>

          <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#a78bfa" }}>DIFFICULTY · {profile?.handle ?? profile?.name}</div>
            <div className="grid grid-cols-4 gap-1">
              {(["prek", "early", "mid", "advanced"] as Tier[]).map(t => (
                <button key={t} onClick={() => { setTier(t); saveTier(t); }}
                  className="py-2 rounded text-[9px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: tier === t ? "rgba(167,139,250,0.30)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${tier === t ? "#a78bfa" : "rgba(255,255,255,0.15)"}`,
                    color: tier === t ? "#a78bfa" : "#fef3c7",
                  }}>
                  {t === "prek" ? "PRE-K" : t === "early" ? "EARLY" : t === "mid" ? "MID" : "ADV"}
                </button>
              ))}
            </div>
            <div className="text-[10px] mt-2 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
              {tier === "prek" && "Counting & shapes (1–9)."}
              {tier === "early" && "Add & subtract (1–20)."}
              {tier === "mid" && "Multiply & divide (times tables)."}
              {tier === "advanced" && "Mixed: + − × ÷ and fractions."}
            </div>
          </section>

          <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#a78bfa" }}>MATH MODE</div>
            <div className="flex flex-wrap gap-1.5">
              {(["mixed", "add", "sub", "mul", "div", "frac"] as Op[]).map(o => (
                <button key={o} onClick={() => setOp(o)}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: op === o ? "rgba(167,139,250,0.30)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${op === o ? "#a78bfa" : "rgba(255,255,255,0.15)"}`,
                    color: op === o ? "#a78bfa" : "#fef3c7",
                  }}>
                  {o === "mixed" ? "MIXED" : o === "add" ? "+" : o === "sub" ? "−" : o === "mul" ? "×" : o === "div" ? "÷" : "FRAC"}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => start("asteroid")}
              className="py-3 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
              style={{ background: "linear-gradient(135deg, #a78bfa, #6d28d9)", color: "#0a0a14" }}>
              🚀 BLASTER
            </button>
            <button onClick={() => start("practice")}
              className="py-3 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
              style={{ background: "rgba(134,239,172,0.18)", border: "1.5px solid #86efac", color: "#86efac" }}>
              📖 PRACTICE
            </button>
          </div>

          {/* Parent report (skill summary) */}
          {Object.keys(skills).length > 0 && (
            <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1" style={{ color: "#fde047" }}>
                <BookOpen size={10} /> PARENT REPORT · {profile?.name}
              </div>
              <div className="space-y-1.5">
                {(Object.keys(skills) as Op[]).map(o => {
                  const s = skills[o]!;
                  const pct = Math.round((s.correct / Math.max(1, s.attempts)) * 100);
                  return (
                    <div key={o} className="flex items-center gap-2 text-[10px]">
                      <span className="font-mono w-12" style={{ color: "#fef3c7" }}>
                        {o === "add" ? "+" : o === "sub" ? "−" : o === "mul" ? "×" : o === "div" ? "÷" : o === "frac" ? "FRAC" : "MIX"}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="h-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#86efac" : pct >= 60 ? "#fde047" : "#fb923c" }} />
                      </div>
                      <span className="w-16 text-right font-mono" style={{ color: "rgba(229,231,235,0.85)" }}>
                        {s.correct}/{s.attempts} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] mt-2 opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
                Mom &amp; Dad can also see this from the My Stats page.
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  const g = gameRef.current;
  if (!g) return null;
  const showHint = !g.hintShown && g.elapsed > 0 && g.streak === 0 && g.elapsed - g.missAt > 1.0 && g.missAt > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#02010a" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 font-display text-[11px] tracking-widest" style={{ color: "#a78bfa" }}>
          MATH BLASTER · {tier.toUpperCase()} · {op.toUpperCase()}
        </div>
        <button onClick={() => { g.paused = !g.paused; force(n => n + 1); }} aria-label="Pause"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          {g.paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </header>

      <main className="flex-1 relative flex items-center justify-center">
        <canvas ref={canvasRef}
          onPointerDown={onCanvasTap}
          style={{ width: "min(100%, 480px)", aspectRatio: `${W}/${H}`, touchAction: "none" }} />

        {showHint && (
          <div className="absolute left-1/2 top-24 -translate-x-1/2 max-w-xs px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
            style={{ background: "rgba(167,139,250,0.18)", border: "1px solid #a78bfa", color: "#fef3c7" }}
            onClick={() => { g.hintShown = true; force(n => n + 1); }}>
            <Lightbulb size={12} style={{ color: "#fde047" }} />
            <span>{hintFor(g.problem)}</span>
          </div>
        )}

        {g.paused && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
            <div className="text-center">
              <div className="font-display tracking-widest text-2xl" style={{ color: "#a78bfa" }}>PAUSED</div>
              <button onClick={() => { g.paused = false; force(n => n + 1); }}
                className="mt-3 px-4 py-2 rounded-full font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: "#a78bfa", color: "#0a0a14" }}>
                RESUME
              </button>
            </div>
          </div>
        )}

        {g.state === "lost" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.78)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.20), rgba(8,8,14,0.95))", border: "1.5px solid #a78bfa" }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: "#fde047" }}>
                <Trophy size={20} />
                <div className="font-display tracking-widest text-lg">FINAL SCORE</div>
              </div>
              <div className="text-3xl font-display mt-2" style={{ color: "#fef3c7" }}>{g.score}</div>
              <div className="text-[11px] font-mono mt-1" style={{ color: "#86efac" }}>BEST STREAK {g.bestStreak}</div>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => { setMode(null); }}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                  MENU
                </button>
                <button onClick={() => { gameRef.current = newGame(tier, op); setEndShown(false); force(n => n + 1); }}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #6d28d9)", color: "#0a0a14" }}>
                  AGAIN
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
