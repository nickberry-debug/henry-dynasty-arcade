// Baseball Hub — the entry point when Henry picks baseball from the
// arcade. Lists the four mode cards: Franchise, Live Game, Training
// Camp, Score Keeper. Inside Franchise mode none of the other three
// are reachable; players exit via Save & Exit to come back here.
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Dumbbell, Edit3, Zap, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { listLeagues } from "../db/dexie";
import { ArcadeSettings } from "../arcade/ArcadeSettings";
import { hasAnthropicKey } from "../arcade/keys";

export default function BaseballHub() {
  const league = useStore(s => s.league);
  const navigate = useNavigate();
  const [savedCount, setSavedCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyOn, setKeyOn] = useState(hasAnthropicKey());

  useEffect(() => {
    listLeagues().then((rows: unknown[]) => setSavedCount(rows.length)).catch(() => {});
  }, [league?.id]);

  const userTeam = league?.teams.find(t => t.id === league?.userTeamId);
  const closeSettings = () => { setSettingsOpen(false); setKeyOn(hasAnthropicKey()); };

  return (
    <div className="min-h-screen safe-top safe-bottom" style={{ background: "linear-gradient(180deg, #0b1a2f 0%, #050a16 100%)" }}>
      <header className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/play")}
          className="rounded-full bg-white/5 flex items-center justify-center pressable touch-target"
          aria-label="Back to game picker"
          style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">BERRY KID'S ARCADE</div>
          <div className="font-display text-2xl tracking-widest">⚾ BASEBALL</div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full flex items-center justify-center pressable touch-target relative"
          aria-label="Arcade settings"
          style={{
            width: 44, height: 44, minWidth: 44, minHeight: 44, touchAction: "manipulation",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: keyOn ? "#ffb302" : "#9aa6bf",
          }}
        >
          <SettingsIcon size={18} />
          {!keyOn && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />}
        </button>
      </header>

      <div className="px-4 pb-8 max-w-2xl mx-auto space-y-3">
        <ModeCard
          emoji="🏟️"
          icon={<Trophy size={20} />}
          title="FRANCHISE MODE"
          body={league
            ? `Continue your ${userTeam?.name ?? "team"} — Year ${league.year} · ${userTeam ? `${userTeam.wins}-${userTeam.losses}` : ""}`
            : savedCount > 0
              ? `${savedCount} saved franchise${savedCount === 1 ? "" : "s"} — pick a slot to continue`
              : "Manage a team across seasons. Draft, sign, trade, win."}
          tint="#ffb302"
          onClick={() => navigate(league ? "/dashboard" : "/title")}
          primary
        />
        <ModeCard
          emoji="⚾"
          icon={<Zap size={20} />}
          title="LIVE GAME"
          body="Play a single interactive game. Pitch and bat every player."
          tint="#60a5fa"
          onClick={() => navigate("/live")}
        />
        <ModeCard
          emoji="🏋️"
          icon={<Dumbbell size={20} />}
          title="TRAINING CAMP"
          body="Henry's personal practice tools — hit, pitch, drills."
          tint="#34d399"
          onClick={() => navigate("/training")}
        />
        <ModeCard
          emoji="📝"
          icon={<Edit3 size={20} />}
          title="SCORE KEEPER"
          body="Track a real-world game."
          tint="#f472b6"
          onClick={() => navigate("/score")}
        />
      </div>

      {settingsOpen && <ArcadeSettings onClose={closeSettings} />}
    </div>
  );
}

function ModeCard({
  emoji, icon, title, body, tint, onClick, primary,
}: {
  emoji: string; icon: React.ReactNode; title: string; body: string; tint: string;
  onClick: () => void; primary?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 pressable touch-target flex items-center gap-4 min-h-[88px]"
      style={{
        background: primary
          ? `linear-gradient(135deg, ${tint}33, rgba(15,25,45,0.85))`
          : "linear-gradient(135deg, rgba(20,30,55,0.65), rgba(8,15,28,0.85))",
        border: `1px solid ${tint}66`,
        boxShadow: primary ? `0 12px 40px ${tint}33` : "0 6px 20px rgba(0,0,0,0.4)",
        touchAction: "manipulation",
      }}
    >
      <div className="text-4xl shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="font-display tracking-widest text-lg" style={{ color: tint }}>{title}</div>
        <div className="text-[12px] text-ink-100 mt-1 leading-snug">{body}</div>
      </div>
      <div className="shrink-0" style={{ color: tint }}>{icon}</div>
    </motion.button>
  );
}
