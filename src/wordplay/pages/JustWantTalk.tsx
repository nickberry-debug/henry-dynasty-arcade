import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mic, Square, Send, Lock } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput } from "../voice";

const ACCENT = "#A78BFA";
const GRADIENT = "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(10,5,25,0.97))";
const LS_KEY = "dd_just_want_talk";
const MAX_MESSAGES = 20;

type Mood = "talking" | "sad" | "help" | "great";

interface MoodOption {
  id: Mood;
  label: string;
  emoji: string;
  accent: string;
  systemExtra: string;
}

const MOODS: MoodOption[] = [
  {
    id: "talking",
    label: "Just talking",
    emoji: "😊",
    accent: "#A78BFA",
    systemExtra: "",
  },
  {
    id: "sad",
    label: "Feeling sad",
    emoji: "😢",
    accent: "#60A5FA",
    systemExtra: " The child is feeling sad right now. Lead with extra warmth and empathy. Acknowledge their feelings fully before anything else.",
  },
  {
    id: "help",
    label: "Need help",
    emoji: "😕",
    accent: "#FBBF24",
    systemExtra: " The child feels like they need help with something. Be gentle, ask what's going on, and listen carefully.",
  },
  {
    id: "great",
    label: "Great day",
    emoji: "🎉",
    accent: "#34D399",
    systemExtra: " The child is having a great day! Match their energy, celebrate with them, and ask what made it so good.",
  },
];

const BASE_SYSTEM =
  "You are a kind, warm friend for a child (ages 5-13). Listen first, ask gentle follow-up questions. If the kid seems sad, frustrated, or struggling, validate their feelings, never dismiss them. Keep responses to 2-3 sentences. Be comforting but age-appropriate. Never give medical advice, but do suggest talking to a parent/teacher if something sounds serious. Be a good listener.";

interface Message {
  role: "user" | "ai";
  text: string;
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
  } catch {}
}

export default function JustWantTalk() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<Mood>("talking");
  const scrollRef = useRef<HTMLDivElement>(null);
  const vi = useVoiceInput();

  const activeMood = MOODS.find(m => m.id === mood)!;
  const activeAccent = activeMood.accent;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (vi.transcript) {
      handleSend(vi.transcript);
      vi.reset();
    }
  }, [vi.transcript]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", text: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    saveMessages(next);
    setLoading(true);

    const history = next
      .slice(-10)
      .map(m => `${m.role === "user" ? "Child" : "Friend"}: ${m.text}`)
      .join("\n");

    const system = BASE_SYSTEM + activeMood.systemExtra;

    const reply = await callAI({
      system,
      user: history,
      maxTokens: 200,
      model: "fast",
    });

    const aiMsg: Message = {
      role: "ai",
      text: reply ?? "I'm here. Tell me more — I'm listening.",
    };
    const withReply = [...next, aiMsg];
    setMessages(withReply);
    saveMessages(withReply);
    setLoading(false);
  };

  return (
    <WordplayShell title="Just Want to Talk" emoji="💬" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
          style={{
            background: "rgba(167,139,250,0.10)",
            border: "1px solid rgba(167,139,250,0.25)",
            color: "#c4b5fd",
          }}
        >
          <Lock size={11} />
          This stays between us.
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] pressable touch-target"
              style={{
                background: mood === m.id ? `${m.accent}28` : "rgba(255,255,255,0.05)",
                border: `1px solid ${mood === m.id ? m.accent + "88" : "rgba(255,255,255,0.10)"}`,
                color: mood === m.id ? m.accent : "#9aa6bf",
                minHeight: 36,
                touchAction: "manipulation",
              }}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 space-y-2"
          >
            <div className="text-5xl">💬</div>
            <div className="text-sm" style={{ color: "#9aa6bf" }}>
              Say anything. I'm here to listen.
            </div>
          </motion.div>
        )}

        <div ref={scrollRef} className="flex flex-col gap-2 max-h-96 overflow-y-auto pb-1">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
                style={{
                  marginLeft: m.role === "user" ? "18%" : 0,
                  marginRight: m.role === "user" ? 0 : "18%",
                  background: m.role === "user" ? "rgba(255,255,255,0.07)" : `${activeAccent}18`,
                  border: `1px solid ${m.role === "user" ? "rgba(255,255,255,0.10)" : activeAccent + "44"}`,
                  color: "#fff",
                }}
              >
                <div
                  className="text-[9px] tracking-widest mb-1 font-display"
                  style={{ color: m.role === "user" ? "rgba(255,255,255,0.45)" : activeAccent }}
                >
                  {m.role === "user" ? "YOU" : "FRIEND"}
                </div>
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex items-center gap-2 text-[11px] italic ml-1" style={{ color: activeAccent }}>
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

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            placeholder="Say anything…"
            disabled={loading || vi.listening}
            className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
            style={{ border: `1px solid ${activeAccent}44`, fontFamily: "inherit" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-3 rounded-xl pressable touch-target disabled:opacity-40"
            style={{ background: activeAccent, color: "#0a0519", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
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
            aria-label={vi.listening ? "Stop recording" : "Speak"}
          >
            {vi.listening ? <Square size={14} /> : <Mic size={14} />}
          </button>
        </div>
      </div>
    </WordplayShell>
  );
}
