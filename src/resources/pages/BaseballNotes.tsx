// Baseball Notes — standalone coaching log for Henry's training.
// Voice or text notes, tagged by skill. AI coach feedback on each entry.
// Mirrors the spirit of the Training Center without requiring a franchise save.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Send, Trash2, ChevronDown } from "lucide-react";
import { useVoiceInput } from "../../wordplay/voice";
import { MicErrorBanner } from "../../wordplay/components/MicErrorBanner";
import { hasAnthropicKey, getAnthropicKey } from "../../arcade/keys";

const NOTES_KEY = "dd_resources_baseball_notes";
const ACCENT = "#60A5FA";

type Category = "hitting" | "pitching" | "fielding" | "game" | "general";

const CAT_LABELS: Record<Category, { label: string; emoji: string; color: string }> = {
  hitting:  { label: "Hitting",   emoji: "🥎", color: "#34D399" },
  pitching: { label: "Pitching",  emoji: "⚾", color: "#60A5FA" },
  fielding: { label: "Fielding",  emoji: "🧤", color: "#F59E0B" },
  game:     { label: "Game",      emoji: "🏟️", color: "#F472B6" },
  general:  { label: "General",   emoji: "📝", color: "#A78BFA" },
};

interface Note {
  id: string;
  createdAt: number;
  category: Category;
  text: string;
  aiResponse?: string;
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 200)));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function getCoachFeedback(note: Note): Promise<string> {
  const key = getAnthropicKey();
  if (!key) return "";
  try {
    const cat = CAT_LABELS[note.category];
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
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `You're an encouraging baseball coach giving brief feedback to a young player (age 10-14).
The player's ${cat.label.toLowerCase()} note: "${note.text}"
Give 1-3 sentences of specific, encouraging coaching feedback. Be practical, positive, and brief.`,
        }],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? "";
  } catch { return ""; }
}

export default function BaseballNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const vi = useVoiceInput();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice transcript → text field
  useEffect(() => {
    if (!vi.transcript) return;
    setText(prev => prev ? `${prev} ${vi.transcript.trim()}` : vi.transcript.trim());
    vi.reset();
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNote = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    const note: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      category,
      text: trimmed,
    };
    // Get AI feedback immediately
    if (hasAnthropicKey()) {
      note.aiResponse = await getCoachFeedback(note);
    }
    const updated = [note, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setText("");
    setLoading(false);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  };

  const filtered = filterCat === "all" ? notes : notes.filter(n => n.category === filterCat);

  // Group by day
  const grouped: { dateLabel: string; notes: Note[] }[] = [];
  for (const note of filtered) {
    const label = formatDate(note.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.dateLabel === label) last.notes.push(note);
    else grouped.push({ dateLabel: label, notes: [note] });
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0a1525 0%, #050a18 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
      }}
    >
      {/* Header */}
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
          <div className="font-display text-2xl tracking-widest">📓 BASEBALL NOTES</div>
        </div>
        <div className="text-[11px] px-2 py-1 rounded-full font-display"
          style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: ACCENT }}>
          {notes.length}
        </div>
      </header>

      <div className="flex-1 px-4 max-w-xl mx-auto w-full flex flex-col gap-4">

        {vi.error && <MicErrorBanner error={vi.error} />}

        {/* Note entry */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)" }}>
          {/* Category selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.entries(CAT_LABELS) as [Category, { label: string; emoji: string; color: string }][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display tracking-wide pressable touch-target"
                style={{
                  background: category === key ? meta.color : "rgba(255,255,255,0.05)",
                  color: category === key ? "#050a18" : "white",
                  border: category === key ? "none" : "1px solid rgba(255,255,255,0.08)",
                  minHeight: 36, touchAction: "manipulation",
                }}>
                {meta.emoji} {meta.label}
              </button>
            ))}
          </div>

          {/* Text area */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(); }}
            placeholder="What did you work on? How did it feel? What do you want to improve?"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              outline: "none",
            }}
          />

          <div className="flex items-center gap-2">
            {vi.supported && (
              <button
                onClick={vi.listening ? vi.stop : vi.start}
                className="w-12 h-12 rounded-xl flex items-center justify-center pressable touch-target"
                style={{
                  background: vi.listening ? ACCENT : "rgba(255,255,255,0.06)",
                  border: `1px solid ${vi.listening ? ACCENT : "rgba(255,255,255,0.1)"}`,
                  color: vi.listening ? "#050a18" : ACCENT,
                  minWidth: 48, minHeight: 48, touchAction: "manipulation",
                }}>
                {vi.listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            {vi.listening && (
              <div className="flex-1 text-sm animate-pulse" style={{ color: ACCENT }}>Recording… tap mic to stop</div>
            )}
            {!vi.listening && (
              <button
                onClick={addNote}
                disabled={!text.trim() || loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-display tracking-widest pressable touch-target"
                style={{
                  background: text.trim() && !loading ? ACCENT : "rgba(255,255,255,0.05)",
                  color: text.trim() && !loading ? "#050a18" : "#6a7d9a",
                  minHeight: 48, touchAction: "manipulation",
                  opacity: loading ? 0.6 : 1,
                }}>
                <Send size={14} />
                {loading ? "SAVING…" : "SAVE NOTE"}
              </button>
            )}
          </div>
          {!hasAnthropicKey() && (
            <div className="text-[10px]" style={{ color: "#6a7d9a" }}>Add an API key in Arcade Settings to get AI coach feedback on each note.</div>
          )}
        </div>

        {/* Filter bar */}
        {notes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCat("all")}
              className="shrink-0 px-3 py-2 rounded-xl text-xs font-display pressable touch-target"
              style={{
                background: filterCat === "all" ? ACCENT : "rgba(255,255,255,0.05)",
                color: filterCat === "all" ? "#050a18" : "white",
                minHeight: 36, touchAction: "manipulation",
              }}>
              ALL ({notes.length})
            </button>
            {(Object.entries(CAT_LABELS) as [Category, { label: string; emoji: string; color: string }][]).map(([key, meta]) => {
              const count = notes.filter(n => n.category === key).length;
              if (!count) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilterCat(key)}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-display pressable touch-target"
                  style={{
                    background: filterCat === key ? meta.color : "rgba(255,255,255,0.05)",
                    color: filterCat === key ? "#050a18" : "white",
                    minHeight: 36, touchAction: "manipulation",
                  }}>
                  {meta.emoji} {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Notes list */}
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color: "#6a7d9a" }}>
            <div className="text-4xl mb-3">📓</div>
            <div className="text-sm">No notes yet. Add your first one above!</div>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.dateLabel}>
            <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#6a7d9a" }}>
              {group.dateLabel}
            </div>
            <div className="space-y-2">
              {group.notes.map(note => {
                const meta = CAT_LABELS[note.category];
                const isExpanded = expandedId === note.id;
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${meta.color}33` }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      className="w-full text-left px-4 py-3.5 pressable touch-target"
                      style={{ background: `${meta.color}0d`, minHeight: 52, touchAction: "manipulation" }}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-display tracking-widest mb-0.5" style={{ color: meta.color }}>{meta.label.toUpperCase()}</div>
                          <div className="text-sm line-clamp-2" style={{ color: isExpanded ? "white" : "#c8d4e8" }}>{note.text}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px]" style={{ color: "#6a7d9a" }}>
                            {new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <ChevronDown size={14} style={{ color: "#6a7d9a", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Full note text */}
                            <div className="text-sm" style={{ color: "white" }}>{note.text}</div>

                            {/* AI coach feedback */}
                            {note.aiResponse && (
                              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div className="text-[9px] font-display tracking-widest mb-1.5" style={{ color: ACCENT }}>🧢 COACH SAYS</div>
                                <div className="text-xs leading-relaxed" style={{ color: "#c8d4e8" }}>{note.aiResponse}</div>
                              </div>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl pressable touch-target"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minHeight: 36, touchAction: "manipulation" }}>
                              <Trash2 size={12} /> Delete note
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
