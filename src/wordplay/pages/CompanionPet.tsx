// Companion Pet — pick your companion (Dragon, Fox, Owl, Cat, Dog, Bunny),
// give it a name, then chat by voice or text. Personality + emoji match your choice.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, RefreshCw, ChevronRight } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput, speak } from "../voice";

const ACCENT = "#F97316";
const GRADIENT = "linear-gradient(135deg, rgba(249,115,22,0.28), rgba(30,10,5,0.96))";
const STORAGE_KEY = "dd_companion_v2";
const MAX_HISTORY = 10;

type Mood = "happy" | "sleepy" | "hungry" | "excited" | "grumpy";

interface ChatMessage {
  id: string;
  role: "user" | "companion";
  text: string;
}

interface CompanionType {
  id: string;
  emoji: string;
  label: string;
  color: string;
  desc: string;
  system: string;
}

interface SavedCompanion {
  typeId: string;
  name: string;
  messages: ChatMessage[];
  mood: Mood;
}

const COMPANIONS: CompanionType[] = [
  {
    id: "dragon",
    emoji: "🐉",
    label: "Dragon",
    color: "#F97316",
    desc: "Fiery, brave, loves snacks",
    system: `You are {NAME} the Dragon, a small friendly dragon companion for a kid. Be playful, warm, and age-appropriate. Keep responses to 1-3 short sentences. You occasionally mention wanting snacks, flying, and breathing small fire. You're brave and love adventures. Never break character.`,
  },
  {
    id: "fox",
    emoji: "🦊",
    label: "Fox",
    color: "#F59E0B",
    desc: "Clever, curious, loves riddles",
    system: `You are {NAME} the Fox, a clever and curious fox companion for a kid. Be witty, playful, and age-appropriate. Keep responses to 1-3 short sentences. You love riddles, puzzles, and outsmarting everyone. Occasionally mention your fluffy tail. Never break character.`,
  },
  {
    id: "owl",
    emoji: "🦉",
    label: "Owl",
    color: "#8B5CF6",
    desc: "Wise, loves facts and books",
    system: `You are {NAME} the Owl, a wise and knowledgeable owl companion for a kid. Be thoughtful, educational, and age-appropriate. Keep responses to 1-3 short sentences. You love sharing fun facts, reading books, and staying up late. Occasionally hoot. Never break character.`,
  },
  {
    id: "cat",
    emoji: "🐱",
    label: "Cat",
    color: "#EC4899",
    desc: "Independent, curious, purrs",
    system: `You are {NAME} the Cat, a curious and independent cat companion for a kid. Be warm but with a cat-like personality — sometimes a little sassy but always lovable. Keep responses to 1-3 short sentences. You purr when happy, love cozy spots, and are very curious. Never break character.`,
  },
  {
    id: "dog",
    emoji: "🐶",
    label: "Dog",
    color: "#34D399",
    desc: "Loyal, enthusiastic, loves play",
    system: `You are {NAME} the Dog, an enthusiastic and loyal dog companion for a kid. Be super excited, warm, and age-appropriate. Keep responses to 1-3 short sentences. You love playing fetch, going for walks, and your favorite human. Occasionally mention your tail wagging. Never break character.`,
  },
  {
    id: "bunny",
    emoji: "🐰",
    label: "Bunny",
    color: "#60A5FA",
    desc: "Bouncy, sweet, loves carrots",
    system: `You are {NAME} the Bunny, a sweet and bouncy bunny companion for a kid. Be gentle, cheerful, and age-appropriate. Keep responses to 1-3 short sentences. You love carrots, hopping around, and soft cozy things. Occasionally twitch your nose. Never break character.`,
  },
];

const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😄", sleepy: "😴", hungry: "🍖", excited: "🤩", grumpy: "😤",
};
const MOOD_LABEL: Record<Mood, string> = {
  happy: "Happy", sleepy: "Sleepy", hungry: "Hungry", excited: "Excited!", grumpy: "Grumpy",
};

function loadSaved(): SavedCompanion | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedCompanion;
  } catch {}
  return null;
}

function saveTo(s: SavedCompanion): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...s,
      messages: s.messages.slice(-MAX_HISTORY),
    }));
  } catch {}
}

function inferMood(text: string): Mood | null {
  const t = text.toLowerCase();
  if (/hungry|snack|eat|food|crumb|treat|carrot/.test(t)) return "hungry";
  if (/sleepy|tired|nap|yawn|zzz/.test(t)) return "sleepy";
  if (/excited|amazing|wow|yay|hooray|great|wag/.test(t)) return "excited";
  if (/grumpy|annoyed|bother|hmph|sassy/.test(t)) return "grumpy";
  return "happy";
}

export default function CompanionPet() {
  const [saved, setSaved] = useState<SavedCompanion | null>(null);
  const [phase, setPhase] = useState<"loading" | "pick" | "name" | "chat">("loading");
  const [selectedType, setSelectedType] = useState<CompanionType | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mood, setMood] = useState<Mood>("happy");
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const vi = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = loadSaved();
    if (s) {
      setSaved(s);
      setMessages(s.messages);
      setMood(s.mood);
      setPhase("chat");
    } else {
      setPhase("pick");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!vi.transcript || phase !== "chat") return;
    const text = vi.transcript.trim();
    vi.reset();
    if (!text) return;
    sendMessage(text);
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const companionType = saved ? COMPANIONS.find(c => c.id === saved.typeId) ?? COMPANIONS[0] : selectedType ?? COMPANIONS[0];
  const accent = companionType.color;

  const buildSystem = () => {
    const name = (saved?.name ?? nameInput.trim()) || companionType.label;
    return companionType.system.replace("{NAME}", name);
  };

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    const companionName = (saved?.name ?? "") || "Companion";
    const context = nextMessages.slice(-8).map(m => `${m.role === "user" ? "Kid" : companionName}: ${m.text}`).join("\n");
    const ai = await callAI({
      system: buildSystem(),
      user: `Conversation:\n${context}\n\nRespond as ${companionName} in 1-3 short sentences.`,
      maxTokens: 120,
      model: "fast",
    });
    const replyText = ai || `*makes a happy sound* You're my favorite human! ${companionType.emoji}`;
    const replyMsg: ChatMessage = { id: `c-${Date.now()}`, role: "companion", text: replyText };
    const finalMessages = [...nextMessages, replyMsg];
    setMessages(finalMessages);
    speak(replyText);
    const newMood: Mood = inferMood(replyText) ?? "happy";
    const nextSaved: SavedCompanion = {
      typeId: (saved?.typeId ?? "") || companionType.id,
      name: (saved?.name ?? nameInput.trim()) || companionType.label,
      messages: finalMessages,
      mood: newMood,
    };
    saveTo(nextSaved);
    setSaved(nextSaved);
    setMood(newMood);
    setLoading(false);
  };

  const handleSend = () => {
    const text = textInput.trim();
    if (!text || loading) return;
    setTextInput("");
    sendMessage(text);
  };

  const resetCompanion = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
    setMessages([]);
    setMood("happy");
    setSelectedType(null);
    setNameInput("");
    setPhase("pick");
    vi.reset();
  };

  if (phase === "loading") return null;

  // ── PICK SCREEN ──────────────────────────────────────────────────
  if (phase === "pick") {
    return (
      <WordplayShell title="Companion Pet" emoji="🐾" accent={ACCENT} gradient={GRADIENT}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-white/70 leading-relaxed">
              Pick your companion! They'll remember your conversations and be there whenever you need them.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {COMPANIONS.map(c => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setSelectedType(c); setPhase("name"); }}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                style={{
                  background: `${c.color}18`,
                  border: `2px solid ${c.color}44`,
                  touchAction: "manipulation",
                }}
              >
                <span className="text-5xl">{c.emoji}</span>
                <div className="font-display tracking-widest text-sm" style={{ color: c.color }}>{c.label.toUpperCase()}</div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>{c.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </WordplayShell>
    );
  }

  // ── NAME SCREEN ──────────────────────────────────────────────────
  if (phase === "name" && selectedType) {
    return (
      <WordplayShell title="Companion Pet" emoji={selectedType.emoji} accent={selectedType.color} gradient={GRADIENT}>
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="text-7xl"
            >
              {selectedType.emoji}
            </motion.div>
            <div className="font-display text-lg tracking-widest" style={{ color: selectedType.color }}>
              YOUR {selectedType.label.toUpperCase()}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/70 text-center">
              What will you call your {selectedType.label.toLowerCase()}?
            </div>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && nameInput.trim()) {
                  const name = nameInput.trim();
                  const s: SavedCompanion = { typeId: selectedType.id, name, messages: [], mood: "happy" };
                  saveTo(s);
                  setSaved(s);
                  setPhase("chat");
                }
              }}
              placeholder={`e.g. "Blaze", "Shadow", "Cleo"…`}
              className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/30 outline-none text-base text-center font-display tracking-wide"
              style={{
                background: `${selectedType.color}14`,
                border: `2px solid ${selectedType.color}44`,
                fontSize: 16,
              }}
              autoFocus
            />
          </div>

          <button
            onClick={() => {
              const name = nameInput.trim() || selectedType.label;
              const s: SavedCompanion = { typeId: selectedType.id, name, messages: [], mood: "happy" };
              saveTo(s);
              setSaved(s);
              setPhase("chat");
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-display tracking-widest text-sm"
            style={{
              background: selectedType.color,
              color: "#180a00",
              minHeight: 56,
              touchAction: "manipulation",
            }}
          >
            MEET {(nameInput.trim() || selectedType.label).toUpperCase()} <ChevronRight size={18} />
          </button>

          <button
            onClick={() => { setSelectedType(null); setPhase("pick"); }}
            className="w-full text-center text-xs text-white/40 py-2"
          >
            ← Choose a different companion
          </button>
        </div>
      </WordplayShell>
    );
  }

  // ── CHAT SCREEN ──────────────────────────────────────────────────
  const displayName = saved?.name ?? "Companion";

  return (
    <WordplayShell title="Companion Pet" emoji={companionType.emoji} accent={accent} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* Companion header */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: `${accent}18`, border: `1px solid ${accent}44` }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl select-none"
          >
            {companionType.emoji}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg tracking-wider" style={{ color: accent }}>{displayName.toUpperCase()}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base">{MOOD_EMOJI[mood]}</span>
              <span className="text-[11px]" style={{ color: accent }}>{MOOD_LABEL[mood]}</span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">Your {companionType.label.toLowerCase()} companion</div>
          </div>
        </div>

        {/* Chat history */}
        <div
          className="rounded-2xl p-3 space-y-2.5 min-h-[180px] max-h-[45vh] overflow-y-auto"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {messages.length === 0 && !loading && (
            <div className="text-center text-sm text-white/40 italic py-6">
              Say hi to {displayName}! {companionType.emoji}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="rounded-2xl px-3 py-2 text-sm leading-relaxed max-w-[85%]"
                  style={
                    msg.role === "companion"
                      ? { background: `${accent}22`, border: `1px solid ${accent}55`, color: "#fff" }
                      : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0" }
                  }
                >
                  {msg.role === "companion" && (
                    <div className="text-[9px] tracking-[0.25em] font-display mb-1" style={{ color: accent }}>{displayName.toUpperCase()}</div>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div
                className="rounded-2xl px-3 py-2 inline-flex items-center gap-1.5"
                style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
              >
                <span className="text-[11px]" style={{ color: accent }}>{displayName} is thinking</span>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accent }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {vi.error && <MicErrorBanner error={vi.error} onRetry={vi.start} />}

        {/* Input area */}
        <div className="flex gap-2">
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            placeholder={`Say something to ${displayName}…`}
            disabled={loading}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50 outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              minHeight: 44,
              fontSize: 16,
            }}
          />
          {vi.supported && (
            <motion.button
              onClick={vi.listening ? vi.stop : vi.start}
              disabled={loading}
              animate={vi.listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.7, repeat: vi.listening ? Infinity : 0 }}
              className="rounded-xl inline-flex items-center justify-center disabled:opacity-40"
              style={{
                background: vi.listening ? accent : `${accent}33`,
                border: `2px solid ${vi.listening ? accent : accent + "66"}`,
                color: vi.listening ? "#0a0a14" : accent,
                minWidth: 48, minHeight: 44, touchAction: "manipulation",
              }}
            >
              {vi.listening ? <MicOff size={18} /> : <Mic size={18} />}
            </motion.button>
          )}
          <button
            onClick={handleSend}
            disabled={loading || !textInput.trim()}
            className="rounded-xl inline-flex items-center justify-center disabled:opacity-40"
            style={{
              background: accent, color: "#0a0a14",
              minWidth: 48, minHeight: 44, touchAction: "manipulation",
            }}
          >
            <Send size={17} />
          </button>
        </div>

        {vi.listening && (
          <div className="text-center text-[11px] text-white/50">
            Listening — tap mic again when done
          </div>
        )}

        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                const cleared: SavedCompanion = { ...saved!, messages: [], mood: "happy" };
                saveTo(cleared);
                setSaved(cleared);
                setMessages([]);
                setMood("happy");
              }}
              className="flex-1 rounded-xl text-xs font-display tracking-widest inline-flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 44, touchAction: "manipulation" }}
            >
              <RefreshCw size={13} /> START FRESH
            </button>
          )}
          <button
            onClick={resetCompanion}
            className="flex-1 rounded-xl text-xs font-display tracking-widest inline-flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", minHeight: 44, touchAction: "manipulation" }}
          >
            CHANGE COMPANION
          </button>
        </div>
      </div>
    </WordplayShell>
  );
}
