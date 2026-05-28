// Explain It Like I'm 8 — user speaks or types a confusing concept,
// AI explains it in simple words with a fun analogy and example.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Loader2, Mic, Square, RotateCw } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI, useHistory } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#60A5FA";
const GRADIENT = "linear-gradient(135deg, rgba(96,165,250,0.28), rgba(8,10,30,0.95))";

const EXAMPLE_CHIPS = [
  "black holes", "inflation", "democracy",
  "DNA", "quantum", "the stock market",
];

interface HistoryItem { concept: string; explanation: string; ts: number }

const SYSTEM = "You are an expert at explaining complex topics to curious 8-year-olds. Use simple words, a fun analogy, and a concrete example. Keep it to 3-4 sentences.";

export default function ExplainIt() {
  const [input, setInput] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [concept, setConcept] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, addHistory] = useHistory<HistoryItem>("explain_it", 5);
  const vi = useVoiceInput();

  // When voice transcript arrives, submit it
  useEffect(() => {
    if (vi.transcript) {
      setInput(vi.transcript);
      handleSubmit(vi.transcript);
      vi.reset();
    }
  }, [vi.transcript]);

  const handleSubmit = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading) return;
    setLoading(true);
    setExplanation(null);
    setConcept(query);
    setInput("");
    const result = await callAI({
      system: SYSTEM,
      user: `Explain this to me like I'm 8 years old: "${query}"`,
      maxTokens: 350,
      model: "fast",
    });
    const answer = result ?? "Hmm, I had trouble thinking of an explanation! Try asking again or pick a different topic.";
    setExplanation(answer);
    addHistory({ concept: query, explanation: answer, ts: Date.now() });
    setLoading(false);
  };

  const reset = () => {
    setInput("");
    setExplanation(null);
    setConcept("");
    vi.reset();
  };

  return (
    <WordplayShell title="Explain It Like I'm 8" emoji="💡" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <p className="text-[12px] text-ink-200 leading-relaxed">
          Confused by a big word or idea? Type it or speak it — I'll explain it so anyone can understand!
        </p>

        {/* Chip suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_CHIPS.map(chip => (
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
            placeholder="Type a word or concept…"
            disabled={loading || vi.listening}
            className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
            style={{ border: `1px solid ${ACCENT}44`, fontFamily: "inherit" }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl font-display text-xs tracking-widest pressable touch-target disabled:opacity-40"
            style={{ background: ACCENT, color: "#0a0a28", minHeight: 44, touchAction: "manipulation" }}
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
            Listening… tap the mic button again to stop
          </div>
        )}

        {vi.error && (
          <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-300 italic">
            <Loader2 size={13} className="animate-spin" /> Thinking of the perfect explanation…
          </div>
        )}

        {/* Explanation card */}
        <AnimatePresence>
          {explanation && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}18, rgba(10,12,35,0.9))`,
                border: `1px solid ${ACCENT}55`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} style={{ color: ACCENT }} />
                <span className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>EXPLAINING</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-display"
                  style={{ background: `${ACCENT}33`, color: ACCENT }}
                >
                  {concept}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-white">{explanation}</p>
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
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-300 mb-2">RECENT EXPLANATIONS</div>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setConcept(item.concept); setExplanation(item.explanation); }}
                  className="w-full text-left rounded-xl px-3 py-2.5 pressable touch-target"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 50,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="text-[11px] font-display" style={{ color: ACCENT }}>{item.concept}</div>
                  <div className="text-[11px] text-ink-200 mt-0.5 line-clamp-1">{item.explanation}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
