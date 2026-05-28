import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { useVoiceInput } from "../../wordplay/voice";
import { MicErrorBanner } from "../../wordplay/components/MicErrorBanner";
import { getAnthropicKey, hasAnthropicKey } from "../../arcade/keys";

const ACCENT = "#F472B6";
const NAME_KEY = "dd_journal_name";

const MOODS = [
  { id: "happy",     emoji: "😊", label: "Happy" },
  { id: "sad",       emoji: "😢", label: "Sad" },
  { id: "angry",     emoji: "😤", label: "Angry" },
  { id: "tired",     emoji: "😴", label: "Tired" },
  { id: "cool",      emoji: "😎", label: "Cool" },
  { id: "thoughtful",emoji: "🤔", label: "Thoughtful" },
] as const;

type MoodId = typeof MOODS[number]["id"];

interface JournalEntry {
  id: string;
  text: string;
  date: string;
  mood?: MoodId;
  summary?: string;
}

function journalKey(name: string) {
  return `dd_journal_${name.toLowerCase().replace(/\s+/g, "_")}`;
}

function loadEntries(name: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(journalKey(name));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEntries(name: string, entries: JournalEntry[]) {
  try {
    localStorage.setItem(journalKey(name), JSON.stringify(entries));
  } catch {}
}

function todayStr() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function shortDate(dateStr: string) {
  return dateStr;
}

function moodEmoji(id?: MoodId) {
  return MOODS.find(m => m.id === id)?.emoji ?? "";
}

async function summarizeWeek(entries: JournalEntry[]): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  const week = entries.slice(0, 7);
  if (!week.length) return null;
  const text = week.map(e => `[${e.date}] ${moodEmoji(e.mood)} ${e.text}`).join("\n\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        system:
          "You are a kind journal assistant for a child. Summarize their week in 3-4 sentences, highlight positive moments, validate any difficulties gently.",
        messages: [{ role: "user", content: `Here are my journal entries from this week:\n\n${text}` }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? null;
  } catch { return null; }
}

export default function Journal() {
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(() => {
    try { return localStorage.getItem(NAME_KEY); } catch { return null; }
  });
  const [nameInput, setNameInput] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<MoodId | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [switchingName, setSwitchingName] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const vi = useVoiceInput();

  useEffect(() => {
    if (name) {
      setEntries(loadEntries(name));
    }
  }, [name]);

  useEffect(() => {
    if (vi.transcript) {
      setText(prev => (prev ? prev + " " + vi.transcript : vi.transcript));
      vi.reset();
    }
  }, [vi.transcript]);

  const setupName = () => {
    const n = nameInput.trim();
    if (!n) return;
    try { localStorage.setItem(NAME_KEY, n); } catch {}
    setName(n);
    setEntries(loadEntries(n));
    setNameInput("");
    setSwitchingName(false);
  };

  const addEntry = () => {
    if (!text.trim() || !name) return;
    const entry: JournalEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      date: todayStr(),
      mood,
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(name, next);
    setText("");
    setMood(undefined);
    setSummary(null);
  };

  const deleteEntry = (id: string) => {
    if (!name) return;
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(name, next);
    if (expandedId === id) setExpandedId(null);
  };

  const handleSummarize = async () => {
    if (!hasAnthropicKey()) return;
    setSummaryLoading(true);
    setSummary(null);
    const result = await summarizeWeek(entries);
    setSummary(result ?? "Couldn't generate a summary right now. Try again soon!");
    setSummaryLoading(false);
  };

  if (!name || switchingName) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{
          background: "linear-gradient(180deg, #130a1f 0%, #050810 100%)",
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-5 text-center"
        >
          <div className="text-6xl">📔</div>
          <div className="font-display text-2xl tracking-widest" style={{ color: ACCENT }}>
            YOUR JOURNAL
          </div>
          <p className="text-sm" style={{ color: "#9aa6bf" }}>
            {switchingName ? "Switch to a different journal:" : "What's your name? I'll create your personal journal."}
          </p>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setupName(); }}
            placeholder="Your name…"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-white outline-none text-center"
            style={{ border: `1px solid ${ACCENT}55`, fontFamily: "inherit" }}
          />
          <div className="flex gap-3">
            {switchingName && (
              <button
                onClick={() => setSwitchingName(false)}
                className="flex-1 py-3 rounded-xl text-sm pressable touch-target"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 48, touchAction: "manipulation" }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={setupName}
              disabled={!nameInput.trim()}
              className="flex-1 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-40"
              style={{ background: ACCENT, color: "#150820", minHeight: 48, touchAction: "manipulation" }}
            >
              {switchingName ? "SWITCH" : "START"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #130a1f 0%, #050810 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
      }}
    >
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => navigate("/resources")}
          className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"
          style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          aria-label="Back to resources"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>RESOURCES</div>
          <div className="font-display text-2xl tracking-widest">📔 JOURNAL</div>
        </div>
        <button
          onClick={() => { setSwitchingName(true); setNameInput(""); }}
          className="text-[10px] px-3 py-2 rounded-xl pressable touch-target"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#9aa6bf",
            minHeight: 36,
            touchAction: "manipulation",
          }}
        >
          Switch
        </button>
      </header>

      <div className="flex-1 px-4 max-w-xl mx-auto w-full space-y-5">
        <div className="text-sm" style={{ color: ACCENT }}>
          {name}'s Journal
        </div>

        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "rgba(244,114,182,0.08)",
            border: `1px solid ${ACCENT}44`,
          }}
        >
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>
            NEW ENTRY — {todayStr().toUpperCase()}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MOODS.map(m => (
              <button
                key={m.id}
                onClick={() => setMood(mood === m.id ? undefined : m.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] pressable touch-target"
                style={{
                  background: mood === m.id ? `${ACCENT}28` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${mood === m.id ? ACCENT + "88" : "rgba(255,255,255,0.10)"}`,
                  color: mood === m.id ? ACCENT : "#9aa6bf",
                  minHeight: 32,
                  touchAction: "manipulation",
                }}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write whatever's on your mind…"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-black/30 text-white outline-none resize-none"
            style={{ border: `1px solid ${ACCENT}33`, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6 }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => vi.listening ? vi.stop() : vi.start()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] pressable touch-target"
              style={{
                background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${vi.listening ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.10)"}`,
                color: vi.listening ? "#fca5a5" : "#9aa6bf",
                minHeight: 40,
                touchAction: "manipulation",
              }}
              aria-label={vi.listening ? "Stop dictation" : "Dictate entry"}
            >
              {vi.listening ? <Square size={13} /> : <Mic size={13} />}
              {vi.listening ? "Stop" : "Dictate"}
            </button>
            <div className="flex-1" />
            <button
              onClick={addEntry}
              disabled={!text.trim()}
              className="px-5 py-2 rounded-xl font-display tracking-widest text-xs pressable touch-target disabled:opacity-40"
              style={{ background: ACCENT, color: "#150820", minHeight: 40, touchAction: "manipulation" }}
            >
              SAVE
            </button>
          </div>

          {vi.listening && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "#86efac" }}>
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Listening…
            </div>
          )}

          {vi.error && (
            <MicErrorBanner error={vi.error} onRetry={() => { vi.reset(); vi.start(); }} compact />
          )}
        </div>

        {entries.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleSummarize}
              disabled={summaryLoading || !hasAnthropicKey()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm pressable touch-target disabled:opacity-40"
              style={{
                background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}44`,
                color: ACCENT,
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              {summaryLoading ? <Loader2 size={14} className="animate-spin" /> : "✨"}
              Summarize my week
            </button>
            {!hasAnthropicKey() && (
              <span className="self-center text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(255,179,2,0.1)", border: "1px solid rgba(255,179,2,0.3)", color: "#ffd54a" }}>
                Add API key for AI
              </span>
            )}
          </div>
        )}

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-4 space-y-2"
              style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}44` }}
            >
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: ACCENT }}>YOUR WEEK</div>
              <p className="text-[13px] leading-relaxed text-white">{summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {entries.length > 0 && (
          <section className="space-y-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-300">PAST ENTRIES</div>
            {entries.map(entry => (
              <div
                key={entry.id}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.03)", minHeight: 56, touchAction: "manipulation" }}
                >
                  {entry.mood && (
                    <span className="text-xl shrink-0">{moodEmoji(entry.mood)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px]" style={{ color: ACCENT }}>{entry.date}</div>
                    <div className="text-[12px] text-white mt-0.5 truncate">
                      {entry.text.slice(0, 80)}{entry.text.length > 80 ? "…" : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-ink-300">
                    {expandedId === entry.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedId === entry.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-4 pt-2 space-y-3"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-[13px] leading-relaxed text-white whitespace-pre-wrap">{entry.text}</p>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] pressable touch-target"
                          style={{
                            background: "rgba(239,68,68,0.10)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "#fca5a5",
                            minHeight: 36,
                            touchAction: "manipulation",
                          }}
                        >
                          <Trash2 size={11} /> Delete entry
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </section>
        )}

        {entries.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <div className="text-5xl">📝</div>
            <div className="text-sm" style={{ color: "#9aa6bf" }}>No entries yet. Write your first one above!</div>
          </div>
        )}
      </div>
    </div>
  );
}
