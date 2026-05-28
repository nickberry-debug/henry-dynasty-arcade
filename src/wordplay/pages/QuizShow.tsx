// Quiz Show — pick category + difficulty + length → run multi-choice
// questions → final score with per-category high-score.
import { useEffect, useState } from "react";
import { Check, X as XIcon, Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, loadHighScore, recordHighScore, usePrefs } from "../ai";
import { QUIZ_QUESTIONS, type QuizQuestion } from "../templates";

const ACCENT = "#60A5FA";
const GRADIENT = "linear-gradient(135deg, rgba(70,170,255,0.30), rgba(10,20,40,0.95))";
const CATEGORIES = ["History", "Science", "Sports", "Geography", "Animals", "Space", "Dinosaurs", "Mythology", "Music"];

type Phase = "pick" | "playing" | "answered" | "done";

interface RunState {
  category: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  length: 5 | 10 | 20;
  questions: QuizQuestion[];
  idx: number;
  score: number;
  pickedIdx: number | null;
}

export default function QuizShow() {
  const [prefs] = usePrefs();
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState("Space");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">(prefs.difficulty);
  const [length, setLength] = useState<5 | 10 | 20>(10);
  const [run, setRun] = useState<RunState | null>(null);
  const [loading, setLoading] = useState(false);
  const [highScore, setHighScore] = useState(loadHighScore("quiz", category));
  const [newRecord, setNewRecord] = useState(false);

  useEffect(() => { setHighScore(loadHighScore("quiz", category)); }, [category]);

  // Auto-read each new question (in "playing" phase) and the explanation
  // when the answer is revealed.
  useEffect(() => {
    if (!run) return;
    if (phase === "playing") {
      const q = run.questions[run.idx];
      if (q) {
        const optsText = q.options.map((o, i) => `${["A", "B", "C", "D"][i]}: ${o}`).join(". ");
        speak(`${q.question}. ${optsText}.`);
      }
    } else if (phase === "answered") {
      const q = run.questions[run.idx];
      const correct = run.pickedIdx === q.correctIdx;
      speak(`${correct ? "Correct!" : "Incorrect."} ${q.explanation}`);
    }
  }, [phase, run?.idx]);

  const start = async () => {
    setLoading(true);
    // Try to fetch a fresh batch via AI; fall back to local pool.
    let qs: QuizQuestion[] = [];
    const ai = await callAI({
      system: "Generate quiz questions. Output ONLY JSON.",
      user: `Generate ${length} multiple-choice quiz questions. Category: ${category}. Difficulty: ${difficulty}. Each has 4 options, one correct, others plausible. Educational explanation included. Return JSON: { "questions": [{ "question": "Question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIdx": 0, "explanation": "..." }] }`,
      maxTokens: 2200,
    });
    const parsed = parseJSON<{ questions: any[] }>(ai);
    if (parsed?.questions?.length) {
      qs = parsed.questions.map((q: any) => ({
        question: String(q.question ?? ""),
        options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o).replace(/^[A-D]\)\s*/, "")) as [string, string, string, string] : ["", "", "", ""] as any,
        correctIdx: Math.max(0, Math.min(3, Number(q.correctIdx) || 0)) as 0 | 1 | 2 | 3,
        explanation: String(q.explanation ?? ""),
        category, difficulty: difficulty === "mixed" ? "medium" : difficulty,
      })).filter(q => q.question && q.options.every(Boolean));
    }
    if (qs.length < length) {
      // Pad with template questions matching category/difficulty.
      const pool = QUIZ_QUESTIONS.filter(q => (category === "Mixed" || q.category === category) && (difficulty === "mixed" || q.difficulty === difficulty));
      const fb = pool.length > 0 ? pool : QUIZ_QUESTIONS;
      const shuffled = fb.slice().sort(() => Math.random() - 0.5);
      while (qs.length < length) {
        qs.push(shuffled[qs.length % shuffled.length]);
      }
    }
    setRun({ category, difficulty, length, questions: qs.slice(0, length), idx: 0, score: 0, pickedIdx: null });
    setPhase("playing");
    setLoading(false);
  };

  const pickOption = (i: number) => {
    if (!run || run.pickedIdx != null) return;
    const correct = i === run.questions[run.idx].correctIdx;
    setRun({ ...run, pickedIdx: i, score: correct ? run.score + 1 : run.score });
    setPhase("answered");
  };
  const nextQ = () => {
    if (!run) return;
    if (run.idx + 1 >= run.questions.length) {
      const isRecord = recordHighScore("quiz", run.category, run.score);
      setNewRecord(isRecord);
      setHighScore(loadHighScore("quiz", run.category));
      setPhase("done");
    } else {
      setRun({ ...run, idx: run.idx + 1, pickedIdx: null });
      setPhase("playing");
    }
  };

  return (
    <WordplayShell title="Quiz Show" emoji="🎯" accent={ACCENT} gradient={GRADIENT}>
      {phase === "pick" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">HIGH SCORE · {category}</div>
            <div className="font-display text-2xl mt-1" style={{ color: ACCENT }}>{highScore} / —</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">CATEGORY</div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} className="px-2 py-2 rounded-lg text-xs pressable touch-target" style={{
                  background: category === c ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${category === c ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                  color: category === c ? ACCENT : "#fff",
                  minHeight: 44, touchAction: "manipulation",
                }}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">DIFFICULTY</div>
            <div className="grid grid-cols-4 gap-2">
              {(["easy", "medium", "hard", "mixed"] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className="px-2 py-2 rounded-lg text-xs capitalize pressable touch-target" style={{
                  background: difficulty === d ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${difficulty === d ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                  color: difficulty === d ? ACCENT : "#fff",
                  minHeight: 44, touchAction: "manipulation",
                }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">LENGTH</div>
            <div className="grid grid-cols-3 gap-2">
              {([5, 10, 20] as const).map(n => (
                <button key={n} onClick={() => setLength(n)} className="px-2 py-2 rounded-lg text-sm font-mono pressable touch-target" style={{
                  background: length === n ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${length === n ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                  color: length === n ? ACCENT : "#fff",
                  minHeight: 44, touchAction: "manipulation",
                }}>{n}</button>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={loading} className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}>
            {loading ? "LOADING QUESTIONS…" : "START QUIZ"}
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "answered") && run && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-ink-200">
            <span>Q {run.idx + 1} / {run.questions.length}</span>
            <span>Score: <span className="font-mono text-white">{run.score}</span></span>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-lg leading-snug text-white">{run.questions[run.idx].question}</div>
          </div>
          <div className="space-y-2">
            {run.questions[run.idx].options.map((opt, i) => {
              const isCorrect = i === run.questions[run.idx].correctIdx;
              const wasPicked = run.pickedIdx === i;
              const reveal = phase === "answered";
              const bg = reveal
                ? isCorrect ? "rgba(52,211,153,0.18)" : wasPicked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.04)";
              const border = reveal
                ? isCorrect ? "rgba(52,211,153,0.50)" : wasPicked ? "rgba(239,68,68,0.50)" : "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.10)";
              return (
                <button key={i} onClick={() => pickOption(i)} disabled={phase === "answered"} className="w-full px-4 py-3 rounded-xl text-left pressable touch-target flex items-center gap-2" style={{
                  background: bg, border: `1px solid ${border}`, minHeight: 56, touchAction: "manipulation",
                }}>
                  <span className="font-display text-sm" style={{ color: ACCENT }}>{["A", "B", "C", "D"][i]}</span>
                  <span className="flex-1 text-sm">{opt}</span>
                  {reveal && isCorrect && <Check size={16} className="text-emerald-300" />}
                  {reveal && wasPicked && !isCorrect && <XIcon size={16} className="text-red-300" />}
                </button>
              );
            })}
          </div>
          {phase === "answered" && (
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">EXPLANATION</div>
              <div className="text-sm text-ink-100">{run.questions[run.idx].explanation}</div>
            </div>
          )}
          {phase === "answered" && (
            <button onClick={nextQ} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 48, touchAction: "manipulation" }}>
              {run.idx + 1 >= run.questions.length ? "SEE RESULTS" : "NEXT QUESTION →"}
            </button>
          )}
        </div>
      )}

      {phase === "done" && run && (
        <div className="space-y-4 text-center">
          <div className="text-4xl mb-2">⭐</div>
          <div className="font-display text-3xl">{run.score} / {run.questions.length}</div>
          <div className="text-base text-ink-100">
            {run.score === run.questions.length ? "PERFECT!" : run.score >= run.questions.length * 0.8 ? "Excellent work!" : run.score >= run.questions.length * 0.5 ? "Solid effort." : "Tough one. Try again?"}
          </div>
          {newRecord && (
            <div className="rounded-xl p-3 inline-block" style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}88`, color: ACCENT }}>
              🏆 NEW HIGH SCORE FOR {run.category.toUpperCase()}
            </div>
          )}
          <div className="text-[11px] text-ink-300">Personal best: {highScore} / {run.questions.length}</div>
          <button onClick={() => { setPhase("pick"); setRun(null); setNewRecord(false); }} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target mt-3" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 48 }}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </WordplayShell>
  );
}
