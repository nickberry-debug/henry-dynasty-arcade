// Football Hub — entry point when Henry picks football from the arcade.
// Three mode cards: Franchise (the meat), Live Game (single
// interactive game), Quick Tournament (single-elimination bracket).
// Inside the franchise none of these are reachable; players exit via
// Save & Exit to come back here.
import { useNavigate } from "react-router-dom";
import { useFootball, listFootballLeagues } from "../store";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Zap, Swords, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";
import { hasAnthropicKey } from "../../arcade/keys";

export default function FootballHub() {
  const league = useFootball(s => s.league);
  const hydrated = useFootball(s => s.hydrated);
  const loadFromDb = useFootball(s => s.loadFromDb);
  const navigate = useNavigate();
  const [savedCount, setSavedCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyOn, setKeyOn] = useState(hasAnthropicKey());

  useEffect(() => { if (!hydrated) loadFromDb(); }, [hydrated]);
  useEffect(() => { listFootballLeagues().then(rows => setSavedCount(rows.length)).catch(() => {}); }, [league?.id]);

  const userTeam = league?.teams.find(t => t.id === league?.userTeamId);
  const closeSettings = () => { setSettingsOpen(false); setKeyOn(hasAnthropicKey()); };

  return (
    <div className="min-h-screen safe-top safe-bottom" style={{ background: "linear-gradient(180deg, #1A2526 0%, #050a10 100%)" }}>
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
          <div className="font-display text-2xl tracking-widest">🏈 FOOTBALL</div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full flex items-center justify-center pressable touch-target relative"
          aria-label="Arcade settings"
          style={{
            width: 44, height: 44, minWidth: 44, minHeight: 44, touchAction: "manipulation",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: keyOn ? "#FFB81C" : "#9aa6bf",
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
            ? `Continue your ${userTeam?.name ?? "team"} — ${league.season}, Week ${league.week} · ${userTeam ? `${userTeam.wins}-${userTeam.losses}` : ""}`
            : savedCount > 0
              ? `${savedCount} saved franchise${savedCount === 1 ? "" : "s"} — pick a slot to continue`
              : "Manage a team across seasons. Draft, sign, trade, win the Lombardi."}
          tint="#FFB81C"
          onClick={() => navigate("/football")}
          primary
        />
        <ModeCard
          emoji="🏈"
          icon={<Zap size={20} />}
          title="LIVE GAME"
          body="Play a single interactive game. Call plays on offense and defense."
          tint="#60a5fa"
          comingSoon
        />
        <ModeCard
          emoji="🏆"
          icon={<Swords size={20} />}
          title="QUICK TOURNAMENT"
          body="Single-elimination bracket. Pick a team and run the gauntlet."
          tint="#34d399"
          comingSoon
        />
      </div>

      {settingsOpen && <ArcadeSettings onClose={closeSettings} />}
    </div>
  );
}

function ModeCard({
  emoji, icon, title, body, tint, onClick, primary, comingSoon,
}: {
  emoji: string; icon: React.ReactNode; title: string; body: string; tint: string;
  onClick?: () => void; primary?: boolean; comingSoon?: boolean;
}) {
  // Coming-soon mode: render the card as a visually-disabled preview
  // div instead of a button. No alert(), no click handler — Henry can
  // see what's coming without being interrupted by a modal.
  if (comingSoon) {
    return (
      <div
        className="w-full text-left rounded-2xl p-5 flex items-center gap-4 min-h-[88px] relative cursor-default select-none"
        style={{
          background: "linear-gradient(135deg, rgba(25,35,45,0.55), rgba(8,12,18,0.75))",
          border: `1px dashed ${tint}55`,
          opacity: 0.55,
        }}
      >
        <div className="text-4xl shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display tracking-widest text-lg" style={{ color: tint }}>{title}</div>
          <div className="text-[12px] text-ink-200 mt-1 leading-snug">{body}</div>
        </div>
        <div className="shrink-0" style={{ color: tint, opacity: 0.6 }}>{icon}</div>
        <div className="absolute top-2 right-2 text-[8px] tracking-widest font-display px-2 py-0.5 rounded-full" style={{ background: tint, color: "#0a0a14", fontWeight: 700 }}>
          COMING SOON
        </div>
      </div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 pressable touch-target flex items-center gap-4 min-h-[88px] relative"
      style={{
        background: primary
          ? `linear-gradient(135deg, ${tint}33, rgba(15,25,32,0.85))`
          : "linear-gradient(135deg, rgba(25,35,45,0.65), rgba(8,12,18,0.85))",
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
