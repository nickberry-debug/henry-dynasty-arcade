// New sub-app: Charades. Tap-to-reveal word or phrase to act out,
// with a built-in timer, picture mode for non-readers, and a
// scoreboard for pass-and-play.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, RotateCw, Plus, Minus, Check } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";

const ACCENT = "#EC4899";
const GRADIENT = "linear-gradient(135deg, rgba(236,72,153,0.30), rgba(40,8,30,0.95))";

type Mode = "word" | "picture" | "family";
type Difficulty = "easy" | "medium" | "hard";

const CATEGORIES = [
  { id: "Movies", emoji: "🎬" },
  { id: "TV Shows", emoji: "📺" },
  { id: "Animals", emoji: "🐶" },
  { id: "Foods", emoji: "🍕" },
  { id: "Sports", emoji: "⚽" },
  { id: "Songs", emoji: "🎵" },
  { id: "Books", emoji: "📚" },
  { id: "Jobs", emoji: "💼" },
  { id: "Places", emoji: "🌎" },
  { id: "Actions", emoji: "🎭" },
  { id: "Superheroes", emoji: "🦸" },
  { id: "Dinosaurs", emoji: "🦖" },
  { id: "Random Mix", emoji: "🎲" },
];

interface CharadesCard {
  phrase: string;
  emoji: string;
  hint: string;
  category: string;
  difficulty: Difficulty;
}

// Offline pool — robust fallback per category.
const OFFLINE_POOL: Record<string, CharadesCard[]> = {
  Animals: [
    { phrase: "Elephant", emoji: "🐘", hint: "Big animal, swing trunk arm, stomp", category: "Animals", difficulty: "easy" },
    { phrase: "Monkey", emoji: "🐵", hint: "Scratch like a monkey, hop around", category: "Animals", difficulty: "easy" },
    { phrase: "Penguin", emoji: "🐧", hint: "Waddle with stiff arms", category: "Animals", difficulty: "easy" },
    { phrase: "Snake", emoji: "🐍", hint: "Slither low to the ground", category: "Animals", difficulty: "easy" },
    { phrase: "Octopus", emoji: "🐙", hint: "Wiggle 8 arms / legs", category: "Animals", difficulty: "medium" },
    { phrase: "Kangaroo", emoji: "🦘", hint: "Hop with little arms forward", category: "Animals", difficulty: "medium" },
    { phrase: "Flamingo", emoji: "🦩", hint: "Stand on one leg, beak hand", category: "Animals", difficulty: "medium" },
  ],
  Foods: [
    { phrase: "Pizza", emoji: "🍕", hint: "Slice, eat triangle from the corner", category: "Foods", difficulty: "easy" },
    { phrase: "Spaghetti", emoji: "🍝", hint: "Twirl noodles on a fork", category: "Foods", difficulty: "easy" },
    { phrase: "Ice Cream Cone", emoji: "🍦", hint: "Lick a cone, fast before it melts", category: "Foods", difficulty: "easy" },
    { phrase: "Hot Dog", emoji: "🌭", hint: "Squeeze ketchup on, bite", category: "Foods", difficulty: "easy" },
    { phrase: "Taco", emoji: "🌮", hint: "Hands as taco shell, fill it up", category: "Foods", difficulty: "medium" },
    { phrase: "Sushi", emoji: "🍣", hint: "Chopsticks, dip in soy sauce", category: "Foods", difficulty: "medium" },
  ],
  Sports: [
    { phrase: "Baseball", emoji: "⚾", hint: "Swing a bat, run bases", category: "Sports", difficulty: "easy" },
    { phrase: "Basketball", emoji: "🏀", hint: "Dribble, jump shot", category: "Sports", difficulty: "easy" },
    { phrase: "Soccer", emoji: "⚽", hint: "Kick, juggle with knees", category: "Sports", difficulty: "easy" },
    { phrase: "Tennis", emoji: "🎾", hint: "Big forehand swing", category: "Sports", difficulty: "medium" },
    { phrase: "Skateboarding", emoji: "🛹", hint: "Push, ollie, balance", category: "Sports", difficulty: "medium" },
  ],
  Movies: [
    { phrase: "Lion King", emoji: "🦁", hint: "Hold a cub up high", category: "Movies", difficulty: "easy" },
    { phrase: "Frozen", emoji: "❄️", hint: "Make a snowman, shiver", category: "Movies", difficulty: "easy" },
    { phrase: "Toy Story", emoji: "🤠", hint: "Toys come to life when nobody looks", category: "Movies", difficulty: "medium" },
    { phrase: "Star Wars", emoji: "⚔️", hint: "Lightsaber swing, force push", category: "Movies", difficulty: "medium" },
    { phrase: "Spider-Man", emoji: "🕷️", hint: "Shoot webs from wrists, swing", category: "Movies", difficulty: "easy" },
  ],
  Actions: [
    { phrase: "Brushing Teeth", emoji: "🦷", hint: "Up and down with brush", category: "Actions", difficulty: "easy" },
    { phrase: "Reading a Book", emoji: "📖", hint: "Hands open like pages, eyes scan", category: "Actions", difficulty: "easy" },
    { phrase: "Driving a Car", emoji: "🚗", hint: "Steering wheel, look both ways", category: "Actions", difficulty: "easy" },
    { phrase: "Building a Sandcastle", emoji: "🏰", hint: "Pat sand, dig with hands", category: "Actions", difficulty: "medium" },
    { phrase: "Climbing a Mountain", emoji: "🏔️", hint: "Step up, pull with arms", category: "Actions", difficulty: "medium" },
  ],
  Jobs: [
    { phrase: "Astronaut", emoji: "🧑‍🚀", hint: "Float, zero gravity walk", category: "Jobs", difficulty: "easy" },
    { phrase: "Firefighter", emoji: "🧑‍🚒", hint: "Spray hose, climb ladder", category: "Jobs", difficulty: "easy" },
    { phrase: "Chef", emoji: "🧑‍🍳", hint: "Chop chop chop, taste-test", category: "Jobs", difficulty: "easy" },
    { phrase: "Doctor", emoji: "🩺", hint: "Listen to a heart, write notes", category: "Jobs", difficulty: "easy" },
    { phrase: "Pilot", emoji: "✈️", hint: "Steer a plane, salute", category: "Jobs", difficulty: "medium" },
  ],
  Places: [
    { phrase: "Beach", emoji: "🏖️", hint: "Sunbathe, dig sand", category: "Places", difficulty: "easy" },
    { phrase: "Library", emoji: "📚", hint: "Shhhh, browse shelves", category: "Places", difficulty: "easy" },
    { phrase: "Zoo", emoji: "🦁", hint: "Point at animals, eat popcorn", category: "Places", difficulty: "easy" },
    { phrase: "Pyramid", emoji: "🔺", hint: "Big triangle in the sand", category: "Places", difficulty: "medium" },
  ],
  Superheroes: [
    { phrase: "Superman", emoji: "🦸", hint: "Fly with one arm forward, rip shirt to reveal logo", category: "Superheroes", difficulty: "easy" },
    { phrase: "Hulk", emoji: "💪", hint: "Get huge, smash with fists", category: "Superheroes", difficulty: "easy" },
    { phrase: "Iron Man", emoji: "🤖", hint: "Hand laser blasts, fly with boot thrust", category: "Superheroes", difficulty: "medium" },
  ],
  Dinosaurs: [
    { phrase: "T-Rex", emoji: "🦖", hint: "Tiny arms, big stomps, roar", category: "Dinosaurs", difficulty: "easy" },
    { phrase: "Triceratops", emoji: "🦕", hint: "Three horns, charge slowly", category: "Dinosaurs", difficulty: "medium" },
    { phrase: "Pterodactyl", emoji: "🦅", hint: "Wings flapping, shrieking", category: "Dinosaurs", difficulty: "medium" },
  ],
  Songs: [
    { phrase: "Happy Birthday", emoji: "🎂", hint: "Sing, blow out candles", category: "Songs", difficulty: "easy" },
    { phrase: "Twinkle Twinkle Little Star", emoji: "⭐", hint: "Hands open and close like twinkle", category: "Songs", difficulty: "easy" },
  ],
  Books: [
    { phrase: "Harry Potter", emoji: "⚡", hint: "Glasses, lightning bolt scar, wand wave", category: "Books", difficulty: "medium" },
    { phrase: "Diary of a Wimpy Kid", emoji: "📔", hint: "Open journal, write nervously", category: "Books", difficulty: "medium" },
  ],
  "TV Shows": [
    { phrase: "SpongeBob", emoji: "🧽", hint: "Square shape with hands, laugh", category: "TV Shows", difficulty: "easy" },
    { phrase: "Pokemon", emoji: "⚡", hint: "Throw ball, catch creature", category: "TV Shows", difficulty: "easy" },
  ],
};

export default function Charades() {
  const [mode, setMode] = useState<Mode>("family");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<string>("Random Mix");
  const [card, setCard] = useState<CharadesCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState<Array<{ name: string; correct: number }>>([{ name: "Player 1", correct: 0 }, { name: "Player 2", correct: 0 }]);
  const [activePlayer, setActivePlayer] = useState(0);
  const [history, addHistory] = useHistory<{ id: string; phrase: string; ts: number }>("charades_history", 50);
  const tickRef = useRef<number | null>(null);

  useEffect(() => () => { if (tickRef.current) window.clearInterval(tickRef.current); }, []);

  const drawCard = async () => {
    const cat = category === "Random Mix"
      ? Object.keys(OFFLINE_POOL)[Math.floor(Math.random() * Object.keys(OFFLINE_POOL).length)]
      : category;
    // AI generation first; offline fallback if empty.
    const ai = await callAI({
      system: "You generate ONE charades word or phrase for a kid age 8-13. Family friendly, actually actable. Output only valid JSON, no preamble.",
      user: `Category: ${cat}. Difficulty: ${difficulty}. Mode: ${mode === "picture" ? "single noun representable as one emoji" : "1-3 word phrase"}.
Return JSON: { "phrase": "...", "emoji": "single emoji", "hint": "brief actor's hint (5-15 words)" }`,
      maxTokens: 150,
    });
    const parsed = parseJSON<{ phrase: string; emoji: string; hint: string }>(ai);
    let chosen: CharadesCard;
    if (parsed && parsed.phrase && parsed.emoji) {
      chosen = { phrase: parsed.phrase, emoji: parsed.emoji, hint: parsed.hint || "Act it out!", category: cat, difficulty };
    } else {
      const pool = (OFFLINE_POOL[cat] ?? Object.values(OFFLINE_POOL).flat()).filter(c => mode !== "picture" || c.emoji.length <= 4);
      chosen = pool[Math.floor(Math.random() * pool.length)] ?? OFFLINE_POOL.Animals[0];
    }
    setCard(chosen);
    setRevealed(false);
    addHistory({ id: `c-${Date.now()}`, phrase: chosen.phrase, ts: Date.now() });
  };

  const reveal = () => {
    setRevealed(true);
    setTimeLeft(duration);
    setRunning(true);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    setRunning(false);
  };

  const markCorrect = () => {
    setScores(prev => prev.map((p, i) => i === activePlayer ? { ...p, correct: p.correct + 1 } : p));
    stopTimer();
    setCard(null);
    setRevealed(false);
    setActivePlayer((activePlayer + 1) % scores.length);
  };

  const skip = () => {
    stopTimer();
    setCard(null);
    setRevealed(false);
    setActivePlayer((activePlayer + 1) % scores.length);
  };

  return (
    <WordplayShell title="Charades" emoji="🎭" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        {/* Mode + difficulty */}
        <div className="flex gap-1.5">
          {(["family", "word", "picture"] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{
                background: mode === m ? ACCENT : "rgba(255,255,255,0.05)",
                color: mode === m ? "#0a0a0a" : "#fff",
                minHeight: 44,
              }}>
              {m === "picture" ? "🖼️ PICTURE" : m === "word" ? "📝 WORD" : "👨‍👩‍👧 FAMILY"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className="flex-1 px-3 py-1.5 rounded-md text-[11px] font-display tracking-widest pressable touch-target"
              style={{
                background: difficulty === d ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                color: difficulty === d ? ACCENT : "#fff",
                border: `1px solid ${difficulty === d ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                minHeight: 36,
              }}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Category */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target"
                style={{
                  background: category === c.id ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${category === c.id ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                  color: category === c.id ? ACCENT : "#fff",
                  minHeight: 36,
                }}>
                {c.emoji} {c.id}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        {!card && (
          <button onClick={drawCard}
            className="w-full px-4 py-5 rounded-2xl font-display tracking-widest text-base pressable touch-target"
            style={{ background: ACCENT, color: "#1a081d", minHeight: 70 }}>
            🎭 DRAW A CARD
          </button>
        )}

        <AnimatePresence>
          {card && !revealed && (
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={reveal}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl p-6 text-center pressable touch-target"
              style={{ background: "rgba(0,0,0,0.5)", border: `2px dashed ${ACCENT}`, minHeight: 200 }}>
              <EyeOff size={32} className="mx-auto mb-3" style={{ color: ACCENT }} />
              <div className="font-display tracking-widest text-base" style={{ color: ACCENT }}>TAP TO REVEAL</div>
              <div className="text-[11px] text-ink-300 mt-2">Don't let others see!</div>
              <div className="text-[11px] mt-1" style={{ color: ACCENT }}>
                Player: {scores[activePlayer]?.name} · {duration}s timer
              </div>
            </motion.button>
          )}

          {card && revealed && (
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,8,30,0.95))`, border: `2px solid ${ACCENT}` }}>
              <div className="text-7xl mb-3">{card.emoji}</div>
              {mode !== "picture" && (
                <>
                  <div className="font-display text-2xl tracking-widest text-white mb-1">{card.phrase}</div>
                  <div className="text-[10px] tracking-widest" style={{ color: ACCENT }}>{card.category.toUpperCase()} · {card.difficulty.toUpperCase()}</div>
                  <div className="text-[11px] text-ink-200 mt-2 italic">💡 {card.hint}</div>
                </>
              )}
              {/* Timer */}
              <div className="mt-4">
                <div className="font-display text-4xl tracking-widest"
                  style={{ color: timeLeft <= 10 && timeLeft > 0 ? "#fca5a5" : timeLeft === 0 ? "#fca5a5" : ACCENT }}>
                  {timeLeft === 0 ? "TIME!" : `${timeLeft}s`}
                </div>
              </div>
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                <button onClick={markCorrect}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: "#22c55e", color: "#fff", minHeight: 44 }}>
                  <Check size={12} /> GOT IT!
                </button>
                <button onClick={skip}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", minHeight: 44 }}>
                  <RotateCw size={12} /> SKIP
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings: timer + players */}
        <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">TIMER</div>
            <div className="flex gap-1">
              {[30, 60, 90, 120].map(s => (
                <button key={s} onClick={() => setDuration(s)}
                  className="px-2.5 py-1 rounded text-[11px] pressable touch-target"
                  style={{
                    background: duration === s ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                    color: duration === s ? ACCENT : "#fff",
                    border: `1px solid ${duration === s ? ACCENT : "rgba(255,255,255,0.07)"}`,
                    minHeight: 32,
                  }}>{s}s</button>
              ))}
            </div>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center justify-between mb-2 mt-3">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">PLAYERS</div>
            <div className="flex gap-1">
              <button onClick={() => setScores(s => s.length > 1 ? s.slice(0, -1) : s)}
                className="w-7 h-7 rounded flex items-center justify-center pressable touch-target"
                style={{ background: "rgba(255,255,255,0.05)", color: "#fff", minWidth: 30, minHeight: 30 }}><Minus size={10} /></button>
              <button onClick={() => setScores(s => s.length < 6 ? [...s, { name: `Player ${s.length + 1}`, correct: 0 }] : s)}
                className="w-7 h-7 rounded flex items-center justify-center pressable touch-target"
                style={{ background: "rgba(255,255,255,0.05)", color: "#fff", minWidth: 30, minHeight: 30 }}><Plus size={10} /></button>
            </div>
          </div>
          <div className="space-y-1.5">
            {scores.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded p-2"
                style={{ background: i === activePlayer ? `${ACCENT}22` : "rgba(0,0,0,0.3)", border: `1px solid ${i === activePlayer ? ACCENT : "rgba(255,255,255,0.06)"}` }}>
                <input value={p.name} onChange={e => setScores(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="flex-1 bg-transparent text-[12px] text-white outline-none px-1" />
                <div className="text-[12px] font-display" style={{ color: ACCENT }}>{p.correct} pts</div>
              </div>
            ))}
          </div>
        </section>

        {history.length > 0 && (
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">RECENT CARDS</div>
            <div className="text-[11px] text-ink-200 flex flex-wrap gap-1">
              {history.slice(0, 12).map(h => (
                <span key={h.id} className="rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.04)" }}>{h.phrase}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
