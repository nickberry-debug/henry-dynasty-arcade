// V3 Section 2 — Premium baseball card. Holographic foil shine, photo upload,
// flip-on-tap to see back with attribute bars + weekly deltas.
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { Player } from "../store/types";
import { Camera, Upload, Settings as Cog } from "lucide-react";

interface Props {
  henry: Player | null;
}

export function BaseballCard({ henry }: Props) {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const profile = league?.training?.henryProfile;
  const [flipped, setFlipped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!league || !profile) return null;

  const team = profile.teamId ? league.teams.find(t => t.id === profile.teamId) : null;
  const primary = team?.primary ?? "#1e3a8a";
  const secondary = team?.secondary ?? "#fbbf24";
  const accent = team?.accent ?? "#ffffff";

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      // Downsize to keep IndexedDB happy
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const small = canvas.toDataURL("image/jpeg", 0.78);
        await mutate(lg => {
          if (lg.training) {
            lg.training.henryProfile.photoDataUrl = small;
            lg.training.henryProfile.modifiedAt = Date.now();
          }
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const isRookie = Date.now() - profile.createdAt < 30 * 24 * 60 * 60 * 1000;
  const ovr = henry?.overall ?? 36;
  const weeklyDelta = computeWeeklyOvrDelta(league);

  const tagText = ovr >= 90 ? "HALL OF FAMER" : ovr >= 80 ? "STAR" : isRookie ? "ROOKIE CARD" : null;
  const tagColor = ovr >= 90 ? "#fde68a" : ovr >= 80 ? "#e5e7eb" : "#fbbf24";

  return (
    <div className="relative perspective-card max-w-sm mx-auto">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full aspect-[3/4]"
      >
        {/* FRONT */}
        <div
          onClick={() => setFlipped(true)}
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer card-elevated"
          style={{
            backfaceVisibility: "hidden",
            background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 50%, ${secondary}66 100%)`,
            border: `3px solid ${secondary}`
          }}
        >
          {/* Holographic shine sweep */}
          <div className="absolute inset-0 holo-shine pointer-events-none" />
          {/* Tag */}
          {tagText && (
            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md text-[10px] font-display tracking-widest" style={{ background: tagColor, color: "#0a0d13" }}>
              {tagText}
            </div>
          )}
          {/* Position badge */}
          <div className="absolute top-2 right-2 z-10 w-12 h-12 rounded-full flex items-center justify-center font-display text-xs" style={{ background: accent, color: primary }}>
            {profile.position}
          </div>
          {/* Photo area */}
          <div className="relative h-2/3 m-3 mb-2 rounded-xl overflow-hidden bg-black/40 border-2 border-white/20">
            {profile.photoDataUrl ? (
              <img src={profile.photoDataUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 pressable touch-target"
              >
                <Camera size={36} />
                <span className="text-xs font-display tracking-widest">Tap to upload photo</span>
              </button>
            )}
            {/* Jersey number watermark over photo */}
            <div
              className="absolute right-2 bottom-2 font-display leading-none pointer-events-none"
              style={{ color: accent, fontSize: "44px", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
            >
              {profile.jerseyNumber}
            </div>
          </div>
          {/* Name + OVR */}
          <div className="px-4 pb-3 text-white">
            <div className="font-display text-2xl tracking-wide leading-none" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {profile.name.toUpperCase()}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[10px] opacity-90 tracking-widest">OVR</span>
              <span className="font-display text-5xl leading-none" style={{ color: secondary }}>{ovr}</span>
            </div>
            {weeklyDelta !== 0 && (
              <div className={`text-xs mt-1 ${weeklyDelta > 0 ? "text-emerald-300" : "text-red-300"}`}>
                {weeklyDelta > 0 ? "↑" : "↓"} {Math.abs(weeklyDelta).toFixed(1)} this week
              </div>
            )}
            <div className="text-[10px] opacity-75 mt-1">
              {Math.floor(profile.heightInches / 12)}'{profile.heightInches % 12}" · {profile.weightLbs} lbs · {profile.hometown}
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          onClick={() => setFlipped(false)}
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer card-elevated"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${primary}, ${primary}88 60%, #0a0d13)`,
            border: `3px solid ${secondary}`
          }}
        >
          <div className="p-4 text-white text-xs space-y-2 overflow-y-auto h-full">
            <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
              <span className="font-display text-base">{profile.name.toUpperCase()} #{profile.jerseyNumber}</span>
              <span className="font-display text-2xl" style={{ color: secondary }}>{ovr}</span>
            </div>
            {henry && <RatingBars henry={henry} secondary={secondary} />}
            <div className="border-t border-white/20 pt-1.5 mt-2 text-[10px] opacity-85 space-y-0.5">
              <div>Bats: {profile.bats} · Throws: {profile.throws}</div>
              <div>Age {profile.age} · Position {profile.position}</div>
              <div>Achievements: {league.training?.achievementsUnlocked.length ?? 0}</div>
              <div>Practice streak: {league.training?.practiceStreakDays ?? 0} days</div>
              <div>Total swings: {league.training?.totalSwings ?? 0} · pitches: {league.training?.totalPitches ?? 0}</div>
            </div>
            <div className="text-center text-[10px] text-white/60 mt-2">Tap to flip back</div>
          </div>
        </div>
      </motion.div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      <div className="flex gap-2 mt-3 justify-center">
        <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg bg-white/5 text-xs pressable touch-target flex items-center gap-1">
          <Upload size={12} /> {profile.photoDataUrl ? "Change Photo" : "Add Photo"}
        </button>
        <Link to="/training/profile" className="px-3 py-2 rounded-lg bg-white/5 text-xs pressable touch-target flex items-center gap-1">
          <Cog size={12} /> Edit Card
        </Link>
      </div>
    </div>
  );
}

function computeWeeklyOvrDelta(league: any): number {
  const t = league.training;
  if (!t) return 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = t.weeklySnapshots.filter((w: any) => w.weekStart >= sevenDaysAgo);
  if (recent.length === 0) {
    // Approximate from session form-score trajectory or just zero
    const recentSessions = (t.sessions ?? []).filter((s: any) => s.t >= sevenDaysAgo);
    if (recentSessions.length === 0) return 0;
    return Math.min(5, recentSessions.length * 0.3);
  }
  return recent.reduce((s: number, w: any) => s + w.ovrDelta, 0);
}

function RatingBars({ henry, secondary }: { henry: Player; secondary: string }) {
  const rows: Array<[string, number]> = [
    ["Contact", Math.round((henry.ratings.contactL + henry.ratings.contactR) / 2)],
    ["Power",   Math.round((henry.ratings.powerL + henry.ratings.powerR) / 2)],
    ["Vision",  henry.ratings.vision],
    ["Speed",   henry.ratings.speed],
    ["Fielding",henry.ratings.fielding],
    ["Arm",     henry.ratings.arm],
    ["Velocity",henry.ratings.pitches?.[0]?.velo ?? 0],
    ["Control", henry.ratings.pitches?.[0]?.ctrl ?? 0],
    ["Stamina", henry.ratings.stamina]
  ];
  return (
    <div className="space-y-1">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2 text-[10px]">
          <span className="w-16 opacity-80">{label}</span>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full" style={{ width: `${Math.min(100, v)}%`, background: `linear-gradient(90deg, ${secondary}, #fff)` }} />
          </div>
          <span className="w-6 text-right font-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}
