// FitCoach — AI-generated daily workout plan for Henry.
// Pulls age/weight from baseball training profile if available;
// otherwise uses a simple onboarding form. Plan stored in localStorage.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, CheckCircle2, Circle, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { hasAnthropicKey, getAnthropicKey } from "../../arcade/keys";

const PROFILE_KEY = "dd_resources_fitcoach_profile";
const HISTORY_KEY = "dd_resources_fitcoach_history";
const ACCENT = "#4ADE80";

interface Profile {
  name: string;
  age: number;
  weightLbs: number;
  level: "beginner" | "intermediate" | "advanced";
}

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  note?: string;
  category: "warmup" | "main" | "cooldown";
}

interface DayPlan {
  date: string;
  focus: string;
  exercises: Exercise[];
  completed: Set<string>;
  generatedAt: number;
}

interface SerializedDayPlan {
  date: string;
  focus: string;
  exercises: Exercise[];
  completed: string[];
  generatedAt: number;
}

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadTodayPlan(): DayPlan | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const arr: SerializedDayPlan[] = JSON.parse(raw);
    const today = arr.find(d => d.date === todayStr());
    if (!today) return null;
    return { ...today, completed: new Set(today.completed) };
  } catch { return null; }
}

function savePlan(plan: DayPlan) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr: SerializedDayPlan[] = raw ? JSON.parse(raw) : [];
    const idx = arr.findIndex(d => d.date === plan.date);
    const serialized: SerializedDayPlan = { ...plan, completed: [...plan.completed] };
    if (idx >= 0) arr[idx] = serialized;
    else arr.unshift(serialized);
    // Keep last 30 days
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 30)));
  } catch {}
}

function loadStreak(): number {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return 0;
    const arr: { date: string; completed: string[] }[] = JSON.parse(raw);
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const entry = arr.find(x => x.date === dStr);
      if (entry && entry.completed.length > 0) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch { return 0; }
}

function parseExercises(text: string): Exercise[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Try to extract JSON array from text
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return [];
}

export default function FitCoach() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [plan, setPlan] = useState<DayPlan | null>(loadTodayPlan);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [streak, setStreak] = useState(loadStreak);
  const [expanded, setExpanded] = useState<"warmup" | "main" | "cooldown" | null>("main");

  // Form state
  const [fName, setFName] = useState(profile?.name ?? "Henry");
  const [fAge, setFAge] = useState(profile?.age ?? 12);
  const [fWeight, setFWeight] = useState(profile?.weightLbs ?? 100);
  const [fLevel, setFLevel] = useState<Profile["level"]>(profile?.level ?? "beginner");

  useEffect(() => {
    // Try to pull from baseball training if no profile set
    if (!profile) {
      try {
        const stored = localStorage.getItem("dexie_baseball_league");
        if (stored) {
          const lg = JSON.parse(stored);
          const p = lg?.training?.henryProfile;
          if (p?.age) {
            setFAge(p.age);
            setFName(p.name ?? "Henry");
            setFWeight(p.weightLbs ?? 100);
          }
        }
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSetup = () => {
    const p: Profile = { name: fName.trim() || "Henry", age: fAge, weightLbs: fWeight, level: fLevel };
    setProfile(p);
    saveProfile(p);
    setShowSetup(false);
  };

  const generatePlan = async () => {
    if (!profile) { setShowSetup(true); return; }
    setLoading(true);
    const key = getAnthropicKey();
    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const prompt = `You are FitCoach, an enthusiastic youth fitness coach designing a workout for a ${profile.age}-year-old baseball player named ${profile.name} (${profile.weightLbs} lbs, ${profile.level} level). Today is ${todayName}.

Create a fun, age-appropriate daily workout. Return ONLY a JSON array of exercise objects with this exact shape:
[
  { "id": "w1", "name": "Jumping Jacks", "reps": "30", "category": "warmup", "note": "Get the blood pumping!" },
  { "id": "m1", "name": "Push-Ups", "sets": 3, "reps": "10", "category": "main", "note": "Keep your back straight" },
  { "id": "c1", "name": "Standing Quad Stretch", "duration": "30 sec each leg", "category": "cooldown" }
]

Rules:
- category must be "warmup", "main", or "cooldown"
- 3-5 warmup exercises, 5-8 main exercises, 3-4 cooldown stretches
- Age-appropriate: fun names, encouraging notes, nothing dangerous
- For a baseball player: include rotational movements, arm care, leg power
- Vary the workout from a generic routine (${todayName} focus)

Also add a "focus" field at the top level as the first array element's parent — actually, return this shape:
{"focus": "Upper Body Power + Arm Care", "exercises": [...array as above...]}`;

    let exercises: Exercise[] = [];
    let focus = "Full Body";

    if (key) {
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
            max_tokens: 900,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.content?.[0]?.text ?? "";
          // Try to parse as {"focus":..., "exercises":[...]}
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              focus = parsed.focus ?? focus;
              exercises = parsed.exercises ?? parseExercises(text);
            }
          } catch {
            exercises = parseExercises(text);
          }
        }
      } catch {}
    }

    // Fallback plan
    if (!exercises.length) {
      focus = `${todayName} Training`;
      exercises = [
        { id: "w1", name: "Jumping Jacks", reps: "30", category: "warmup", note: "Shake out the sleepiness!" },
        { id: "w2", name: "Arm Circles", reps: "15 each direction", category: "warmup", note: "Small circles → big circles" },
        { id: "w3", name: "High Knees", reps: "20 steps", category: "warmup" },
        { id: "m1", name: "Push-Ups", sets: 3, reps: "10", category: "main", note: "Keep your body straight like a plank" },
        { id: "m2", name: "Squats", sets: 3, reps: "15", category: "main", note: "Sit back like you're in a chair" },
        { id: "m3", name: "Lunges", sets: 2, reps: "10 each leg", category: "main" },
        { id: "m4", name: "Band Pull-Aparts", sets: 3, reps: "15", category: "main", note: "Arm care! Pretend you have a band" },
        { id: "m5", name: "Core Rotations", sets: 2, reps: "12 each side", category: "main", note: "Like a baseball swing — use your hips!" },
        { id: "c1", name: "Standing Hamstring Stretch", duration: "30 sec each", category: "cooldown" },
        { id: "c2", name: "Shoulder Cross-Body Stretch", duration: "20 sec each", category: "cooldown" },
        { id: "c3", name: "Child's Pose", duration: "45 seconds", category: "cooldown" },
      ];
    }

    const newPlan: DayPlan = {
      date: todayStr(),
      focus,
      exercises,
      completed: new Set(),
      generatedAt: Date.now(),
    };
    setPlan(newPlan);
    savePlan(newPlan);
    setStreak(loadStreak());
    setLoading(false);
  };

  const toggleExercise = (id: string) => {
    if (!plan) return;
    const next = new Set(plan.completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const updated = { ...plan, completed: next };
    setPlan(updated);
    savePlan(updated);
    setStreak(loadStreak());
  };

  const sections: { key: "warmup" | "main" | "cooldown"; label: string; emoji: string }[] = [
    { key: "warmup", label: "Warm-Up", emoji: "🔥" },
    { key: "main", label: "Main Workout", emoji: "💪" },
    { key: "cooldown", label: "Cool-Down", emoji: "🧘" },
  ];

  const totalExercises = plan?.exercises.length ?? 0;
  const doneCount = plan?.completed.size ?? 0;
  const pct = totalExercises > 0 ? Math.round((doneCount / totalExercises) * 100) : 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #081a10 0%, #030a06 100%)",
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
          <div className="font-display text-2xl tracking-widest">💪 FITCOACH</div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-display"
              style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: ACCENT }}>
              <Flame size={12} /> {streak}
            </div>
          )}
          <button
            onClick={() => { setFName(profile?.name ?? "Henry"); setFAge(profile?.age ?? 12); setFWeight(profile?.weightLbs ?? 100); setFLevel(profile?.level ?? "beginner"); setShowSetup(true); }}
            className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center pressable touch-target text-[11px] font-display"
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {profile ? "✏️" : "⚙️"}
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 max-w-xl mx-auto w-full space-y-4">

        {/* Setup modal */}
        <AnimatePresence>
          {showSetup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={e => { if (e.target === e.currentTarget) setShowSetup(false); }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-6 space-y-4"
                style={{ background: "#0d1f13", border: "1px solid rgba(74,222,128,0.3)" }}
              >
                <div className="font-display text-lg" style={{ color: ACCENT }}>PROFILE SETUP</div>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-ink-300 mb-1">Name</div>
                  <input value={fName} onChange={e => setFName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm"
                    style={{ color: "white" }} placeholder="Henry" />
                </label>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-ink-300 mb-1">Age: {fAge}</div>
                  <input type="range" min={6} max={18} value={fAge} onChange={e => setFAge(+e.target.value)}
                    className="w-full" style={{ accentColor: ACCENT }} />
                </label>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-ink-300 mb-1">Weight: {fWeight} lbs</div>
                  <input type="range" min={50} max={250} value={fWeight} onChange={e => setFWeight(+e.target.value)}
                    className="w-full" style={{ accentColor: ACCENT }} />
                </label>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-ink-300 mb-2">Fitness Level</div>
                  <div className="flex gap-2">
                    {(["beginner", "intermediate", "advanced"] as const).map(l => (
                      <button key={l} onClick={() => setFLevel(l)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-display tracking-wide pressable touch-target capitalize"
                        style={{
                          background: fLevel === l ? ACCENT : "rgba(255,255,255,0.05)",
                          color: fLevel === l ? "#030a06" : "white",
                          border: fLevel === l ? "none" : "1px solid rgba(255,255,255,0.1)",
                          minHeight: 44, touchAction: "manipulation",
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowSetup(false)}
                    className="flex-1 py-3 rounded-xl text-sm pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.05)", minHeight: 44, touchAction: "manipulation" }}>
                    Cancel
                  </button>
                  <button onClick={saveSetup}
                    className="flex-1 py-3 rounded-xl text-sm font-display tracking-widest pressable touch-target"
                    style={{ background: ACCENT, color: "#030a06", minHeight: 44, touchAction: "manipulation" }}>
                    SAVE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No profile yet */}
        {!profile && !showSetup && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="text-6xl mb-4">💪</div>
            <div className="font-display text-xl mb-2" style={{ color: ACCENT }}>SET UP YOUR PROFILE</div>
            <div className="text-sm mb-6" style={{ color: "#9aa6bf" }}>Tell FitCoach your age and level so it can build the right workout.</div>
            <button
              onClick={() => setShowSetup(true)}
              className="px-8 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
              style={{ background: ACCENT, color: "#030a06", minHeight: 44, touchAction: "manipulation" }}>
              GET STARTED
            </button>
          </motion.div>
        )}

        {/* Profile exists — show plan or generate */}
        {profile && !showSetup && (
          <>
            {/* Profile chip */}
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: "#9aa6bf" }}>
                {profile.name} · Age {profile.age} · {profile.weightLbs} lbs · {profile.level}
              </div>
              {!hasAnthropicKey() && (
                <div className="text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(255,179,2,0.1)", border: "1px solid rgba(255,179,2,0.3)", color: "#ffd54a" }}>
                  Add API key for AI plans
                </div>
              )}
            </div>

            {/* Progress bar */}
            {plan && (
              <div className="rounded-xl p-4" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display text-sm tracking-widest" style={{ color: ACCENT }}>{plan.focus}</div>
                  <div className="text-sm font-display" style={{ color: ACCENT }}>{doneCount}/{totalExercises}</div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: ACCENT }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 80 }}
                  />
                </div>
                {pct === 100 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2 text-sm font-display" style={{ color: ACCENT }}>
                    🎉 Workout Complete!
                  </motion.div>
                )}
              </div>
            )}

            {/* Generate / Regenerate */}
            {!plan ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                <div className="text-5xl mb-3">📋</div>
                <div className="text-sm mb-4" style={{ color: "#9aa6bf" }}>No workout yet for today. Generate your plan!</div>
                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target"
                  style={{ background: ACCENT, color: "#030a06", minHeight: 44, touchAction: "manipulation", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "BUILDING…" : "GENERATE TODAY'S WORKOUT"}
                </button>
              </motion.div>
            ) : (
              <button
                onClick={generatePlan}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm pressable touch-target"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 44, touchAction: "manipulation", opacity: loading ? 0.6 : 1 }}>
                <RefreshCw size={14} style={{ color: ACCENT }} />
                <span style={{ color: ACCENT }}>{loading ? "Building new plan…" : "Regenerate plan"}</span>
              </button>
            )}

            {/* Exercise sections */}
            {plan && sections.map(sec => {
              const exes = plan.exercises.filter(e => e.category === sec.key);
              if (!exes.length) return null;
              const secDone = exes.filter(e => plan.completed.has(e.id)).length;
              const isOpen = expanded === sec.key;
              return (
                <div key={sec.key} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : sec.key)}
                    className="w-full flex items-center justify-between px-4 py-3.5 pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.04)", minHeight: 44, touchAction: "manipulation" }}>
                    <div className="flex items-center gap-2">
                      <span>{sec.emoji}</span>
                      <span className="font-display tracking-widest text-sm">{sec.label}</span>
                      <span className="text-[11px]" style={{ color: secDone === exes.length ? ACCENT : "#9aa6bf" }}>
                        {secDone}/{exes.length}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={16} style={{ color: "#9aa6bf" }} /> : <ChevronDown size={16} style={{ color: "#9aa6bf" }} />}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-2">
                          {exes.map(ex => {
                            const done = plan.completed.has(ex.id);
                            return (
                              <button
                                key={ex.id}
                                onClick={() => toggleExercise(ex.id)}
                                className="w-full text-left flex items-start gap-3 py-3 px-3 rounded-xl pressable touch-target"
                                style={{
                                  background: done ? "rgba(74,222,128,0.10)" : "rgba(255,255,255,0.03)",
                                  border: done ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.06)",
                                  minHeight: 52, touchAction: "manipulation",
                                }}>
                                <span className="mt-0.5 shrink-0" style={{ color: done ? ACCENT : "#9aa6bf" }}>
                                  {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium" style={{ color: done ? ACCENT : "white", textDecoration: done ? "line-through" : "none" }}>
                                    {ex.name}
                                  </div>
                                  <div className="text-[11px] mt-0.5" style={{ color: "#9aa6bf" }}>
                                    {ex.sets ? `${ex.sets} × ` : ""}{ex.reps ?? ex.duration ?? ""}
                                  </div>
                                  {ex.note && <div className="text-[11px] mt-1 italic" style={{ color: "#6a7d9a" }}>{ex.note}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
