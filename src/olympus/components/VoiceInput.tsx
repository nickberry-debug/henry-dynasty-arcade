// Voice input — browser Web Speech Recognition API. Tap mic, speak,
// the captured text is offered as a confirmation before committing.
//
// If the recognised phrase fuzzy-matches a pre-set choice label closely,
// onMatchChoice is called with that choice's index. Otherwise the raw
// text is offered as a free-text action via onFreeText.
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, CheckCircle, RotateCw, X } from "lucide-react";

interface Props {
  /** Labels of the currently-visible pre-set choices. */
  choiceLabels: string[];
  /** Called when speech matches one of the choices closely enough. */
  onMatchChoice: (index: number) => void;
  /** Called when the speech is offered as free-text. */
  onFreeText: (text: string) => void;
  /** Whether the host page wants the voice flow at all. */
  enabled: boolean;
}

type RecognitionState = "idle" | "listening" | "confirm" | "denied" | "unsupported";

interface Recog {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

function getRecognitionCtor(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function VoiceInput({ choiceLabels, onMatchChoice, onFreeText, enabled }: Props) {
  const [state, setState] = useState<RecognitionState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [matchIdx, setMatchIdx] = useState<number | null>(null);
  const recogRef = useRef<Recog | null>(null);

  useEffect(() => {
    const ctor = getRecognitionCtor();
    if (!ctor) {
      setState("unsupported");
      return;
    }
    const r = new ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = (event: any) => {
      const results = event.results?.[0];
      if (!results) return;
      const alts: string[] = [];
      for (let i = 0; i < results.length; i++) alts.push(results[i].transcript);
      // Pick the alternative that best matches a choice.
      let bestIdx = -1; let bestScore = 0; let bestText = alts[0] ?? "";
      for (const alt of alts) {
        for (let i = 0; i < choiceLabels.length; i++) {
          const s = fuzzy(alt, choiceLabels[i]);
          if (s > bestScore) { bestScore = s; bestIdx = i; bestText = alt; }
        }
      }
      setTranscript(bestText.trim());
      setMatchIdx(bestScore >= 0.5 ? bestIdx : null);
      setState("confirm");
    };
    r.onerror = (event: any) => {
      const err = event.error;
      if (err === "not-allowed" || err === "service-not-allowed") setState("denied");
      else setState("idle");
    };
    r.onend = () => {
      setState(s => (s === "listening" ? "idle" : s));
    };
    recogRef.current = r;
    return () => {
      try { r.abort(); } catch {}
    };
  }, [choiceLabels.join("|")]);

  if (!enabled) return null;
  if (state === "unsupported") {
    return (
      <button disabled className="px-3 py-2 rounded-xl bg-white/5 text-ink-300 text-xs flex items-center gap-2" title="Voice input not supported on this browser">
        <MicOff size={14} /> Voice unavailable
      </button>
    );
  }

  const start = () => {
    try {
      setTranscript("");
      setMatchIdx(null);
      setState("listening");
      recogRef.current?.start();
    } catch {
      setState("idle");
    }
  };
  const stop = () => {
    try { recogRef.current?.stop(); } catch {}
    setState("idle");
  };
  const confirm = () => {
    if (matchIdx !== null) onMatchChoice(matchIdx);
    else if (transcript.trim()) onFreeText(transcript.trim());
    setState("idle");
    setTranscript("");
    setMatchIdx(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {state === "idle" && (
        <button onClick={start} className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-display tracking-wider pressable touch-target" style={{ background: "#DAA520", color: "#0a0d13" }}>
          <Mic size={16} /> Speak your choice
        </button>
      )}
      {state === "listening" && (
        <button onClick={stop} className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-display tracking-wider pressable touch-target bg-red-500/80 text-white">
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" /> Listening… tap to stop
        </button>
      )}
      {state === "confirm" && (
        <div className="rounded-xl bg-black/60 border border-amber-400/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1">Heard you say</div>
          <div className="text-sm text-white leading-snug mb-2">"{transcript}"</div>
          {matchIdx !== null && (
            <div className="text-xs text-emerald-300 mb-2">
              ✓ Matched choice {matchIdx + 1}: <span className="italic">{choiceLabels[matchIdx]}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={confirm} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-ink-950 text-xs font-display tracking-wider flex items-center gap-1.5 pressable touch-target">
              <CheckCircle size={12} /> Commit
            </button>
            {matchIdx !== null && (
              <button onClick={() => { onFreeText(transcript.trim()); setState("idle"); setTranscript(""); setMatchIdx(null); }} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-display tracking-wider pressable touch-target">
                Use as free-text instead
              </button>
            )}
            <button onClick={start} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs flex items-center gap-1 pressable touch-target">
              <RotateCw size={12} /> Retry
            </button>
            <button onClick={() => { setState("idle"); setTranscript(""); setMatchIdx(null); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs flex items-center gap-1 pressable touch-target">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}
      {state === "denied" && (
        <div className="text-xs text-amber-300">Microphone access denied. Enable it in your browser settings to use voice input.</div>
      )}
    </div>
  );
}

/** Crude similarity score 0..1 between two phrases. */
function fuzzy(a: string, b: string): number {
  const A = a.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const B = b.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  if (A.length === 0 || B.length === 0) return 0;
  const setA = new Set(A);
  const setB = new Set(B);
  let overlap = 0;
  for (const w of setA) if (setB.has(w)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}
