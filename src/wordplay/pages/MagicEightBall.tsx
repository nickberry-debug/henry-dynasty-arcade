// Magic 8 Ball — ask any yes/no question, shake, get a mystical
// answer. Uses AI for personalized replies; falls back to canonical
// 8-ball responses if no key.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { useVoiceInput, speak } from "../voice";
import { callAI, useHistory } from "../ai";
import { MAGIC_8_RESPONSES } from "../templates";

const ACCENT = "#94A3B8";
const GRADIENT = "linear-gradient(135deg, rgba(80,90,110,0.50), rgba(8,10,15,0.95))";

interface Entry { id: string; question: string; answer: string; ts: number }

export default function MagicEightBall() {
  const [question, setQuestion] = useState("");
  const [shaking, setShaking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [history, add, clear] = useHistory<Entry>("magic8", 20);
  const voice = useVoiceInput();

  const shake = async () => {
    if (!question.trim()) return;
    setShaking(true);
    setAnswer(null);
    // ~1.2s shake feel before the answer reveal.
    await new Promise(r => setTimeout(r, 1200));
    const ai = await callAI({
      system: "You are a Magic 8-Ball. Answer the user's yes/no question with one short mystical reply (10-25 words). Mix definite yes, definite no, uncertain. Match the question's tone. No preamble, no commentary. Reply with just the answer line.",
      user: question.trim(),
      maxTokens: 80,
    });
    const text = (ai && ai.length < 200) ? ai : MAGIC_8_RESPONSES[Math.floor(Math.random() * MAGIC_8_RESPONSES.length)];
    setAnswer(text);
    setShaking(false);
    add({ id: `m8-${Date.now()}`, question: question.trim(), answer: text, ts: Date.now() });
    speak(text);
  };

  // Pipe voice transcript into the question field when listening lands.
  if (voice.transcript && voice.transcript !== question) {
    setTimeout(() => { setQuestion(voice.transcript); voice.reset(); }, 0);
  }

  return (
    <WordplayShell title="Magic 8 Ball" emoji="🎱" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-5">
        <motion.div
          animate={shaking ? { rotate: [0, -8, 8, -8, 8, -4, 4, 0], scale: [1, 1.05, 0.97, 1.05, 0.97, 1] } : {}}
          transition={{ duration: 1.2 }}
          className="mx-auto rounded-full flex items-center justify-center shadow-2xl"
          style={{ width: 200, height: 200, background: "radial-gradient(circle at 30% 28%, #2a2a3a 0%, #0a0a14 80%)", border: `2px solid ${ACCENT}33` }}
        >
          <div className="rounded-full flex items-center justify-center" style={{ width: 100, height: 100, background: "radial-gradient(circle at 35% 30%, #1e2030 0%, #050610 80%)", border: `1px solid ${ACCENT}55` }}>
            <div className="font-display text-6xl" style={{ color: ACCENT, textShadow: "0 0 12px rgba(148,163,184,0.5)" }}>8</div>
          </div>
        </motion.div>

        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.20)" }}>
          <label className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2 block">YOUR QUESTION</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything yes-or-no…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm"
            rows={2}
            style={{ minHeight: 60 }}
          />
          <div className="flex gap-2 mt-3">
            {voice.supported && (
              <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl pressable touch-target text-xs" style={{
                background: voice.listening ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${voice.listening ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                minHeight: 48, touchAction: "manipulation",
              }}>
                <Mic size={14} /> {voice.listening ? "Listening…" : "Speak"}
              </button>
            )}
            <button
              onClick={shake}
              disabled={!question.trim() || shaking}
              className="flex-[2] inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-40"
              style={{ background: ACCENT, color: "#0a0a14", minHeight: 48, touchAction: "manipulation" }}
            >
              🎱 {shaking ? "SHAKING…" : "SHAKE THE BALL"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {answer && !shaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: `linear-gradient(135deg, ${ACCENT}33, rgba(8,10,15,0.85))`, border: `1px solid ${ACCENT}88`, boxShadow: `0 0 30px ${ACCENT}33` }}
            >
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: ACCENT }}>THE BALL SAYS…</div>
              <div className="text-lg leading-snug text-white italic" style={{ textShadow: `0 0 12px ${ACCENT}55` }}>
                "{answer}"
              </div>
              <button onClick={() => speak(answer)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 32 }}>
                <Volume2 size={12} /> Read aloud
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">RECENT · {history.length}</div>
              <button onClick={() => clear()} className="text-[10px] text-ink-300 underline pressable touch-target" style={{ minHeight: 32 }}>Clear</button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {history.map(e => (
                <div key={e.id} className="rounded-lg px-2 py-1.5 text-[12px]" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-ink-200 italic truncate">Q: {e.question}</div>
                  <div className="text-white">A: {e.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
