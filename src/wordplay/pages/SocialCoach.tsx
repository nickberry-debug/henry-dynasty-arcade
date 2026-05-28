// Social Coach — AI helps kids navigate social situations.
// Kid picks a scenario, chats back and forth, then gets kind feedback.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Send, Loader2, RotateCw, Star } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#34D399";
const GRADIENT = "linear-gradient(135deg, rgba(52,211,153,0.25), rgba(5,18,12,0.95))";

interface Scenario {
  label: string;
  emoji: string;
  character: string;
  setup: string;
}

const SCENARIOS: Scenario[] = [
  { label: "Making a new friend", emoji: "👋", character: "a kid you just met at the park", setup: "You're sitting nearby and haven't spoken yet." },
  { label: "Someone is being mean to me", emoji: "😞", character: "a kid who said something unkind to you", setup: "They just said something hurtful about your drawing." },
  { label: "I want to join a group", emoji: "🤝", character: "a group of kids playing a game at recess", setup: "They're already playing and you want to join in." },
  { label: "My friend is upset", emoji: "💙", character: "your friend who is sitting alone and looks sad", setup: "You noticed they seemed down after lunch." },
  { label: "I said something wrong", emoji: "😬", character: "a friend you accidentally offended", setup: "You said something that hurt their feelings and now it's awkward." },
  { label: "I'm nervous to talk to someone", emoji: "😨", character: "someone you admire and want to get to know", setup: "You've been wanting to say hi for a while but keep freezing up." },
];

interface Message { role: "character" | "user" | "coach"; text: string }

const CHAR_SYSTEM = (s: Scenario) =>
  `You are playing ${s.character}. Scenario: ${s.setup}. Keep responses realistic and age-appropriate for kids 8-12. Short responses only — 1-3 sentences. React naturally to what the kid says.`;

const COACH_SYSTEM =
  "You are a kind social coach for kids 8-12. Give brief, warm, practical advice in 2-3 sentences. Be encouraging, positive, and specific about what the kid did well and one small thing to try next time.";

export default function SocialCoach() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vi = useVoiceInput();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, feedback]);

  // When voice transcript arrives, submit it
  useEffect(() => {
    if (vi.transcript) {
      handleSend(vi.transcript);
      vi.reset();
    }
  }, [vi.transcript]);

  const startScenario = async (s: Scenario) => {
    setScenario(s);
    setMessages([]);
    setFeedback(null);
    setExchangeCount(0);
    setLoading(true);
    const opener = await callAI({
      system: CHAR_SYSTEM(s),
      user: `Start the scene: ${s.setup} — say the first thing naturally.`,
      maxTokens: 120,
      model: "fast",
    });
    const openingLine = opener ?? `Hi there. ${s.setup}`;
    setMessages([{ role: "character", text: openingLine }]);
    setLoading(false);
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !scenario) return;
    setInput("");

    const newCount = exchangeCount + 1;
    setExchangeCount(newCount);

    const next: Message[] = [...messages, { role: "user", text: msg }];
    setMessages(next);

    if (newCount >= 3) {
      // Time for coach feedback
      setLoading(true);
      const convo = next.map(m => `${m.role === "user" ? "Kid" : m.role === "character" ? "Character" : "Coach"}: ${m.text}`).join("\n");
      const coachReply = await callAI({
        system: COACH_SYSTEM,
        user: `Scenario: "${scenario.label}". Here's how the conversation went:\n${convo}\n\nGive kind, practical feedback to the kid.`,
        maxTokens: 200,
        model: "fast",
      });
      const fb = coachReply ?? "You did great! Conversations like this take practice and you tried — that's the most important part. Keep going!";
      setFeedback(fb);
      setMessages(prev => [...prev, { role: "coach", text: fb }]);
      setLoading(false);
    } else {
      // Character responds
      setLoading(true);
      const convo = next.map(m => `${m.role === "user" ? "Kid" : "You"}: ${m.text}`).join("\n");
      const charReply = await callAI({
        system: CHAR_SYSTEM(scenario),
        user: convo,
        maxTokens: 120,
        model: "fast",
      });
      const reply = charReply ?? "Hmm… okay.";
      setMessages(prev => [...prev, { role: "character", text: reply }]);
      setLoading(false);
    }
  };

  const reset = () => {
    setScenario(null);
    setMessages([]);
    setInput("");
    setFeedback(null);
    setExchangeCount(0);
    vi.reset();
  };

  return (
    <WordplayShell title="Social Coach" emoji="🤝" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        {!scenario ? (
          <>
            <p className="text-[12px] text-ink-200 leading-relaxed">
              Pick a social situation to practice. I'll play the other person — you respond however you'd like. Then I'll give you kind feedback!
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.label}
                  onClick={() => startScenario(s)}
                  className="text-left rounded-xl px-4 py-3 pressable touch-target flex items-center gap-3"
                  style={{
                    background: `${ACCENT}14`,
                    border: `1px solid ${ACCENT}40`,
                    minHeight: 60,
                    touchAction: "manipulation",
                  }}
                >
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <div>
                    <div className="text-[13px] text-white font-display">{s.label}</div>
                    <div className="text-[10px] text-ink-300 mt-0.5">{s.setup}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{scenario.emoji}</span>
                <span className="text-[12px] font-display" style={{ color: ACCENT }}>{scenario.label}</span>
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] pressable touch-target"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 36, touchAction: "manipulation" }}
              >
                <RotateCw size={10} /> New scene
              </button>
            </div>

            {/* Exchange counter */}
            {!feedback && (
              <div className="text-[10px] text-ink-300 text-center">
                Exchange {Math.min(exchangeCount + 1, 3)} of 3 — then Coach gives feedback!
              </div>
            )}

            {/* Chat */}
            <div ref={scrollRef} className="flex flex-col gap-2 max-h-80 overflow-y-auto pb-1">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      marginLeft: m.role === "user" ? "20%" : 0,
                      marginRight: m.role === "user" ? 0 : "20%",
                      background:
                        m.role === "coach"
                          ? "rgba(250,204,21,0.12)"
                          : m.role === "user"
                          ? "rgba(255,255,255,0.08)"
                          : `${ACCENT}18`,
                      border: `1px solid ${
                        m.role === "coach"
                          ? "rgba(250,204,21,0.35)"
                          : m.role === "user"
                          ? "rgba(255,255,255,0.10)"
                          : `${ACCENT}44`
                      }`,
                      color: "#fff",
                    }}
                  >
                    <div
                      className="text-[9px] tracking-widest mb-1 font-display"
                      style={{
                        color:
                          m.role === "coach" ? "#fde047" : m.role === "user" ? "rgba(255,255,255,0.5)" : ACCENT,
                      }}
                    >
                      {m.role === "coach" ? "⭐ COACH" : m.role === "user" ? "YOU" : "CHARACTER"}
                    </div>
                    {m.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex items-center gap-2 text-[11px] text-ink-300 italic ml-1">
                  <Loader2 size={11} className="animate-spin" /> Thinking…
                </div>
              )}
            </div>

            {vi.error && (
              <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} compact />
            )}

            {vi.listening && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Listening…
              </div>
            )}

            {/* Input */}
            {!feedback && (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                  placeholder="Type your response…"
                  disabled={loading || vi.listening}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
                  style={{ border: `1px solid ${ACCENT}44`, fontFamily: "inherit" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="px-3 rounded-xl pressable touch-target disabled:opacity-40"
                  style={{ background: ACCENT, color: "#04100a", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
                >
                  <Send size={14} />
                </button>
                <button
                  onClick={() => vi.listening ? vi.stop() : vi.start()}
                  disabled={loading}
                  className="px-3 rounded-xl pressable touch-target disabled:opacity-40 flex items-center justify-center"
                  style={{
                    background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${vi.listening ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                    color: vi.listening ? "#fca5a5" : "#fff",
                    minWidth: 44,
                    minHeight: 44,
                    touchAction: "manipulation",
                  }}
                  aria-label={vi.listening ? "Stop recording" : "Speak your response"}
                >
                  {vi.listening ? <Square size={14} /> : <Mic size={14} />}
                </button>
              </div>
            )}

            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.30)" }}
              >
                <div className="flex items-center gap-2 text-[10px] tracking-widest font-display" style={{ color: "#fde047" }}>
                  <Star size={13} /> COACH FEEDBACK
                </div>
                <p className="text-[13px] leading-relaxed text-white">{feedback}</p>
                <button
                  onClick={reset}
                  className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-xs pressable touch-target"
                  style={{ background: ACCENT, color: "#04100a", minHeight: 44, touchAction: "manipulation" }}
                >
                  TRY ANOTHER SCENARIO
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </WordplayShell>
  );
}
