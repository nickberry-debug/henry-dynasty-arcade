// What Happens If? — science hypothetical questions engine.
// User speaks or types a "what if" scenario; AI gives a fun, grounded answer.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Loader2, Mic, Square, RotateCw } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI, useHistory } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#A78BFA";
const GRADIENT = "linear-gradient(135deg, rgba(167,139,250,0.28), rgba(10,5,28,0.95))";

const SYSTEM =
  "You are a playful science expert answering 'what if' questions for curious kids. Give a real scientific answer (what would actually happen) in 3-4 engaging sentences. Be fun but accurate.";

const CHIPS = [
  "the moon disappeared",
  "dogs could talk",
  "gravity reversed",
  "we had 48 hour days",
  "the ocean was chocolate milk",
  "everyone forgot how to read",
];

interface HistoryItem { question: string; answer: string; ts: number }

export default function WhatHappensIf() {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, addHistory] = useHistory<HistoryItem>("what_if", 5);
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
    // Normalise — strip leading "what happens if" so we don't duplicate it in display
    const q = raw.replace(/^what happens if\s*/i, "").replace(/\?$/, "").trim();
    setLoading(true);
    setAnswer(null);
    setQuestion(q);
    setInput("");
    const result = await callAI({
      system: SYSTEM,
      user: `What happens if ${q}?`,
      maxTokens: 350,
      model: "fast",
    });
    const reply =
      result ??
      "Whoa, that's such a wild question my brain short-circuited! Try asking again — I want to figure this one out with you.";
    setAnswer(reply);
    addHistory({ question: q, answer: reply, ts: Date.now() });
    setLoading(false);
  };

  const reset = () => {
    setInput("");
    setAnswer(null);
    setQuestion("");
    vi.reset();
  };

  return (
    <WordplayShell title="What Happens If?" emoji="🔬" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <p className="text-[12px] text-ink-200 leading-relaxed">
          Ask any wild "What if" question — I'll tell you what would ACTUALLY happen, step by step!
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
          <div className="flex-1 flex items-center rounded-xl overflow-hidden bg-black/40" style={{ border: `1px solid ${ACCENT}44` }}>
            <span className="pl-3 text-[12px] text-ink-300 whitespace-nowrap">What if…</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="type something wild"
              disabled={loading || vi.listening}
              className="flex-1 px-2 py-2.5 bg-transparent text-white outline-none disabled:opacity-40"
              style={{ fontFamily: "inherit" }}
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl font-display text-xs tracking-widest pressable touch-target disabled:opacity-40"
            style={{ background: ACCENT, color: "#0a0828", minHeight: 44, touchAction: "manipulation" }}
          >
            GO
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
            aria-label={vi.listening ? "Stop recording" : "Speak your question"}
          >
            {vi.listening ? <Square size={14} /> : <Mic size={14} />}
          </button>
        </div>

        {vi.listening && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Listening… tap mic again to stop
          </div>
        )}

        {vi.error && (
          <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} />
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-300 italic">
            <Loader2 size={13} className="animate-spin" /> Calculating the chaos…
          </div>
        )}

        {/* Answer card */}
        <AnimatePresence>
          {answer && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}18, rgba(10,5,28,0.9))`,
                border: `1px solid ${ACCENT}55`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={16} style={{ color: ACCENT }} />
                <span className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>WHAT HAPPENS IF…</span>
              </div>
              <div
                className="text-[12px] font-display mb-3 px-3 py-1.5 rounded-lg inline-block"
                style={{ background: `${ACCENT}28`, color: ACCENT }}
              >
                {question}?
              </div>
              <p className="text-[14px] leading-relaxed text-white">{answer}</p>
              <button
                onClick={reset}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  minHeight: 40,
                  touchAction: "manipulation",
                }}
              >
                <RotateCw size={11} /> Ask another
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
                  onClick={() => { setQuestion(item.question); setAnswer(item.answer); }}
                  className="w-full text-left rounded-xl px-3 py-2.5 pressable touch-target"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 50,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="text-[11px] font-display" style={{ color: ACCENT }}>What if {item.question}?</div>
                  <div className="text-[11px] text-ink-200 mt-0.5 line-clamp-1">{item.answer}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
