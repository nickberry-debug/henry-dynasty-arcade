// Game Show — You Don't Know Jack-style AI trivia with host "Benny Buzzworth".
// Categories: Animals, Science, History, Sports, Food, Space, Movies.
// AI generates a question + 4 choices; player picks A-D; host reacts.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Trophy } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON } from "../ai";
import { speak } from "../voice";

const ACCENT = "#FBBF24";
const GRADIENT = "linear-gradient(135deg, rgba(251,191,36,0.28), rgba(30,20,5,0.96))";

const CATEGORIES = ["Animals", "Science", "History", "Sports", "Food", "Space", "Movies"] as const;
type Category = typeof CATEGORIES[number];

interface Question {
  question: string;
  choices: [string, string, string, string];
  correct: "A" | "B" | "C" | "D";
  fun_fact: string;
}

type AnswerKey = "A" | "B" | "C" | "D";

interface RoundResult {
  correct: boolean;
  reaction: string;
}

export default function GameShow() {
  const [phase, setPhase] = useState<"lobby" | "loading" | "question" | "reaction" | "done">("lobby");
  const [category, setCategory] = useState<Category>("Animals");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchQuestion = async (cat: Category) => {
    setPhase("loading");
    setLoading(true);
    setQuestion(null);
    setSelected(null);
    setResult(null);

    const ai = await callAI({
      system: `You are Benny Buzzworth, an over-the-top, hilarious game show host for kids. Generate trivia questions that are fun and age-appropriate (ages 7-13). Output ONLY valid JSON.`,
      user: `Category: ${cat}. Generate a trivia question with exactly 4 multiple-choice answers (A, B, C, D). Make it tricky but fair. Return JSON:
{
  "question": "...",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": "A" | "B" | "C" | "D",
  "fun_fact": "One fun sentence about the answer."
}`,
      maxTokens: 300,
      model: "fast",
    });

    const parsed = parseJSON<Question>(ai);

    if (parsed?.question && Array.isArray(parsed.choices) && parsed.choices.length === 4 && parsed.correct) {
      setQuestion(parsed);
    } else {
      // Fallback question
      setQuestion({
        question: "Which planet is known as the Red Planet?",
        choices: ["A. Venus", "B. Mars", "C. Jupiter", "D. Saturn"],
        correct: "B",
        fun_fact: "Mars gets its red color from iron oxide (rust) on its surface!",
      });
    }

    setPhase("question");
    setLoading(false);
  };

  const handleAnswer = async (key: AnswerKey) => {
    if (!question || selected) return;
    setSelected(key);
    const isCorrect = key === question.correct;

    setLoading(true);
    const ai = await callAI({
      system: `You are Benny Buzzworth, a hilarious over-the-top game show host for kids. React to the player's answer with big energy. 1-2 sentences max. Be funny and enthusiastic. If correct: celebrate wildly. If wrong: be dramatically shocked but kind.`,
      user: `The question was: "${question.question}"
Correct answer: ${question.correct}. ${question.choices[question.correct.charCodeAt(0) - 65]}
Player answered: ${key} — that is ${isCorrect ? "CORRECT" : "WRONG"}.
Fun fact: ${question.fun_fact}
React as Benny Buzzworth in 1-2 sentences.`,
      maxTokens: 120,
      model: "fast",
    });

    const reaction = ai || (isCorrect
      ? "DING DING DING! You're absolutely right, you brilliant superstar!"
      : `Ohhhh, SO close! The answer was ${question.correct}! Better luck next round, champ!`);

    setResult({ correct: isCorrect, reaction });
    if (isCorrect) setScore(s => s + 1);
    setTotal(t => t + 1);
    speak(reaction);
    setPhase("reaction");
    setLoading(false);
  };

  const nextQuestion = () => {
    fetchQuestion(category);
  };

  const resetGame = () => {
    setScore(0);
    setTotal(0);
    setPhase("lobby");
    setQuestion(null);
    setSelected(null);
    setResult(null);
  };

  const choiceKeys: AnswerKey[] = ["A", "B", "C", "D"];

  return (
    <WordplayShell title="Game Show" emoji="🎰" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* Score bar — always visible once playing */}
        {total > 0 && (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}44` }}
          >
            <div className="flex items-center gap-2">
              <Trophy size={15} style={{ color: ACCENT }} />
              <span className="font-display text-sm tracking-widest" style={{ color: ACCENT }}>SCORE</span>
            </div>
            <div className="font-display text-xl" style={{ color: ACCENT }}>
              {score} <span className="text-white/40 text-sm font-sans">/ {total}</span>
            </div>
          </div>
        )}

        {/* LOBBY */}
        {phase === "lobby" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center space-y-1"
              style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}44` }}
            >
              <div className="text-3xl">🎤</div>
              <div className="font-display text-xl" style={{ color: ACCENT }}>BENNY BUZZWORTH</div>
              <div className="text-sm text-white/60">Pick a category and let's play!</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="rounded-xl px-3 py-2.5 text-sm font-display tracking-wide"
                  style={{
                    background: category === cat ? `${ACCENT}33` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${category === cat ? ACCENT + "88" : "rgba(255,255,255,0.10)"}`,
                    color: category === cat ? ACCENT : "#fff",
                    minHeight: 48,
                    touchAction: "manipulation",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchQuestion(category)}
              className="w-full rounded-2xl font-display tracking-widest text-sm"
              style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
            >
              LET'S PLAY!
            </button>
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-4xl">🎤</div>
            <div className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>
              BENNY IS COOKING UP A QUESTION…
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: ACCENT }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        )}

        {/* QUESTION */}
        {(phase === "question" || phase === "reaction") && question && (
          <div className="space-y-4">
            {/* Category badge */}
            <div className="flex items-center justify-between text-[11px]">
              <span
                className="px-2.5 py-1 rounded-full font-display tracking-widest"
                style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44` }}
              >
                {category.toUpperCase()}
              </span>
              <span className="text-white/40">Q #{total + (phase === "reaction" ? 0 : 1)}</span>
            </div>

            {/* Question card */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div className="text-[10px] tracking-[0.3em] font-display mb-2 text-white/40">THE QUESTION</div>
              <div className="text-base leading-relaxed font-semibold">{question.question}</div>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 gap-2.5">
              {choiceKeys.map((key) => {
                const choiceText = question.choices[key.charCodeAt(0) - 65];
                const isSelected = selected === key;
                const isCorrect = question.correct === key;
                const showResult = phase === "reaction";

                let bg = "rgba(255,255,255,0.05)";
                let border = "1px solid rgba(255,255,255,0.10)";
                let textColor = "#fff";

                if (showResult && isCorrect) {
                  bg = "rgba(52,211,153,0.20)";
                  border = "1px solid rgba(52,211,153,0.55)";
                  textColor = "#86efac";
                } else if (showResult && isSelected && !isCorrect) {
                  bg = "rgba(239,68,68,0.20)";
                  border = "1px solid rgba(239,68,68,0.55)";
                  textColor = "#fca5a5";
                } else if (!showResult && isSelected) {
                  bg = `${ACCENT}22`;
                  border = `1px solid ${ACCENT}66`;
                  textColor = ACCENT;
                }

                return (
                  <motion.button
                    key={key}
                    onClick={() => handleAnswer(key)}
                    disabled={!!selected || loading}
                    whileTap={!selected ? { scale: 0.97 } : {}}
                    className="w-full rounded-xl px-4 py-3 text-sm text-left font-medium disabled:cursor-default"
                    style={{
                      background: bg,
                      border,
                      color: textColor,
                      minHeight: 52,
                      touchAction: "manipulation",
                    }}
                  >
                    <span
                      className="inline-block w-6 h-6 rounded-full text-xs font-display mr-3 text-center leading-6"
                      style={{
                        background: showResult && isCorrect ? "#34d399" : isSelected ? ACCENT : "rgba(255,255,255,0.12)",
                        color: showResult && isCorrect ? "#0a0a14" : isSelected && !showResult ? "#0a0a14" : "#fff",
                      }}
                    >
                      {key}
                    </span>
                    {choiceText.replace(/^[ABCD]\.\s*/, "")}
                  </motion.button>
                );
              })}
            </div>

            {/* Benny's reaction */}
            <AnimatePresence>
              {phase === "reaction" && result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 space-y-2"
                  style={{
                    background: result.correct ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${result.correct ? "rgba(52,211,153,0.45)" : "rgba(239,68,68,0.45)"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{result.correct ? "🎉" : "😱"}</span>
                    <div className="text-[10px] tracking-[0.25em] font-display" style={{ color: ACCENT }}>BENNY SAYS</div>
                  </div>
                  <div className="text-sm leading-relaxed italic">"{result.reaction}"</div>
                  {!result.correct && (
                    <div className="text-[11px] text-white/50 mt-1">{question.fun_fact}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next / controls */}
            {phase === "reaction" && (
              <div className="flex gap-2.5">
                <button
                  onClick={nextQuestion}
                  disabled={loading}
                  className="flex-[3] rounded-2xl font-display tracking-widest text-sm disabled:opacity-50"
                  style={{ background: ACCENT, color: "#0a0a14", minHeight: 56, touchAction: "manipulation" }}
                >
                  NEXT QUESTION
                </button>
                <button
                  onClick={resetGame}
                  className="flex-1 rounded-2xl inline-flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 56, touchAction: "manipulation" }}
                  aria-label="Reset game"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category change in lobby */}
        {phase === "reaction" && (
          <div className="overflow-x-auto pb-1 -mx-1">
            <div className="flex gap-1.5 px-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap font-display"
                  style={{
                    background: category === cat ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${category === cat ? ACCENT + "66" : "rgba(255,255,255,0.08)"}`,
                    color: category === cat ? ACCENT : "#fff",
                    minHeight: 36,
                    touchAction: "manipulation",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
