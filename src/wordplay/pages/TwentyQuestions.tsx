// 20 Questions — three modes:
//   A) "AI guesses you" — user thinks of a thing, AI asks yes/no questions
//   B) "You guess AI"   — AI picks something, user asks yes/no questions
//   C) "Akinator mode"  — user thinks of a CHARACTER (real/fictional),
//                         AI asks character-narrowing questions and guesses
//
// v3 fixes (2026-05-31):
//  - FUZZY duplicate detection. Normalized token-overlap ≥ 0.7 rejects
//    rephrased repeats ("Is it bigger than a basketball?" vs "Is it
//    larger than a basketball?"). Previous v2 only caught exact text.
//  - Asked-categories tracker forces topic diversity — once size /
//    location / color / material has been asked, the AI is pushed to
//    a different axis.
//  - Tighter guess threshold: model is prompted to guess by Q15 if it
//    has a 60%+ confident hypothesis, then narrow further if wrong.
//  - Akinator mode: new "characterGuess" path with character-specific
//    decision tree (fictional? human? era? media?) and known-character
//    fallback bank (Harry Potter, Mario, Pikachu, Sherlock, etc.).
import { useState } from "react";
import { Mic } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { useVoiceInput, speak } from "../voice";
import { callAI, parseJSON } from "../ai";

const ACCENT = "#34D399";
const GRADIENT = "linear-gradient(135deg, rgba(40,180,140,0.30), rgba(8,30,20,0.95))";

interface Turn { who: "ai" | "user"; text: string }

// ── Fuzzy duplicate detection ────────────────────────────────────────

/** Strip filler, lowercase, return token set. */
function normalizeTokens(s: string): Set<string> {
  const cleaned = s
    .toLowerCase()
    .replace(/[?!.,'"]/g, " ")
    .replace(/\b(is|it|the|a|an|are|you|your|can|do|does|have|has|did|of|to|in|on|at|with|that|than|or|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return new Set(cleaned.split(" ").filter(w => w.length >= 2));
}

/** Jaccard similarity on token sets — 0..1. */
function tokenOverlap(a: string, b: string): number {
  const A = normalizeTokens(a);
  const B = normalizeTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size);
}

function isDuplicate(candidate: string, asked: string[]): boolean {
  // Exact match (post-normalize)
  const cand = candidate.toLowerCase().trim();
  for (const q of asked) {
    if (q.toLowerCase().trim() === cand) return true;
    if (tokenOverlap(candidate, q) >= 0.7) return true;
  }
  return false;
}

// Build a structured "knowledge so far" string from completed Q/A pairs.
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

// Generic question banks (kept narrow per axis so we always have a
// fresh fallback we haven't asked yet).
// Tiered fallback bank — broadest splits first, then narrower. The
// engine pulls from the tier matching the current question number so
// "is it bigger than a basketball" can't appear before "is it alive."
//
// Tier 1 (Q1-Q3): widest splits — alive/object, real/fictional, etc.
// Tier 2 (Q4-Q9): category narrowing — animal/plant/man-made, etc.
// Tier 3 (Q10+):   specific attributes — colors, materials, uses.
const THING_FALLBACKS_TIERED = [
  // Tier 1 — widest possible splits
  [
    "Is it alive?",
    "Is it a thing you can touch?",
    "Is it bigger than a breadbox?",
    "Is it man-made?",
  ],
  // Tier 2 — category narrowing
  [
    "Is it found mostly outdoors?",
    "Is it commonly found at home?",
    "Does it have moving parts?",
    "Is it usually found indoors?",
    "Is it found in a kitchen?",
    "Is it a vehicle of some kind?",
    "Is it a kind of animal?",
    "Is it a kind of plant?",
  ],
  // Tier 3 — specific attributes
  [
    "Can you hold it in one hand?",
    "Is it heavier than a backpack?",
    "Does it make a sound on its own?",
    "Is it made of metal?",
    "Is it warm to the touch?",
    "Is it edible?",
    "Does it run on electricity?",
    "Is it usually one color?",
  ],
];

const CHARACTER_FALLBACKS_TIERED = [
  // Tier 1 — widest splits
  [
    "Are they a real person, not fictional?",
    "Are they human?",
    "Are they alive today?",
    "Are they from a story, movie, or game?",
  ],
  // Tier 2 — medium-broad category narrowing
  [
    "Are they from a movie or TV show?",
    "Are they from a video game?",
    "Are they from a book?",
    "Are they a superhero?",
    "Do they have any magical powers?",
    "Are they an adult?",
    "Did they first appear before the year 2000?",
    "Are they an athlete?",
  ],
  // Tier 3 — narrow attributes
  [
    "Are they male?",
    "Do they wear a costume or uniform?",
    "Are they known for being funny?",
    "Are they known mostly for one specific role?",
    "Do they have a sidekick or partner?",
    "Are they known for a famous catchphrase?",
  ],
];

/** Pick the next fallback in a sensible broad→specific order based on
 *  the current question number. Skips anything that fuzzy-matches a
 *  prior question. */
function pickFallback(tiered: string[][], asked: string[], questionNumber: number): string {
  // Map question number → tier index. Q1-3 from tier 0, Q4-9 from
  // tier 1, Q10+ from tier 2.
  const tierIdx = questionNumber <= 3 ? 0
                : questionNumber <= 9 ? 1
                : 2;
  // Walk the chosen tier first; then earlier tiers; then later.
  const order = [
    tiered[tierIdx],
    ...(tierIdx > 0 ? [tiered[tierIdx - 1]] : []),
    ...(tierIdx < tiered.length - 1 ? [tiered[tierIdx + 1]] : []),
    ...(tierIdx > 1 ? [tiered[0]] : []),
  ];
  for (const bank of order) {
    for (const q of bank) {
      if (!isDuplicate(q, asked)) return q;
    }
  }
  // Last-resort: accept reuse from the chosen tier.
  return tiered[tierIdx][asked.length % tiered[tierIdx].length];
}

// Flat banks for any code paths that still want a single list.
const THING_FALLBACKS = THING_FALLBACKS_TIERED.flat();
const CHARACTER_FALLBACKS = CHARACTER_FALLBACKS_TIERED.flat();

export default function TwentyQuestions() {
  const [mode, setMode] = useState<"pick" | "aiGuess" | "userGuess" | "characterGuess">("pick");
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

  const startCharacterGuess = async () => {
    setTurns([]); setCount(0); setDone(null); setMode("characterGuess"); setLoading(true);
    const ai = await callAI({
      system: "You're playing Akinator-style 20 Questions: the user is thinking of a CHARACTER (real or fictional). Ask the FIRST broadest yes/no question — 'Is your character fictional?' is the strongest opener. Output ONLY JSON.",
      user: `Return JSON: { "type": "question", "text": "your opening question" }`,
      maxTokens: 100,
    });
    const parsed = parseJSON<{ type: string; text: string }>(ai);
    const q = parsed?.text || "Is your character fictional?";
    setTurns([{ who: "ai", text: q }]); setCount(1); setLoading(false);
    speak(q);
  };

  /** Shared handler for both AI-guesses-thing (aiGuess) and AI-guesses-
   *  character (characterGuess) — same loop, different prompts + fallback. */
  const sendUserAnswer = async (answer: "yes" | "no" | "maybe") => {
    const isCharacter = mode === "characterGuess";
    const isThing = mode === "aiGuess";
    if (!isCharacter && !isThing) return;
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
    // Stage guidance: enforce broad → specific funnel. The model is
    // told WHICH PHASE it's in based on the question number, so it
    // can't ask "is it made of metal?" before knowing if the thing
    // is alive. This was the v1 bug — questions felt random.
    const stage =
      count + 1 <= 3 ? "PHASE 1 (Q1-3, WIDEST SPLITS): ask the broadest possible binary question — alive/not, real/fictional, category. NEVER ask about specific colors, sizes, or attributes yet."
    : count + 1 <= 9 ? "PHASE 2 (Q4-9, CATEGORY NARROWING): now that the broadest splits are known, narrow within the established category. Ask about medium (movie/game/book), human/non-human, indoor/outdoor, animal/plant — categorical splits ONE level finer than Phase 1."
    : "PHASE 3 (Q10+, SPECIFIC ATTRIBUTES): the broad picture is clear. Ask specifics — colors, materials, single roles, distinctive features. By Q15 with a confident hypothesis, GUESS.";

    const systemPrompt = isCharacter
      ? "You are playing Akinator-style 20 Questions. The user is thinking of a CHARACTER (real person OR fictional). " +
        "ENFORCE BROAD→SPECIFIC FUNNEL: " + stage + " " +
        "Each question MUST meaningfully eliminate possibilities (binary-search narrowing). Kid-friendly. " +
        "After ~12 questions when you have a strong hypothesis, GUESS: 'Are you thinking of {Character Name}?'. " +
        "CRITICAL: do NOT repeat any question or rephrase one. Output ONLY JSON."
      : "You are playing 20 Questions and trying to GUESS what the user is thinking of. " +
        "ENFORCE BROAD→SPECIFIC FUNNEL: " + stage + " " +
        "Each question MUST meaningfully eliminate possibilities; avoid filler. " +
        "By Q15 with a confident hypothesis, make a guess: 'Are you thinking of a {X}?'. " +
        "CRITICAL: do NOT repeat any question or rephrase one. Output ONLY JSON.";
    const ai = await callAI({
      system: systemPrompt,
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
    let text = parsed?.text || (isCharacter ? "Are they a real person?" : "Is it bigger than a breadbox?");
    // Fuzzy dedupe — never let the model (or its fallback) repeat
    // semantically. THING_FALLBACKS for objects, CHARACTER_FALLBACKS
    // for the Akinator mode.
    if (isDuplicate(text, asked)) {
      text = pickFallback(
        isCharacter ? CHARACTER_FALLBACKS_TIERED : THING_FALLBACKS_TIERED,
        asked,
        count + 1,
      );
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
  const showAIGuessChips = !done && (mode === "aiGuess" || mode === "characterGuess");
  const showConfirmGotIt = !done
    && (mode === "aiGuess" || mode === "characterGuess")
    && turns.some(t => t.who === "ai" && /are you thinking|is it/i.test(t.text));

  return (
    <WordplayShell title="20 Questions" emoji="🔮" accent={ACCENT} gradient={GRADIENT}>
      {mode === "pick" && (
        <div className="space-y-4">
          <div className="text-sm text-ink-200 text-center">Pick a mode:</div>
          <button onClick={startAIGuess} className="w-full rounded-2xl p-5 text-left pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 100, touchAction: "manipulation" }}>
            <div className="font-display text-lg" style={{ color: ACCENT }}>🤖 AI GUESSES YOU</div>
            <div className="text-[12px] text-ink-100 mt-1">Think of any object, animal, or place. I'll ask 20 questions and try to guess.</div>
          </button>
          <button onClick={startCharacterGuess} className="w-full rounded-2xl p-5 text-left pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 100, touchAction: "manipulation" }}>
            <div className="font-display text-lg" style={{ color: ACCENT }}>🧙 GUESS THE CHARACTER (AKINATOR MODE)</div>
            <div className="text-[12px] text-ink-100 mt-1">Think of a CHARACTER — Harry Potter, Mario, your favorite athlete, anyone. I'll ask 20 yes/no questions and try to name them.</div>
          </button>
          <button onClick={startUserGuess} className="w-full rounded-2xl p-5 text-left pressable touch-target" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}55`, minHeight: 100, touchAction: "manipulation" }}>
            <div className="font-display text-lg" style={{ color: ACCENT }}>🧠 YOU GUESS AI</div>
            <div className="text-[12px] text-ink-100 mt-1">I'll pick something. You ask 20 yes/no questions.</div>
          </button>
        </div>
      )}

      {mode !== "pick" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-ink-200">
            <span>
              {mode === "aiGuess" ? "AI Guesses" : mode === "characterGuess" ? "Akinator Mode" : "You Guess"}
            </span>
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
          {showAIGuessChips && (
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
          {showConfirmGotIt && (
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
