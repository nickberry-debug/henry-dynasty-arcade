// Pregame matchup intro — 4-step sequence that runs before a game opens.
// Steps auto-advance (≈3s each, skip-tap to advance instantly) except the
// "Pick Mode" step which waits for the user's choice. Wraps the three
// existing playback paths (live game / watched sim / auto sim) in a
// premium matchup card so the player feels like they're stepping into a
// real broadcast instead of jumping straight into a modal.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { TeamLogo } from "./TeamLogo";
import { PlayerPortrait } from "./PlayerPortrait";
import type { League, Game, Team, Player } from "../store/types";

export type GameMode = "play" | "watch" | "auto";

const STEP_MS = 2600;

interface Props {
  league: League;
  game: Game;
  onClose: () => void;
  onChooseMode: (mode: GameMode) => void;
}

export function Pregame({ league, game, onClose, onChooseMode }: Props) {
  const home = league.teams.find(t => t.id === game.homeId)!;
  const away = league.teams.find(t => t.id === game.awayId)!;
  const userTeamId = league.userTeamId;
  const userIsHome = userTeamId === home.id;
  const userIsAway = userTeamId === away.id;
  const userIsInGame = userIsHome || userIsAway;

  const homeSP = pickStartingPitcher(league, home.id);
  const awaySP = pickStartingPitcher(league, away.id);

  const [step, setStep] = useState(0); // 0: matchup, 1: pitchers, 2: lineup, 3: mode, 4: splash

  // Auto-advance — except on step 3 (mode picker).
  useEffect(() => {
    if (step === 3) return;
    if (step >= 4) return;
    const t = setTimeout(() => setStep(step + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  const skip = () => {
    if (step === 3) return; // wait for explicit choice
    setStep(Math.min(step + 1, 4));
  };

  const choose = (mode: GameMode) => {
    setStep(4);
    // Small splash delay so PLAY BALL flashes briefly before transition.
    setTimeout(() => onChooseMode(mode), 750);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onPointerDown={skip}
      style={{
        background: `radial-gradient(800px 600px at 50% 30%, ${home.primary ?? "#1f2937"}40, rgba(5,8,15,0.98))`,
        touchAction: "manipulation",
      }}
    >
      {/* Close (X) — top-right, doesn't trigger skip */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white pressable touch-target flex items-center justify-center"
        aria-label="Cancel"
      >
        <X size={20} />
      </button>

      {/* Step indicators */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1 rounded-full transition-all" style={{
            width: step >= i ? 24 : 12,
            background: step >= i ? "#ffb302" : "rgba(255,255,255,0.18)",
          }} />
        ))}
      </div>

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepCard key="matchup" tone={userIsInGame ? home.primary : undefined}>
              <Eyebrow>MATCHUP</Eyebrow>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mt-4">
                <TeamCol team={away} highlight={userIsAway} alignRight />
                <div className="text-center">
                  <div className="font-display text-3xl text-ink-200">@</div>
                </div>
                <TeamCol team={home} highlight={userIsHome} />
              </div>
              <Headline>{away.city} {away.name} at {home.city} {home.name}</Headline>
              <SubLine>Day {league.day} · {league.year} Season</SubLine>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard key="pitchers" tone={userIsInGame ? home.primary : undefined}>
              <Eyebrow>STARTING PITCHERS</Eyebrow>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <PitcherCard player={awaySP} team={away} />
                <PitcherCard player={homeSP} team={home} />
              </div>
              <SubLine className="mt-4">Tap to continue</SubLine>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard key="lineup" tone={userIsInGame ? home.primary : undefined}>
              <Eyebrow>STARTING LINEUP</Eyebrow>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <LineupCol team={away} league={league} />
                <LineupCol team={home} league={league} />
              </div>
              <SubLine className="mt-3">Tap to continue</SubLine>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard key="mode" tone={userIsInGame ? home.primary : undefined}>
              <Eyebrow>HOW DO YOU WANT TO PLAY?</Eyebrow>
              <div className="grid grid-cols-1 gap-2.5 mt-4">
                <ModeButton
                  emoji="⚾"
                  title="PLAY"
                  body="Live pitch-by-pitch — you control every swing and pitch."
                  onClick={(e) => { e.stopPropagation(); choose("play"); }}
                  hot
                />
                <ModeButton
                  emoji="📺"
                  title="WATCH"
                  body="Sim plays out in real-time with full play-by-play."
                  onClick={(e) => { e.stopPropagation(); choose("watch"); }}
                />
                <ModeButton
                  emoji="⏩"
                  title="AUTO"
                  body="Skip straight to the final score."
                  onClick={(e) => { e.stopPropagation(); choose("auto"); }}
                />
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <motion.div
              key="splash"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="text-center"
            >
              <div className="font-display tracking-[0.3em] text-2xl text-amber-300 mb-2">⚾</div>
              <div
                className="font-display tracking-[0.4em] leading-none"
                style={{
                  fontSize: "clamp(56px, 14vw, 120px)",
                  background: "linear-gradient(135deg, #ffd54a, #ff8a00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 36px rgba(255,179,2,0.5))",
                }}
              >PLAY BALL</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function pickStartingPitcher(league: League, teamId: string): Player | null {
  const pitchers = league.players.filter(p => p.teamId === teamId && p.isPitcher && !p.injury);
  if (pitchers.length === 0) return null;
  const sps = pitchers.filter(p => p.position === "SP");
  const pool = sps.length > 0 ? sps : pitchers;
  return pool.slice().sort((a, b) => b.overall - a.overall)[0];
}

function StepCard({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28 }}
      className="rounded-3xl p-6 lg:p-8 shadow-2xl backdrop-blur-md"
      style={{
        background: `linear-gradient(135deg, ${tone ?? "#1f2937"}30, rgba(10,12,20,0.96))`,
        border: `1px solid ${tone ?? "rgba(255,255,255,0.15)"}55`,
      }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] tracking-[0.4em] font-display text-amber-300">{children}</div>;
}

function Headline({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-xl lg:text-2xl text-white mt-4 leading-tight text-center">{children}</div>;
}

function SubLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[11px] text-ink-200 text-center ${className ?? ""}`}>{children}</div>;
}

function TeamCol({ team, highlight, alignRight }: { team: Team; highlight?: boolean; alignRight?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${highlight ? "" : "opacity-90"}`}>
      <TeamLogo team={team} size={72} glow={highlight} />
      <div className={`font-display text-lg ${alignRight ? "" : ""}`}>{team.abbr}</div>
      <div className="text-[11px] text-ink-200">{team.wins}-{team.losses}</div>
    </div>
  );
}

function PitcherCard({ player, team }: { player: Player | null; team: Team }) {
  if (!player) {
    return (
      <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <TeamLogo team={team} size={32} variant="cap" />
        <div className="text-xs text-ink-200 mt-2">No SP available</div>
      </div>
    );
  }
  const era = player.seasonStats.era;
  const w = player.seasonStats.w ?? 0;
  const l = player.seasonStats.l ?? 0;
  const k = player.seasonStats.pk ?? 0;
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center gap-2">
        <PlayerPortrait player={player} team={team} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-ink-200 uppercase tracking-widest">{team.abbr} · SP</div>
          <div className="font-display text-sm truncate">{player.name}</div>
          <div className="text-[10px] text-ink-200">OVR {player.overall}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2.5 text-center">
        <Stat label="W-L" value={`${w}-${l}`} />
        <Stat label="ERA" value={era != null ? era.toFixed(2) : "—"} />
        <Stat label="K" value={String(k)} />
      </div>
    </div>
  );
}

function LineupCol({ team, league }: { team: Team; league: League }) {
  const order = (team.rosterOrder ?? [])
    .map(id => league.players.find(p => p.id === id))
    .filter((p): p is Player => !!p && !p.isPitcher && !p.injury)
    .slice(0, 9);
  // Fallback: best 9 non-pitchers if no rosterOrder set.
  const lineup = order.length >= 9 ? order :
    league.players
      .filter(p => p.teamId === team.id && !p.isPitcher && !p.injury)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 9);
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo team={team} size={20} variant="cap" />
        <div className="text-[10px] text-ink-200 uppercase tracking-widest truncate">{team.abbr}</div>
      </div>
      <ol className="space-y-0.5">
        {lineup.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1.5 text-[11px]">
            <span className="text-ink-300 font-mono w-3 text-right">{i + 1}</span>
            <span className="truncate flex-1">{p.lastName}</span>
            <span className="text-ink-300 text-[10px]">{p.position}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-1 py-1" style={{ background: "rgba(0,0,0,0.25)" }}>
      <div className="text-[8px] text-ink-300 uppercase tracking-widest">{label}</div>
      <div className="font-mono text-xs text-white">{value}</div>
    </div>
  );
}

function ModeButton({
  emoji, title, body, onClick, hot,
}: {
  emoji: string;
  title: string;
  body: string;
  onClick: (e: React.MouseEvent | React.PointerEvent) => void;
  hot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="text-left rounded-2xl p-4 pressable touch-target flex items-center gap-3 min-h-[72px]"
      style={{
        background: hot ? "linear-gradient(135deg, #ffb302, #ff8a00)" : "rgba(255,255,255,0.06)",
        border: hot ? "1px solid rgba(255,179,2,0.6)" : "1px solid rgba(255,255,255,0.15)",
        color: hot ? "#0a0d13" : "#fff",
        touchAction: "manipulation",
      }}
    >
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display tracking-widest text-lg">{title}</div>
        <div className={`text-[11px] ${hot ? "text-ink-700/80" : "text-ink-200"}`}>{body}</div>
      </div>
      <ArrowRight size={18} className="shrink-0" />
    </button>
  );
}

