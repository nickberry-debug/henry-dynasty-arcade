// Story Starters — pick a genre, get a captivating 100-180 word
// opening. Optional "continue" mode that builds another 100-180 words
// onto the story.
import { useEffect, useState } from "react";
import { Volume2, Heart, Repeat, PenLine } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { STORY_STARTERS } from "../templates";

const ACCENT = "#C084FC";
const GRADIENT = "linear-gradient(135deg, rgba(170,100,250,0.30), rgba(20,8,40,0.95))";
const CATEGORIES = ["Superhero", "Fantasy Quest", "Space", "Mystery", "Spooky", "High Seas", "Dinosaur Discovery", "Inside Video Game", "Sports Comeback", "Greek Hero", "Robot Companion", "Survival", "Talking Animal", "Championship", "Time Travel", "Action Hero", "Magical Art", "Strange Food"];

interface Saved { id: string; title: string; opening: string; continuation?: string; category: string; ts: number }

export default function StoryStarter() {
  const [category, setCategory] = useState("Mystery");
  const [current, setCurrent] = useState<Saved | null>(null);
  const [continuation, setContinuation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saved, addSaved] = useHistory<Saved>("stories_saved", 30);
  const [view, setView] = useState<"new" | "library">("new");

  // Auto-read story openings + continuations as they arrive.
  useEffect(() => {
    if (view === "new" && current) {
      const text = continuation ? `${current.title}. ${continuation}` : `${current.title}. ${current.opening}`;
      speak(text);
    }
  }, [current?.id, continuation, view]);

  const fresh = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "You write captivating story openings (100-180 words) for ages 8-13. Hook the reader immediately. End on a moment that demands a turn of the page. Output ONLY JSON.",
      user: `Category: ${category}. Return JSON: { "title": "Working title", "opening": "Full 100-180 word opening" }`,
      maxTokens: 600,
    });
    const parsed = parseJSON<{ title: string; opening: string }>(ai);
    if (parsed?.title && parsed.opening) {
      setCurrent({ id: `st-${Date.now()}`, title: parsed.title, opening: parsed.opening, category, ts: Date.now() });
    } else {
      const pool = STORY_STARTERS.filter(s => s.category === category);
      const tpl = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? STORY_STARTERS[Math.floor(Math.random() * STORY_STARTERS.length)];
      setCurrent({ id: `st-${Date.now()}`, title: tpl.title, opening: tpl.opening, category, ts: Date.now() });
    }
    setContinuation("");
    setLoading(false);
  };

  const continueIt = async () => {
    if (!current) return;
    setLoading(true);
    const ai = await callAI({
      system: "Continue a story opening with another 100-180 words. Match tone. Keep the reader on the hook.",
      user: `Story so far:\n\n${current.opening}\n${continuation}\n\nWrite the next 100-180 words.`,
      maxTokens: 600,
    });
    if (ai) setContinuation(prev => `${prev}\n\n${ai}`.trim());
    setLoading(false);
  };

  return (
    <WordplayShell title="Story Starters" emoji="📖" accent={ACCENT} gradient={GRADIENT}>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("new")} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
          background: view === "new" ? ACCENT : "rgba(255,255,255,0.05)",
          color: view === "new" ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
        }}>NEW</button>
        <button onClick={() => setView("library")} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
          background: view === "library" ? ACCENT : "rgba(255,255,255,0.05)",
          color: view === "library" ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
        }}>LIBRARY · {saved.length}</button>
      </div>

      {view === "new" && (
        <div className="space-y-4">
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

          <button onClick={fresh} disabled={loading} className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}>
            {loading ? "WRITING…" : current ? "FRESH STORY" : "GIVE ME A STORY"}
          </button>

          {current && (
            <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${ACCENT}1c, rgba(20,8,40,0.85))`, border: `1px solid ${ACCENT}55` }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-1" style={{ color: ACCENT }}>{current.category}</div>
              <div className="font-display text-lg mb-3">{current.title}</div>
              <div className="text-sm leading-relaxed text-ink-100 whitespace-pre-wrap">{current.opening}</div>
              {continuation && (
                <div className="text-sm leading-relaxed text-ink-100 whitespace-pre-wrap mt-3 pt-3 border-t border-white/10">{continuation}</div>
              )}
              <div className="flex gap-2 mt-4 flex-wrap">
                <button onClick={() => speak((current.opening + " " + continuation).trim())} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                  <Volume2 size={12} /> Read aloud
                </button>
                <button onClick={continueIt} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target disabled:opacity-40" style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}55`, color: ACCENT, minHeight: 40 }}>
                  <PenLine size={12} /> Continue
                </button>
                <button onClick={() => addSaved({ ...current, continuation })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                  <Heart size={12} /> Save
                </button>
                <button onClick={fresh} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
                  <Repeat size={12} /> Fresh
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "library" && (
        <div className="space-y-3">
          {saved.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">Saved stories appear here.</div>}
          {saved.map(s => (
            <div key={s.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest text-ink-300 mb-1">{s.category}</div>
              <div className="font-display text-base mb-2">{s.title}</div>
              <div className="text-[12px] text-ink-100 whitespace-pre-wrap">{s.opening}</div>
              {s.continuation && <div className="text-[12px] text-ink-100 whitespace-pre-wrap mt-2 pt-2 border-t border-white/10">{s.continuation}</div>}
            </div>
          ))}
        </div>
      )}
    </WordplayShell>
  );
}
