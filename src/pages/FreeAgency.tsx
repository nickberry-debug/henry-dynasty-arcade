import { useStore } from "../store";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { fmt } from "../utils/format";
import { Link } from "react-router-dom";
import { useState } from "react";
import { signFreeAgent } from "../engine/offseason";
import { Undo2 } from "lucide-react";

export default function FreeAgency() {
  const league = useStore(s => s.league)!;
  const mutateUndoable = useStore(s => s.mutateUndoable);
  const undo = useStore(s => s.undo);
  const canUndo = useStore(s => s.canUndo);
  const [team, setTeam] = useState(league.userTeamId ?? league.teams[0].id);
  const [years, setYears] = useState(3);
  const [pendingSign, setPendingSign] = useState<{ playerId: string; name: string; aav: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const top = league.freeAgents.slice().sort((a, b) => b.overall - a.overall).slice(0, 80);

  async function doSign() {
    if (!pendingSign) return;
    const playerId = pendingSign.playerId;
    setPendingSign(null);
    await mutateUndoable(lg => {
      const res = signFreeAgent(lg, playerId, team, years);
      if (res === "cap") setToast("Over cap! Toggle the cap off in Settings or pick another team.");
      else if (res === "missing") setToast("Player no longer available.");
      else setToast(null);
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">Available Players</div>
          <h1 className="font-display text-4xl">FREE AGENCY</h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={team} onChange={e => setTeam(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm touch-target">
            {league.teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
          </select>
          <select value={years} onChange={e => setYears(+e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm touch-target">
            <option value={1}>1 year</option><option value={3}>3 years</option><option value={5}>5 years</option><option value={7}>7 years</option>
          </select>
          {canUndo() && (
            <button onClick={() => undo()} className="px-3 py-2.5 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1">
              <Undo2 size={14} /> Undo
            </button>
          )}
        </div>
      </header>
      {toast && <div className="glass rounded-xl p-3 text-sm border border-red-500/30 bg-red-500/5">{toast}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {top.map(p => (
          <div key={p.id} className="bg-white/3 border border-white/5 rounded-2xl p-3 flex items-center gap-3 card-elevated">
            <PlayerPortrait player={p} team={null} size={56} />
            <div className="flex-1 min-w-0">
              <Link to={`/player/${p.id}`} className="font-semibold truncate block">{p.name}</Link>
              <div className="text-[11px] text-ink-200">{p.position} • Age {p.age} • {p.bats}/{p.throws}</div>
              <div className="text-[11px] text-ink-200">{fmt.money(p.contract.aav)} AAV</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-xl" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</div>
              <button onClick={() => setPendingSign({ playerId: p.id, name: p.name, aav: p.contract.aav })} className="px-3 py-2 text-xs rounded-lg bg-accent text-ink-950 font-semibold pressable touch-target mt-1">Sign</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!pendingSign}
        title={`Sign ${pendingSign?.name}?`}
        body={<>
          You'll commit to <strong>{years} year{years > 1 ? "s" : ""}</strong> at <strong>{pendingSign && fmt.money(pendingSign.aav)}</strong> per year (total ~{pendingSign && fmt.money(pendingSign.aav * years)}).
          You can undo within the next 5 actions.
        </>}
        confirmLabel="Yes, sign them"
        cancelLabel="Not yet"
        onConfirm={doSign}
        onCancel={() => setPendingSign(null)}
      />
    </div>
  );
}
