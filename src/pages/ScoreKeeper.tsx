// L — Score Keeper hub. Two modes: Backyard (fun) + Real Game (full).
// Plus "My Scorecards" history.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { saveScorecard, listScorecards, deleteScorecard, loadScorecard } from "../db/dexie";
import type { Scorecard } from "../scorekeeper/types";
import { newScorecard } from "../scorekeeper/engine";
import { BackyardScoreboard } from "../scorekeeper/BackyardScoreboard";
import { RealGameScoreboard } from "../scorekeeper/RealGameScoreboard";
import { Zap, Tv, ClipboardList, Trash2, FolderOpen, Plus } from "lucide-react";

export default function ScoreKeeper() {
  const league = useStore(s => s.league);
  const [tab, setTab] = useState<"home" | "scoring" | "history">("home");
  const [activeCard, setActiveCard] = useState<Scorecard | null>(null);
  const [history, setHistory] = useState<Scorecard[]>([]);
  const gmName = league?.gmProfile?.name ?? "Henry";

  useEffect(() => { listScorecards().then(setHistory); }, [tab, activeCard?.modifiedAt]);

  // Auto-save active card every change
  useEffect(() => {
    if (!activeCard) return;
    saveScorecard(activeCard);
  }, [activeCard?.modifiedAt]);

  const startBackyard = (cardOpts?: any) => {
    const card = newScorecard({
      mode: "backyard",
      homeName: cardOpts?.homeName ?? "Team Henry",
      awayName: cardOpts?.awayName ?? "The Challengers",
      innings: cardOpts?.innings ?? 3,
      homeColor: cardOpts?.homeColor,
      awayColor: cardOpts?.awayColor,
      scoredBy: gmName,
      gameName: cardOpts?.gameName
    });
    setActiveCard(card);
    setTab("scoring");
  };

  const startReal = (cardOpts: any) => {
    const card = newScorecard({
      mode: "real",
      homeName: cardOpts.homeName,
      awayName: cardOpts.awayName,
      innings: cardOpts.innings ?? 9,
      gameType: cardOpts.gameType,
      scoredBy: gmName,
      gameName: cardOpts.gameName
    });
    setActiveCard(card);
    setTab("scoring");
  };

  const onCardUpdate = (next: Scorecard) => {
    setActiveCard({ ...next, modifiedAt: Date.now() });
  };

  const openCard = async (id: string) => {
    const c = await loadScorecard(id);
    if (c) {
      setActiveCard(c);
      setTab("scoring");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">For Real Games</div>
          <h1 className="font-display text-4xl">SCORE KEEPER</h1>
          <div className="text-sm text-ink-200 mt-1">Hi {gmName}! Ready to be the official scorekeeper?</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("home")} className={`px-3 py-2 rounded-xl text-sm pressable touch-target ${tab === "home" ? "bg-accent text-ink-950" : "bg-white/5"}`}>New</button>
          <button onClick={() => setTab("history")} className={`px-3 py-2 rounded-xl text-sm pressable touch-target ${tab === "history" ? "bg-accent text-ink-950" : "bg-white/5"}`}>My Scorecards</button>
          {activeCard && <button onClick={() => setTab("scoring")} className={`px-3 py-2 rounded-xl text-sm pressable touch-target ${tab === "scoring" ? "bg-accent text-ink-950" : "bg-white/5"}`}>Live</button>}
        </div>
      </header>

      {tab === "home" && <HomePicker onBackyard={startBackyard} onReal={startReal} />}
      {tab === "scoring" && activeCard && (
        activeCard.mode === "backyard"
          ? <BackyardScoreboard card={activeCard} onUpdate={onCardUpdate} onClose={() => { setActiveCard(null); setTab("history"); }} />
          : <RealGameScoreboard card={activeCard} onUpdate={onCardUpdate} onClose={() => { setActiveCard(null); setTab("history"); }} />
      )}
      {tab === "history" && (
        <ScorecardHistory cards={history} onOpen={openCard} onDelete={async (id) => { await deleteScorecard(id); setHistory(h => h.filter(c => c.id !== id)); }} />
      )}
    </div>
  );
}

function HomePicker({ onBackyard, onReal }: { onBackyard: (o?: any) => void; onReal: (o: any) => void }) {
  const [showRealForm, setShowRealForm] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => onBackyard()}
          className="glass rounded-2xl p-6 text-left pressable touch-target card-elevated border border-emerald-400/30 hover:border-emerald-400/60"
        >
          <div className="text-5xl mb-2">🥎</div>
          <div className="font-display text-2xl tracking-wide mb-1">BACKYARD MODE</div>
          <div className="text-sm text-ink-200">Pretend games. Big buttons, big fun. Confetti when you hit a homer. Photos of funny moments.</div>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowRealForm(true)}
          className="glass rounded-2xl p-6 text-left pressable touch-target card-elevated border border-sky-400/30 hover:border-sky-400/60"
        >
          <div className="text-5xl mb-2">⚾</div>
          <div className="font-display text-2xl tracking-wide mb-1">REAL GAME MODE</div>
          <div className="text-sm text-ink-200">Track a real game — MLB, Little League, your school team. Full box score, exportable scorecard.</div>
        </motion.button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <button onClick={() => onBackyard({ gameName: "Quick Backyard Game" })} className="glass rounded-xl p-4 text-left pressable touch-target flex items-center gap-3">
          <Zap size={22} className="text-amber-400" />
          <div>
            <div className="font-display tracking-wide">Quick Backyard</div>
            <div className="text-[11px] text-ink-200">One-tap defaults, start now</div>
          </div>
        </button>
        <button onClick={() => onReal({ homeName: "Home Team", awayName: "Away Team", gameType: "MLB", innings: 9 })} className="glass rounded-xl p-4 text-left pressable touch-target flex items-center gap-3">
          <Tv size={22} className="text-sky-400" />
          <div>
            <div className="font-display tracking-wide">Watching MLB</div>
            <div className="text-[11px] text-ink-200">9 innings, pre-filled names</div>
          </div>
        </button>
        <button onClick={() => onReal({ homeName: "Henry's Team", awayName: "Visitors", gameType: "Little League", innings: 6 })} className="glass rounded-xl p-4 text-left pressable touch-target flex items-center gap-3">
          <ClipboardList size={22} className="text-emerald-400" />
          <div>
            <div className="font-display tracking-wide">Little League</div>
            <div className="text-[11px] text-ink-200">6 innings, your team</div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showRealForm && (
          <RealGameSetupModal onClose={() => setShowRealForm(false)} onStart={(o) => { setShowRealForm(false); onReal(o); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RealGameSetupModal({ onClose, onStart }: { onClose: () => void; onStart: (o: any) => void }) {
  const [homeName, setHomeName] = useState("");
  const [awayName, setAwayName] = useState("");
  const [gameType, setGameType] = useState("MLB");
  const [innings, setInnings] = useState(9);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="glass max-w-md w-full rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-2xl tracking-wide mb-3">Set Up Real Game</div>
        <div className="space-y-3">
          <Field label="Game type">
            <select value={gameType} onChange={e => setGameType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3">
              {["MLB","Little League","High School","Pickup","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Home team name">
            <input value={homeName} onChange={e => setHomeName(e.target.value)} placeholder="e.g., Yankees" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" enterKeyHint="next" />
          </Field>
          <Field label="Away team name">
            <input value={awayName} onChange={e => setAwayName(e.target.value)} placeholder="e.g., Red Sox" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" enterKeyHint="done" />
          </Field>
          <Field label="Innings">
            <div className="flex gap-2 flex-wrap">
              {[3, 5, 6, 7, 9].map(n => (
                <button key={n} onClick={() => setInnings(n)} className={`px-4 py-2.5 rounded-lg text-sm pressable touch-target ${innings === n ? "bg-accent text-ink-950" : "bg-white/5"}`}>{n}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target">Cancel</button>
          <button
            disabled={!homeName.trim() || !awayName.trim()}
            onClick={() => onStart({ homeName: homeName.trim(), awayName: awayName.trim(), gameType, innings, gameName: `${awayName} @ ${homeName}` })}
            className="flex-1 px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target disabled:opacity-50"
          >Start Scoring</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1.5">{label}</div>{children}</label>;
}

function ScorecardHistory({ cards, onOpen, onDelete }: { cards: Scorecard[]; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  if (cards.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="text-5xl mb-3">📝</div>
        <div className="font-display text-2xl">No scorecards yet</div>
        <div className="text-sm text-ink-200 mt-1">Start a game from the 'New' tab.</div>
      </div>
    );
  }
  const backyard = cards.filter(c => c.mode === "backyard");
  const real = cards.filter(c => c.mode === "real");
  return (
    <div className="space-y-5">
      {real.length > 0 && (
        <div>
          <h3 className="font-head text-base uppercase tracking-widest mb-2">⚾ Real Games ({real.length})</h3>
          <div className="space-y-2">
            {real.map(c => <CardRow key={c.id} card={c} onOpen={onOpen} onDelete={onDelete} />)}
          </div>
        </div>
      )}
      {backyard.length > 0 && (
        <div>
          <h3 className="font-head text-base uppercase tracking-widest mb-2">🥎 Backyard Games ({backyard.length})</h3>
          <div className="space-y-2">
            {backyard.map(c => <CardRow key={c.id} card={c} onOpen={onOpen} onDelete={onDelete} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CardRow({ card, onOpen, onDelete }: { card: Scorecard; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{card.gameName}</div>
        <div className="text-[11px] text-ink-300">{card.completed ? "Final" : `Inning ${card.currentInning}`} • {card.away.name} {card.away.runs} @ {card.home.name} {card.home.runs} • {new Date(card.modifiedAt).toLocaleString()}</div>
      </div>
      <button onClick={() => onOpen(card.id)} className="w-10 h-10 rounded-lg bg-accent text-ink-950 flex items-center justify-center pressable touch-target" aria-label="Open"><FolderOpen size={16} /></button>
      {confirming ? (
        <>
          <button onClick={() => { onDelete(card.id); setConfirming(false); }} className="px-3 h-10 rounded-lg bg-red-500 text-white text-xs font-bold pressable touch-target">Yes</button>
          <button onClick={() => setConfirming(false)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target">×</button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target" aria-label="Delete"><Trash2 size={14} /></button>
      )}
    </div>
  );
}
