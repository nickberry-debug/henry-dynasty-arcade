// V3 Training Camp landing — premium baseball card + weekly drill strip + big buttons.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../store";
import { TRAINING_ACHIEVEMENTS, createHenryPlayer, runDecay } from "../engine/trainingCamp";
import { DRILLS } from "../data/drills";
import { gainsLabel } from "../data/drillGains";
import { BaseballCard } from "../components/BaseballCard";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { Trophy, Calendar, BookOpen, Target, Zap, Award, TrendingUp, TrendingDown } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function TrainingCamp() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);

  // Auto-create Henry as a real player if not already done — uses the pre-loaded profile.
  // Idempotent: re-checks henryPlayerId inside mutate to survive React strict-mode
  // double-invocation and rapid nav.
  useEffect(() => {
    if (!league?.training) return;
    const t = league.training;
    if (!t.henryPlayerId && t.henryProfile) {
      mutate(lg => {
        // Inside mutate so we read the freshest state
        if (lg.training?.henryPlayerId) return;
        const profile = lg.training!.henryProfile;
        // Validate teamId still exists; fall back gracefully
        const desiredTeam = profile.teamId && lg.teams.find(tm => tm.id === profile.teamId)
          ? profile.teamId
          : (lg.userTeamId && lg.teams.find(tm => tm.id === lg.userTeamId) ? lg.userTeamId : lg.teams[0]?.id ?? null);
        createHenryPlayer(lg, {
          name: profile.name,
          bats: profile.bats,
          throws: profile.throws,
          age: profile.age,
          jersey: profile.jerseyNumber,
          teamId: desiredTeam
        });
      });
    }
    // Run decay on first visit (idempotent — uses timestamps)
    mutate(lg => { runDecay(lg); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league?.training?.henryPlayerId]);

  if (!league?.training) return null;
  const t = league.training;
  const henry = league.players.find(p => p.id === t.henryPlayerId) ?? league.freeAgents.find(p => p.id === t.henryPlayerId) ?? null;
  const todayDOW = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayKey = new Date().toISOString().slice(0, 10);
  const doneToday = new Set(t.scheduleCompleted[todayKey] ?? []);

  // Drill of the day (deterministic per date)
  const dotd = DRILLS[(new Date().getDate() + (t.totalSwings % 7)) % DRILLS.length];

  // Weekly OVR delta
  const weeklyDelta = computeWeeklyDelta(league);

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <header>
        <div className="text-[11px] text-ink-200 uppercase tracking-widest">Practice & Improve</div>
        <h1 className="font-display text-4xl">TRAINING CAMP</h1>
        <div className="text-sm text-ink-200 mt-1">Hi {t.henryProfile.name}! Real practice. Real progress.</div>
      </header>

      {/* WEEKLY DRILLS STRIP — sticky-ish horizontal scroll */}
      <div className="glass rounded-2xl p-3 card-elevated">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] text-ink-300 uppercase tracking-widest font-display">This Week</span>
          <Link to="/training/schedule" className="text-[11px] text-accent pressable">Full schedule →</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DAYS.map(day => {
            const plan = t.weeklyTemplate.find(d => d.day === day);
            const isToday = day === todayDOW;
            const drills = plan?.drills ?? [];
            const allDone = drills.length > 0 && drills.every(id => doneToday.has(id));
            return (
              <Link
                key={day}
                to="/training/schedule"
                className={`shrink-0 rounded-xl p-2.5 min-w-[110px] pressable touch-target ${isToday ? "bg-accent/20 border border-accent/50" : "bg-white/3 border border-white/5"}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-[10px] font-display tracking-widest ${isToday ? "text-accent" : "text-ink-300"}`}>{day.slice(0, 3).toUpperCase()}</span>
                  {allDone ? <span className="text-emerald-400 text-xs">✓</span> : drills.length === 0 ? <span className="text-xs">💤</span> : <span className="text-xs">📋</span>}
                </div>
                <div className="text-[10px] text-ink-100 line-clamp-2">
                  {drills.length === 0 ? (day === "Saturday" ? "Live Game" : day === "Sunday" ? "Choice" : "Rest") : drills.map(id => DRILLS.find(d => d.id === id)?.emoji).join(" ")}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* BASEBALL CARD — hero */}
      <BaseballCard henry={henry} />

      {/* OVERALL RATING + WEEKLY DELTA */}
      {henry && (
        <div className="glass rounded-2xl p-5 text-center card-elevated relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at center, #fbbf24 0%, transparent 60%)" }} />
          <div className="relative">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">Overall</div>
            <div className="font-display leading-none text-7xl text-accent">
              <AnimatedNumber value={henry.overall} />
            </div>
            {weeklyDelta !== 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`text-sm mt-2 inline-flex items-center gap-1 ${weeklyDelta > 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {weeklyDelta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {weeklyDelta > 0 ? "+" : ""}{weeklyDelta.toFixed(1)} this week
              </motion.div>
            )}
            <div className="text-[10px] text-ink-300 mt-1">Streak: 🔥 {t.practiceStreakDays} days</div>
          </div>
        </div>
      )}

      {/* BIG ACTION TILES */}
      <div className="grid grid-cols-2 gap-3">
        <BigTile to="/training/hit" emoji="🥎" title="HITTING" subtitle="Tap-zone swing logger" color="from-emerald-500/40" />
        <BigTile to="/training/pitch" emoji="⚾" title="PITCHING" subtitle="Strike zone + speed gun" color="from-sky-500/40" />
      </div>

      {/* SECONDARY ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SmallTile to="/training/drills" icon={<BookOpen size={18}/>} title="Drill Library" badge={`${DRILLS.length}`} />
        <SmallTile to="/training/arsenal" icon={<Target size={18}/>} title="Pitch Arsenal" badge="8" />
        <SmallTile to="/training/schedule" icon={<Calendar size={18}/>} title="Weekly Plan" />
        <SmallTile to="/training/live" icon={<Zap size={18}/>} title="Live Game" />
        <SmallTile to="/training/achievements" icon={<Award size={18}/>} title="Achievements" badge={`${t.achievementsUnlocked.length}/${TRAINING_ACHIEVEMENTS.length}`} />
        <SmallTile to="/training/profile" icon={<Trophy size={18}/>} title="Edit Profile" />
      </div>

      {/* DRILL OF THE DAY */}
      <div className="glass rounded-2xl p-5 card-elevated">
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-accent" />
          <span className="text-[10px] text-ink-300 uppercase tracking-widest font-display">Drill of the Day</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-5xl shrink-0">{dotd.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl">{dotd.name}</div>
            <div className="text-xs text-emerald-300 font-display tracking-wide my-1">{gainsLabel(dotd.id)}</div>
            <div className="text-xs text-ink-200 line-clamp-2">{dotd.purpose}</div>
            <Link to="/training/drills" className="inline-block mt-2 px-4 py-2 rounded-xl bg-accent text-ink-950 text-sm font-display tracking-wider pressable touch-target">Open Drill</Link>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Swings" value={t.totalSwings} />
        <StatTile label="Pitches" value={t.totalPitches} />
        <StatTile label="Crushed" value={t.totalCrushedHits} />
        <StatTile label="Painted" value={t.totalPaintedCorners} />
      </div>
    </div>
  );
}

function BigTile({ to, emoji, title, subtitle, color }: { to: string; emoji: string; title: string; subtitle: string; color: string }) {
  return (
    <Link to={to} className="glass rounded-2xl p-5 relative overflow-hidden pressable touch-target min-h-[140px] flex flex-col justify-end card-elevated">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} to-transparent opacity-60`} />
      <div className="relative">
        <div className="text-5xl mb-1">{emoji}</div>
        <div className="font-display tracking-widest text-lg">{title}</div>
        <div className="text-[11px] text-ink-200">{subtitle}</div>
      </div>
    </Link>
  );
}

function SmallTile({ to, icon, title, badge }: { to: string; icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <Link to={to} className="glass rounded-xl p-3 flex items-center gap-2 pressable touch-target">
      <span className="text-accent">{icon}</span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      {badge && <span className="text-[10px] text-ink-300">{badge}</span>}
    </Link>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <div className="text-[9px] text-ink-300 uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl text-accent"><AnimatedNumber value={value} /></div>
    </div>
  );
}

function computeWeeklyDelta(league: any): number {
  const t = league.training;
  const henry = league.players.find((p: any) => p.id === t?.henryPlayerId);
  if (!henry) return 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (t?.weeklySnapshots ?? []).filter((w: any) => w.weekStart >= sevenDaysAgo);
  if (recent.length === 0) {
    const recentSessions = (t?.sessions ?? []).filter((s: any) => s.t >= sevenDaysAgo);
    if (recentSessions.length === 0) return 0;
    return Math.min(5, recentSessions.length * 0.3);
  }
  return recent.reduce((s: number, w: any) => s + w.ovrDelta, 0);
}
