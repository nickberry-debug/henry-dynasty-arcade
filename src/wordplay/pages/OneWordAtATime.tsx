// One Word At A Time — player and AI alternate one word each to build a
// sentence. After ~15-20 words, AI writes a funny summary of what was made.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, RefreshCw } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput, speak } from "../voice";

const ACCENT = "#22D3EE";
const GRADIENT = "linear-gradient(135deg, rgba(6,182,212,0.28), rgba(5,12,30,0.95))";
const PLAYER_COLOR = "#22D3EE";
const AI_COLOR = "#A78BFA";
const SUMMARY_THRESHOLD = 16;

interface WordEntry {
  id: string;
  word: string;
  author: "player" | "ai";
}

export default function OneWordAtATime() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "player" | "ai">("idle");
  const vi = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [words, summary]);

  // When voice transcript arrives, extract first real word
  useEffect(() => {
    if (!vi.transcript) return;
    const raw = vi.transcript.trim();
    vi.reset();
    const firstWord = raw.split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, "");
    if (!firstWord) return;
    handlePlayerWord(firstWord);
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerWord = async (word: string) => {
    const playerEntry: WordEntry = { id: `p-${Date.now()}`, word, author: "player" };
    const nextWords = [...words, playerEntry];
    setWords(nextWords);
    setPhase("ai");

    if (nextWords.length >= SUMMARY_THRESHOLD) {
      await generateSummary(nextWords);
      return;
    }

    await pickAIWord(nextWords);
  };

  const pickAIWord = async (currentWords: WordEntry[]) => {
    setLoading(true);
    const sentence = currentWords.map(w => w.word).join(" ");
    const ai = await callAI({
      system: "You are playing a one-word-at-a-time story game with a kid. Respond with ONLY ONE single word that continues the sentence naturally. No punctuation, no explanation — just one word.",
      user: `Sentence so far: "${sentence}"\n\nWhat ONE word comes next? Reply with just the word.`,
      maxTokens: 10,
      model: "fast",
    });
    const aiWord = (ai || "suddenly").split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, "") || "suddenly";
    const aiEntry: WordEntry = { id: `ai-${Date.now()}`, word: aiWord, author: "ai" };
    setWords(prev => [...prev, aiEntry]);
    speak(aiWord);
    setPhase("player");
    setLoading(false);
  };

  const generateSummary = async (finalWords: WordEntry[]) => {
    setLoading(true);
    const sentence = finalWords.map(w => w.word).join(" ");
    const ai = await callAI({
      system: "You write funny, enthusiastic summaries of silly collaborative stories for kids. Keep it 2-3 short sentences. Be over-the-top hilarious about whatever nonsense was created.",
      user: `The story we built word-by-word: "${sentence}"\n\nWrite a funny 2-3 sentence summary of this masterpiece.`,
      maxTokens: 160,
      model: "fast",
    });
    const text = ai || `What a story! "${sentence}" — pure genius from start to finish. Shakespeare himself would be jealous!`;
    setSummary(text);
    speak(text);
    setLoading(false);
  };

  const startGame = () => {
    setWords([]);
    setSummary(null);
    setPhase("player");
  };

  const reset = () => {
    setWords([]);
    setSummary(null);
    setPhase("idle");
  };

  const handleMicButton = () => {
    if (vi.listening) {
      vi.stop();
    } else {
      vi.start();
    }
  };

  const isPlayerTurn = phase === "player" && !loading && !summary;
  const sentence = words.map(w => w.word).join(" ");

  return (
    <WordplayShell title="One Word At A Time" emoji="💬" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* Word count */}
        {words.length > 0 && !summary && (
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>{words.length} words</span>
            <span>{Math.max(0, SUMMARY_THRESHOLD - words.length)} until ending</span>
          </div>
        )}

        {/* Word stream */}
        {words.length > 0 && (
          <div
            className="rounded-2xl p-4 min-h-[80px]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex flex-wrap gap-1.5 items-baseline">
              <AnimatePresence initial={false}>
                {words.map(entry => (
                  <motion.span
                    key={entry.id}
                    initial={{ opacity: 0, scale: 0.7, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-base font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: entry.author === "player" ? PLAYER_COLOR : AI_COLOR,
                      background: entry.author === "player" ? `${PLAYER_COLOR}18` : `${AI_COLOR}18`,
                    }}
                  >
                    {entry.word}
                  </motion.span>
                ))}
              </AnimatePresence>

              {loading && (
                <span className="flex gap-0.5 items-center ml-1">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: AI_COLOR }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </span>
              )}
            </div>
            <div ref={bottomRef} />
          </div>
        )}

        {/* Color legend */}
        {words.length > 0 && (
          <div className="flex gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: PLAYER_COLOR }} />
              <span style={{ color: PLAYER_COLOR }}>You</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: AI_COLOR }} />
              <span style={{ color: AI_COLOR }}>AI</span>
            </span>
          </div>
        )}

        {/* Summary card */}
        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 space-y-2"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}55` }}
            >
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>THE VERDICT</div>
              <div className="text-sm leading-relaxed">{summary}</div>
              <div className="text-xs text-white/40 italic mt-1">"{sentence}"</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic error */}
        {vi.error && <MicErrorBanner error={vi.error} onRetry={vi.start} />}

        {/* Controls */}
        {phase === "idle" ? (
          <button
            onClick={startGame}
            className="w-full rounded-2xl font-display tracking-widest text-sm"
            style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
          >
            START BUILDING
          </button>
        ) : summary ? (
          <button
            onClick={reset}
            className="w-full rounded-2xl font-display tracking-widest text-sm inline-flex items-center justify-center gap-2"
            style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
          >
            <RefreshCw size={16} /> PLAY AGAIN
          </button>
        ) : (
          <div className="space-y-2">
            {vi.supported && (
              <motion.button
                onClick={handleMicButton}
                disabled={!isPlayerTurn}
                animate={vi.listening ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.7, repeat: vi.listening ? Infinity : 0 }}
                className="w-full rounded-2xl font-display tracking-widest text-sm inline-flex items-center justify-center gap-2.5 disabled:opacity-40"
                style={{
                  background: vi.listening ? ACCENT : isPlayerTurn ? `${ACCENT}33` : "rgba(255,255,255,0.05)",
                  border: `2px solid ${vi.listening ? ACCENT : isPlayerTurn ? ACCENT + "88" : "rgba(255,255,255,0.10)"}`,
                  color: vi.listening ? "#0a0a14" : ACCENT,
                  minHeight: 60,
                  touchAction: "manipulation",
                }}
              >
                {vi.listening ? <MicOff size={18} /> : <Mic size={18} />}
                {vi.listening ? "SAY YOUR WORD" : isPlayerTurn ? "TAP TO SPEAK" : "AI IS THINKING…"}
              </motion.button>
            )}

            <div className="text-center text-[11px] text-white/40">
              {vi.listening && "Say one word, then tap the button again"}
              {!vi.listening && isPlayerTurn && "Your turn! Say just one word."}
              {phase === "ai" && !loading && "AI's turn…"}
            </div>

            <button
              onClick={reset}
              className="w-full rounded-xl text-xs font-display tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 44, touchAction: "manipulation" }}
            >
              <RefreshCw size={13} /> START OVER
            </button>
          </div>
        )}

        {/* Idle intro */}
        {phase === "idle" && (
          <div className="rounded-xl p-3 text-[12px] text-white/50 leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            You and the AI take turns saying <span style={{ color: PLAYER_COLOR }}>one word</span> at a time to build a story. After {SUMMARY_THRESHOLD} words, get a funny recap!
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
