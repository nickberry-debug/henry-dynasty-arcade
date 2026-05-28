// Conversation Starters — pick a setting, get an open-ended question.
import { useEffect, useState } from "react";
import { Volume2, Heart, Repeat } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { CONVO_STARTERS } from "../templates";

const ACCENT = "#86EFAC";
const GRADIENT = "linear-gradient(135deg, rgba(90,200,140,0.30), rgba(15,30,20,0.95))";
const CATS = ["Family Dinner", "Deep Questions", "Hopes & Dreams", "Funny Hypotheticals", "If You Could…", "Storytelling Prompts", "Get to Know", "Hero Questions", "Food Choices", "Animal Hypotheticals", "Future Predictions", "What Would You Do?", "Game Theory", "World Building"];

interface Q { id: string; question: string; category: string; ts: number }

export default function ConversationStarters() {
  const [category, setCategory] = useState("Family Dinner");
  const [current, setCurrent] = useState<Q | null>(null);
  const [loading, setLoading] = useState(false);
  const [favs, addFav] = useHistory<Q>("convo_favs", 80);
  const [view, setView] = useState<"new" | "favs">("new");

  // Auto-read each new question as it appears.
  useEffect(() => {
    if (view === "new" && current) speak(current.question);
  }, [current?.id, view]);

  const next = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "Generate ONE conversation starter. Open-ended, no yes/no. Sparks discussion. Kid-friendly but interesting to all ages. 10-40 words.",
      user: `Category: ${category}. Return JSON: { "question": "..." }`,
      maxTokens: 150,
    });
    const parsed = parseJSON<{ question: string }>(ai);
    if (parsed?.question) {
      setCurrent({ id: `c-${Date.now()}`, question: parsed.question, category, ts: Date.now() });
    } else {
      const pool = CONVO_STARTERS.filter(c => c.category === category);
      const tpl = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? CONVO_STARTERS[Math.floor(Math.random() * CONVO_STARTERS.length)];
      setCurrent({ id: `c-${Date.now()}`, question: tpl.question, category, ts: Date.now() });
    }
    setLoading(false);
  };

  return (
    <WordplayShell title="Conversation Starters" emoji="💬" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setView("new")} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
            background: view === "new" ? ACCENT : "rgba(255,255,255,0.05)",
            color: view === "new" ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
          }}>NEW QUESTION</button>
          <button onClick={() => setView("favs")} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
            background: view === "favs" ? ACCENT : "rgba(255,255,255,0.05)",
            color: view === "favs" ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
          }}>FAVORITES · {favs.length}</button>
        </div>

        {view === "new" && (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1.5">
                {CATS.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target" style={{
                    background: category === c ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${category === c ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                    color: category === c ? ACCENT : "#fff",
                    minHeight: 36, touchAction: "manipulation",
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <button onClick={next} disabled={loading} className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}>
              {loading ? "THINKING…" : current ? "ANOTHER QUESTION" : "GET A QUESTION"}
            </button>

            {current && (
              <div className="rounded-2xl p-5 text-center" style={{ background: `${ACCENT}1c`, border: `1px solid ${ACCENT}55` }}>
                <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: ACCENT }}>{current.category}</div>
                <div className="text-base leading-relaxed text-white">{current.question}</div>
                <div className="flex gap-2 mt-4 justify-center flex-wrap">
                  <button onClick={() => speak(current.question)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                    <Volume2 size={12} /> Read aloud
                  </button>
                  <button onClick={() => addFav(current)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}55`, color: ACCENT, minHeight: 40 }}>
                    <Heart size={12} /> Save
                  </button>
                  <button onClick={next} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                    <Repeat size={12} /> Another
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {view === "favs" && (
          <div className="space-y-2">
            {favs.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">Saved questions appear here.</div>}
            {favs.map(q => (
              <div key={q.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] text-ink-300 mb-1">{q.category}</div>
                <div className="text-sm text-ink-100">{q.question}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
