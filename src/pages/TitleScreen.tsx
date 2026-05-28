import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore, listSavedLeagues } from "../store";
import { useKonami } from "../hooks/useKonami";
import { Trophy, Zap, Gem, FolderOpen, ArrowRight, Loader } from "lucide-react";

type Mode = "career" | "tournament" | "sandbox";

interface SavedSummary { id: string; name: string; year: number; phase: string; modifiedAt: number; }

export function TitleScreen() {
  const navigate = useNavigate();
  const newLeague = useStore(s => s.newLeague);
  const loadFromDb = useStore(s => s.loadFromDb);
  const setLeague = useStore(s => s.setLeague);
  const [saves, setSaves] = useState<SavedSummary[]>([]);
  const [picking, setPicking] = useState<Mode | null>(null);
  const [creating, setCreating] = useState(false);
  const [numTeams, setNumTeams] = useState(30);
  const [sched, setSched] = useState<30 | 60 | 82 | 120 | 162>(162);
  const [mlbMode, setMlbMode] = useState(false);
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);
  useKonami(() => {
    setKonamiUnlocked(true);
    localStorage.setItem("dd_arcade_mode", "1");
  });

  useEffect(() => {
    listSavedLeagues().then((s: any[]) => setSaves(s.map(x => ({ id: x.id, name: x.name, year: x.year, phase: x.phase, modifiedAt: x.modifiedAt }))));
  }, []);

  const start = async (mode: Mode) => {
    setCreating(true);
    const opts: any = {
      numTeams: mode === "tournament" ? Math.min(16, numTeams) : numTeams,
      scheduleLength: mode === "tournament" ? 30 : sched,
      year: new Date().getFullYear(),
      mlbMode,
      mode
    };
    await newLeague(opts);
    setCreating(false);
    navigate("/welcome");
  };

  const resume = async () => {
    await loadFromDb();
    navigate("/dashboard");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 700px at 50% 0%, rgba(255,213,74,0.10), transparent 60%), " +
          "radial-gradient(700px 500px at 80% 90%, rgba(59,130,246,0.10), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      <SportSelectorStrip saves={saves} />

      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-center mb-8">
        <motion.div
          initial={{ rotate: -10, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, delay: 0.1 }}
          className="text-7xl mb-3"
        >⚾</motion.div>
        <div className="font-display tracking-[0.3em] text-3xl lg:text-5xl text-accent">HENRY'S</div>
        <div
          className="font-display tracking-[0.4em] text-4xl lg:text-7xl"
          style={{ textShadow: "0 0 28px rgba(255,213,74,0.25)" }}
        >DIAMOND DYNASTY</div>
        <div className="text-ink-200 text-sm tracking-widest uppercase mt-2">Pure baseball simulation • Made for Henry</div>
        {konamiUnlocked && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 inline-block px-3 py-1 rounded-full bg-violet-500/30 border border-violet-400 text-violet-200 text-xs font-display tracking-widest">
            ⚡ ARCADE MODE UNLOCKED
          </motion.div>
        )}
      </motion.div>

      {!picking && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="grid gap-3 w-full max-w-md">
          {saves.length > 0 && (
            <button onClick={resume} className="glass rounded-2xl p-5 flex items-center gap-4 pressable text-left border border-accent/30">
              <FolderOpen size={28} className="text-accent shrink-0" />
              <div className="flex-1">
                <div className="font-display tracking-wider text-lg">CONTINUE</div>
                <div className="text-xs text-ink-200">{saves[0].name} • {saves[0].year} • {saves[0].phase}</div>
              </div>
              <ArrowRight size={20} className="text-accent" />
            </button>
          )}
          <ModeCard
            icon={<Trophy size={28} className="text-amber-400" />}
            title="CAREER MODE"
            desc="Build a dynasty over decades. Draft, free agency, awards, the full experience."
            onClick={() => setPicking("career")}
          />
          <ModeCard
            icon={<Zap size={28} className="text-emerald-400" />}
            title="QUICK TOURNAMENT"
            desc="Short round-robin into a knockout. Perfect for a quick session."
            onClick={() => setPicking("tournament")}
          />
          <ModeCard
            icon={<Gem size={28} className="text-violet-400" />}
            title="SANDBOX"
            desc="God mode. Edit anything. No rules, just play."
            onClick={() => setPicking("sandbox")}
          />
        </motion.div>
      )}

      {picking && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass rounded-2xl p-6 w-full max-w-md">
          <div className="font-display tracking-widest text-xl mb-1">
            {picking === "career" ? "CAREER MODE" : picking === "tournament" ? "QUICK TOURNAMENT" : "SANDBOX"}
          </div>
          <div className="text-xs text-ink-200 mb-4">Configure your league.</div>

          <label className="block text-xs text-ink-300 mb-1">Number of teams</label>
          <input type="range" min={picking === "tournament" ? 4 : 2} max={picking === "tournament" ? 16 : 32} value={numTeams} onChange={e => setNumTeams(+e.target.value)} className="w-full accent-accent mb-1" />
          <div className="text-sm mb-4">{numTeams} teams</div>

          {picking !== "tournament" && (
            <>
              <label className="block text-xs text-ink-300 mb-1">Season length</label>
              <div className="flex gap-2 mb-4 flex-wrap">
                {([30, 60, 82, 120, 162] as const).map(n => (
                  <button key={n} onClick={() => setSched(n)} className={`px-3 py-2 rounded-lg text-sm pressable touch-target ${sched === n ? "bg-accent text-ink-950" : "bg-white/5 text-ink-200"}`}>{n}</button>
                ))}
              </div>
            </>
          )}

          <label className="flex items-center gap-2 mb-5 text-sm">
            <input type="checkbox" checked={mlbMode} onChange={e => setMlbMode(e.target.checked)} className="w-4 h-4 accent-accent" />
            Use real MLB teams (30 franchises)
          </label>

          <div className="flex gap-2">
            <button onClick={() => setPicking(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-sm pressable touch-target">Back</button>
            <button disabled={creating} onClick={() => start(picking)} className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-ink-950 font-display tracking-wider text-sm pressable touch-target disabled:opacity-60 flex items-center justify-center gap-2">
              {creating ? (<><Loader size={14} className="animate-spin" /> Building {numTeams}-team league…</>) : "Start"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      className="glass rounded-2xl p-5 flex items-center gap-4 pressable text-left group"
      style={{ boxShadow: "0 6px 22px -10px rgba(255,213,74,0.25)" }}
    >
      {icon}
      <div className="flex-1">
        <div className="font-display tracking-wider text-lg">{title}</div>
        <div className="text-xs text-ink-200">{desc}</div>
      </div>
      <ArrowRight size={20} className="text-ink-300 group-hover:translate-x-0.5 transition-transform" />
    </motion.button>
  );
}

/** Sport selector — eight games playable: baseball, football, olympus,
 *  Beckett Movie Studios, Wordplay Hub, Cosmic Squad, Temporal Order,
 *  and Beckett's Battle Forge. Baseball is "Active" here since
 *  TitleScreen is the baseball-side entry. */
function SportSelectorStrip({ saves }: { saves: SavedSummary[] }) {
  const lastSave = saves[0];
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-5xl mb-6"
    >
      {/* BASEBALL — active here */}
      <div className="glass rounded-2xl p-4 border border-accent/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #fbbf24, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">⚾</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-amber-300 uppercase tracking-[0.3em] font-display">Active</div>
            <div className="font-display text-base leading-tight">BASEBALL</div>
            <div className="text-[10px] text-ink-200 truncate">
              {lastSave ? `${lastSave.name} · ${lastSave.year}` : "Start a new dynasty"}
            </div>
          </div>
        </div>
      </div>
      {/* FOOTBALL */}
      <button
        onClick={() => navigate("/football/hub")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#FFB81C44", background: "linear-gradient(135deg, #1A2526, #0B3D2E 70%)" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #FFB81C, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">🏈</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>Live</div>
            <div className="font-display text-base leading-tight">FOOTBALL</div>
            <div className="text-[10px] text-ink-200 truncate">17-week season + StatCast view</div>
          </div>
        </div>
      </button>
      {/* OLYMPUS */}
      <button
        onClick={() => navigate("/olympus")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#DAA52055", background: "linear-gradient(135deg, #0F1B2D, #050a12 70%)" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #DAA520, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">⚔️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#DAA520" }}>Live</div>
            <div className="font-display text-base leading-tight">OLYMPUS</div>
            <div className="text-[10px] text-ink-200 truncate">AI-driven Greek mythology RPG</div>
          </div>
        </div>
      </button>
      {/* BECKETT MOVIE STUDIOS */}
      <button
        onClick={() => navigate("/mogul")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#D4AF3755", background: "linear-gradient(135deg, rgba(30,12,20,0.95), rgba(60,30,10,0.85))" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #D4AF37, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">🎬</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#D4AF37" }}>Live</div>
            <div className="font-display text-base leading-tight">BECKETT MOVIE STUDIOS</div>
            <div className="text-[10px] text-ink-200 truncate">Hollywood tycoon — studios, stars, awards</div>
          </div>
        </div>
      </button>
      {/* WORDPLAY HUB */}
      <button
        onClick={() => navigate("/wordplay")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#C084FC55", background: "linear-gradient(135deg, rgba(20,10,40,0.95), rgba(60,10,80,0.85))" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #C084FC, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">💬</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#C084FC" }}>Live</div>
            <div className="font-display text-base leading-tight">WORDPLAY HUB</div>
            <div className="text-[10px] text-ink-200 truncate">13 word-games — jokes, quizzes, riddles, more</div>
          </div>
        </div>
      </button>
      {/* COSMIC SQUAD */}
      <button
        onClick={() => navigate("/cosmic")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#9be3ff55", background: "linear-gradient(135deg, rgba(8,18,40,0.95), rgba(20,40,80,0.85))" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #9be3ff, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">🚀</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#9be3ff" }}>Live</div>
            <div className="font-display text-base leading-tight">COSMIC SQUAD</div>
            <div className="text-[10px] text-ink-200 truncate">Turn-based space combat — 20 ships, 10 eras</div>
          </div>
        </div>
      </button>
      {/* TEMPORAL ORDER */}
      <button
        onClick={() => navigate("/temporal")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#f5c51855", background: "linear-gradient(135deg, rgba(40,28,8,0.95), rgba(20,12,5,0.85))" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #f5c518, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">🕰️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#f5c518" }}>Live</div>
            <div className="font-display text-base leading-tight">TEMPORAL ORDER</div>
            <div className="text-[10px] text-ink-200 truncate">Time-travel investigation — AI mysteries</div>
          </div>
        </div>
      </button>
      {/* BATTLE FORGE */}
      <button
        onClick={() => navigate("/battleforge")}
        className="text-left rounded-2xl p-4 border relative overflow-hidden pressable touch-target"
        style={{ borderColor: "#fca5a555", background: "linear-gradient(135deg, rgba(60,8,8,0.95), rgba(20,5,5,0.85))" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(400px 200px at 80% -30%, #fca5a5, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="text-4xl">⚔️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>Live</div>
            <div className="font-display text-base leading-tight">BATTLE FORGE</div>
            <div className="text-[10px] text-ink-200 truncate">Tactical character combat — isometric arenas</div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
