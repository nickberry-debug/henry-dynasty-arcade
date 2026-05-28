// 20 Questions — two modes:
//   A) AI guesses what user is thinking
//   B) AI picks a thing; user asks yes/no questions to guess it.
//
// v2 fixes (2026-05-27):
//  - Build prompt from the CURRENT turn array (including the answer the
//    user JUST gave). Prior code sent stale `turns`, so the AI never saw
//    its own latest question + the matching answer — root cause of
//    repeated questions.
//  - Pass an explicit "questions already asked" list with DO-NOT-REPEAT
//    instruction, plus a structured KNOWN-FACTS summary so the model
//    doesn't have to re-derive what's true from raw chat history.
//  - Strategy hint nudges classic 20Q decision tree (living → animal/
//    plant; object → size/use/material).
//  - Client-side last-ditch dedupe: if the model still repeats, swap to
//    a generic narrowing question the model hasn't asked yet.
//  - Tighter "did you guess it?" matching (whole-word, ignores articles).
import { useState } from "react";
import { Mic } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { useVoiceInput, speak } from "../voice";
import { callAI, parseJSON } from "../ai";

const ACCENT = "#34D399";
const GRADIENT = "linear-gradient(135deg, rgba(40,180,140,0.30), rgba(8,30,20,0.95))";

interface Turn { who: "ai" | "user"; text: string }

// Build a structured "knowledge so far" string from completed Q/A pairs.
// Pairs are (ai question, user yes/no/maybe). The list of asked questions
// is what we'll forbid the model from repeating.
function summarizeKnowledge(turns: Turn[]): { facts: string; asked: string[] } {
  const asked: string[] = [];
  const facts: string[] = [];
  for (let i = 0; i < turns.length - 1; i++) {
    const a = turns[i];
    const b = turns[i + 1];
    if (a.who === "ai" && b.who === "user") {
      asked.push(a.text);
      const ans = b.text.toLowerCase();
      const verdict =
        ans.startsWith("yes") ? "YES" :
        ans.startsWith("no") ? "NO" :
        "MAYBE";
      facts.push(`${verdict}: ${a.text}`);
    }
  }
  return { facts: facts.join("\n"), asked };
}

const GENERIC_FALLBACKS = [
  "Can you hold it in one hand?",
  "Is it found mostly outdoors?",
  "Is it man-made?",
  "Is it commonly seen at school?",
  "Does it make a sound on its own?",
  "Is it usually one color?",
  "Is it bigger than a basketball?",
  "Do you use it every day?",
  "Is it found in a kitchen?",
  "Does it have moving parts?",
];

export default function TwentyQuestions() {
  const [mode, setMode] = useState<"pick" | "aiGuess" | "userGuess">("pick");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string>("");
  const [userInput, setUserInput] = useState("");
  const [done, setDone] = useState<{ won: boolean; reveal?: string } | null>(null);
  const voice = useVoiceInput();
  if (voice.transcript && voice.transcript !== userInput) {
    setTimeout(() => { setUserInput(voice.transcript); voice.reset(); }, 0);
  }

  const startAIGuess = async () => {
    setTurns([]); setCount(0); setDone(null); setMode("aiGuess"); setLoading(true);
    const ai = await callAI({
      system: "You're playing 20 Questions. The user thought of something. Ask the FIRST strategic yes/no question that maximally narrows the space. Good openers: 'Is it alive?', 'Is it bigger than a microwave?', 'Is it found indoors?'. Output ONLY JSON.",
      user: `Return JSON: { "type": "question", "text": "your opening question" }`,
      maxTokens: 100,
    });
    const parsed = parseJSON<{ type: string; text: string }>(ai);
    const q = parsed?.text || "Is it alive?";
    setTurns([{ who: "ai", text: q }]); setCount(1); setLoading(false);
    speak(q);
  };

  const startUserGuess = async () => {
    setTurns([]); setCount(0); setDone(null); setMode("userGuess"); setLoading(true);
    const ai = await callAI({
      system: "Pick a single common, kid-friendly thing to secretly play 20 Questions about. Person/place/thing. Output one word/short phrase only.",
      user: "Pick something now. Just return the noun, no preamble.",
      maxTokens: 30,
    });
    setSecret((ai || "elephant").toLowerCase().replace(/[.!?,"]/g, "").trim());
    setTurns([{ who: "ai", text: "I'm thinking of something. Ask me yes/no questions to figure it out." }]);
    setLoading(false);
  };

  const sendUserAnswer = async (answer: "yes" | "no" | "maybe") => {
    if (mode !== "aiGuess") return;
    // Build the next turn array up-front so the AI sees the latest answer.
    const nextTurns: Turn[] = [...turns, { who: "user" as const, text: answer.toUpperCase() }];
    setTurns(nextTurns);
    if (count >= 20) {
      setDone({ won: false });
      return;
    }
    setLoading(true);
    const { facts, asked } = summarizeKnowledge(nextTurns);
    const askedList = asked.length
      ? asked.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(none yet)";
    const ai = await callAI({
      system:
        "You are playing 20 Questions and trying to GUESS what the user is thinking of. " +
        "Strategy: binary-search style narrowing — first establish alive/not, then category " +
        "(animal/plant/object/person/place), then size, then specific features. Each question " +
        "MUST meaningfully eliminate possibilities; avoid filler. After ~12 questions when you " +
        "have a strong hypothesis, make a guess like 'Are you thinking of a {X}?'. " +
        "CRITICAL: do NOT repeat any question you have already asked, and do NOT ask anything " +
        "whose answer is already implied by the known facts. Output ONLY JSON.",
      user:
`KNOWN FACTS (from prior answers):
${facts || "(none yet)"}

QUESTIONS ALREADY ASKED (DO NOT REPEAT ANY OF THESE OR A REPHRASING):
${askedList}

This is question ${count + 1} of 20. Ask the next strategic question OR make a final guess.

Return JSON: { "type": "question" | "guess", "text": "..." }`,
      maxTokens: 150,
    });
    const parsed = parseJSON<{ type: string; text: string }>(ai);
    let text = parsed?.text || "Is it bigger than a breadbox?";
    // Last-ditch dedupe: if model still repeated, swap to a generic
    // narrowing question we haven't asked yet.
    const lowerAsked = asked.map(q => q.toLowerCase().trim());
    if (lowerAsked.includes(text.toLowerCase().trim())) {
      text = GENERIC_FALLBACKS.find(f => !lowerAsked.includes(f.toLowerCase())) || `Is it bigger than a basketball?`;
    }
    setTurns(prev => [...prev, { who: "ai", text }]);
    setCount(c => c + 1);
    speak(text);
    setLoading(false);
  };

  const sendUserQuestion = async () => {
    if (mode !== "userGuess" || !userInput.trim()) return;
    const q = userInput.trim();
    setTurns(prev => [...prev, { who: "user", text: q }]);
    setUserInput("");
    setCount(c => c + 1);
    setLoading(true);
    const ai = await callAI({
      system: "You're playing 20 Questions and you secretly picked something. Answer the user's question honestly with Yes / No / Sometimes / Unclear. Brief explanation only if needed. Output ONLY JSON.",
      user: `Your secret: ${secret}\nUser asks: "${q}"\nReturn JSON: { "answer": "Yes | No | Sometimes | Unclear", "explanation": "(short, optional)" }`,
      maxTokens: 100,
    });
    const parsed = parseJSON<{ answer: string; explanation?: string }>(ai);
    const text = `${parsed?.answer || "Sometimes"}${parsed?.explanation ? ` — ${parsed.explanation}` : ""}`;
    setTurns(prev => [...prev, { who: "ai", text }]);
    speak(text);
    setLoading(false);
    // Did they guess it? Whole-word match, articles ignored, ignores
    // substring false-positives ("is it a cat" winning when secret = "catalog").
    const cleanGuess = q.toLowerCase().replace(/[?!.,'"]/g, "").replace(/\b(a|an|the|is|it)\b/g, " ").replace(/\s+/g, " ").trim();
    const cleanSecret = secret.toLowerCase().trim();
    const guessedWords = cleanGuess.split(" ").filter(Boolean);
    const secretWords = cleanSecret.split(" ").filter(Boolean);
    const fullMatch = guessedWords.some(w => secretWords.includes(w) && w.length >= 3);
    if (fullMatch) {
      setDone({ won: true, reveal: secret });
    } else if (count + 1 >= 20) {
      setDone({ won: false, reveal: secret });
    }
  };

  const confirm = (won: boolean) => setDone({ won });

  return (
    <WordplayShell title="20 Questions" emoji="🔮" accent={ACCENT} gradient={GRADIENT}>
      {mode === "pick" && (
        <div className="space-y-4">
          <div className="text-sm text-ink-200 text-center">Pick a mode:</div>
          <button onClick={startAIGuess} className="w-full rounded-2xl p-5 text-left pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 100, touchAction: "manipulation" }}>
            <div className="font-display text-lg" style={{ color: ACCENT }}>🤖 AI GUESSES YOU</div>
            <div className="text-[12px] text-ink-100 mt-1">Think of something. I'll ask 20 questions and try to guess.</div>
          </button>
          <button onClick={startUserGuess} className="w-full rounded-2xl p-5 text-left pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 100, touchAction: "manipulation" }}>
            <div className="font-display text-lg" style={{ color: ACCENT }}>🧠 YOU GUESS AI</div>
            <div className="text-[12px] text-ink-100 mt-1">I'll pick something. You ask 20 yes/no questions.</div>
          </button>
        </div>
      )}

      {(mode === "aiGuess" || mode === "userGuess") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-ink-200">
            <span>{mode === "aiGuess" ? "AI Guesses" : "You Guess"}</span>
            <span>{count} / 20</span>
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className="rounded-lg px-3 py-2 text-sm" style={{
                background: t.who === "ai" ? `${ACCENT}1a` : "rgba(255,255,255,0.05)",
                border: `1px solid ${t.who === "ai" ? ACCENT + "55" : "rgba(255,255,255,0.10)"}`,
                color: t.who === "ai" ? "#fff" : "#cbd5e1",
              }}>
                <div className="text-[9px] tracking-widest font-display mb-0.5" style={{ color: t.who === "ai" ? ACCENT : "#94a3b8" }}>{t.who === "ai" ? "AI" : "YOU"}</div>
                <div>{t.text}</div>
              </div>
            ))}
          </div>
          {!done && mode === "aiGuess" && (
            <div className="grid grid-cols-3 gap-2">
              {(["yes", "no", "maybe"] as const).map(a => (
                <button key={a} onClick={() => sendUserAnswer(a)} disabled={loading} className="px-3 py-3 rounded-xl text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#0a0a14", minHeight: 52, touchAction: "manipulation" }}>
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {!done && mode === "userGuess" && (
            <div className="space-y-2">
              <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendUserQuestion(); }} placeholder="Ask a yes/no question or guess…" aria-label="Ask a yes/no question or make a guess" className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm" style={{ minHeight: 48 }} />
              <div className="flex gap-2">
                {voice.supported && (
                  <button onClick={voice.listening ? voice.stop : voice.start} className="flex-1 px-3 py-2.5 rounded-lg text-xs pressable touch-target inline-flex items-center justify-center gap-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                    <Mic size={12} /> {voice.listening ? "Listening…" : "Speak"}
                  </button>
                )}
                <button onClick={sendUserQuestion} disabled={loading || !userInput.trim()} className="flex-[2] px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#0a0a14", minHeight: 44 }}>
                  ASK
                </button>
              </div>
            </div>
          )}
          {!done && mode === "aiGuess" && turns.some(t => t.who === "ai" && t.text.toLowerCase().includes("are you thinking")) && (
            <div className="flex gap-2 mt-1">
              <button onClick={() => confirm(true)} className="flex-1 px-3 py-2 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.45)", color: "#86efac", minHeight: 40 }}>AI got it!</button>
              <button onClick={() => confirm(false)} className="flex-1 px-3 py-2 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5", minHeight: 40 }}>Nope, wrong</button>
            </div>
          )}
          {done && (
            <div className="rounded-2xl p-4 text-center" style={{ background: done.won ? "rgba(52,211,153,0.18)" : "rgba(239,68,68,0.18)", border: `1px solid ${done.won ? "rgba(52,211,153,0.5)" : "rgba(239,68,68,0.5)"}` }}>
              <div className="text-3xl mb-2">{done.won ? "🎉" : "🤷"}</div>
              <div className="font-display text-lg">{done.won ? "YOU GOT IT!" : "Better luck next time!"}</div>
              {done.reveal && <div className="text-[12px] text-ink-100 mt-1">{mode === "userGuess" ? `I was thinking of: ${done.reveal}` : ""}</div>}
              <button onClick={() => setMode("pick")} className="mt-3 px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target" style={{ background: ACCENT, color: "#0a0a14", minHeight: 40 }}>PLAY AGAIN</button>
            </div>
          )}
        </div>
      )}
    </WordplayShell>
  );
}
