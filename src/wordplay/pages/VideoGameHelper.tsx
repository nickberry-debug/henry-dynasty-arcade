// Video Game Helper — conversational strategy assistant.
// Kid describes the game and where they're stuck; AI gives tips.
// Voice-first: AI asks, mic auto-opens. Falls back to text input.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Mic, MicOff, Send, RotateCw, Loader2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI } from "../ai";
import { speak, useConvTurn, sttSupported, primeVoicePermission, unlockTTS } from "../voice";

const ACCENT = "#818CF8";
const GRADIENT = "linear-gradient(135deg, rgba(129,140,248,0.30), rgba(15,10,40,0.95))";

interface ChatLine { role: "ai" | "user"; text: string }

const STARTER_PROMPTS = [
  "What game are you playing and where are you stuck?",
  "Tell me the game name and what's giving you trouble!",
  "What game do you need help with today?",
];

export default function VideoGameHelper() {
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conv = useConvTurn();

  // Auto-scroll chat to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const addLine = (role: "ai" | "user", text: string) => {
    setChat(prev => [...prev, { role, text }]);
  };

  const sendToAI = async (userText: string, history: ChatLine[]) => {
    setThinking(true);
    const context = history.map(l => `${l.role === "ai" ? "Assistant" : "Player"}: ${l.text}`).join("\n");
    const response = await callAI({
      system: `You are an enthusiastic, kid-friendly video game coach (age 8-13).
You give short, clear strategy tips. Be encouraging and specific.
- Ask follow-up questions to understand the situation better
- Give 1-3 tips at a time, not a wall of text
- Use game language naturally
- If the kid is stuck on a boss, ask what attacks they're struggling with
- Keep responses under 4 sentences unless they really need a walkthrough
Never mention violence beyond game terms. Never give spoilers without warning.`,
      user: context ? `${context}\nPlayer: ${userText}` : userText,
      maxTokens: 300,
      model: "fast",
    });
    setThinking(false);
    return response || "Hmm, tell me more about the game! What's it called?";
  };

  const startConversation = async () => {
    setStarted(true);
    const prompt = STARTER_PROMPTS[Math.floor(Math.random() * STARTER_PROMPTS.length)];
    addLine("ai", prompt);

    if (sttSupported()) {
      const userSaid = await conv.ask(prompt, 30);
      if (userSaid.trim()) {
        addLine("user", userSaid);
        const aiReply = await sendToAI(userSaid, []);
        addLine("ai", aiReply);
        speak(aiReply);
      } else {
        // Mic blocked, no speech detected, or auto-timeout. Don't leave the
        // user staring at a silent screen — surface a hint that they can
        // type instead.
        addLine("ai", "I didn't catch that — you can tap the mic again, or type your answer in the box below.");
      }
    } else {
      speak(prompt);
    }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    setInput("");
    addLine("user", msg);
    const history = [...chat, { role: "user" as const, text: msg }];
    const aiReply = await sendToAI(msg, chat);
    addLine("ai", aiReply);
    speak(aiReply);

    // Auto-open mic for follow-up if supported
    if (sttSupported()) {
      const userSaid = await conv.ask("", 25);
      if (userSaid.trim()) {
        addLine("user", userSaid);
        const reply2 = await sendToAI(userSaid, history);
        addLine("ai", reply2);
        speak(reply2);
      }
      // If they didn't speak this round, just sit quietly — the conversation
      // doesn't end, the text input is still right there. Adding a hint
      // every silent turn would get noisy.
    }
  };

  const restart = () => {
    conv.cancel();
    setChat([]);
    setInput("");
    setStarted(false);
  };

  return (
    <WordplayShell title="Game Helper" emoji="🎮" accent={ACCENT} gradient={GRADIENT}>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-ink-200 leading-relaxed">
          Tell me what game you're playing and where you're stuck. I'll give you tips!
          <span className="block mt-0.5 text-ink-300">No spoilers without asking first.</span>
        </p>

        {!started && (
          <motion.div className="space-y-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            {sttSupported() ? (
              <button onClick={() => { primeVoicePermission(); unlockTTS(); startConversation(); }}
                className="w-full px-4 py-5 rounded-2xl font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-3"
                style={{ background: ACCENT, color: "#0f0a28", minHeight: 72 }}>
                <Mic size={18} /> TALK TO GAME HELPER
              </button>
            ) : null}
            <button onClick={() => { setStarted(true); addLine("ai", STARTER_PROMPTS[0]); }}
              className="w-full px-4 py-3 rounded-xl text-sm pressable touch-target flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", minHeight: 52 }}>
              <Gamepad2 size={14} /> {sttSupported() ? "Type instead" : "Start"}
            </button>
          </motion.div>
        )}

        {started && (
          <>
            <div ref={scrollRef} className="flex flex-col gap-2 max-h-80 overflow-y-auto pb-1">
              <AnimatePresence initial={false}>
                {chat.map((l, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${l.role === "ai" ? "mr-6" : "ml-6"}`}
                    style={{
                      background: l.role === "ai" ? `${ACCENT}22` : "rgba(255,255,255,0.08)",
                      border: `1px solid ${l.role === "ai" ? `${ACCENT}44` : "rgba(255,255,255,0.10)"}`,
                      color: "#fff",
                    }}>
                    {l.role === "ai" && (
                      <div className="text-[9px] tracking-widest mb-1" style={{ color: ACCENT }}>GAME HELPER</div>
                    )}
                    {l.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {thinking && (
                <div className="flex items-center gap-2 text-[11px] text-ink-300 italic ml-1">
                  <Loader2 size={11} className="animate-spin" /> Thinking…
                </div>
              )}
              {conv.speaking && (
                <div className="flex items-center gap-2 text-[11px] italic" style={{ color: ACCENT }}>
                  <Loader2 size={11} className="animate-spin" /> Speaking…
                </div>
              )}
              {conv.listening && (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Listening…
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") send(); }}
                placeholder="Type your question…"
                disabled={thinking || conv.speaking || conv.listening}
                className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 text-white outline-none disabled:opacity-40"
                style={{ border: `1px solid ${ACCENT}44`, fontFamily: "inherit" }}
              />
              {sttSupported() && !conv.listening && (
                <button onClick={() => send()}
                  disabled={!input.trim() || thinking}
                  className="px-3 rounded-xl pressable touch-target disabled:opacity-40"
                  style={{ background: ACCENT, color: "#0f0a28", minWidth: 44, minHeight: 44 }}>
                  <Send size={14} />
                </button>
              )}
              {sttSupported() && (
                <button
                  onClick={() => { if (conv.listening) { conv.cancel(); } else { conv.ask("", 25).then(t => { if (t.trim()) send(t); }); } }}
                  disabled={thinking || conv.speaking}
                  className="px-3 rounded-xl pressable touch-target disabled:opacity-40"
                  style={{
                    background: conv.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${conv.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: conv.listening ? "#fca5a5" : "#fff",
                    minWidth: 44, minHeight: 44,
                  }}>
                  {conv.listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
            </div>

            <button onClick={restart}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target self-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
              <RotateCw size={10} /> New game
            </button>
          </>
        )}
      </div>
    </WordplayShell>
  );
}
