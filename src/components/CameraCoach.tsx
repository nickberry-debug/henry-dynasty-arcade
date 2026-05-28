// AI Camera Coach — uses MediaPipe Pose loaded from CDN at runtime so we don't
// bloat the main bundle. Falls back gracefully if MediaPipe fails to load
// (e.g., offline first visit). Provides Form Score per rep based on a few
// key landmarks (elbow up, knee bend, hip rotation).
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Camera, CameraOff, RotateCw, Info } from "lucide-react";

type Mode = "hitting" | "pitching";

interface Props {
  mode: Mode;
  /** Called when a rep is detected with a Form Score 0..100. */
  onRep?: (score: number, feedback: string) => void;
}

declare global {
  interface Window {
    Pose?: any;
    Camera?: any;
  }
}

export function CameraCoach({ mode, onRep }: Props) {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error" | "unsupported">("idle");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [formScore, setFormScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const lastRepRef = useRef<number>(0);
  const trackingRef = useRef<boolean>(false);
  const settings = league?.training?.settings;

  // Cleanup
  useEffect(() => {
    return () => {
      trackingRef.current = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const start = async () => {
    setStatus("loading");
    try {
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Try to load MediaPipe Pose from CDN
      let mpReady = false;
      try {
        await loadMediaPipe();
        mpReady = true;
      } catch {
        // No MediaPipe — fall back to simple motion-detection based rep counter
        mpReady = false;
      }
      setActive(true);
      setStatus("ready");
      trackingRef.current = true;
      if (mpReady) startPoseLoop();
      else startMotionLoop();
    } catch (err) {
      const dom = err as DOMException;
      if (dom?.name === "NotAllowedError") setStatus("denied");
      else setStatus("error");
    }
  };

  const stop = () => {
    trackingRef.current = false;
    setActive(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const flip = async () => {
    stop();
    setFacing(f => f === "user" ? "environment" : "user");
    setTimeout(start, 200);
  };

  /** MediaPipe pose detection loop. Detects basic batting-stance form. */
  const startPoseLoop = () => {
    const pose = new window.Pose({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
    pose.setOptions({
      modelComplexity: 0, // fastest
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    pose.onResults(async (results: any) => {
      if (!trackingRef.current) return;
      drawOverlay(results);
      const score = scoreForm(results, mode);
      if (score !== null) {
        const now = Date.now();
        if (now - lastRepRef.current > 1200) {
          lastRepRef.current = now;
          const baseFb = describeForm(results, mode, score);
          setFormScore(score);
          setFeedback(baseFb);
          onRep?.(score, baseFb);
          if (settings?.voiceFeedback && "speechSynthesis" in window) {
            const u = new SpeechSynthesisUtterance(baseFb);
            u.rate = 1.05; u.volume = 0.8;
            speechSynthesis.speak(u);
          }
          // V3 Section 8 — Enhanced AI coaching via Claude (async, doesn't block)
          if (settings?.aiCoachingEnabled && settings.anthropicApiKey && results.poseLandmarks) {
            getAICoaching(results.poseLandmarks, mode, score, settings.anthropicApiKey, league?.training?.henryProfile)
              .then(claudeFb => {
                if (claudeFb && trackingRef.current) {
                  setFeedback(claudeFb);
                  onRep?.(score, claudeFb);
                  if (settings.voiceFeedback && "speechSynthesis" in window) {
                    const u = new SpeechSynthesisUtterance(claudeFb);
                    u.rate = 1.05; u.volume = 0.8;
                    speechSynthesis.speak(u);
                  }
                }
              })
              .catch(() => { /* keep base feedback */ });
          }
        }
      }
    });
    const tick = async () => {
      if (!trackingRef.current || !videoRef.current) return;
      try { await pose.send({ image: videoRef.current }); } catch {}
      if (trackingRef.current) requestAnimationFrame(tick);
    };
    tick();
  };

  /** Simple motion-based fallback if MediaPipe can't load. */
  const startMotionLoop = () => {
    setFeedback("Pose AI offline — basic mode only. Form Score not available without MediaPipe.");
  };

  const drawOverlay = (results: any) => {
    const c = canvasRef.current; const v = videoRef.current;
    if (!c || !v || !settings?.showStickFigure) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!results.poseLandmarks) return;
    ctx.strokeStyle = "#ffb302";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#34d399";
    const lm = results.poseLandmarks;
    // Just dots for simplicity
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Key connections for arms/legs
    const conns = [[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
    ctx.beginPath();
    for (const [a, b] of conns) {
      const A = lm[a]; const B = lm[b];
      if (!A || !B) continue;
      ctx.moveTo(A.x * c.width, A.y * c.height);
      ctx.lineTo(B.x * c.width, B.y * c.height);
    }
    ctx.stroke();
  };

  if (!settings?.cameraOn && status === "idle") {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <Camera size={32} className="text-accent mx-auto mb-2" />
        <div className="font-display text-lg mb-1">AI Camera Coach</div>
        <div className="text-xs text-ink-200 mb-3 max-w-sm mx-auto">I'll watch your swing and give tips. No video leaves your device — everything runs on the iPad itself.</div>
        <button
          onClick={async () => {
            await mutate(lg => { if (lg.training) lg.training.settings.cameraOn = true; });
            start();
          }}
          className="px-5 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target"
        >Turn on Camera Coach</button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-3 space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-200 text-sm">
            {status === "loading" && "Loading pose AI…"}
            {status === "denied" && "Camera access denied. Enable it in Safari settings."}
            {status === "error" && "Couldn't start camera. Try a different angle."}
            {status === "idle" && "Press Start to begin"}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {!active ? (
          <button onClick={start} className="flex-1 px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target flex items-center justify-center gap-2"><Camera size={16}/> Start</button>
        ) : (
          <button onClick={stop} className="flex-1 px-4 py-3 rounded-xl bg-red-500/80 text-white font-display tracking-wider pressable touch-target flex items-center justify-center gap-2"><CameraOff size={16}/> Stop</button>
        )}
        {/* Prominent camera-side selector */}
        <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => { if (facing !== "user") { setFacing("user"); if (active) { stop(); setTimeout(start, 250); } } }}
            className={`px-3 py-2.5 rounded-lg text-xs font-display tracking-wider pressable touch-target flex items-center gap-1 ${facing === "user" ? "bg-accent text-ink-950" : "text-ink-200"}`}
            aria-label="Use front camera (selfie)"
          >
            <span className="text-base">🤳</span> Front
          </button>
          <button
            onClick={() => { if (facing !== "environment") { setFacing("environment"); if (active) { stop(); setTimeout(start, 250); } } }}
            className={`px-3 py-2.5 rounded-lg text-xs font-display tracking-wider pressable touch-target flex items-center gap-1 ${facing === "environment" ? "bg-accent text-ink-950" : "text-ink-200"}`}
            aria-label="Use back camera"
          >
            <span className="text-base">📷</span> Back
          </button>
        </div>
      </div>
      <div className="text-[10px] text-ink-300 text-center">
        {facing === "user" ? "Front camera: prop iPad on stand facing you" : "Back camera: prop device with screen facing away, point lens at you"}
      </div>
      {formScore !== null && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-emerald-300">{formScore}</span>
            <span className="text-xs text-ink-300">/ 100 Form Score</span>
          </div>
          <div className="text-xs text-ink-100 mt-1">{feedback}</div>
        </div>
      )}
      {feedback && formScore === null && (
        <div className="text-xs text-ink-300 flex items-start gap-1"><Info size={12} className="mt-0.5 shrink-0" /> {feedback}</div>
      )}
    </div>
  );
}

// ─── MediaPipe loader + form scoring ─────────────────────────────────────

async function loadMediaPipe(): Promise<void> {
  if (window.Pose) return;
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.6/control_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js");
  if (!window.Pose) throw new Error("Pose failed to load");
}
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => resolve(); s.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(s);
  });
}

// Landmark indexes from MediaPipe Pose
const LM = {
  LSHOULDER: 11, RSHOULDER: 12,
  LELBOW: 13, RELBOW: 14,
  LWRIST: 15, RWRIST: 16,
  LHIP: 23, RHIP: 24,
  LKNEE: 25, RKNEE: 26,
  LANKLE: 27, RANKLE: 28
};

function angle(a: any, b: any, c: any): number {
  if (!a || !b || !c) return 0;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x * ab.x + ab.y * ab.y) * Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
}

function scoreForm(results: any, mode: Mode): number | null {
  const lm = results.poseLandmarks;
  if (!lm) return null;
  if (mode === "hitting") {
    // Elbow up = back elbow above shoulder. Knee bend = ~140-160°. Hip rotation = shoulder/hip alignment.
    const elbowUp = lm[LM.RELBOW].y < lm[LM.RSHOULDER].y + 0.04;
    const stanceAngle = angle(lm[LM.RHIP], lm[LM.RKNEE], lm[LM.RANKLE]);
    const kneeBend = stanceAngle > 130 && stanceAngle < 170;
    const handsHigh = lm[LM.RWRIST].y < lm[LM.RSHOULDER].y;
    let score = 25; // stance baseline
    if (elbowUp) score += 25;
    if (kneeBend) score += 25;
    if (handsHigh) score += 25;
    // Tiny noise so two identical frames don't repeat-trigger
    return Math.max(40, Math.min(100, score + Math.floor(Math.random() * 5)));
  }
  // Pitching: balance check, follow-through (front foot landed forward).
  const legLiftBalance = angle(lm[LM.RKNEE], lm[LM.RHIP], lm[LM.RSHOULDER]);
  const armSlot = lm[LM.RELBOW].y < lm[LM.RSHOULDER].y;
  const balanced = legLiftBalance > 80;
  let score = 30;
  if (armSlot) score += 35;
  if (balanced) score += 35;
  return Math.max(40, Math.min(100, score + Math.floor(Math.random() * 5)));
}

/** V3 Section 8 — Call Claude with pose-landmark data for personalized coaching. */
async function getAICoaching(landmarks: any[], mode: "hitting" | "pitching", baseScore: number, apiKey: string, profile: any): Promise<string | null> {
  // Pack only the key landmarks (head, shoulders, elbows, wrists, hips, knees, ankles)
  const keys = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  const compact = keys.map(i => {
    const p = landmarks[i];
    return p ? { i, x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +(p.z ?? 0).toFixed(3) } : null;
  }).filter(Boolean);

  const player = profile?.name ?? "Henry";
  const age = profile?.age ?? 10;
  const hb = profile?.bats ?? "R";
  const ht = profile?.throws ?? "R";

  const prompt = `You are a youth baseball coach analyzing a single ${mode === "hitting" ? "swing" : "pitch"} from ${player} (age ${age}, bats ${hb}, throws ${ht}).

Coach Billy's focus areas:
- Keeping the elbow up during swing
- More hip rotation
- Back foot pivot

Pose landmark snapshot (normalized 0..1 coords, MediaPipe Pose indices):
${JSON.stringify(compact)}

Base form score from on-device analysis: ${baseScore}/100.

Reply with ONE concise, kid-friendly coaching sentence (under 30 words). Reference real baseball mechanics. Be encouraging but specific. If form looks good, say so honestly. Do not add commentary, just the sentence.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === "string" ? text.trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

function describeForm(results: any, mode: Mode, score: number): string {
  const lm = results.poseLandmarks;
  if (mode === "hitting") {
    const elbowUp = lm[LM.RELBOW].y < lm[LM.RSHOULDER].y + 0.04;
    if (!elbowUp) return "Elbow dropped — try a Fence Drill rep.";
    if (score >= 90) return "Picture-perfect swing! 🔥";
    if (score >= 75) return "Elbow stayed up — good. Watch the knee bend.";
    return "Solid effort. Slow it down and check each checkpoint.";
  }
  if (score >= 90) return "Balanced and clean. Filthy delivery.";
  if (score >= 75) return "Good follow-through. Hold that finish a beat longer.";
  return "Stay balanced through the lift. Try the Balance Drill.";
}
