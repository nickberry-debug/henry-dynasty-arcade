import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Info } from "lucide-react";
import { getAnthropicKey } from "../../arcade/keys";

type Mode = "hitting" | "pitching";

interface Props {
  mode: Mode;
  playerName?: string;
  onRep?: (score: number, feedback: string) => void;
}

declare global {
  interface Window { Pose?: any; }
}

const LM = {
  RSHOULDER: 12, RELBOW: 14, RWRIST: 16,
  RHIP: 24, RKNEE: 26, RANKLE: 28,
};

function angle(a: any, b: any, c: any): number {
  if (!a || !b || !c) return 0;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
}

function scoreForm(lm: any[], mode: Mode): number {
  if (mode === "hitting") {
    const elbowUp = lm[LM.RELBOW]?.y < (lm[LM.RSHOULDER]?.y ?? 1) + 0.04;
    const stanceAngle = angle(lm[LM.RHIP], lm[LM.RKNEE], lm[LM.RANKLE]);
    const kneeBend = stanceAngle > 130 && stanceAngle < 170;
    const handsHigh = lm[LM.RWRIST]?.y < lm[LM.RSHOULDER]?.y;
    let s = 25;
    if (elbowUp) s += 25;
    if (kneeBend) s += 25;
    if (handsHigh) s += 25;
    return Math.max(40, Math.min(100, s + Math.floor(Math.random() * 5)));
  }
  const armSlot = lm[LM.RELBOW]?.y < lm[LM.RSHOULDER]?.y;
  const balanced = angle(lm[LM.RKNEE], lm[LM.RHIP], lm[LM.RSHOULDER]) > 80;
  let s = 30;
  if (armSlot) s += 35;
  if (balanced) s += 35;
  return Math.max(40, Math.min(100, s + Math.floor(Math.random() * 5)));
}

function describeForm(lm: any[], mode: Mode, score: number): string {
  if (mode === "hitting") {
    const elbowUp = lm[LM.RELBOW]?.y < (lm[LM.RSHOULDER]?.y ?? 1) + 0.04;
    if (!elbowUp) return "Elbow dropped — lift that back elbow up through the swing.";
    if (score >= 90) return "Picture-perfect stance! 🔥";
    if (score >= 75) return "Good elbow position. Watch that knee bend.";
    return "Solid effort. Slow it down and hit each checkpoint.";
  }
  if (score >= 90) return "Clean delivery — balanced and powerful. Filthy.";
  if (score >= 75) return "Good follow-through. Hold that finish a beat longer.";
  return "Stay balanced through the lift. Try the Balance Drill.";
}

async function loadMediaPipe(): Promise<void> {
  if (window.Pose) return;
  const load = (src: string) => new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => res(); s.onerror = () => rej(new Error("load fail"));
    document.head.appendChild(s);
  });
  await load("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js");
  await load("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js");
  await load("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js");
  if (!window.Pose) throw new Error("Pose not found");
}

async function fetchAICoaching(lm: any[], mode: Mode, score: number, name: string): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  const keys = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  const compact = keys.map(i => {
    const p = lm[i];
    return p ? { i, x: +p.x.toFixed(3), y: +p.y.toFixed(3) } : null;
  }).filter(Boolean);
  const prompt = `You are a youth baseball coach. ${name} just did a ${mode === "hitting" ? "swing" : "pitch"} in practice. Base form score: ${score}/100. Pose data: ${JSON.stringify(compact)}. Give ONE coaching sentence under 25 words. Kid-friendly, specific, encouraging. Just the sentence, no quotes.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const t = j?.content?.[0]?.text;
    return typeof t === "string" ? t.trim().replace(/^["']|["']$/g, "") : null;
  } catch { return null; }
}

export function StandaloneCameraCoach({ mode, playerName = "Player", onRep }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [formScore, setFormScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const trackingRef = useRef(false);
  const lastRepRef = useRef(0);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      let mpReady = false;
      try { await loadMediaPipe(); mpReady = true; } catch { mpReady = false; }
      setActive(true); setStatus("ready"); trackingRef.current = true;
      if (mpReady) startPoseLoop();
      else setFeedback("Pose AI offline — camera is active but form scoring unavailable.");
    } catch (err) {
      const e = err as DOMException;
      setStatus(e?.name === "NotAllowedError" ? "denied" : "error");
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

  const startPoseLoop = () => {
    const pose = new window.Pose({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}` });
    pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(async (results: any) => {
      if (!trackingRef.current) return;
      const lm = results.poseLandmarks;
      if (!lm) return;
      const c = canvasRef.current; const v = videoRef.current;
      if (c && v) {
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.fillStyle = "#34d399"; ctx.strokeStyle = "#ffb302"; ctx.lineWidth = 2;
          for (const p of lm) { ctx.beginPath(); ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2); ctx.fill(); }
          ctx.beginPath();
          [[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]].forEach(([a, b]) => {
            const A = lm[a]; const B = lm[b];
            if (A && B) { ctx.moveTo(A.x * c.width, A.y * c.height); ctx.lineTo(B.x * c.width, B.y * c.height); }
          });
          ctx.stroke();
        }
      }
      const now = Date.now();
      if (now - lastRepRef.current > 1200) {
        lastRepRef.current = now;
        const score = scoreForm(lm, mode);
        const baseFb = describeForm(lm, mode, score);
        setFormScore(score); setFeedback(baseFb);
        onRep?.(score, baseFb);
        fetchAICoaching(lm, mode, score, playerName).then(aiFb => {
          if (aiFb && trackingRef.current) { setFeedback(aiFb); onRep?.(score, aiFb); }
        });
      }
    });
    const tick = async () => {
      if (!trackingRef.current || !videoRef.current) return;
      try { await pose.send({ image: videoRef.current }); } catch {}
      if (trackingRef.current) requestAnimationFrame(tick);
    };
    tick();
  };

  if (status === "idle") {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Camera size={32} className="mx-auto mb-2" style={{ color: "#34d399" }} />
        <div className="font-display text-lg mb-1">AI Camera Coach</div>
        <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>I'll watch your form and give tips. No video leaves your device.</div>
        <button
          onClick={start}
          className="px-5 py-3 rounded-xl font-display tracking-wider pressable touch-target"
          style={{ background: "#34d399", color: "#040f08", touchAction: "manipulation" }}
        >
          Turn on Camera Coach
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {status === "loading" && "Loading pose AI…"}
            {status === "denied" && "Camera access denied. Enable in browser settings."}
            {status === "error" && "Couldn't start camera. Try a different angle."}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {!active ? (
          <button onClick={start} className="flex-1 px-4 py-3 rounded-xl font-display tracking-wider pressable touch-target flex items-center justify-center gap-2" style={{ background: "#34d399", color: "#040f08", touchAction: "manipulation" }}>
            <Camera size={16} /> Start
          </button>
        ) : (
          <button onClick={stop} className="flex-1 px-4 py-3 rounded-xl font-display tracking-wider pressable touch-target flex items-center justify-center gap-2" style={{ background: "rgba(239,68,68,0.8)", color: "white", touchAction: "manipulation" }}>
            <CameraOff size={16} /> Stop
          </button>
        )}
        <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["user", "environment"] as const).map(f => (
            <button
              key={f}
              onClick={() => { if (facing !== f) { setFacing(f); if (active) { stop(); setTimeout(start, 250); } } }}
              className="px-3 py-2 rounded-lg text-xs font-display tracking-wider pressable touch-target"
              style={{ background: facing === f ? "#34d399" : "transparent", color: facing === f ? "#040f08" : "rgba(255,255,255,0.5)", touchAction: "manipulation" }}
            >
              {f === "user" ? "🤳 Front" : "📷 Back"}
            </button>
          ))}
        </div>
      </div>
      {formScore !== null && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl" style={{ color: "#34d399" }}>{formScore}</span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>/ 100 Form Score</span>
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{feedback}</div>
        </div>
      )}
      {feedback && formScore === null && (
        <div className="text-xs flex items-start gap-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Info size={12} className="mt-0.5 shrink-0" /> {feedback}
        </div>
      )}
    </div>
  );
}
