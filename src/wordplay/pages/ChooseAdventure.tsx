// New sub-app: Choose Your Own Adventure. AI-driven branching stories.
// 4-6 chapters, choices influence later scenes, multiple endings.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RotateCw, Library, Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak } from "../voice";

const ACCENT = "#34D399";
const GRADIENT = "linear-gradient(135deg, rgba(52,211,153,0.30), rgba(8,30,20,0.95))";

const CATEGORIES = [
  { id: "Fantasy Quest", emoji: "🏰", intro: "You stand at the gate of an ancient stone keep, a sword at your hip and a strange feather in your pocket." },
  { id: "Space Mission", emoji: "🚀", intro: "Your shuttle has just landed on a moon nobody has ever set foot on — and the lights are on inside the empty base." },
  { id: "Mystery Detective", emoji: "🕵️", intro: "You're at your front door. A note is taped to it: 'If you want to find your missing dog, go to the willow tree at the park. Come alone.'" },
  { id: "Spooky House", emoji: "👻", intro: "The old Briarwood House has been empty for fifty years. Tonight your friends dared you to spend an hour inside." },
  { id: "Dinosaur Discovery", emoji: "🦖", intro: "You fell asleep on a school field trip — and woke up in a forest with a brontosaurus blinking at you." },
  { id: "Pirate Treasure", emoji: "🏴‍☠️", intro: "Your grandfather left you one thing: a strange map with no names, only X's and a single instruction — 'Start at the lighthouse.'" },
  { id: "Inside a Video Game", emoji: "🎮", intro: "You put on the new VR headset, and when you took it off — you were still inside the game. The console is dark." },
  { id: "Superhero Day", emoji: "🦸", intro: "You woke up this morning able to lift the refrigerator with one finger. Your parents haven't noticed yet." },
  { id: "Underwater Adventure", emoji: "🌊", intro: "Your submersible reached the deep trench at noon. At 2pm, a window cracked. At 3pm, you heard knocking from outside." },
  { id: "Big Game Day", emoji: "🏈", intro: "Championship game. Last play. Coach taps you on the shoulder and says: 'You're going in.'" },
];

interface Choice { id: number; text: string }
interface Scene {
  text: string;
  choices: Choice[];
  isFinal: boolean;
  endingType?: string;
}
interface Adventure {
  id: string;
  category: string;
  scenes: Array<{ scene: string; chosen?: string }>;
  ts: number;
  ended: boolean;
}

const FALLBACK_CHOICES = (cat: string): Choice[] => ([
  { id: 1, text: `Move forward carefully` },
  { id: 2, text: `Look around for clues first` },
  { id: 3, text: `Call for help` },
]);

export default function ChooseAdventure() {
  const [view, setView] = useState<"pick" | "play" | "library">("pick");
  const [category, setCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [chapter, setChapter] = useState(1);
  const [scene, setScene] = useState<Scene | null>(null);
  const [history, setHistory] = useState<Array<{ scene: string; chosen?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [library, addLib] = useHistory<Adventure>("adventure_library", 30);

  const targetChapters = 5;

  const start = async (cat: typeof CATEGORIES[0]) => {
    setCategory(cat);
    setChapter(1);
    setHistory([]);
    setView("play");
    setLoading(true);
    // Use the canned intro as chapter 1; AI generates choices.
    const ai = await callAI({
      system: "You generate Choose-Your-Own-Adventure scenes for kids age 8-13. PG, clever, vivid. Output ONLY JSON.",
      user: `Category: ${cat.id}. This is CHAPTER 1 of approximately ${targetChapters}.

OPENING TEXT (already written, use this verbatim):
"${cat.intro}"

Generate 3 distinct choices the player could make next. Each choice should feel meaningfully different — leading to different middle paths.

Return JSON:
{
  "scene_text": "${cat.intro.replace(/"/g, '\\"')}",
  "is_final_chapter": false,
  "choices": [
    { "id": 1, "text": "Choice 1 (concrete action, 8-15 words)" },
    { "id": 2, "text": "Choice 2 (different concrete action)" },
    { "id": 3, "text": "Choice 3 (different concrete action)" }
  ]
}`,
      maxTokens: 400,
    });
    const parsed = parseJSON<Scene & { scene_text: string; is_final_chapter: boolean; ending_type?: string }>(ai);
    const s: Scene = parsed?.choices?.length
      ? { text: parsed.scene_text || cat.intro, choices: parsed.choices, isFinal: !!parsed.is_final_chapter }
      : { text: cat.intro, choices: FALLBACK_CHOICES(cat.id), isFinal: false };
    setScene(s);
    setHistory([{ scene: s.text }]);
    setLoading(false);
  };

  const choose = async (choice: Choice) => {
    if (!scene || !category) return;
    const updatedHistory = [...history];
    if (updatedHistory.length > 0) {
      updatedHistory[updatedHistory.length - 1] = { ...updatedHistory[updatedHistory.length - 1], chosen: choice.text };
    }
    const nextChapter = chapter + 1;
    const isLast = nextChapter >= targetChapters;
    setLoading(true);
    const ai = await callAI({
      system: "You continue Choose-Your-Own-Adventure scenes for kids age 8-13. PG, clever, vivid. Earlier choices subtly matter. Output ONLY JSON.",
      user: `Category: ${category.id}
Chapter: ${nextChapter} of approximately ${targetChapters}
${isLast ? "THIS IS THE FINAL CHAPTER — deliver a satisfying ending based on cumulative path. Pick ending tone: good | surprise | cautionary | bittersweet | triumphant." : ""}

STORY SO FAR:
${updatedHistory.map((h, i) => `Ch${i + 1}: ${h.scene}\n→ Chose: ${h.chosen ?? "?"}`).join("\n\n")}

PLAYER JUST CHOSE: "${choice.text}"

Continue the story. Build on what they did. 100-180 words of scene text.
${isLast ? "End with resolution — no new choices." : "End with 2-3 new choices."}
Reference past choices subtly when natural.

Return JSON:
{
  "scene_text": "Next scene prose (100-180 words)",
  "is_final_chapter": ${isLast},
  ${isLast ? '"ending_type": "good | surprise | cautionary | bittersweet | triumphant",' : ""}
  "choices": ${isLast ? "[]" : "[{ \"id\": 1, \"text\": \"...\" }, { \"id\": 2, \"text\": \"...\" }, { \"id\": 3, \"text\": \"...\" }]"}
}`,
      maxTokens: 500,
      model: isLast ? "rich" : "fast",
    });
    const parsed = parseJSON<{ scene_text: string; is_final_chapter: boolean; ending_type?: string; choices: Choice[] }>(ai);
    const next: Scene = parsed?.scene_text
      ? { text: parsed.scene_text, isFinal: !!parsed.is_final_chapter, choices: parsed.choices ?? [], endingType: parsed.ending_type }
      : { text: `(Story continues from your choice "${choice.text}"...)`, isFinal: isLast, choices: isLast ? [] : FALLBACK_CHOICES(category.id) };
    const newHistory = [...updatedHistory, { scene: next.text }];
    setHistory(newHistory);
    setScene(next);
    setChapter(nextChapter);
    setLoading(false);
    if (next.isFinal) {
      addLib({
        id: `adv-${Date.now()}`,
        category: category.id,
        scenes: newHistory,
        ts: Date.now(),
        ended: true,
      });
      speak("And that's how your adventure ends.");
    }
  };

  const restart = () => {
    setView("pick");
    setCategory(null);
    setScene(null);
    setHistory([]);
    setChapter(1);
  };

  return (
    <WordplayShell title="Choose Your Adventure" emoji="🎮" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setView("pick")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "pick" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "pick" ? "#082018" : "#fff", minHeight: 44 }}>NEW</button>
          <button onClick={() => setView("library")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "library" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "library" ? "#082018" : "#fff", minHeight: 44 }}>
            <Library size={11} className="inline mr-1" /> PAST · {library.length}
          </button>
        </div>

        {view === "pick" && (
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => start(c)} disabled={loading}
                className="rounded-2xl p-4 text-left pressable touch-target disabled:opacity-50"
                style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}44`, minHeight: 100 }}>
                <div className="text-3xl">{c.emoji}</div>
                <div className="font-display text-[12px] mt-2" style={{ color: ACCENT }}>{c.id.toUpperCase()}</div>
              </button>
            ))}
          </div>
        )}

        {view === "play" && category && (
          <div className="space-y-3">
            <div className="text-center text-[11px] text-ink-200">
              <span className="font-display tracking-widest" style={{ color: ACCENT }}>{category.emoji} {category.id.toUpperCase()}</span>
              {!scene?.isFinal && <span className="ml-2">· CHAPTER {chapter} OF ~{targetChapters}</span>}
              {scene?.isFinal && <span className="ml-2 text-emerald-300">· THE END</span>}
            </div>

            {loading && (
              <div role="status" aria-live="polite" aria-busy="true" className="text-center py-6">
                <Loader2 size={28} className="mx-auto animate-spin" style={{ color: ACCENT }} aria-hidden="true" />
                <div className="text-[11px] text-ink-100 mt-2">The story unfolds…</div>
              </div>
            )}

            {!loading && scene && (
              <AnimatePresence mode="wait">
                <motion.section key={chapter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT}44` }}>
                  <div className="text-[14px] text-white leading-relaxed whitespace-pre-wrap">{scene.text}</div>
                  {scene.isFinal && scene.endingType && (
                    <div className="mt-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded-md text-[10px] font-display tracking-widest"
                        style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}` }}>
                        ENDING: {scene.endingType.toUpperCase()}
                      </span>
                    </div>
                  )}
                </motion.section>
              </AnimatePresence>
            )}

            {!loading && scene && !scene.isFinal && scene.choices.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] tracking-widest font-display text-ink-200 text-center">WHAT DO YOU DO?</div>
                {scene.choices.map(c => (
                  <button key={c.id} onClick={() => choose(c)}
                    className="w-full text-left rounded-xl p-3.5 flex items-start gap-3 pressable touch-target"
                    style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}33`, minHeight: 56 }}>
                    <div className="font-display flex-shrink-0" style={{ color: ACCENT }}>{["❶","❷","❸","❹"][c.id - 1] ?? c.id}</div>
                    <div className="text-[13px] text-white leading-relaxed">{c.text}</div>
                  </button>
                ))}
              </div>
            )}

            {!loading && scene?.isFinal && (
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => speak(history.map(h => h.scene).join(" "))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                  <Volume2 size={12} /> READ ALOUD
                </button>
                <button onClick={() => category && start(category)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}88`, minHeight: 44 }}>
                  <RotateCw size={12} /> TRY DIFFERENT PATH
                </button>
                <button onClick={restart}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: ACCENT, color: "#082018", minHeight: 44 }}>
                  <Sparkles size={12} /> NEW ADVENTURE
                </button>
              </div>
            )}
          </div>
        )}

        {view === "library" && (
          <div className="space-y-2">
            {library.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No adventures yet.</div>}
            {library.map(a => (
              <div key={a.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px]" style={{ color: ACCENT }}>{a.category.toUpperCase()}</div>
                <div className="font-display text-sm text-white mt-0.5">{a.scenes.length} chapters</div>
                <div className="text-[11px] text-ink-200 mt-1 line-clamp-2 italic">{a.scenes[0]?.scene.slice(0, 100)}…</div>
                <div className="text-[10px] text-ink-300 mt-1">{new Date(a.ts).toLocaleString([], { month: "short", day: "numeric" })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
