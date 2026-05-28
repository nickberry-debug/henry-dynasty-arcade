// Improv Scenes — AI sets up a scene, plays a character, and the
// user plays their character. 4-6 line exchanges, then AI wraps it.
import { useState } from "react";
import { Mic } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { useVoiceInput, speak } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { IMPROV_SCENES, type ImprovScene } from "../templates";

const ACCENT = "#F87171";
const GRADIENT = "linear-gradient(135deg, rgba(220,80,80,0.30), rgba(40,10,10,0.95))";
const CATS = ["Outer Space", "School Day Gone Weird", "Restaurant Disaster", "Theme Park Chaos", "Royal Court", "Time Travel Mishap", "Mythology Encounter", "Video Game World", "Big Game Pressure", "Robot Misunderstanding", "Action Hero Moment", "Animal Conversation"];

interface Turn { who: "ai" | "user"; text: string }
interface Saved { id: string; scene: ImprovScene; turns: Turn[]; ts: number }

export default function ImprovScenes() {
  const [phase, setPhase] = useState<"pick" | "play" | "done">("pick");
  const [category, setCategory] = useState("Outer Space");
  const [scene, setScene] = useState<ImprovScene | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, addSaved] = useHistory<Saved>("improv_saved", 30);
  const voice = useVoiceInput();
  if (voice.transcript && voice.transcript !== input) {
    setTimeout(() => { setInput(voice.transcript); voice.reset(); }, 0);
  }

  const start = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "Generate an absurd improv scene setup. Output ONLY JSON.",
      user: `Category: ${category}. Return JSON: { "scene_description": "(50-100 words)", "user_character": "...", "ai_character": "...", "ai_opening_line": "AI's first line" }`,
      maxTokens: 350,
    });
    const parsed = parseJSON<{ scene_description: string; user_character: string; ai_character: string; ai_opening_line: string }>(ai);
    let s: ImprovScene;
    if (parsed?.scene_description && parsed.ai_opening_line) {
      s = { setting: parsed.scene_description, userChar: parsed.user_character, aiChar: parsed.ai_character, aiOpener: parsed.ai_opening_line, category };
    } else {
      const pool = IMPROV_SCENES.filter(x => x.category === category);
      s = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? IMPROV_SCENES[Math.floor(Math.random() * IMPROV_SCENES.length)];
    }
    setScene(s);
    setTurns([{ who: "ai", text: s.aiOpener }]);
    speak(s.aiOpener);
    setPhase("play");
    setLoading(false);
  };

  const sendLine = async () => {
    if (!scene || !input.trim()) return;
    const next: Turn[] = [...turns, { who: "user", text: input.trim() }];
    setTurns(next);
    setInput("");
    setLoading(true);
    const history = next.map(t => `${t.who === "ai" ? scene.aiChar : scene.userChar}: ${t.text}`).join("\n");
    const ai = await callAI({
      system: "You're playing improv. Stay in character. Respond in 1-2 sentences. After 4-6 user exchanges, end the scene with a fun twist by setting scene_status='ending'. Output ONLY JSON.",
      user: `Setting: ${scene.setting}\nUser plays: ${scene.userChar}\nYou play: ${scene.aiChar}\n\nDialogue:\n${history}\n\nReturn JSON: { "ai_response": "...", "scene_status": "continuing | ending", "ending_text": "(only if ending) wrap-up" }`,
      maxTokens: 250,
    });
    const parsed = parseJSON<{ ai_response: string; scene_status: string; ending_text?: string }>(ai);
    const txt = parsed?.ai_response || "Hmm, interesting. Tell me more.";
    setTurns(prev => [...prev, { who: "ai", text: txt }]);
    speak(txt);
    if (parsed?.scene_status === "ending") {
      if (parsed.ending_text) {
        setTurns(prev => [...prev, { who: "ai", text: `(SCENE) ${parsed.ending_text}` }]);
      }
      setPhase("done");
    }
    setLoading(false);
  };

  const endScene = () => setPhase("done");

  return (
    <WordplayShell title="Improv Scenes" emoji="🎭" accent={ACCENT} gradient={GRADIENT}>
      {phase === "pick" && (
        <div className="space-y-4">
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
          <button onClick={start} disabled={loading} className="w-full px-4 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#fff", minHeight: 60, touchAction: "manipulation" }}>
            {loading ? "SETTING THE SCENE…" : "START A SCENE"}
          </button>
        </div>
      )}

      {phase === "play" && scene && (
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
            <div className="text-[10px] tracking-widest font-display mb-1" style={{ color: ACCENT }}>THE SCENE</div>
            <div className="text-[12px] text-ink-100 leading-snug">{scene.setting}</div>
            <div className="text-[11px] text-ink-300 mt-2">You: <span className="text-white">{scene.userChar}</span> · AI: <span className="text-white">{scene.aiChar}</span></div>
          </div>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className="rounded-lg px-3 py-2 text-sm" style={{
                background: t.who === "ai" ? `${ACCENT}1a` : "rgba(255,255,255,0.05)",
                border: `1px solid ${t.who === "ai" ? ACCENT + "55" : "rgba(255,255,255,0.10)"}`,
              }}>
                <div className="text-[9px] tracking-widest font-display mb-0.5" style={{ color: t.who === "ai" ? ACCENT : "#94a3b8" }}>{t.who === "ai" ? scene.aiChar.toUpperCase() : "YOU"}</div>
                <div>{t.text}</div>
              </div>
            ))}
          </div>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendLine(); }} placeholder="Your line…" className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm" style={{ minHeight: 48 }} />
          <div className="flex gap-2">
            {voice.supported && (
              <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 px-3 py-2.5 rounded-lg text-xs pressable touch-target inline-flex items-center justify-center gap-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                <Mic size={12} /> {voice.listening ? "Listening…" : "Speak"}
              </button>
            )}
            <button onClick={sendLine} disabled={loading || !input.trim()} className="flex-[2] px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#fff", minHeight: 44 }}>
              SAY IT
            </button>
            <button onClick={endScene} className="px-3 py-2.5 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>End</button>
          </div>
        </div>
      )}

      {phase === "done" && scene && (
        <div className="space-y-3 text-center">
          <div className="text-5xl">🎬</div>
          <div className="font-display text-xl">SCENE!</div>
          <button onClick={() => { addSaved({ id: `i-${Date.now()}`, scene, turns, ts: Date.now() }); setPhase("pick"); setScene(null); setTurns([]); }} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target" style={{ background: ACCENT, color: "#fff", minHeight: 48 }}>
            SAVE & NEW SCENE
          </button>
          <button onClick={() => { setPhase("pick"); setScene(null); setTurns([]); }} className="w-full px-4 py-2.5 rounded-xl text-xs pressable touch-target bg-white/5 border border-white/10" style={{ minHeight: 44 }}>
            New Scene (don't save)
          </button>
        </div>
      )}

      {saved.length > 0 && phase === "pick" && (
        <details className="mt-6">
          <summary className="text-[11px] text-ink-300 tracking-widest font-display cursor-pointer pressable touch-target">SAVED SCENES · {saved.length}</summary>
          <div className="space-y-2 mt-2">
            {saved.slice(0, 5).map(s => (
              <div key={s.id} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-ink-300">{s.scene.category}</div>
                <div className="text-[12px] text-ink-100 truncate">{s.scene.setting}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </WordplayShell>
  );
}
