// Training Camp achievements grid (55 medals).
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { TRAINING_ACHIEVEMENTS } from "../engine/trainingCamp";
import { ArrowLeft, Lock } from "lucide-react";

export default function TrainingAchievements() {
  const league = useStore(s => s.league)!;
  const t = league.training!;
  const unlocked = new Set(t.achievementsUnlocked);
  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Training</div>
          <h1 className="font-display text-3xl">🏅 ACHIEVEMENTS</h1>
          <div className="text-sm text-ink-200 mt-1">{unlocked.size} / {TRAINING_ACHIEVEMENTS.length} unlocked</div>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TRAINING_ACHIEVEMENTS.map(a => {
          const got = unlocked.has(a.id);
          return (
            <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${got ? "border-amber-400/40 bg-amber-400/5" : "border-white/5 bg-white/5"}`}>
              <div className={`text-3xl ${got ? "" : "opacity-30 grayscale"}`}>{got ? a.icon : <Lock size={22} />}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${got ? "" : "text-ink-300"}`}>{a.name}</div>
                <div className="text-[11px] text-ink-300">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
