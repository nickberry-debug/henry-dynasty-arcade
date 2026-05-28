// What Am I? — clue-by-clue riddles. Fewer clues used = more points.
import { useEffect, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak, useVoiceInput } from "../voice";
import { callAI, parseJSON, recordHighScore, loadHighScore } from "../ai";
import { RIDDLES, type Riddle } from "../templates";

const ACCENT = "#818CF8";
const GRADIENT = "linear-gradient(135deg, rgba(120,130,240,0.30), rgba(10,15,40,0.95))";
const CATS = ["Animals", "Objects", "Foods", "Sports", "Space", "Ocean Life", "Mythological Creatures", "Dinosaurs"];

export default function WhatAmI() {
  const [category, setCategory] = useState("Animals");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [phase, setPhase] = useState<"pick" | "playing" | "won" | "lost">("pick");
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [visibleClues, setVisibleClues] = useState(1);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const voice = useVoiceInput();

  // Auto-read each new clue as it becomes visible (and the answer reveal).
  useEffect(() => {
    if (!riddle) return;
    if (phase === "playing") {
      const lastClue = riddle.clues[visibleClues - 1];
      if (lastClue) speak(`Clue ${visibleClues}. ${lastClue}`);
    } else if (phase === "won") {
      speak(`Correct! The answer is ${riddle.answer}.`);
    } else if (phase === "lost") {
      speak(`Out of clues. The answer was ${riddle.answer}.`);
    }
  }, [phase, visibleClues, riddle?.answer]);

  if (voice.transcript && voice.transcript !== guess) {
    setTimeout(() => { setGuess(voice.transcript); voice.reset(); }, 0);
  }

  const start = async () => {
    setLoading(true);
    setVisibleClues(1);
    setGuess("");
    const clueCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 7;
    const ai = await callAI({
      system: "Generate a What-Am-I riddle. Clues from vague to specific. Kid-appropriate. Output ONLY JSON.",
      user: `Category: ${category}. Difficulty: ${difficulty}. Provide ${clueCount} clues. Return JSON: { "answer": "single word answer", "clues": ["clue1", ...], "fun_fact": "..." }`,
      maxTokens: 500,
    });
    const parsed = parseJSON<{ answer: string; clues: string[]; fun_fact?: string }>(ai);
    if (parsed?.answer && Array.isArray(parsed.clues) && parsed.clues.length >= clueCount - 1) {
      setRiddle({ answer: parsed.answer.toLowerCase(), clues: parsed.clues.slice(0, clueCount), category, difficulty, fact: parsed.fun_fact });
    } else {
      const pool = RIDDLES.filter(r => r.category === category && r.difficulty === difficulty);
      const fb = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? RIDDLES.find(r => r.difficulty === difficulty) ?? RIDDLES[0];
      setRiddle(fb);
    }
    setPhase("playing");
    setLoading(false);
  };

  const submitGuess = () => {
    if (!riddle || !guess.trim()) return;
    const g = guess.trim().toLowerCase();
    if (g === riddle.answer || g.includes(riddle.answer) || riddle.answer.includes(g)) {
      const max = riddle.difficulty === "easy" ? 3 : riddle.difficulty === "medium" ? 5 : 7;
      const points = Math.max(1, max - visibleClues + 1);
      setScore(points);
      const next = totalScore + points;
      setTotalScore(next);
      recordHighScore("whatami", riddle.category, next);
      setPhase("won");
    } else {
      if (visibleClues < riddle.clues.length) {
        setVisibleClues(visibleClues + 1);
        setGuess("");
      } else {
        setPhase("lost");
      }
    }
  };

  return (
    <WordplayShell title="What Am I?" emoji="🔍" accent={ACCENT} gradient={GRADIENT}>
      {phase === "pick" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">RUN TOTAL</div>
            <div className="font-display text-2xl mt-1" style={{ color: ACCENT }}>{totalScore} pts</div>
            <div className="text-[10px] text-ink-300 mt-1">High for {category}: {loadHighScore("whatami", category)}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">CATEGORY</div>
            <div className="grid grid-cols-2 gap-2">
              {CATS.map(c => (
                <button key={c} onClick={() => setCategory(c)} className="px-3 py-2 rounded-lg text-xs text-left pressable touch-target" style={{
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
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className="px-3 py-2 rounded-lg text-xs capitalize pressable touch-target" style={{
                  background: difficulty === d ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${difficulty === d ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                  color: difficulty === d ? ACCENT : "#fff",
                  minHeight: 44, touchAction: "manipulation",
                }}>{d}</button>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={loading} className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}>
            {loading ? "LOADING…" : "GIVE ME A RIDDLE"}
          </button>
        </div>
      )}

      {phase === "playing" && riddle && (
        <div className="space-y-4">
          <div className="text-[11px] text-ink-200 text-center">Clue {visibleClues} of {riddle.clues.length} · Worth {Math.max(1, riddle.clues.length - visibleClues + 1)} pts</div>
          <div className="space-y-2">
            {riddle.clues.slice(0, visibleClues).map((c, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
                <div className="text-[10px] text-ink-300 mb-0.5">Clue {i + 1}</div>
                <div className="text-sm text-white">{c}</div>
              </div>
            ))}
          </div>
          <input
            value={guess}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submitGuess(); }}
            placeholder="Your guess…"
            className="w-full px-3 py-3 rounded-lg bg-white/10 border border-white/15 text-sm text-center"
            style={{ minHeight: 48 }}
          />
          <div className="flex gap-2">
            {voice.supported && (
              <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{
                background: voice.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)", minHeight: 44, touchAction: "manipulation",
              }}>
                <Mic size={12} /> {voice.listening ? "Listening…" : "Speak"}
              </button>
            )}
            <button onClick={() => { if (visibleClues < riddle.clues.length) setVisibleClues(visibleClues + 1); else setPhase("lost"); }} className="flex-1 px-3 py-2.5 rounded-lg text-xs pressable touch-target bg-white/5 border border-white/10" style={{ minHeight: 44 }}>
              Next clue
            </button>
            <button onClick={submitGuess} disabled={!guess.trim()} className="flex-[2] px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#0a0a14", minHeight: 44 }}>
              SUBMIT GUESS
            </button>
          </div>
        </div>
      )}

      {(phase === "won" || phase === "lost") && riddle && (
        <div className="space-y-4 text-center">
          <div className="text-5xl">{phase === "won" ? "🎉" : "💭"}</div>
          <div className="font-display text-2xl">{phase === "won" ? `CORRECT! +${score} pts` : "Out of clues"}</div>
          <div className="rounded-xl p-3" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[10px] text-ink-300">The answer was</div>
            <div className="font-display text-xl mt-0.5" style={{ color: ACCENT }}>{riddle.answer.toUpperCase()}</div>
            {riddle.fact && <div className="text-[12px] text-ink-100 mt-2 italic">🧠 {riddle.fact}</div>}
          </div>
          <button onClick={() => setPhase("pick")} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target" style={{ background: ACCENT, color: "#0a0a14", minHeight: 48 }}>
            NEXT RIDDLE
          </button>
        </div>
      )}
    </WordplayShell>
  );
}
