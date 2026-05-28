// Weekly schedule view: this week + next week, drag-free checkbox model.
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { DRILLS } from "../data/drills";
import { markScheduleDone } from "../engine/trainingCamp";
import { ArrowLeft, Check, Circle } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function TrainingSchedule() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const t = league.training!;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todayDOW = today.toLocaleDateString("en-US", { weekday: "long" });
  const completedToday = new Set(t.scheduleCompleted[todayKey] ?? []);

  const toggle = async (drillId: string) => {
    if (completedToday.has(drillId)) return; // can't un-complete (avoids race with achievement)
    await mutate(lg => { markScheduleDone(lg, drillId); });
  };

  const weekFor = (offsetWeeks: number): Date[] => {
    const monday = new Date(today);
    const offset = (today.getDay() + 6) % 7; // days since Monday
    monday.setDate(today.getDate() - offset + offsetWeeks * 7);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const thisWeek = weekFor(0);
  const nextWeek = weekFor(1);

  return (
    <div className="space-y-5 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Practice</div>
          <h1 className="font-display text-3xl">📅 WEEKLY PLAN</h1>
        </div>
      </header>

      <WeekTable days={DAYS} dates={thisWeek} template={t.weeklyTemplate} completed={t.scheduleCompleted} todayKey={todayKey} todayDOW={todayDOW} onToggle={toggle} label="THIS WEEK" />
      <WeekTable days={DAYS} dates={nextWeek} template={t.weeklyTemplate} completed={t.scheduleCompleted} todayKey={todayKey} todayDOW={todayDOW} onToggle={toggle} label="NEXT WEEK" />

      <div className="glass rounded-2xl p-4">
        <div className="font-display tracking-wide text-base mb-2">Real-life tips</div>
        <ul className="text-sm space-y-1.5 text-ink-100 list-disc list-inside">
          <li>Warm up first: 10 jumping jacks, 10 arm circles, 10 toe touches.</li>
          <li>Drink water during practice.</li>
          <li>Pitching arms need rest — never throw hard 2 days in a row.</li>
          <li>Quality &gt; Quantity. 15 focused swings beats 50 lazy ones.</li>
          <li>If something hurts (real pain, not soreness), STOP. Tell a grown-up.</li>
          <li>Eat protein after practice — chocolate milk works great.</li>
          <li>9–11 hours of sleep at your age.</li>
          <li>Practice with a goal: "Get better at hip rotation today."</li>
        </ul>
      </div>
    </div>
  );
}

function WeekTable({ days, dates, template, completed, todayKey, todayDOW, onToggle, label }: any) {
  return (
    <div>
      <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-2 px-1">{label}</div>
      <div className="space-y-2">
        {days.map((day: string, i: number) => {
          const plan = template.find((p: any) => p.day === day);
          const date = dates[i];
          const key = date.toISOString().slice(0, 10);
          const completedHere = completed[key] ?? [];
          const isToday = key === todayKey;
          return (
            <div key={day} className={`glass rounded-xl p-3 ${isToday ? "border border-accent/40" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-display tracking-wide text-base">{day}</span>
                  {isToday && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent text-ink-950 font-bold">TODAY</span>}
                </div>
                <span className="text-[11px] text-ink-300">{date.getMonth() + 1}/{date.getDate()}</span>
              </div>
              {plan && plan.drills.length > 0 ? (
                <div className="space-y-1">
                  {plan.drills.map((id: string) => {
                    const d = DRILLS.find(x => x.id === id);
                    if (!d) return null;
                    const done = completedHere.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => isToday && onToggle(id)}
                        disabled={!isToday}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left pressable touch-target ${done ? "bg-emerald-500/10" : "bg-white/3"} ${!isToday ? "opacity-60" : ""}`}
                      >
                        {done ? <Check size={16} className="text-emerald-400" /> : <Circle size={16} className="text-ink-300" />}
                        <span className="text-lg">{d.emoji}</span>
                        <span className="flex-1 text-sm">{d.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-ink-300 italic">{plan?.day === "Saturday" ? "Live Game day" : plan?.day === "Sunday" ? "Coach's Choice" : "Flex day"}</div>
              )}
              {plan?.tip && <div className="mt-2 text-[11px] text-amber-200 italic">💡 {plan.tip}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
