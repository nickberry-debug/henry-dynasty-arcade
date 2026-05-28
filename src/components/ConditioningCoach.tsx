// Conditioning Coach — pose-driven rep counter for body-weight drills.
// Loads MediaPipe Pose from CDN, feeds each frame into repCounter, displays
// a big live rep count + phase + last form score. Falls back to a manual
// tap-to-count button if pose AI fails to load.
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Camera, CameraOff, Plus } from "lucide-react";
import { newRepCounter, processFrame, repCoachLine, type RepCounter, type RepDrill } from "../utils/repCounter";

interface Props {
  drillId: string;
  /** Called whenever the rep total increments. */
  onRep?: (totalReps: number) => void;
}

declare global { interface Window { Pose?: any; } }

/** Map drill IDs to the rep-counter's supported drill types. */
function repDrillFor(drillId: string): RepDrill | null {
  const map: Record<string, RepDrill> = {
    "pushups": "pushups",
    "squats": "squats",
    "plank": "plank",
    "lateral-shuffles": "lateral-shuffles",
    "jump-rope": "jump-rope",
    "bear-crawls": "bear-crawls",
    "arm-circles": "arm-circles",
    "mountain-climbers": "mountain-climbers",
    "toe-touches": "toe-touches",
  };
  return map[drillId] ?? null;
}

export function ConditioningCoach({ drillId, onRep }: Props) {
  const league = useStore(s => s.league);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<RepCounter>(newRepCounter());
  const trackingRef = useRef<boolean>(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error" | "manual">("idle");
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState<RepCounter["phase"]>("rest");
  const [holdSec, setHoldSec] = useState(0);
  const [coachLine, setCoachLine] = useState("");

  const repDrill = repDrillFor(drillId);
  const isPlank = repDrill === "plank";
  const settings = league?.training?.settings;
  const speak = settings?.voiceFeedback ?? false;

  useEffect(() => () => {
    trackingRef.current = false;
    const v = videoRef.current;
    if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
  }, []);

  if (!repDrill) {
    return (
      <div className="rounded-xl bg-white/5 p-3 text-xs text-ink-300">
        Auto rep-counting isn't available for this drill — tap "Mark Done" when you finish your set.
      </div>
    );
  }

  const start = async () => {
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      let mpReady = false;
      try { await loadMediaPipe(); mpReady = true; } catch { mpReady = false; }
      counterRef.current = newRepCounter();
      setReps(0); setPhase("rest"); setHoldSec(0); setCoachLine("");
      setActive(true);
      trackingRef.current = true;
      if (mpReady) { setStatus("ready"); startPoseLoop(); }
      else { setStatus("manual"); }
    } catch (err) {
      const dom = err as DOMException;
      setStatus(dom?.name === "NotAllowedError" ? "denied" : "error");
    }
  };

  const stop = () => {
    trackingRef.current = false;
    setActive(false);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
  };

  const manualRep = () => {
    counterRef.current.reps += 1;
    counterRef.current.formScores.push(75);
    const next = counterRef.current.reps;
    setReps(next);
    setPhase("up");
    setCoachLine(repCoachLine(counterRef.current, repDrill));
    onRep?.(next);
  };

  const startPoseLoop = () => {
    const pose = new window.Pose({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults((results: any) => {
      if (!trackingRef.current) return;
      drawOverlay(results);
      const lm = results.poseLandmarks;
      if (!lm) return;
      const prev = counterRef.current.reps;
      const c = processFrame(counterRef.current, { t: performance.now(), landmarks: lm }, repDrill);
      counterRef.current = c;
      if (c.reps !== prev) {
        setReps(c.reps);
        const line = repCoachLine(c, repDrill);
        setCoachLine(line);
        onRep?.(c.reps);
        if (speak && "speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(String(c.reps));
          u.rate = 1.2; u.volume = 0.7;
          speechSynthesis.speak(u);
        }
      }
      if (c.phase !== phase) setPhase(c.phase);
      if (isPlank) setHoldSec(c.holdSec);
    });
    const tick = async () => {
      if (!trackingRef.current || !videoRef.current) return;
      try { await pose.send({ image: videoRef.current }); } catch {}
      if (trackingRef.current) requestAnimationFrame(tick);
    };
    tick();
  };

  const drawOverlay = (results: any) => {
    const c = canvasRef.current; const v = videoRef.current;
    if (!c || !v) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const lm = results.poseLandmarks;
    if (!lm) return;
    ctx.fillStyle = "#34d399";
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * c.width, p.y * c.height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#ffb302"; ctx.lineWidth = 2;
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

  return (
    <div className="glass rounded-2xl p-3 space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {/* Big live rep counter overlay */}
        {active && (
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
            <div className="px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm">
              <div className="text-[9px] text-ink-300 uppercase tracking-widest">{isPlank ? "Hold" : "Reps"}</div>
              <div className="font-display text-4xl text-accent leading-none">
                {isPlank ? `${holdSec.toFixed(1)}s` : reps}
              </div>
            </div>
            <div className="px-2 py-1 rounded-lg bg-black/60 text-[10px] text-emerald-300 uppercase tracking-widest">{phase}</div>
          </div>
        )}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-200 text-sm text-center px-4">
            {status === "loading" && "Loading pose AI…"}
            {status === "denied" && "Camera blocked. Enable it in Safari settings."}
            {status === "error" && "Couldn't start camera."}
            {status === "idle" && "Press Start. Prop iPad about 6 feet away so your whole body fits in frame."}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!active ? (
          <button onClick={start} className="flex-1 px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target flex items-center justify-center gap-2">
            <Camera size={16}/> Start Camera
          </button>
        ) : (
          <>
            <button onClick={stop} className="flex-1 px-4 py-3 rounded-xl bg-red-500/80 text-white font-display tracking-wider pressable touch-target flex items-center justify-center gap-2">
              <CameraOff size={16}/> Stop
            </button>
            {status === "manual" && !isPlank && (
              <button onClick={manualRep} className="px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target flex items-center gap-1">
                <Plus size={16}/> Rep
              </button>
            )}
          </>
        )}
      </div>
      {status === "manual" && (
        <div className="text-[10px] text-amber-300 text-center">Pose AI offline — tap "Rep" each time you finish one.</div>
      )}
      {coachLine && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-2.5 text-xs text-emerald-100">
          {coachLine}
        </div>
      )}
    </div>
  );
}

// ─── MediaPipe loader ────────────────────────────────────────────────────
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
