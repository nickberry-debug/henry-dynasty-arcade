// Beckett's To-Do List — categorized tasks, voice input, persistence
// (localStorage), recurring daily/weekly resets at midnight, confetti
// burst on completion. Suggested starter tasks offered on first run.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Mic, Trash2, Check, Filter } from "lucide-react";
import { ResourcesShell } from "../components/ResourcesShell";
import { useModal, dialogProps } from "../../a11y";
import { useVoiceInput, sttSupported } from "../../wordplay/voice";

const ACCENT = "#fde68a";
const STORAGE_KEY = "becketts_todos_v1";
const SEEDED_KEY = "becketts_todos_seeded_v1";

type Category = "chores" | "homework" | "ash-care" | "personal" | "other";
type When = "today" | "week" | "one-time" | "daily" | "weekly";

interface Task {
  id: string;
  text: string;
  category: Category;
  when: When;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  recurring: boolean;
  /** Date stamp of last daily/weekly reset, YYYY-MM-DD. */
  lastReset?: string;
}

const CATEGORIES: Array<{ id: Category; label: string; emoji: string; color: string }> = [
  { id: "chores",    label: "Chores",     emoji: "🧹", color: "#fb923c" },
  { id: "homework",  label: "Homework",   emoji: "📚", color: "#60a5fa" },
  { id: "ash-care",  label: "Ash Care",   emoji: "🦎", color: "#86efac" },
  { id: "personal",  label: "Personal",   emoji: "🧼", color: "#f472b6" },
  { id: "other",     label: "Other",      emoji: "✨", color: "#a78bfa" },
];

const SUGGESTED: Array<Omit<Task, "id" | "createdAt" | "completed" | "lastReset">> = [
  { text: "Feed Ash breakfast",     category: "ash-care", when: "daily", recurring: true },
  { text: "Mist Ash's greens",      category: "ash-care", when: "daily", recurring: true },
  { text: "Check Ash's water",      category: "ash-care", when: "daily", recurring: true },
  { text: "Make my bed",            category: "chores",   when: "daily", recurring: true },
  { text: "Brush teeth (morning)",  category: "personal", when: "daily", recurring: true },
  { text: "Brush teeth (night)",    category: "personal", when: "daily", recurring: true },
  { text: "Clean Ash's tank",       category: "ash-care", when: "weekly", recurring: true },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function thisWeekKey(): string {
  const d = new Date();
  // ISO-ish week: year + week number (rough — good enough for our reset cadence).
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  return `${d.getFullYear()}-W${Math.ceil((days + oneJan.getDay() + 1) / 7)}`;
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveTasks(ts: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ts)); } catch {}
}

/** Reset recurring tasks if their cadence has rolled over. */
function applyResets(tasks: Task[]): Task[] {
  const day = todayKey();
  const week = thisWeekKey();
  return tasks.map(t => {
    if (!t.recurring) return t;
    if (t.when === "daily" && t.lastReset !== day) {
      return { ...t, completed: false, completedAt: undefined, lastReset: day };
    }
    if (t.when === "weekly" && t.lastReset !== week) {
      return { ...t, completed: false, completedAt: undefined, lastReset: week };
    }
    return t;
  });
}

export default function BeckettsTodo() {
  const [tasks, setTasks] = useState<Task[]>(() => applyResets(loadTasks()));
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "done">("today");
  const [confetti, setConfetti] = useState<number[]>([]);
  const [showSeeder, setShowSeeder] = useState(false);

  // First run: offer to seed tasks.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEDED_KEY);
      if (!seen && tasks.length === 0) setShowSeeder(true);
    } catch {}
  }, []);

  // Persist on change.
  useEffect(() => { saveTasks(tasks); }, [tasks]);

  // Refresh resets at midnight (if app stays open).
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    const t = setTimeout(() => setTasks(prev => applyResets(prev)), ms);
    return () => clearTimeout(t);
  }, [tasks.length]);

  const addTask = (t: Omit<Task, "id" | "createdAt" | "completed" | "lastReset">) => {
    setTasks(prev => [...prev, {
      ...t,
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(), completed: false,
      lastReset: t.when === "daily" ? todayKey() : t.when === "weekly" ? thisWeekKey() : undefined,
    }]);
  };

  const seedSuggested = () => {
    SUGGESTED.forEach(s => addTask(s));
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch {}
    setShowSeeder(false);
  };
  const skipSeed = () => {
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch {}
    setShowSeeder(false);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const willComplete = !t.completed;
      if (willComplete) {
        // Confetti burst (handled via local state — just a key for the animation).
        setConfetti(c => [...c, Date.now()]);
      }
      return { ...t, completed: willComplete, completedAt: willComplete ? Date.now() : undefined };
    }));
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const visible = useMemo(() => {
    return tasks.filter(t => {
      if (filter === "done") return t.completed;
      if (filter === "today") return !t.completed && (t.when === "today" || t.when === "daily");
      if (filter === "week") return !t.completed && (t.when === "week" || t.when === "weekly");
      return true;
    });
  }, [tasks, filter]);

  const todayDone = tasks.filter(t => (t.when === "today" || t.when === "daily") && t.completed).length;
  const todayTotal = tasks.filter(t => t.when === "today" || t.when === "daily").length;

  return (
    <ResourcesShell title="Beckett's To-Do" subtitle={`Today: ${todayDone} of ${todayTotal} done`} backTo="/resources/becketts-corner" emoji="✅" accent={ACCENT}>
      <div className="space-y-3 relative">
        {/* Add button */}
        <button onClick={() => setShowAdd(true)}
          className="w-full px-4 py-3 rounded-2xl font-display tracking-widest text-sm pressable touch-target flex items-center justify-center gap-2"
          style={{ background: ACCENT, color: "#1a1308", minHeight: 56 }}>
          <Plus size={14} aria-hidden="true" /> ADD NEW TASK
        </button>

        {/* Filter row */}
        <div className="rounded-xl p-2 flex gap-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Filter size={13} className="ml-1 self-center text-amber-200/70" aria-hidden="true" />
          {(["today", "week", "done", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] font-display tracking-widest pressable touch-target"
              style={{
                background: filter === f ? `${ACCENT}33` : "transparent",
                color: filter === f ? ACCENT : "#fde68a99",
                border: `1px solid ${filter === f ? ACCENT : "transparent"}`,
                minHeight: 36,
              }}>{f.toUpperCase()}</button>
          ))}
        </div>

        {/* Task list */}
        {visible.length === 0 && (
          <div className="text-center text-emerald-100/85 italic text-[13px] py-8">
            {filter === "done" ? "Nothing done yet — let's get to it!" : filter === "today" ? "No tasks for today. Tap ADD to make one." : "Nothing here yet."}
          </div>
        )}
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {visible.map(t => {
              const cat = CATEGORIES.find(c => c.id === t.category)!;
              return (
                <motion.li key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="rounded-lg p-2.5 flex items-center gap-2"
                  style={{
                    background: t.completed ? "rgba(134,239,172,0.08)" : "rgba(0,0,0,0.45)",
                    border: `1px solid ${t.completed ? "rgba(134,239,172,0.30)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <button onClick={() => toggleTask(t.id)}
                    role="checkbox" aria-checked={t.completed}
                    aria-label={`Mark ${t.text} ${t.completed ? "incomplete" : "complete"}`}
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 pressable"
                    style={{
                      background: t.completed ? "#22c55e" : "transparent",
                      border: `2px solid ${t.completed ? "#22c55e" : cat.color}`,
                      minWidth: 28, minHeight: 28,
                    }}>
                    {t.completed && <Check size={14} className="text-white" aria-hidden="true" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] ${t.completed ? "text-emerald-200/70 line-through" : "text-white"} leading-snug`}>{t.text}</div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: cat.color }}>
                      <span aria-hidden="true">{cat.emoji}</span>{cat.label.toUpperCase()}
                      {t.recurring && <span className="text-emerald-200/70">· repeats {t.when}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(t.id)} aria-label={`Delete ${t.text}`}
                    className="w-9 h-9 rounded flex items-center justify-center pressable text-red-300/80 hover:text-red-400"
                    style={{ background: "rgba(0,0,0,0.3)", minWidth: 32, minHeight: 32 }}>
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {/* Suggested seeder banner */}
        {showSeeder && (
          <SuggestedBanner onAccept={seedSuggested} onSkip={skipSeed} />
        )}

        {/* Confetti pieces */}
        <ConfettiBurst keys={confetti} onDone={(k) => setConfetti(c => c.filter(x => x !== k))} />
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={(t) => { addTask(t); setShowAdd(false); }} />}
    </ResourcesShell>
  );
}

function SuggestedBanner({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3"
      style={{ background: "rgba(253,230,138,0.12)", border: "1px solid rgba(253,230,138,0.45)" }}>
      <div className="text-[10px] tracking-widest font-display mb-1" style={{ color: ACCENT }}>WANT A STARTER LIST?</div>
      <div className="text-[12px] text-amber-100 mb-2 leading-relaxed">
        We can add 7 helpful daily tasks (feed Ash, mist greens, make bed…) to get you started. You can edit or delete any of them.
      </div>
      <div className="flex gap-2">
        <button onClick={onAccept} className="flex-1 px-3 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target" style={{ background: ACCENT, color: "#1a1308", minHeight: 40 }}>
          ADD STARTER TASKS
        </button>
        <button onClick={onSkip} className="px-3 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", color: "#fde68a", border: "1px solid rgba(255,255,255,0.12)", minHeight: 40 }}>
          NO THANKS
        </button>
      </div>
    </motion.div>
  );
}

function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Task, "id" | "createdAt" | "completed" | "lastReset">) => void }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("chores");
  const [when, setWhen] = useState<When>("today");
  const dialogRef = useRef<HTMLDivElement>(null);
  const vi = useVoiceInput();
  useModal({ onClose, containerRef: dialogRef });

  // Apply voice transcript.
  if (vi.transcript && vi.transcript !== text) {
    setTimeout(() => { setText(prev => prev ? `${prev} ${vi.transcript}` : vi.transcript); vi.reset(); }, 0);
  }

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const recurring = when === "daily" || when === "weekly";
    onAdd({ text: trimmed, category, when, recurring });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.78)" }} onClick={onClose}>
      <div ref={dialogRef} {...dialogProps("add-task-title")} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-4 max-h-[92vh] overflow-y-auto"
        style={{ background: "linear-gradient(180deg, #1a1308, #0a0604)", border: `2px solid ${ACCENT}` }}>
        <div className="flex items-center justify-between mb-3">
          <h2 id="add-task-title" className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>NEW TASK</h2>
          <button onClick={onClose} className="w-10 h-10 rounded flex items-center justify-center pressable touch-target" aria-label="Close" style={{ background: "rgba(0,0,0,0.5)", color: "#fde68a", minWidth: 44, minHeight: 44 }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] tracking-[0.3em] font-display text-amber-100/80 mb-1">WHAT DO YOU NEED TO DO?</label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              autoFocus rows={2}
              placeholder='e.g. "Feed Ash"'
              aria-label="Task description"
              className="w-full rounded-lg bg-black/50 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
              style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
            {sttSupported() && (
              <button onClick={() => vi.listening ? vi.stop() : vi.start()}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
                style={{
                  background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                  color: vi.listening ? "#fca5a5" : "#fde68a",
                  minHeight: 38,
                }}>
                <Mic size={11} aria-hidden="true" /> {vi.listening ? "STOP" : "SPEAK IT INSTEAD"}
              </button>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-amber-100/80 mb-1.5">CATEGORY</div>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                  className="px-3 py-2 rounded-md text-[12px] pressable touch-target flex items-center gap-1.5 justify-center"
                  style={{
                    background: category === c.id ? `${c.color}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${category === c.id ? c.color : "rgba(255,255,255,0.07)"}`,
                    color: category === c.id ? c.color : "#fde68a",
                    minHeight: 40,
                  }}>
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.3em] font-display text-amber-100/80 mb-1.5">WHEN?</div>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: "today" as When,    label: "Today" },
                { id: "week" as When,     label: "This week" },
                { id: "one-time" as When, label: "One-time" },
                { id: "daily" as When,    label: "Every day" },
                { id: "weekly" as When,   label: "Every week" },
              ]).map(w => (
                <button key={w.id} onClick={() => setWhen(w.id)}
                  aria-pressed={when === w.id}
                  className="px-3 py-2 rounded-md text-[12px] pressable touch-target"
                  style={{
                    background: when === w.id ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                    color: when === w.id ? ACCENT : "#fde68a",
                    border: `1px solid ${when === w.id ? ACCENT : "rgba(255,255,255,0.07)"}`,
                    minHeight: 40,
                  }}>{w.label}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-md text-[11px] font-display tracking-widest pressable touch-target" style={{ background: "rgba(255,255,255,0.06)", color: "#fde68a", border: "1px solid rgba(255,255,255,0.12)", minHeight: 48 }}>CANCEL</button>
            <button onClick={submit} disabled={!text.trim()} className="flex-1 px-4 py-3 rounded-md text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: ACCENT, color: "#1a1308", minHeight: 48 }}>SAVE TASK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Brief confetti burst — pure CSS/SVG, no extra deps. */
function ConfettiBurst({ keys, onDone }: { keys: number[]; onDone: (k: number) => void }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {keys.map(k => <Burst key={k} onDone={() => onDone(k)} />)}
    </div>
  );
}
function Burst({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(() => Array.from({ length: 28 }, () => ({
    angle: Math.random() * 360,
    dist: 60 + Math.random() * 160,
    color: ["#fde68a", "#86efac", "#fb923c", "#60a5fa", "#f472b6"][Math.floor(Math.random() * 5)],
    delay: Math.random() * 60,
  })), []);
  useEffect(() => { const t = setTimeout(onDone, 1400); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute" style={{ left: "50%", top: "50%" }}>
      {pieces.map((p, i) => (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle * Math.PI / 180) * p.dist,
            y: Math.sin(p.angle * Math.PI / 180) * p.dist + 120,
            opacity: 0, scale: 1, rotate: Math.random() * 540,
          }}
          transition={{ duration: 1.1, delay: p.delay / 1000, ease: "easeOut" }}
          className="absolute w-2 h-3 rounded-sm"
          style={{ background: p.color, transform: "translate(-50%, -50%)" }} />
      ))}
    </div>
  );
}
