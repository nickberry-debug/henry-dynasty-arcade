// New sub-app: Quiet Game Monitor. Uses Web Audio API to listen
// to ambient volume and end the streak when noise crosses a
// sensitivity threshold. Tracks today's-best + all-time-best.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Trophy, Pause, Play, AlertTriangle } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { loadHighScore, recordHighScore, useHistory } from "../ai";
import { profileKey } from "../../profiles/store";

const ACCENT = "#A78BFA";
const GRADIENT = "linear-gradient(135deg, rgba(167,139,250,0.30), rgba(30,16,50,0.95))";

// Quiet Game is permanently Hard. The mic noise threshold (0-100 from
// the analyser) was previously selected via 3 difficulty levels:
//   easy=38, medium=22, hard=12   (lower = stricter)
// Now there is no difficulty selector — instead the player tunes the
// core variable (the threshold itself) directly via a slider, defaulting
// to the old "hard" value of 12. Range 5 (very strict) to 40 (loose),
// persisted per profile.
const DEFAULT_THRESHOLD = 12;     // Hard
const THRESHOLD_MIN = 5;
const THRESHOLD_MAX = 40;
const STORE_KEY = "dd_quietgame_sensitivity_v1";

interface SessionLog { id: string; durationMs: number; ts: number }

function fmtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function QuietGame() {
  // Threshold = the core variable Hard exposes. Players tune it via the
  // slider (lower = stricter, ~tiny breath; higher = loose, ~normal talk).
  const [threshold, setThreshold] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(profileKey(STORE_KEY));
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n >= THRESHOLD_MIN && n <= THRESHOLD_MAX ? n : DEFAULT_THRESHOLD;
    } catch { return DEFAULT_THRESHOLD; }
  });
  useEffect(() => {
    try { localStorage.setItem(profileKey(STORE_KEY), String(threshold)); } catch { /* ignore */ }
  }, [threshold]);
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [streakMs, setStreakMs] = useState(0);
  const [lastVolume, setLastVolume] = useState(0);
  const [busted, setBusted] = useState(false);
  const [todayBest, setTodayBest] = useState(0);
  const [allTimeBest, setAllTimeBest] = useState(0);
  const [history, addHistory] = useHistory<SessionLog>("quiet_game", 50);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const bustedRef = useRef(false);
  // Mirror reactive state into refs so the rAF loop reads live values,
  // not the closure snapshot it captured when start() ran.
  const pausedRef = useRef(false);
  const thresholdRef = useRef<number>(DEFAULT_THRESHOLD);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);

  useEffect(() => {
    setAllTimeBest(loadHighScore("quiet_game", "all_time"));
    setTodayBest(loadHighScore("quiet_game", todayKey()));
    return () => { stopAll(); };
  }, []);

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    analyserRef.current = null;
  }

  async function start() {
    if (listening) return;
    setBusted(false); bustedRef.current = false;
    setStreakMs(0);
    pausedAccumRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
      // iOS Safari (and some Chrome configs) start the context in
      // "suspended" state — frequency data is all zeros until resumed,
      // which silently makes the streak unbustable.
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /* ignore */ }
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);
      setPaused(false);
      pausedRef.current = false;
      setPermissionDenied(false);
      startTimeRef.current = performance.now();
      const freqArray = new Uint8Array(analyser.frequencyBinCount);
      const timeArray = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        // RMS in the time domain → reliable "ambient volume" even on
        // iOS where high-band FFT bins drag the average to ~0. Scale
        // to roughly 0-100 for human-readable thresholds.
        analyserRef.current.getByteTimeDomainData(timeArray);
        let sq = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const v = (timeArray[i] - 128) / 128;
          sq += v * v;
        }
        const rms = Math.sqrt(sq / timeArray.length);
        // Also peek at FFT peak for the visualization fallback.
        analyserRef.current.getByteFrequencyData(freqArray);
        let peak = 0;
        for (let i = 0; i < freqArray.length; i++) if (freqArray[i] > peak) peak = freqArray[i];
        // Effective level: weight RMS heavily (real loudness), peak adds responsiveness.
        const level = Math.min(100, rms * 220 + peak * 0.05);
        setLastVolume(level);
        if (!pausedRef.current) {
          const now = performance.now();
          const elapsed = now - startTimeRef.current - pausedAccumRef.current;
          setStreakMs(elapsed);
          if (level > thresholdRef.current && !bustedRef.current) {
            bustedRef.current = true;
            const finalMs = elapsed;
            setBusted(true);
            setStreakMs(finalMs);
            addHistory({ id: `q-${Date.now()}`, durationMs: finalMs, ts: Date.now() });
            const beat = recordHighScore("quiet_game", todayKey(), finalMs);
            const beatAll = recordHighScore("quiet_game", "all_time", finalMs);
            if (beat) setTodayBest(finalMs);
            if (beatAll) setAllTimeBest(finalMs);
            stopAll();
            setListening(false);
            // brief beep via WebAudio (1-shot oscillator)
            try {
              const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ac.createOscillator();
              const gain = ac.createGain();
              osc.connect(gain).connect(ac.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.18, ac.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
              osc.start();
              osc.stop(ac.currentTime + 0.4);
              osc.onended = () => ac.close().catch(() => {});
            } catch {}
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      setPermissionDenied(true);
      setListening(false);
    }
  }

  function stop() {
    stopAll();
    setListening(false);
    setPaused(false);
    if (streakMs > 0 && !bustedRef.current) {
      addHistory({ id: `q-${Date.now()}`, durationMs: streakMs, ts: Date.now() });
      const beat = recordHighScore("quiet_game", todayKey(), streakMs);
      const beatAll = recordHighScore("quiet_game", "all_time", streakMs);
      if (beat) setTodayBest(streakMs);
      if (beatAll) setAllTimeBest(streakMs);
    }
  }

  function togglePause() {
    if (!listening) return;
    if (paused) {
      pausedAccumRef.current += performance.now() - pauseStartRef.current;
      setPaused(false);
    } else {
      pauseStartRef.current = performance.now();
      setPaused(true);
    }
  }

  const overThreshold = lastVolume > threshold;

  return (
    <WordplayShell title="Quiet Game" emoji="🤫" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <p className="text-[12px] text-ink-200 leading-relaxed">
          How long can everyone stay quiet? The mic listens for noise — when it hears anything louder than the threshold you set below, the streak ends. Tougher than the old "medium" setting — the default is the strict Hard threshold; nudge the slider higher if you want more forgiveness.
          <span className="block mt-1 text-ink-300">No audio is recorded or saved.</span>
        </p>

        {/* Main indicator */}
        <motion.div
          className="rounded-2xl p-6 text-center"
          animate={busted
            ? { background: "rgba(239,68,68,0.18)" }
            : overThreshold && listening
              ? { background: "rgba(239,68,68,0.10)" }
              : { background: `linear-gradient(135deg, ${ACCENT}22, rgba(30,16,50,0.95))` }
          }
          style={{ border: `2px solid ${busted ? "#ef4444" : overThreshold && listening ? "#fca5a5" : ACCENT}` }}>
          <div className="text-6xl mb-1">
            {busted ? "🔴" : !listening ? "🤫" : overThreshold ? "🔊" : "🟢"}
          </div>
          <div className="font-display tracking-widest text-sm mb-2" style={{ color: busted ? "#fca5a5" : ACCENT }}>
            {busted ? "SOUND HEARD!" : !listening ? "READY" : overThreshold ? "TOO LOUD" : "SHHH…"}
          </div>
          <div className="font-display text-4xl text-white">{fmtTime(streakMs)}</div>
          <div className="text-[11px] text-ink-200 mt-2">
            {listening && !busted ? "Stay quiet. The clock is ticking." : busted ? "Streak ended — try again!" : "Tap start to begin."}
          </div>

          {listening && (
            <div className="mt-4">
              <div className="text-[9px] tracking-widest text-ink-300 mb-1">VOLUME</div>
              <div className="h-2 rounded bg-black/40">
                <div className="h-full rounded" style={{
                  width: `${Math.min(100, lastVolume)}%`,
                  background: overThreshold ? "#fca5a5" : ACCENT,
                  transition: "width 80ms linear",
                }} />
              </div>
              <div className="text-[9px] text-ink-300 mt-1">Threshold: {threshold}</div>
            </div>
          )}
        </motion.div>

        {permissionDenied && (
          <div className="rounded-xl p-3 flex items-center gap-2 text-[12px]"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#fca5a5" }}>
            <AlertTriangle size={14} />
            <span>Microphone permission is needed for this game. Enable it in your browser settings.</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!listening ? (
            <button onClick={start}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
              style={{ background: ACCENT, color: "#1a1308", minHeight: 56 }}>
              <Mic size={14} /> START
            </button>
          ) : (
            <>
              <button onClick={togglePause}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", minHeight: 56 }}>
                {paused ? <><Play size={14} /> RESUME</> : <><Pause size={14} /> PAUSE</>}
              </button>
              <button onClick={stop}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
                style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.40)", color: "#fca5a5", minHeight: 56 }}>
                <MicOff size={14} /> STOP
              </button>
            </>
          )}
        </div>

        {/* Sensitivity — single slider tuning the noise threshold. Lower
         *  is stricter (closer to true silence). Default is the old
         *  "hard" value of 12. Persisted per profile. */}
        <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">SENSITIVITY</div>
            <div className="text-[10px] text-ink-300 font-mono">threshold {threshold}</div>
          </div>
          <input
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            value={threshold}
            onChange={e => setThreshold(parseInt(e.target.value, 10))}
            disabled={listening}
            aria-label="Noise sensitivity threshold (lower = stricter)"
            className="w-full pressable touch-target disabled:opacity-50"
            style={{ accentColor: ACCENT, minHeight: 40 }}
          />
          <div className="flex items-center justify-between text-[9px] text-ink-300 mt-1">
            <span>Strict (5)</span>
            <span>Default Hard ({DEFAULT_THRESHOLD})</span>
            <span>Forgiving (40)</span>
          </div>
          <div className="text-[10px] text-ink-300 mt-2">
            {threshold <= 10 && "Triggers on tiny sounds — close breathing, paper rustle."}
            {threshold > 10 && threshold <= 18 && "Triggers on whispers and quiet movement (default Hard)."}
            {threshold > 18 && threshold <= 28 && "Triggers on normal talking."}
            {threshold > 28 && "Tolerates conversation — only triggers on loud sounds."}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[10px] tracking-widest text-ink-200 mb-1">TODAY'S BEST</div>
            <div className="font-display text-xl text-white">{fmtTime(todayBest)}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.30)" }}>
            <div className="text-[10px] tracking-widest text-ink-200 mb-1 flex items-center gap-1"><Trophy size={10} /> ALL-TIME BEST</div>
            <div className="font-display text-xl text-white">{fmtTime(allTimeBest)}</div>
          </div>
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">RECENT STREAKS</div>
            <div className="space-y-1">
              {history.slice(0, 6).map(h => (
                <div key={h.id} className="flex items-center justify-between text-[11px] rounded px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-ink-100">{fmtTime(h.durationMs)}</span>
                  <span className="text-ink-300">{new Date(h.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
