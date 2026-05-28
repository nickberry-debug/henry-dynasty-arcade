// Detective Agency — Carmen Sandiego-style mystery solving.
// AI generates a mystery (stolen object, location, 3 suspects).
// Player asks 5 yes/no questions via voice, then must make an accusation.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, RefreshCw, Search } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI, parseJSON } from "../ai";
import { useVoiceInput, speak } from "../voice";

const ACCENT = "#818CF8";
const GRADIENT = "linear-gradient(135deg, rgba(99,102,241,0.30), rgba(8,8,28,0.96))";
const MAX_QUESTIONS = 5;

interface Mystery {
  stolen: string;
  location: string;
  suspects: [string, string, string];
  culprit: string; // one of the suspect names
  setup: string;   // narrator intro sentence
}

interface Clue {
  id: string;
  question: string;
  answer: string;
}

type Phase = "lobby" | "loading" | "investigating" | "accusing" | "verdict";

export default function DetectiveMystery() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [verdict, setVerdict] = useState<{ won: boolean; culprit: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const vi = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clues, phase]);

  // Voice transcript → ask question
  useEffect(() => {
    if (!vi.transcript) return;
    const text = vi.transcript.trim();
    vi.reset();
    if (!text || phase !== "investigating") return;
    askQuestion(text);
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateMystery = async () => {
    setPhase("loading");
    setLoading(true);
    setClues([]);
    setVerdict(null);

    const ai = await callAI({
      system: `You are a mysterious narrator for a kids' detective game (ages 7-13). Generate imaginative, spooky-fun mysteries. Output ONLY valid JSON.`,
      user: `Generate a mystery for a detective game. Return JSON:
{
  "stolen": "the stolen object (e.g. 'the Golden Cookie Recipe')",
  "location": "the location (e.g. 'Chef Marco's Bakery')",
  "suspects": ["Full Name 1", "Full Name 2", "Full Name 3"],
  "culprit": "Full Name (must match one suspect exactly)",
  "setup": "One dramatic narrator sentence introducing the crime (2nd person: 'Detective, ...')"
}`,
      maxTokens: 280,
      model: "fast",
    });

    const parsed = parseJSON<Mystery>(ai);

    let m: Mystery;
    if (parsed?.stolen && parsed.location && Array.isArray(parsed.suspects) && parsed.suspects.length === 3 && parsed.culprit) {
      m = parsed;
    } else {
      m = {
        stolen: "the Legendary Trophy",
        location: "Sunridge Sports Academy",
        suspects: ["Coach Dirk Larson", "Rival Player Sam Fox", "Jealous Janitor Pete"],
        culprit: "Rival Player Sam Fox",
        setup: "Detective, a shocking theft struck Sunridge Sports Academy — the Legendary Trophy has vanished overnight!",
      };
    }

    setMystery(m);
    speak(m.setup);
    setPhase("investigating");
    setLoading(false);
  };

  const askQuestion = async (question: string) => {
    if (!mystery || clues.length >= MAX_QUESTIONS) return;
    setLoading(true);

    const clueHistory = clues.map(c => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n");

    const ai = await callAI({
      system: `You are a mysterious narrator for a kids' detective game. Answer the detective's yes/no questions truthfully but cryptically. Keep responses to 1-2 short sentences. Never directly reveal who did it.`,
      user: `Mystery: "${mystery.stolen}" was stolen from "${mystery.location}".
Suspects: ${mystery.suspects.join(", ")}.
The culprit is: ${mystery.culprit} (SECRET — do not reveal directly).

Previous clues:
${clueHistory || "None yet."}

Detective asks: "${question}"

Answer in 1-2 sentences. Be cryptic and atmospheric. Start with Yes/No/Perhaps/Possibly.`,
      maxTokens: 100,
      model: "fast",
    });

    const answer = ai || "The shadows reveal nothing… yet.";
    const newClue: Clue = { id: `c-${Date.now()}`, question, answer };
    const nextClues = [...clues, newClue];
    setClues(nextClues);
    speak(answer);

    if (nextClues.length >= MAX_QUESTIONS) {
      setPhase("accusing");
    }

    setLoading(false);
  };

  const makeAccusation = async (suspect: string) => {
    if (!mystery) return;
    setLoading(true);

    const isCorrect = suspect === mystery.culprit;

    const ai = await callAI({
      system: `You are a mysterious narrator revealing the solution to a kids' detective mystery. Be dramatic, fun, and age-appropriate. 2-3 sentences.`,
      user: `Mystery: "${mystery.stolen}" stolen from "${mystery.location}".
The actual culprit: ${mystery.culprit}.
The detective accused: ${suspect}.
Result: ${isCorrect ? "CORRECT!" : "WRONG!"}

Write a dramatic 2-3 sentence reveal. If correct: celebrate. If wrong: dramatically reveal the truth.`,
      maxTokens: 150,
      model: "fast",
    });

    const message = ai || (isCorrect
      ? `Incredible detective work! ${mystery.culprit} is caught red-handed — the mystery is solved!`
      : `Not quite, Detective! It was ${mystery.culprit} all along — slipping away while you looked elsewhere.`);

    setVerdict({ won: isCorrect, culprit: mystery.culprit, message });
    speak(message);
    setPhase("verdict");
    setLoading(false);
  };

  const handleMicButton = () => {
    if (vi.listening) vi.stop();
    else vi.start();
  };

  const questionsLeft = MAX_QUESTIONS - clues.length;

  return (
    <WordplayShell title="Detective Agency" emoji="🔍" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* LOBBY */}
        {phase === "lobby" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-5 text-center space-y-2"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}44` }}
            >
              <div className="text-4xl">🕵️</div>
              <div className="font-display text-lg" style={{ color: ACCENT }}>DETECTIVE AGENCY</div>
              <div className="text-sm text-white/60 leading-relaxed">
                A crime has been committed. Ask <strong style={{ color: ACCENT }}>5 questions</strong>, collect clues, then accuse the culprit.
              </div>
            </div>
            <button
              onClick={generateMystery}
              className="w-full rounded-2xl font-display tracking-widest text-sm"
              style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
            >
              OPEN A NEW CASE
            </button>
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl"
            >
              🔍
            </motion.div>
            <div className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>
              PREPARING THE MYSTERY…
            </div>
          </div>
        )}

        {/* INVESTIGATING */}
        {phase === "investigating" && mystery && (
          <div className="space-y-4">
            {/* Case file */}
            <div
              className="rounded-2xl p-4 space-y-2"
              style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}44` }}
            >
              <div className="text-[10px] tracking-[0.3em] font-display text-white/40">CASE FILE</div>
              <div className="text-sm leading-relaxed italic text-white/80">"{mystery.setup}"</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                <div>
                  <span className="text-white/40">Stolen: </span>
                  <span style={{ color: ACCENT }}>{mystery.stolen}</span>
                </div>
                <div>
                  <span className="text-white/40">Location: </span>
                  <span style={{ color: ACCENT }}>{mystery.location}</span>
                </div>
              </div>
              <div className="text-[12px] mt-1">
                <span className="text-white/40">Suspects: </span>
                {mystery.suspects.map((s, i) => (
                  <span key={s}>
                    <span className="text-white/90">{s}</span>
                    {i < mystery.suspects.length - 1 && <span className="text-white/30"> · </span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Questions left indicator */}
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: ACCENT }}>
                {questionsLeft > 0 ? `${questionsLeft} question${questionsLeft !== 1 ? "s" : ""} left` : "No questions left — time to accuse!"}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_QUESTIONS }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ background: i < clues.length ? ACCENT : "rgba(255,255,255,0.15)" }}
                  />
                ))}
              </div>
            </div>

            {/* Clues */}
            {clues.length > 0 && (
              <div
                className="rounded-2xl p-3 space-y-2.5 max-h-[35vh] overflow-y-auto"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="text-[10px] tracking-[0.3em] font-display text-white/30">CLUES COLLECTED</div>
                <AnimatePresence initial={false}>
                  {clues.map((clue, i) => (
                    <motion.div
                      key={clue.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-1"
                    >
                      <div className="text-[11px] text-white/50">
                        <Search size={10} className="inline mr-1" />
                        {clue.question}
                      </div>
                      <div
                        className="rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                        style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`, color: "#e0e7ff" }}
                      >
                        {clue.answer}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>
            )}

            {/* Mic error */}
            {vi.error && <MicErrorBanner error={vi.error} onRetry={vi.start} />}

            {/* Ask button */}
            {questionsLeft > 0 && (
              <motion.button
                onClick={handleMicButton}
                disabled={loading}
                animate={vi.listening ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: vi.listening ? Infinity : 0 }}
                className="w-full rounded-2xl font-display tracking-widest text-sm inline-flex items-center justify-center gap-2.5 disabled:opacity-40"
                style={{
                  background: vi.listening ? ACCENT : loading ? "rgba(255,255,255,0.05)" : `${ACCENT}33`,
                  border: `2px solid ${vi.listening ? ACCENT : loading ? "rgba(255,255,255,0.10)" : ACCENT + "88"}`,
                  color: vi.listening ? "#0a0a14" : ACCENT,
                  minHeight: 60,
                  touchAction: "manipulation",
                }}
              >
                {vi.listening ? <MicOff size={18} /> : <Mic size={18} />}
                {loading ? "NARRATOR SPEAKS…" : vi.listening ? "TAP WHEN DONE" : "ASK A QUESTION"}
              </motion.button>
            )}

            {vi.listening && (
              <div className="text-center text-[11px] text-white/50">
                Speak your yes/no question, then tap again
              </div>
            )}

            {/* Accuse button — appears only when all questions used */}
            {questionsLeft === 0 && !loading && (
              <button
                onClick={() => setPhase("accusing")}
                className="w-full rounded-2xl font-display tracking-widest text-sm"
                style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
              >
                MAKE YOUR ACCUSATION
              </button>
            )}

            <button
              onClick={generateMystery}
              disabled={loading}
              className="w-full rounded-xl text-xs font-display tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 44, touchAction: "manipulation" }}
            >
              <RefreshCw size={13} /> NEW MYSTERY
            </button>
          </div>
        )}

        {/* ACCUSING */}
        {phase === "accusing" && mystery && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center space-y-1"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}55` }}
            >
              <div className="text-2xl">⚖️</div>
              <div className="font-display text-base" style={{ color: ACCENT }}>WHO STOLE THE {mystery.stolen.toUpperCase()}?</div>
              <div className="text-[12px] text-white/50">Tap the suspect you believe is guilty.</div>
            </div>

            <div className="space-y-2.5">
              {mystery.suspects.map(suspect => (
                <motion.button
                  key={suspect}
                  onClick={() => makeAccusation(suspect)}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-2xl px-4 py-4 text-left font-medium disabled:opacity-50"
                  style={{
                    background: `${ACCENT}15`,
                    border: `1px solid ${ACCENT}55`,
                    minHeight: 64,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="text-[10px] tracking-[0.25em] font-display text-white/40 mb-0.5">SUSPECT</div>
                  <div className="text-base" style={{ color: ACCENT }}>{suspect}</div>
                </motion.button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="text-[12px] text-white/50">The narrator deliberates…</div>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: ACCENT }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERDICT */}
        {phase === "verdict" && verdict && mystery && (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-5 text-center space-y-3"
              style={{
                background: verdict.won ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${verdict.won ? "rgba(52,211,153,0.50)" : "rgba(239,68,68,0.50)"}`,
              }}
            >
              <div className="text-4xl">{verdict.won ? "🏆" : "🕵️"}</div>
              <div className="font-display text-xl" style={{ color: verdict.won ? "#34d399" : "#f87171" }}>
                {verdict.won ? "CASE CLOSED!" : "NOT QUITE…"}
              </div>
              <div className="text-sm leading-relaxed">{verdict.message}</div>
              {!verdict.won && (
                <div className="text-[12px] text-white/50 mt-1">
                  The culprit was: <span style={{ color: ACCENT }}>{verdict.culprit}</span>
                </div>
              )}
            </motion.div>

            <button
              onClick={generateMystery}
              className="w-full rounded-2xl font-display tracking-widest text-sm inline-flex items-center justify-center gap-2"
              style={{ background: ACCENT, color: "#0a0a14", minHeight: 60, touchAction: "manipulation" }}
            >
              <RefreshCw size={16} /> NEW MYSTERY
            </button>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
