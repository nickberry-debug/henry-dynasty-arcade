import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { fmt } from "../utils/format";
import { useState } from "react";
import { initDraft, makeDraftPick, cpuDraftPick, autoCompleteDraft, startFreeAgency, cpuFillRosters, startNewSeason, scoutProspect } from "../engine/offseason";
import { useBusyAction } from "../hooks/useBusyAction";
import { Loader, Search, Gem } from "lucide-react";

export default function Draft() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const [busy, run] = useBusyAction();
  const draft = league.draft;

  if (!draft) {
    return (
      <div className="space-y-4">
        <header>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">Amateur Draft</div>
          <h1 className="font-display text-4xl">DRAFT</h1>
        </header>
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-ink-200 mb-3">No draft active. Start a new draft to bring in fresh talent.</div>
          <button disabled={busy} onClick={() => run(() => mutate(lg => initDraft(lg)))} className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader size={14} className="animate-spin" />}
            Start Draft
          </button>
        </div>
      </div>
    );
  }

  const teamOnClock = league.teams.find(t => t.id === draft.pickOrder[draft.currentPick % draft.pickOrder.length]);
  const top = draft.prospects.slice(0, 30);

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] text-ink-200 uppercase tracking-widest">{draft.year} Class</div>
        <h1 className="font-display text-4xl">DRAFT</h1>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-head text-lg uppercase tracking-widest mb-3">On the Clock</h3>
          <div className="flex items-center gap-3">
            {teamOnClock && <TeamLogo team={teamOnClock} size={48} />}
            <div>
              <div className="font-semibold">{teamOnClock ? `${teamOnClock.city} ${teamOnClock.name}` : "—"}</div>
              <div className="text-ink-200 text-xs">Pick #{draft.currentPick + 1} of {draft.pickOrder.length * 6}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button disabled={busy} onClick={() => run(() => mutate(lg => { cpuDraftPick(lg); }))} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy && <Loader size={14} className="animate-spin" />} Let CPU pick
            </button>
            <button disabled={busy} onClick={() => run(() => mutate(lg => { autoCompleteDraft(lg); }))} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy && <Loader size={14} className="animate-spin" />} Auto-complete draft
            </button>
            {draft.completed && (
              <button disabled={busy} onClick={() => run(() => mutate(lg => { startFreeAgency(lg); cpuFillRosters(lg); startNewSeason(lg); }))} className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {busy && <Loader size={14} className="animate-spin" />} Begin Next Season
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="font-head text-lg uppercase tracking-widest mb-3">Top Prospects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {top.map((p, i) => {
              const visits = (p as any).scoutVisits ?? 0;
              const scoutedPot: number = (p as any).scoutedPotential ?? p.potential;
              // Range tightens with scouting: ±10 at 0 visits, ±5 at 1, ±2 at 2, ±0 (point) at 3+.
              const noise = visits >= 3 ? 0 : visits === 2 ? 2 : visits === 1 ? 5 : 10;
              const potRange = noise === 0 ? `${scoutedPot}` : `${Math.max(40, scoutedPot - noise)}–${Math.min(99, scoutedPot + noise)}`;
              const revealed = visits >= 3 && (p as any).hiddenGem;
              return (
                <div key={p.id} className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-center gap-3" style={{ borderColor: revealed ? "rgba(168,85,247,0.6)" : undefined }}>
                  <div className="font-display text-2xl text-accent w-8">#{i + 1}</div>
                  <PlayerPortrait player={p} team={null} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1">
                      {p.name}
                      {revealed && <Gem size={12} className="text-purple-400" />}
                    </div>
                    <div className="text-[11px] text-ink-200">{p.position} • Age {p.age} • {(p as any).scoutGrade}</div>
                    <div className="text-[10px] text-ink-300 mt-0.5">
                      Pot: <span className="text-white font-mono">{potRange}</span>
                      <span className="ml-1 text-ink-400">· {visits} scout{visits === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div className="text-center flex flex-col gap-1 shrink-0">
                    <div className="font-mono font-bold" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</div>
                    <button
                      disabled={busy || visits >= 3}
                      onClick={() => run(() => mutate(lg => { scoutProspect(lg, p.id); }))}
                      className="text-[10px] px-2 py-1 rounded-md bg-white/8 border border-white/10 pressable touch-target disabled:opacity-30 inline-flex items-center justify-center gap-1"
                      title="Scout this prospect to tighten the potential estimate"
                    >
                      <Search size={10} /> Scout
                    </button>
                    <button disabled={busy} onClick={() => run(() => mutate(lg => { makeDraftPick(lg, p.id); }))} className="text-xs px-2 py-1 rounded-md bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-40">Draft</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-head text-lg uppercase tracking-widest mb-3">Recent Picks</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {draft.picks.slice().reverse().map(pk => {
            const team = league.teams.find(t => t.id === pk.teamId);
            const p = league.players.find(pp => pp.id === pk.playerId);
            if (!team || !p) return null;
            return (
              <div key={pk.pick} className="flex items-center gap-3 px-3 py-1.5 bg-white/3 rounded-lg text-sm">
                <span className="font-mono text-ink-200 w-10">#{pk.pick}</span>
                <TeamLogo team={team} size={20} variant="cap" />
                <span className="font-semibold">{team.abbr}</span>
                <span className="flex-1 text-ink-200">selects</span>
                <span>{p.name} <span className="text-ink-200 text-xs">({p.position}, OVR {p.overall})</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
