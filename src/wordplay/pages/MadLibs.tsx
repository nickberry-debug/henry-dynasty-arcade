// Mad Libs — pick a category, AI/template generates a story with
// blanks, user fills each in order, finished story is rendered with
// optional TTS narration.
import { useEffect, useState } from "react";
import { Volume2, Mic, Heart } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { useVoiceInput } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { MAD_LIB_TEMPLATES, type MadLibTemplate } from "../templates";

const ACCENT = "#FFD54A";
const GRADIENT = "linear-gradient(135deg, rgba(255,180,40,0.30), rgba(40,20,8,0.95))";
const CATEGORIES = ["Fairy Tales", "Sci-Fi Adventures", "Sports Stories", "Roller Coaster Day", "Vacation Tales", "Spooky Stories", "Greek Mythology", "School Day", "Birthday Party", "Football Game", "Baseball Game", "Food Adventures", "Movie Plots", "Superhero Origin", "Pirate Tales", "Video Game Quests", "Pet Stories", "Holiday Tales"];

interface SavedStory { id: string; title: string; story: string; ts: number }

export default function MadLibs() {
  const [phase, setPhase] = useState<"pick" | "fill" | "done">("pick");
  const [category, setCategory] = useState("Fairy Tales");
  const [template, setTemplate] = useState<MadLibTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [blankIdx, setBlankIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<string>("");
  const [saved, addSaved] = useHistory<SavedStory>("madlibs_saved", 30);
  const [showSaved, setShowSaved] = useState(false);
  const voice = useVoiceInput();

  // Auto-read each blank prompt as it appears (so the kid can fill in
  // without reading), and read the finished story when assembled.
  useEffect(() => {
    if (phase === "fill" && template) {
      const b = template.blanks[blankIdx];
      if (b) speak(`${b.prompt}${b.hint ? `. ${b.hint}` : ""}.`);
    } else if (phase === "done" && story) {
      speak(`${template?.title ?? ""}. ${story}`);
    }
  }, [phase, blankIdx, story]);

  const start = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "Generate a Mad Libs template. Output ONLY JSON. Story 150-250 words, 8-15 blanks. Mix nouns, verbs (past/present/-ing), adjectives, adverbs, plural nouns, exclamations, body parts, animals, places, numbers. Funny, kid-appropriate.",
      user: `Category: ${category}. Return JSON: { "title": "Title", "blanks": [{"id": 1, "type": "noun", "prompt": "A NOUN", "hint": "any thing"}], "template": "Story with [1], [2] placeholders" }`,
      maxTokens: 1200,
    });
    const parsed = parseJSON<MadLibTemplate>(ai);
    const t = (parsed && parsed.blanks && parsed.template)
      ? { ...parsed, category }
      : (MAD_LIB_TEMPLATES.filter(t => t.category === category)[0] ?? MAD_LIB_TEMPLATES[Math.floor(Math.random() * MAD_LIB_TEMPLATES.length)]);
    setTemplate(t);
    setAnswers({});
    setBlankIdx(0);
    setPhase("fill");
    setLoading(false);
  };

  const submitBlank = (value: string) => {
    if (!template || !value.trim()) return;
    const blank = template.blanks[blankIdx];
    const next = { ...answers, [blank.id]: value.trim() };
    setAnswers(next);
    if (blankIdx + 1 >= template.blanks.length) {
      // Assemble.
      let s = template.template;
      Object.entries(next).forEach(([k, v]) => { s = s.split(`[${k}]`).join(v); });
      setStory(s);
      setPhase("done");
    } else {
      setBlankIdx(blankIdx + 1);
    }
  };

  return (
    <WordplayShell title="Mad Libs" emoji="📝" accent={ACCENT} gradient={GRADIENT}>
      {phase === "pick" && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setShowSaved(false)} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
              background: !showSaved ? ACCENT : "rgba(255,255,255,0.05)",
              color: !showSaved ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
            }}>NEW STORY</button>
            <button onClick={() => setShowSaved(true)} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{
              background: showSaved ? ACCENT : "rgba(255,255,255,0.05)",
              color: showSaved ? "#0a0a0a" : "#fff", minHeight: 44, touchAction: "manipulation",
            }}>LIBRARY · {saved.length}</button>
          </div>

          {!showSaved && (
            <>
              <div className="text-sm text-ink-200 mb-1">Pick a category:</div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className="px-3 py-2.5 rounded-lg text-xs text-left pressable touch-target" style={{
                    background: category === c ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${category === c ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                    color: category === c ? ACCENT : "#fff",
                    minHeight: 48, touchAction: "manipulation",
                  }}>{c}</button>
                ))}
              </div>
              <button onClick={start} disabled={loading} className="w-full mt-4 px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}>
                {loading ? "WRITING YOUR STORY…" : "START FILLING IN BLANKS"}
              </button>
            </>
          )}

          {showSaved && (
            <div className="space-y-2">
              {saved.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No saved stories yet.</div>}
              {saved.map(s => (
                <div key={s.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-display text-sm text-amber-300 mb-1">{s.title}</div>
                  <div className="text-[12px] text-ink-100 leading-snug whitespace-pre-wrap">{s.story}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "fill" && template && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">{template.title}</div>
            <div className="text-sm text-ink-100">Blank {blankIdx + 1} of {template.blanks.length}</div>
          </div>
          <BlankInput
            key={blankIdx}
            blank={template.blanks[blankIdx]}
            voice={voice}
            onSubmit={submitBlank}
          />
          <div className="text-center text-[11px] text-ink-300">
            Words so far: {Object.values(answers).filter(Boolean).map((w, i) => <span key={i} className="font-mono text-amber-300 mx-1">{w}</span>)}
          </div>
        </div>
      )}

      {phase === "done" && template && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-amber-300">YOUR STORY</div>
            <div className="font-display text-xl mt-1">{template.title}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,20,8,0.85))`, border: `1px solid ${ACCENT}55` }}>
            <div className="text-base leading-relaxed text-white whitespace-pre-wrap">{story}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => speak(story)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
              <Volume2 size={12} /> Read Aloud
            </button>
            <button onClick={() => { addSaved({ id: `s-${Date.now()}`, title: template.title, story, ts: Date.now() }); }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}55`, color: ACCENT, minHeight: 44 }}>
              <Heart size={12} /> Save
            </button>
          </div>
          <button onClick={() => { setPhase("pick"); setStory(""); setTemplate(null); }} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 48, touchAction: "manipulation" }}>
            ANOTHER STORY
          </button>
        </div>
      )}
    </WordplayShell>
  );
}

function BlankInput({ blank, voice, onSubmit }: {
  blank: { id: number; type: string; prompt: string; hint?: string };
  voice: ReturnType<typeof useVoiceInput>;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState("");
  if (voice.transcript && voice.transcript !== value) {
    setTimeout(() => { setValue(voice.transcript); voice.reset(); }, 0);
  }
  return (
    <div className="rounded-2xl p-4" style={{ background: `rgba(255,213,74,0.08)`, border: `1px solid ${ACCENT}44` }}>
      <div className="text-center mb-3">
        <div className="font-display text-2xl text-amber-300">{blank.prompt}</div>
        {blank.hint && <div className="text-[11px] text-ink-200 mt-1 italic">({blank.hint})</div>}
      </div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(value); }}
        placeholder="Type your word…"
        className="w-full px-3 py-3 rounded-lg bg-white/10 border border-white/15 text-sm text-center"
        style={{ minHeight: 48 }}
        autoFocus
      />
      <div className="flex gap-2 mt-3">
        {voice.supported && (
          <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{
            background: voice.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${voice.listening ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)"}`,
            minHeight: 44, touchAction: "manipulation",
          }}>
            <Mic size={12} /> {voice.listening ? "Listening…" : "Speak"}
          </button>
        )}
        <button onClick={() => onSubmit(value)} disabled={!value.trim()} className="flex-[2] px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 44 }}>
          NEXT
        </button>
      </div>
    </div>
  );
}
