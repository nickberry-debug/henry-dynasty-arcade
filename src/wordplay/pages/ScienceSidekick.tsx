// Science Sidekick — asks science "why" questions, gets answers + safe experiments.
// Parses JSON response to show two sections: "THE SCIENCE" and "TRY THIS!"

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, BookOpen, Loader2, Mic, Square, RotateCw, Zap } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI, parseJSON, useHistory } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#10B981";
const GRADIENT = "linear-gradient(135deg, rgba(16,185,129,0.28), rgba(3,18,12,0.95))";

const SYSTEM =
  "You are a science sidekick for kids 8-12. Answer science questions in 2-3 simple sentences, then suggest ONE safe, easy experiment they can do with household items. " +
  'Respond with ONLY valid JSON (no markdown): {"explanation": "string", "experiment": "string"}';

const CHIPS = [
  "Why is the sky blue?",
  "Why do we yawn?",
  "Why does ice float?",
  "Why do leaves change color?",
  "Why is the ocean salty?",
  "Why do we dream?",
];

interface ScienceResult { explanation: string; experiment: string }
interface HistoryItem { question: string; result: ScienceResult; ts: number }

export default function ScienceSidekick() {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ScienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, addHistory] = useHistory<HistoryItem>("science_sidekick", 5);
  const vi = useVoiceInput();

  useEffect(() => {
    if (vi.transcript) {
      handleSubmit(vi.transcript);
      vi.reset();
    }
  }, [vi.transcript]);

  const handleSubmit = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || loading) return;
    setLoading(true);
    setResult(null);
    setQuestion(raw);
    setInput("");

    const response = await callAI({
      system: SYSTEM,
      user: raw,
      maxTokens: 450,
      model: "fast",
    });

    const parsed = parseJSON<ScienceResult>(response);
    if (parsed && parsed.explanation) {
      setResult(parsed);
      addHistory({ question: raw, result: parsed, ts: Date.now() });
    } else {
      // Fallback if JSON didn't parse cleanly
      const fallback: ScienceResult = {
        explanation: response ?? "Science is amazing! I couldn't quite put this one into words — try asking again.",
        experiment: "Fill a glass with water and put a pencil in it at an angle. Look at it from the side — the pencil appears bent! This is refraction, the same trick light plays on us every day.",
      };
      setResult(fallback);
      addHistory({ question: raw, result: fallback, ts: Date.now() });
    }
    setLoading(false);
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setQuestion("");
    vi.reset();
  };

  return (
    <WordplayShell title="Science Sidekick" emoji="🧪" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <p className="text-[12px] text-ink-200 leading-relaxed">
          Ask any science question — I'll explain it AND give you a cool experiment to try at home!
        </p>

        {/* Chip suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleSubmit(chip)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full text-[11px] pressable touch-target disabled:opacity-40"
              style={{
                background: `${ACCENT}22`,
                border: `1px solid ${ACCENT}55`,
                color: ACCENT,
                minHeight: 34,
                touchAction: "manipulation",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Ask a science question…"
            disabled={loading || vi.listening}
            className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
            style={{ border: `1px solid ${ACCENT}44`, fontFamily: "inherit" }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl font-display text-xs tracking-widest pressable touch-target disabled:opacity-40"
            style={{ background: ACCENT, color: "#021a0e", minHeight: 44, touchAction: "manipulation" }}
          >
            ASK
          </button>
          <button
            onClick={() => vi.listening ? vi.stop() : vi.start()}
            disabled={loading}
            className="w-11 rounded-xl pressable touch-target disabled:opacity-40 flex items-center justify-center"
            style={{
              background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${vi.listening ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
              color: vi.listening ? "#fca5a5" : "#fff",
              minHeight: 44,
              touchAction: "manipulation",
            }}
            aria-label={vi.listening ? "Stop recording" : "Ask with your voice"}
          >
            {vi.listening ? <Square size={14} /> : <Mic size={14} />}
          </button>
        </div>

        {vi.listening && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Listening… ask away, scientist!
          </div>
        )}

        {vi.error && (
          <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} />
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-300 italic">
            <Loader2 size={13} className="animate-spin" /> Looking up the science…
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Question label */}
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: ACCENT }} />
                <span
                  className="text-[11px] font-display"
                  style={{ color: ACCENT }}
                >
                  {question}
                </span>
              </div>

              {/* THE SCIENCE card */}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl p-4"
                style={{
                  background: `${ACCENT}14`,
                  border: `1px solid ${ACCENT}44`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} style={{ color: ACCENT }} />
                  <span className="text-[9px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>THE SCIENCE</span>
                </div>
                <p className="text-[14px] leading-relaxed text-white">{result.explanation}</p>
              </motion.div>

              {/* TRY THIS! card */}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(250,204,21,0.10)",
                  border: "1px solid rgba(250,204,21,0.40)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Beaker size={14} style={{ color: "#fde047" }} />
                  <span className="text-[9px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>TRY THIS!</span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "#fef9c3" }}>{result.experiment}</p>
              </motion.div>

              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display text-xs tracking-widest pressable touch-target"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  minHeight: 44,
                  touchAction: "manipulation",
                }}
              >
                <RotateCw size={12} /> Ask another question
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">RECENT QUESTIONS</div>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(item.question); setResult(item.result); }}
                  className="w-full text-left rounded-xl px-3 py-2.5 pressable touch-target"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 50,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="text-[11px] font-display" style={{ color: ACCENT }}>{item.question}</div>
                  <div className="text-[11px] text-ink-200 mt-0.5 line-clamp-1">{item.result.explanation}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
