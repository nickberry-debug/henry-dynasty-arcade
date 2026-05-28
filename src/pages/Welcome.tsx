import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore, markOnboardingDone } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { ChevronRight, ChevronLeft } from "lucide-react";

const COLORS = ["#ff5d3d","#ffb302","#34d399","#60a5fa","#a78bfa","#f472b6","#fbbf24","#22d3ee"];

const STEPS = [
  { title: "Hi Henry!", body: "Welcome to your Diamond Dynasty.\n\nThis game is all about you being the boss of a baseball team. You don't actually play the games — you build the team that does." },
  { title: "You're the GM", body: "GM stands for General Manager.\n\nYou pick the players. You sign new ones, draft prospects, and trade. The team plays on the field — and you watch them win (or lose) and react." },
  { title: "Pick Your Team", body: "First, pick which team is YOURS. Other teams will be controlled by the computer. Don't worry — you can swap later in Settings." },
  { title: "Watch the Action", body: "Click any game to watch it live. You'll see every pitch and every play. Better teams usually win, but anything can happen." },
  { title: "Build Slowly, Win Big", body: "Make moves. Sign a free agent. Draft a star. Watch your roster get better over time. That's a dynasty — winning over many, many seasons." },
  { title: "Need Help?", body: "Tap the ❓ icon anywhere for quick help.\n\nOr visit the Coach's Corner (the clipboard icon in the menu) for tutorials on everything — stats, strategy, awards, the works." },
  { title: "Ready?", body: "Let's get started. You can come back to this any time in Settings → Welcome Tour." }
];

export function Welcome() {
  const navigate = useNavigate();
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const mutateAndFlush = useStore(s => s.mutateAndFlush);
  const [stepIdx, setStepIdx] = useState(0);
  const [gmName, setGmName] = useState("Henry");
  const [color, setColor] = useState(COLORS[0]);
  const [favTeamId, setFavTeamId] = useState<string | null>(null);
  const [luckyNumber, setLuckyNumber] = useState<number>(7);
  const [birthMMDD, setBirthMMDD] = useState<string>("");

  // If somehow we landed on /welcome without a league (browser refresh
  // during onboarding, deep link, etc), don't render null — that's a
  // blank page. Redirect back to the game picker so the user can pick
  // up a game properly.
  useEffect(() => {
    if (!league) navigate("/play", { replace: true });
  }, [league, navigate]);
  if (!league) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-4xl mb-3">⚾</div>
          <div className="text-sm" style={{ color: "#9aa6bf" }}>Loading your game…</div>
        </div>
      </div>
    );
  }

  const isPickTeam = stepIdx === 2;
  const isLast = stepIdx === STEPS.length - 1;

  const next = async () => {
    if (isLast) {
      // CRITICAL: use mutateAndFlush so the IndexedDB write completes BEFORE
      // we navigate away. Plus mark onboarding done in localStorage as
      // belt-and-suspenders against iOS Safari storage eviction.
      await mutateAndFlush(lg => {
        lg.gmProfile = {
          name: gmName.trim() || "Henry",
          color,
          favTeamId,
          avatarSeed: Math.floor(Math.random() * 9999),
          createdAt: Date.now(),
          luckyNumber,
          birthMMDD: birthMMDD || undefined,
          familyNames: [],
          timeCapsule: []
        };
        lg.userTeamId = favTeamId;
        lg.tutorial.hasSeenWelcome = true;
      });
      markOnboardingDone();
      navigate("/dashboard");
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  const back = () => setStepIdx(Math.max(0, stepIdx - 1));

  const skip = async () => {
    await mutateAndFlush(lg => {
      lg.gmProfile = lg.gmProfile ?? { name: "Henry", color: COLORS[0], favTeamId: null, avatarSeed: 0, createdAt: Date.now() };
      lg.tutorial.hasSeenWelcome = true;
    });
    markOnboardingDone();
    navigate("/dashboard");
  };

  const step = STEPS[stepIdx];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="text-xs text-ink-300 mb-4 tracking-widest">STEP {stepIdx + 1} / {STEPS.length}</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="glass rounded-2xl p-6 lg:p-10 max-w-2xl w-full"
        >
          <div className="font-display tracking-widest text-3xl lg:text-5xl mb-4" style={{ color }}>
            {step.title}
          </div>
          <div className="text-base text-ink-100 whitespace-pre-line leading-relaxed mb-6">
            {step.body}
          </div>

          {stepIdx === 0 && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-ink-300 mb-1">Your name (GM):</label>
                <input
                  value={gmName}
                  onChange={e => setGmName(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                  autoComplete="given-name"
                  inputMode="text"
                  enterKeyHint="next"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg outline-none focus:border-accent"
                  placeholder="Henry"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-300 mb-2">Pick your favorite color:</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-11 h-11 rounded-full pressable touch-target ring-2 ${color === c ? "ring-white" : "ring-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Choose ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-300 mb-2">Your lucky number (1-99):</label>
                <div className="flex items-center gap-3">
                  <input
                    inputMode="numeric" type="text" value={String(luckyNumber)}
                    onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (n >= 1 && n <= 99) setLuckyNumber(n); }}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-display text-center outline-none focus:border-accent"
                  />
                  <span className="text-xs text-ink-300">We'll save this jersey number for your first draft pick.</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-300 mb-2">Your birthday (optional, MM-DD):</label>
                <input
                  inputMode="numeric" type="text" value={birthMMDD}
                  onChange={e => setBirthMMDD(e.target.value.replace(/[^\d-]/g, "").slice(0, 5))}
                  placeholder="07-15"
                  className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent"
                />
                <div className="text-[11px] text-ink-300 mt-1">If you set this, fun stuff happens on your birthday.</div>
              </div>
            </div>
          )}

          {isPickTeam && (
            <div className="mt-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                {league.teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFavTeamId(t.id)}
                    className={`rounded-xl p-2 flex flex-col items-center gap-1 pressable touch-target border ${favTeamId === t.id ? "border-accent bg-accent/10" : "border-white/10"}`}
                  >
                    <TeamLogo team={t} size={48} />
                    <div className="text-[10px] text-ink-200 truncate w-full text-center">{t.city}</div>
                    <div className="text-xs font-medium truncate w-full text-center">{t.name}</div>
                  </button>
                ))}
              </div>
              {favTeamId && <div className="text-xs text-accent mt-2 text-center">Picked: {league.teams.find(t => t.id === favTeamId)?.name}</div>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-6 w-full max-w-2xl">
        {stepIdx > 0 && (
          <button onClick={back} className="px-4 py-2.5 rounded-xl bg-white/5 text-sm pressable touch-target flex items-center gap-1">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button onClick={skip} className="px-4 py-2.5 rounded-xl bg-white/5 text-sm text-ink-300 pressable touch-target">Skip</button>
        <div className="flex-1" />
        <button
          onClick={next}
          disabled={isPickTeam && !favTeamId}
          className="px-6 py-2.5 rounded-xl bg-accent text-ink-950 font-display tracking-wider text-sm pressable touch-target flex items-center gap-1 disabled:opacity-40"
        >
          {isLast ? "Play Ball" : "Next"} <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-5">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIdx ? "w-6 bg-accent" : i < stepIdx ? "w-1.5 bg-accent/50" : "w-1.5 bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}
