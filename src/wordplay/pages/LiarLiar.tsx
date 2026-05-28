// New sub-app: Liar Liar (Two Truths and a Lie). Pick the lie from
// 3 AI-generated statements about a topic. Educational reveals.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCw, Volume2, Trophy } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory, recordHighScore, loadHighScore, usePrefs } from "../ai";
import { speak } from "../voice";

const ACCENT = "#F472B6";
const GRADIENT = "linear-gradient(135deg, rgba(244,114,182,0.30), rgba(40,8,30,0.95))";

const TOPICS = [
  { id: "Dinosaurs", emoji: "🦖" },
  { id: "Space", emoji: "🚀" },
  { id: "Geography", emoji: "🌎" },
  { id: "Animals", emoji: "🐶" },
  { id: "History", emoji: "🏛️" },
  { id: "Science", emoji: "🔬" },
  { id: "Sports", emoji: "⚾" },
  { id: "Movies", emoji: "🎬" },
  { id: "Food", emoji: "🍕" },
  { id: "World Cultures", emoji: "🌍" },
  { id: "Technology", emoji: "🤖" },
  { id: "Famous People", emoji: "👤" },
  { id: "Video Games", emoji: "🎮" },
  { id: "Random Mix", emoji: "🎲" },
];

interface Round {
  topic: string;
  statements: Array<{ text: string; isTrue: boolean }>;
  lieIndex: number;
  lieExplanation: string;
  trueExplanations: string[];
}

const FALLBACK: Record<string, Round[]> = {
  Dinosaurs: [
    {
      topic: "Dinosaurs",
      statements: [
        { text: "Tyrannosaurus rex had teeth the size of bananas.", isTrue: true },
        { text: "Velociraptors were actually about the size of large turkeys.", isTrue: true },
        { text: "Stegosaurus had a second brain in its tail to help control its back legs.", isTrue: false },
      ],
      lieIndex: 2,
      lieExplanation: "Stegosaurus did NOT have a second brain. Scientists once thought a nerve cluster in its hips was a second brain, but it was just a nerve bundle. The myth stuck around for over a hundred years!",
      trueExplanations: [
        "T-Rex teeth really were banana-sized — up to 12 inches long with the root!",
        "Velociraptors were about 3 feet tall and turkey-sized in real life — Jurassic Park made them way bigger.",
      ],
    },
  ],
  Space: [
    {
      topic: "Space",
      statements: [
        { text: "A day on Venus is longer than a year on Venus.", isTrue: true },
        { text: "The Sun is made mostly of hydrogen and helium.", isTrue: true },
        { text: "Astronauts can hear sounds from outside their spacesuit because sound travels through their helmet visors.", isTrue: false },
      ],
      lieIndex: 2,
      lieExplanation: "Sound can't travel through space because there's no air to carry vibrations. Astronauts only hear sounds inside the suit or via radio.",
      trueExplanations: [
        "Venus rotates so slowly that one day there (243 Earth days) is longer than its orbit (225 Earth days).",
        "The Sun is about 73% hydrogen, 25% helium, and 2% heavier elements.",
      ],
    },
  ],
  Animals: [
    {
      topic: "Animals",
      statements: [
        { text: "Octopuses have three hearts and blue blood.", isTrue: true },
        { text: "Cows have four stomachs that work together to digest grass.", isTrue: true },
        { text: "Goldfish only have a memory span of three seconds.", isTrue: false },
      ],
      lieIndex: 2,
      lieExplanation: "Goldfish memory is actually weeks or months, not seconds! They can recognize faces and remember tricks. The 3-second myth is just an old saying.",
      trueExplanations: [
        "Octopuses have 3 hearts (2 pump blood through the gills, 1 through the body) and copper-based blue blood.",
        "Cows have four stomach compartments: rumen, reticulum, omasum, and abomasum — they regurgitate (cud) and re-chew.",
      ],
    },
  ],
};

export default function LiarLiar() {
  const [prefs] = usePrefs();
  const [topic, setTopic] = useState("Random Mix");
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [bestStreak, setBestStreak] = useState(loadHighScore("liar_liar", "best_streak"));
  const [history, addHistory] = useHistory<{ id: string; topic: string; correct: boolean; ts: number }>("liar_liar_history", 50);

  const draw = async () => {
    setLoading(true);
    setPicked(null);
    const chosenTopic = topic === "Random Mix" ? TOPICS[Math.floor(Math.random() * (TOPICS.length - 1))].id : topic;
    const ai = await callAI({
      system: "You generate ONE Two-Truths-and-a-Lie round for a kid age 8-13. Educational facts, plausible lies (often common misconceptions). Output ONLY JSON.",
      user: `Topic: ${chosenTopic}. Difficulty: ${prefs.difficulty === "mixed" ? "medium" : prefs.difficulty}.

Return JSON exactly:
{
  "statements": [
    { "text": "Statement 1 (15-30 words)", "isTrue": true },
    { "text": "Statement 2 (15-30 words)", "isTrue": false },
    { "text": "Statement 3 (15-30 words)", "isTrue": true }
  ],
  "lie_explanation": "Why the false statement is false, and the real truth",
  "true_explanations": ["Why statement 1 is true", "Why statement 3 is true"]
}

IMPORTANT: Exactly one statement must have isTrue=false. Mix up the order so the lie isn't always in the same position. Make the lie plausible — a common misconception is ideal.`,
      maxTokens: 700,
      model: "rich",
    });
    const parsed = parseJSON<{ statements: Array<{ text: string; isTrue: boolean }>; lie_explanation: string; true_explanations: string[] }>(ai);
    let r: Round;
    if (parsed && parsed.statements?.length === 3 && parsed.statements.filter(s => !s.isTrue).length === 1) {
      const lieIndex = parsed.statements.findIndex(s => !s.isTrue);
      r = {
        topic: chosenTopic,
        statements: parsed.statements,
        lieIndex,
        lieExplanation: parsed.lie_explanation,
        trueExplanations: parsed.true_explanations,
      };
    } else {
      const pool = FALLBACK[chosenTopic] ?? Object.values(FALLBACK).flat();
      r = pool[Math.floor(Math.random() * pool.length)];
    }
    setRound(r);
    setLoading(false);
  };

  const pick = (idx: number) => {
    if (!round || picked !== null) return;
    setPicked(idx);
    const correct = idx === round.lieIndex;
    setScore(s => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
      streak: correct ? s.streak + 1 : 0,
    }));
    if (correct) {
      const beat = recordHighScore("liar_liar", "best_streak", score.streak + 1);
      if (beat) setBestStreak(score.streak + 1);
    }
    addHistory({ id: `ll-${Date.now()}`, topic: round.topic, correct, ts: Date.now() });
    speak(correct ? "Got it! That was the lie." : `Almost! The lie was statement ${round.lieIndex + 1}.`);
  };

  return (
    <WordplayShell title="Liar Liar" emoji="🃏" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5">
            {TOPICS.map(t => (
              <button key={t.id} onClick={() => setTopic(t.id)}
                className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target"
                style={{
                  background: topic === t.id ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${topic === t.id ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                  color: topic === t.id ? ACCENT : "#fff",
                  minHeight: 36,
                }}>{t.emoji} {t.id}</button>
            ))}
          </div>
        </div>

        {!round && (
          <button onClick={draw} disabled={loading}
            className="w-full px-4 py-4 rounded-2xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-50"
            style={{ background: ACCENT, color: "#1a081d", minHeight: 60 }}>
            {loading ? "DEALING…" : "🃏 DEAL A ROUND"}
          </button>
        )}

        {round && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>WHICH ONE IS THE LIE?</div>
              <div className="text-[11px] text-ink-200 mt-1">Topic: {round.topic}</div>
            </div>

            {round.statements.map((s, i) => {
              const showResult = picked !== null;
              const isLie = i === round.lieIndex;
              const isPicked = i === picked;
              return (
                <motion.button key={i} onClick={() => pick(i)}
                  disabled={picked !== null}
                  whileTap={picked === null ? { scale: 0.98 } : undefined}
                  className="w-full text-left rounded-2xl p-4 pressable touch-target disabled:cursor-default"
                  style={{
                    background: !showResult ? "rgba(255,255,255,0.04)"
                      : isLie ? "rgba(239,68,68,0.15)"
                      : isPicked ? "rgba(252,165,165,0.15)"
                      : "rgba(34,197,94,0.1)",
                    border: `1px solid ${
                      !showResult ? "rgba(255,255,255,0.10)"
                        : isLie ? "rgba(239,68,68,0.5)"
                        : isPicked ? "rgba(252,165,165,0.4)"
                        : "rgba(34,197,94,0.3)"
                    }`,
                    minHeight: 64,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="font-display text-base flex-shrink-0" style={{ color: ACCENT }}>{i + 1}.</div>
                    <div className="flex-1">
                      <div className="text-[13px] text-white leading-relaxed">{s.text}</div>
                      {showResult && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-display tracking-widest">
                          {isLie ? <><X size={11} className="text-red-300" /><span className="text-red-300">THE LIE</span></> : <><Check size={11} className="text-emerald-300" /><span className="text-emerald-300">TRUE</span></>}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {picked !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 space-y-2"
                style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,8,30,0.92))`, border: `1px solid ${ACCENT}55` }}>
                <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>
                  {picked === round.lieIndex ? "✨ NICE CATCH!" : "AH SO CLOSE!"}
                </div>
                <div className="text-[12px] text-white leading-relaxed">
                  <strong>The lie:</strong> {round.lieExplanation}
                </div>
                {round.trueExplanations.map((t, i) => (
                  <div key={i} className="text-[11px] text-ink-100 leading-relaxed">✓ {t}</div>
                ))}
                <div className="flex gap-2 mt-3">
                  <button onClick={draw}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                    style={{ background: ACCENT, color: "#1a081d", minHeight: 44 }}>
                    <RotateCw size={12} /> NEXT ROUND
                  </button>
                  <button onClick={() => speak(round.lieExplanation)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                    <Volume2 size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Score panel */}
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[9px] tracking-widest text-ink-200">SCORE</div>
            <div className="font-display text-lg text-white">{score.correct}/{score.total}</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[9px] tracking-widest text-ink-200">STREAK</div>
            <div className="font-display text-lg text-white">{score.streak}</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(252,211,77,0.10)", border: "1px solid rgba(252,211,77,0.30)" }}>
            <div className="text-[9px] tracking-widest text-ink-200 flex items-center justify-center gap-1"><Trophy size={9} /> BEST</div>
            <div className="font-display text-lg text-white">{bestStreak}</div>
          </div>
        </section>
      </div>
    </WordplayShell>
  );
}
