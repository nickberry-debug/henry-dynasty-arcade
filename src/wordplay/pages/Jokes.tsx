// Jokes — category picker → fetch joke → save/share/read aloud.
// Tracks last 50 jokes per category so we don't repeat.
import { useEffect, useState } from "react";
import { Volume2, Heart, Repeat } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, useHistory, loadHistory, pushToHistory } from "../ai";
import { JOKE_TEMPLATES, type JokeTemplate } from "../templates";

const ACCENT = "#FF6B9D";
const GRADIENT = "linear-gradient(135deg, rgba(255,80,140,0.30), rgba(40,8,20,0.95))";
const CATEGORIES = ["Knock-Knock", "Animal", "Food", "School", "Sports", "Spooky", "Robot/Tech", "Dinosaur", "Pirate", "Wizard/Magic", "Video Game", "Space", "Music", "Mythology", "Dad Jokes", "Silly Puns", "Science", "Geography"];

interface Joke { id: string; category: string; setup: string; punchline: string; ts: number }

export default function Jokes() {
  const [category, setCategory] = useState<string>("Knock-Knock");
  const [current, setCurrent] = useState<Joke | null>(null);
  const [loading, setLoading] = useState(false);
  const [favs, addFav, _clear] = useHistory<Joke>("jokes_favs", 100);
  const [showFavs, setShowFavs] = useState(false);

  // Auto-read each new joke as it appears. The speak() helper respects
  // the voiceOutput preference and cancels in-flight speech.
  useEffect(() => {
    if (current && !showFavs) speak(`${current.setup}. ${current.punchline}`);
  }, [current?.id, showFavs]);

  const nextJoke = async () => {
    setLoading(true);
    // Prefer AI for variety; fall back to local templates.
    const recentTitles = loadHistory<Joke>(`jokes_recent_${category}`).slice(0, 30).map(j => `${j.setup}|${j.punchline}`);
    const ai = await callAI({
      system: "You generate ONE fresh, kid-friendly joke (age 8-13). G/PG rated. Funny + clever. Output ONLY JSON, no commentary.",
      user: `Category: ${category}. Avoid repeating these:\n${recentTitles.slice(0, 10).join("\n")}\n\nReturn JSON: { "setup": "Setup line(s)", "punchline": "Punchline" }`,
      maxTokens: 250,
    });
    const parsed = parseJSON<{ setup: string; punchline: string }>(ai);
    let joke: Joke;
    if (parsed && parsed.setup && parsed.punchline) {
      joke = { id: `j-${Date.now()}`, category, setup: parsed.setup, punchline: parsed.punchline, ts: Date.now() };
    } else {
      const pool = JOKE_TEMPLATES.filter(j => j.category === category);
      const tpl = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? JOKE_TEMPLATES[Math.floor(Math.random() * JOKE_TEMPLATES.length)];
      joke = { id: `j-${Date.now()}`, category, setup: tpl.setup, punchline: tpl.punchline, ts: Date.now() };
    }
    pushToHistory(`jokes_recent_${category}`, joke, 50);
    setCurrent(joke);
    setLoading(false);
  };

  const readAloud = () => {
    if (!current) return;
    speak(`${current.setup}. ${current.punchline}`);
  };

  return (
    <WordplayShell title="Jokes" emoji="😂" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          <button onClick={() => setShowFavs(false)} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
            background: !showFavs ? ACCENT : "rgba(255,255,255,0.05)",
            color: !showFavs ? "#0a0a0a" : "#fff",
            minHeight: 44, touchAction: "manipulation",
          }}>JOKES</button>
          <button onClick={() => setShowFavs(true)} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
            background: showFavs ? ACCENT : "rgba(255,255,255,0.05)",
            color: showFavs ? "#0a0a0a" : "#fff",
            minHeight: 44, touchAction: "manipulation",
          }}>FAVORITES · {favs.length}</button>
        </div>

        {!showFavs && (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target" style={{
                    background: category === c ? ACCENT + "33" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${category === c ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                    color: category === c ? ACCENT : "#fff",
                    minHeight: 36, touchAction: "manipulation",
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <button
              onClick={nextJoke}
              disabled={loading}
              className="w-full px-4 py-4 rounded-2xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-50"
              style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}
            >
              {loading ? "GENERATING…" : current ? "ANOTHER ONE" : "TELL ME A JOKE"}
            </button>

            {current && (
              <div className="rounded-2xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}1c, rgba(40,8,20,0.85))`, border: `1px solid ${ACCENT}55` }}>
                <div className="text-[10px] tracking-widest font-display text-ink-200 mb-3">{current.category}</div>
                <div className="text-base leading-snug text-white whitespace-pre-wrap mb-3">{current.setup}</div>
                <div className="text-xl font-display text-white">{current.punchline}</div>
                <div className="flex gap-2 mt-4 justify-center flex-wrap">
                  <button onClick={readAloud} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                    <Volume2 size={12} /> Read aloud
                  </button>
                  <button onClick={() => addFav(current)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,107,157,0.18)", border: "1px solid rgba(255,107,157,0.35)", color: ACCENT, minHeight: 40 }}>
                    <Heart size={12} /> Save
                  </button>
                  <button onClick={nextJoke} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                    <Repeat size={12} /> Another
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {showFavs && (
          <div className="space-y-2">
            {favs.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No favorites yet. Tap the heart on a joke to save it.</div>}
            {favs.map(j => (
              <div key={j.id} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] text-ink-300 mb-1">{j.category}</div>
                <div className="text-sm text-ink-100 whitespace-pre-wrap">{j.setup}</div>
                <div className="text-sm font-display text-white mt-1">{j.punchline}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
