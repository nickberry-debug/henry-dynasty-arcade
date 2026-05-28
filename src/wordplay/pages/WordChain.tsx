// Word Chain — free-association game. User says a word, AI responds
// with an associated word. Track length, repeats forbidden.
import { useState } from "react";
import { Mic } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { useVoiceInput, speak } from "../voice";
import { callAI, parseJSON, recordHighScore, loadHighScore } from "../ai";

const ACCENT = "#22D3EE";
const GRADIENT = "linear-gradient(135deg, rgba(40,200,230,0.30), rgba(8,25,35,0.95))";

const FALLBACK_LINKS: Record<string, string[]> = {
  ocean: ["wave", "fish", "boat", "beach"], wave: ["surf", "ocean", "sound", "radio"],
  surf: ["beach", "board", "wave", "summer"], beach: ["sand", "wave", "shell", "umbrella"],
  sand: ["dune", "desert", "castle", "glass"], desert: ["camel", "cactus", "sun", "dune"],
  camel: ["hump", "desert", "sand", "trek"], hump: ["camel", "bump", "back", "day"],
  bump: ["road", "hump", "fist", "ouch"], road: ["car", "bump", "trip", "long"],
  car: ["road", "engine", "drive", "race"], engine: ["car", "train", "fire", "block"],
  train: ["track", "engine", "tunnel", "whistle"], track: ["train", "field", "race", "record"],
};

interface Turn { who: "user" | "ai"; word: string }

export default function WordChain() {
  const [mode, setMode] = useState<"endless" | "theme">("endless");
  const [theme, setTheme] = useState<string>("animals");
  const [chain, setChain] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [over, setOver] = useState<{ reason: string } | null>(null);
  const voice = useVoiceInput();
  if (voice.transcript && voice.transcript !== input) {
    setTimeout(() => { setInput(voice.transcript.split(" ")[0]); voice.reset(); }, 0);
  }

  const start = (m: "endless" | "theme") => {
    setMode(m); setChain([]); setUsed(new Set()); setOver(null); setInput("");
  };

  const submit = async () => {
    const w = input.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return;
    if (used.has(w)) { setOver({ reason: `"${w}" was already used.` }); return; }
    const turn: Turn = { who: "user", word: w };
    const nextChain = [...chain, turn];
    const nextUsed = new Set(used); nextUsed.add(w);
    setChain(nextChain); setUsed(nextUsed); setInput("");
    setLoading(true);
    // AI step.
    const history = nextChain.slice(-8).map(t => t.word).join(" → ");
    const themeHint = mode === "theme" ? ` Stay within theme: ${theme}.` : "";
    const ai = await callAI({
      system: `You're playing word association. Reply with ONE word associated with the user's word. Must NOT be in the chain already. Common, kid-friendly. Output ONLY JSON.${themeHint}`,
      user: `Chain: ${history}\nUser said: ${w}\nUsed words: ${[...nextUsed].join(", ")}\nReturn JSON: { "next_word": "one word" }`,
      maxTokens: 60,
    });
    const parsed = parseJSON<{ next_word: string }>(ai);
    let aiWord = (parsed?.next_word ?? "").toLowerCase().replace(/[^a-z]/g, "");
    // Fallback to local link database if AI no-key/missing/repeat.
    if (!aiWord || nextUsed.has(aiWord)) {
      const links = FALLBACK_LINKS[w] ?? [];
      aiWord = links.find(x => !nextUsed.has(x)) || ["fire", "river", "moon", "star", "tree", "cloud", "rock"].find(x => !nextUsed.has(x)) || "end";
    }
    if (nextUsed.has(aiWord)) { setOver({ reason: "I'm stuck — couldn't find a fresh word!" }); setLoading(false); return; }
    setChain([...nextChain, { who: "ai", word: aiWord }]);
    nextUsed.add(aiWord); setUsed(nextUsed);
    setLoading(false);
    speak(aiWord);
    // Update high score.
    recordHighScore("wordchain", mode, nextChain.length + 1);
  };

  const high = loadHighScore("wordchain", mode);

  return (
    <WordplayShell title="Word Chain" emoji="🔗" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["endless", "theme"] as const).map(m => (
            <button key={m} onClick={() => start(m)} className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target capitalize" style={{
              background: mode === m ? ACCENT : "rgba(255,255,255,0.05)",
              color: mode === m ? "#0a0a14" : "#fff",
              border: `1px solid ${mode === m ? ACCENT : "rgba(255,255,255,0.10)"}`,
              minHeight: 44, touchAction: "manipulation",
            }}>{m === "endless" ? "ENDLESS" : "THEME"}</button>
          ))}
        </div>
        {mode === "theme" && (
          <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Theme (e.g. animals)" aria-label="Word chain theme" className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm" style={{ minHeight: 44 }} />
        )}

        <div className="rounded-2xl p-3 text-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}44` }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">CHAIN · {chain.length}</div>
          <div className="text-[11px] text-ink-300 mt-1">Best: {high}</div>
        </div>

        {chain.length > 0 && (
          <div className="rounded-xl p-3 max-h-44 overflow-y-auto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-sm leading-loose">
              {chain.map((t, i) => (
                <span key={i} className={t.who === "ai" ? "font-mono" : "font-mono"} style={{ color: t.who === "ai" ? ACCENT : "#fff" }}>
                  {t.word}{i < chain.length - 1 && <span className="text-ink-300 mx-1">→</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {!over && (
          <>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); }} placeholder="Your word (single)" aria-label="Your next word in the chain" className="w-full px-3 py-3 rounded-lg bg-white/10 border border-white/15 text-sm text-center font-mono" style={{ minHeight: 48 }} />
            <div className="flex gap-2">
              {voice.supported && (
                <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 px-3 py-2.5 rounded-lg text-xs pressable touch-target inline-flex items-center justify-center gap-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                  <Mic size={12} /> {voice.listening ? "Listening…" : "Speak"}
                </button>
              )}
              <button onClick={submit} disabled={loading || !input.trim()} className="flex-[2] px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#0a0a14", minHeight: 44 }}>
                {loading ? "THINKING…" : "ADD TO CHAIN"}
              </button>
            </div>
          </>
        )}

        {over && (
          <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)" }}>
            <div className="text-3xl mb-2">⛓️</div>
            <div className="font-display text-lg">Chain broken</div>
            <div className="text-[12px] text-ink-100 mt-1">{over.reason}</div>
            <div className="text-[11px] text-ink-300 mt-2">Length: <span className="font-mono text-white">{chain.length}</span></div>
            <button onClick={() => start(mode)} className="mt-3 px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{ background: ACCENT, color: "#0a0a14", minHeight: 40 }}>NEW CHAIN</button>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
