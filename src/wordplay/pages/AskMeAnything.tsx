import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Loader2, Mic, Square, Trash2, RotateCw } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#22D3EE";
const GRADIENT = "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(5,15,25,0.97))";
const LS_KEY = "dd_ask_me_anything";
const MAX_HISTORY = 8;

const SYSTEM =
  "You are a friendly, endlessly curious AI who answers ANY question a kid asks. Keep answers 2-4 sentences, age-appropriate for ages 5-13. Be honest, fun, and never scary or inappropriate. If you don't know something, say so enthusiastically. Add one surprising fun fact when relevant.";

const EXAMPLES = [
  "Why is the sky blue?",
  "How big is space?",
  "Do fish get thirsty?",
  "What happens when you die?",
];

interface QA {
  question: string;
  answer: string;
  ts: number;
}

function loadQAs(): QA[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQAs(items: QA[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {}
}

function Dots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: ACCENT }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export default function AskMeAnything() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQA, setActiveQA] = useState<QA | null>(null);
  const [history, setHistory] = useState<QA[]>(loadQAs);
  const vi = useVoiceInput();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vi.transcript) {
      handleAsk(vi.transcript);
      vi.reset();
    }
  }, [vi.transcript]);

  const handleAsk = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setLoading(true);
    setActiveQA(null);
    setInput("");

    const answer = await callAI({
      system: SYSTEM,
      user: q,
      maxTokens: 300,
      model: "fast",
    });

    const result = answer ?? "Oops! My brain got a little tangled. Try asking again!";
    const qa: QA = { question: q, answer: result, ts: Date.now() };
    setActiveQA(qa);

    const next = [qa, ...history].slice(0, MAX_HISTORY);
    setHistory(next);
    saveQAs(next);
    setLoading(false);
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveQA(null);
    saveQAs([]);
  };

  return (
    <WordplayShell title="ASK ANYTHING!" emoji="🙋" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div>
          <p className="text-[12px] text-ink-200 leading-relaxed">No dumb questions here.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => handleAsk(ex)}
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
              {ex}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAsk(); }}
            placeholder="Ask me anything…"
            disabled={loading || vi.listening}
            className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
            style={{ border: `1px solid ${ACCENT}44`, fontFamily: "inherit" }}
          />
          <button
            onClick={() => handleAsk()}
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl font-display text-xs tracking-widest pressable touch-target disabled:opacity-40"
            style={{ background: ACCENT, color: "#030f14", minHeight: 44, touchAction: "manipulation" }}
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
            aria-label={vi.listening ? "Stop recording" : "Speak your question"}
          >
            {vi.listening ? <Square size={14} /> : <Mic size={14} />}
          </button>
        </div>

        {vi.listening && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Listening… tap the mic again to stop
          </div>
        )}

        {vi.error && (
          <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} />
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[13px] italic" style={{ color: ACCENT }}>
            Thinking… <Dots />
          </div>
        )}

        <AnimatePresence>
          {activeQA && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}18, rgba(5,15,25,0.9))`,
                border: `1px solid ${ACCENT}55`,
              }}
            >
              <div className="flex items-start gap-2">
                <HelpCircle size={15} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
                <span className="text-[13px] font-display" style={{ color: ACCENT }}>{activeQA.question}</span>
              </div>
              <p className="text-[14px] leading-relaxed text-white">{activeQA.answer}</p>
              <button
                onClick={() => { setActiveQA(null); setInput(""); inputRef.current?.focus(); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
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

        {history.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] font-display text-ink-300">RECENT QUESTIONS</div>
              <button
                onClick={clearHistory}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg pressable touch-target"
                style={{
                  color: "#9aa6bf",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minHeight: 32,
                  touchAction: "manipulation",
                }}
              >
                <Trash2 size={10} /> Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map((qa, i) => (
                <button
                  key={qa.ts}
                  onClick={() => setActiveQA(qa)}
                  className="w-full text-left rounded-xl px-3 py-2.5 pressable touch-target"
                  style={{
                    background: activeQA?.ts === qa.ts ? `${ACCENT}14` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${activeQA?.ts === qa.ts ? `${ACCENT}44` : "rgba(255,255,255,0.06)"}`,
                    minHeight: 52,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="text-[11px] font-display" style={{ color: ACCENT }}>{qa.question}</div>
                  <div className="text-[11px] text-ink-200 mt-0.5 line-clamp-1">{qa.answer}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
