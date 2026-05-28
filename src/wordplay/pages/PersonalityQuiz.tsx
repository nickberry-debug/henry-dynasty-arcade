// Personality Quizzes — pick a quiz template, answer 5 questions, see
// the result you mapped to most.
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { PERSONALITY_QUIZZES, type PersonalityQuiz } from "../templates";

const ACCENT = "#F472B6";
const GRADIENT = "linear-gradient(135deg, rgba(245,120,180,0.30), rgba(40,8,30,0.95))";

const BUILT_IN_TITLES = Object.keys(PERSONALITY_QUIZZES);
const AI_TOPICS = [
  "Greek God", "Dinosaur", "Superhero", "Pizza Topping", "Video Game Character",
  "Animal", "Historical Figure", "Movie Hero", "Planet", "Mythological Creature",
  "Color", "Country", "Ice Cream Flavor", "Baseball Position", "Music Genre",
];

interface Result { id: string; quizTitle: string; result: string; description: string; ts: number }

export default function PersonalityQuiz() {
  const [phase, setPhase] = useState<"pick" | "playing" | "done">("pick");
  const [quiz, setQuiz] = useState<PersonalityQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [qIdx, setQIdx] = useState(0);
  const [result, setResult] = useState<{ name: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, addSaved] = useHistory<Result>("personality_saved", 50);

  // Auto-read each question + the final result reveal.
  useEffect(() => {
    if (phase === "playing" && quiz) {
      const q = quiz.questions[qIdx];
      if (q) {
        const optsText = q.options.map((o, i) => `${["A", "B", "C", "D"][i]}: ${o.text}`).join(". ");
        speak(`Question ${qIdx + 1}. ${q.question}. ${optsText}.`);
      }
    } else if (phase === "done" && result) {
      speak(`You are ${result.name}. ${result.description}`);
    }
  }, [phase, qIdx, result?.name, quiz?.title]);

  const loadBuiltIn = (title: string) => {
    setQuiz(PERSONALITY_QUIZZES[title]);
    setAnswers({}); setQIdx(0); setResult(null); setPhase("playing");
  };

  const generateNew = async (topic: string) => {
    setLoading(true);
    const ai = await callAI({
      system: "Generate a 'Which {topic} Are You?' personality quiz. 5 questions, 4 multiple-choice options each (A/B/C/D mapping to four results). Reveal personality, not just preference. Results flattering and fun. Output ONLY JSON.",
      user: `Topic: ${topic}. Return JSON exactly: { "title": "Which ${topic} Are You?", "results": [{"key": "A", "name": "...", "description": "..."}, ...4 total], "questions": [{"id": 1, "question": "...", "options": [{"text": "...", "maps_to": "A"}, ...4 total]}, ...5 total] }`,
      maxTokens: 1800,
      model: "rich",
    });
    const parsed = parseJSON<PersonalityQuiz>(ai);
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 4 && Array.isArray(parsed.results)) {
      setQuiz(parsed);
      setAnswers({}); setQIdx(0); setResult(null); setPhase("playing");
    } else {
      // Fall back to a built-in close to the topic.
      const fb = Object.values(PERSONALITY_QUIZZES)[0];
      setQuiz(fb); setAnswers({}); setQIdx(0); setResult(null); setPhase("playing");
    }
    setLoading(false);
  };

  const answer = (key: "A" | "B" | "C" | "D") => {
    if (!quiz) return;
    const next = { ...answers, [qIdx]: key };
    setAnswers(next);
    if (qIdx + 1 >= quiz.questions.length) {
      // Tally.
      const counts: Record<string, number> = {};
      Object.values(next).forEach(k => { counts[k] = (counts[k] ?? 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "A";
      const r = quiz.results.find(x => x.key === top);
      if (r) {
        setResult({ name: r.name, description: r.description });
        addSaved({ id: `pq-${Date.now()}`, quizTitle: quiz.title, result: r.name, description: r.description, ts: Date.now() });
        setPhase("done");
      }
    } else {
      setQIdx(qIdx + 1);
    }
  };

  return (
    <WordplayShell title="Personality Quiz" emoji="🍕" accent={ACCENT} gradient={GRADIENT}>
      {phase === "pick" && (
        <div className="space-y-4">
          <div className="text-sm text-ink-200">Pick a quiz, or have AI generate a new one:</div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">BUILT-IN</div>
            <div className="space-y-2">
              {BUILT_IN_TITLES.map(t => (
                <button key={t} onClick={() => loadBuiltIn(t)} className="w-full text-left px-4 py-3 rounded-xl pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 56, touchAction: "manipulation" }}>
                  <div className="font-display text-sm" style={{ color: ACCENT }}>{t}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">AI-GENERATED (TAP A TOPIC)</div>
            <div className="grid grid-cols-2 gap-2">
              {AI_TOPICS.map(t => (
                <button key={t} onClick={() => generateNew(t)} disabled={loading} className="px-3 py-2.5 rounded-lg text-xs text-left pressable touch-target disabled:opacity-50" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 44, touchAction: "manipulation" }}>
                  Which {t}?
                </button>
              ))}
            </div>
            {loading && <div className="text-[11px] text-ink-300 mt-2 text-center italic">Generating your quiz…</div>}
          </div>

          {saved.length > 0 && (
            <details className="mt-4">
              <summary className="text-[11px] text-ink-300 tracking-widest font-display cursor-pointer pressable touch-target">PAST RESULTS · {saved.length}</summary>
              <div className="space-y-2 mt-2">
                {saved.slice(0, 10).map(s => (
                  <div key={s.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-[10px] text-ink-300">{s.quizTitle}</div>
                    <div className="font-display text-sm" style={{ color: ACCENT }}>{s.result}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {phase === "playing" && quiz && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">{quiz.title}</div>
            <div className="text-sm text-ink-100 mt-1">Question {qIdx + 1} of {quiz.questions.length}</div>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55` }}>
            <div className="text-base leading-snug">{quiz.questions[qIdx].question}</div>
          </div>
          <div className="space-y-2">
            {quiz.questions[qIdx].options.map((opt, i) => (
              <button key={i} onClick={() => answer(opt.maps_to)} className="w-full text-left px-4 py-3 rounded-xl pressable touch-target flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 56, touchAction: "manipulation" }}>
                <span className="font-display text-sm" style={{ color: ACCENT }}>{["A", "B", "C", "D"][i]}</span>
                <span className="flex-1 text-sm">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && quiz && result && (
        <div className="space-y-4 text-center">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">YOU ARE…</div>
          <div className="font-display text-4xl" style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}55` }}>{result.name.toUpperCase()}</div>
          <div className="rounded-2xl p-4" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55` }}>
            <div className="text-sm text-ink-100 leading-relaxed">{result.description}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => speak(`You are ${result.name}. ${result.description}`)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
              <Volume2 size={12} /> Read aloud
            </button>
            <button onClick={() => { setQuiz(quiz); setAnswers({}); setQIdx(0); setResult(null); setPhase("playing"); }} className="flex-1 px-3 py-2.5 rounded-lg text-xs pressable touch-target bg-white/5 border border-white/10" style={{ minHeight: 44 }}>Retake</button>
            <button onClick={() => setPhase("pick")} className="flex-1 px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 44 }}>New Quiz</button>
          </div>
        </div>
      )}
    </WordplayShell>
  );
}
