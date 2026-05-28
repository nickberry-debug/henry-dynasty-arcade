import { useStore } from "../store";
import type { League } from "../store/types";
import { simDay, simNDays, isRegularComplete } from "../engine/season";
import { startPlayoffs, simCurrentRound } from "../engine/playoffs";
import { initDraft, startFreeAgency, cpuFillRosters, startNewSeason } from "../engine/offseason";
import { FastForward, SkipForward, Play, Loader } from "lucide-react";
import { useBusyAction } from "../hooks/useBusyAction";

/** Convenience: bind useBusyAction to the baseball mutate().
 * The earlier version called itself recursively — instant stack overflow
 * the moment a baseball league existed and CommandBar mounted. That was
 * the production "Maximum call stack size exceeded" crash. */
function useBusyMutate(): [boolean, (fn: (lg: League) => void) => Promise<void>] {
  const mutate = useStore(s => s.mutate);
  const [busy, run] = useBusyAction();
  return [busy, (fn: (lg: League) => void) => run(() => mutate(fn))];
}

export function CommandBar() {
  const league = useStore(s => s.league);
  if (!league) return null;
  return (
    <>
      <DesktopBar />
      <MobileBar />
    </>
  );
}

function DesktopBar() {
  const league = useStore(s => s.league)!;
  const [busy, run] = useBusyMutate();
  const isFinished = isRegularComplete(league);
  return (
    <div className="fixed top-[68px] right-3 z-40 hidden lg:block">
      <div className="glass rounded-2xl px-3 py-2 flex gap-2 items-center shadow-2xl">
        {league.phase === "regular" && !isFinished && (
          <>
            <button disabled={busy} onClick={() => run(lg => { simDay(lg); })} className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-semibold text-sm pressable touch-target disabled:opacity-50 flex items-center gap-1">
              {busy ? <Loader size={14} className="animate-spin" /> : null} Sim Day
            </button>
            <button disabled={busy} onClick={() => run(lg => { simNDays(lg, 7); })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm pressable touch-target disabled:opacity-50">+1 Week</button>
            <button disabled={busy} onClick={() => run(lg => { simNDays(lg, 30); })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm pressable touch-target disabled:opacity-50">+1 Month</button>
          </>
        )}
        {league.phase === "regular" && isFinished && (
          <button disabled={busy} onClick={() => run(lg => startPlayoffs(lg))} className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-semibold text-sm pressable touch-target disabled:opacity-50">Start Playoffs</button>
        )}
        {league.phase === "playoffs" && (
          <button disabled={busy} onClick={() => run(lg => { simCurrentRound(lg); })} className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-semibold text-sm pressable touch-target disabled:opacity-50">Sim Round</button>
        )}
        {league.phase === "offseason" && !league.draft && (
          <button disabled={busy} onClick={() => run(lg => initDraft(lg))} className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-semibold text-sm pressable touch-target disabled:opacity-50">Start Draft</button>
        )}
        {league.phase === "freeagency" && (
          <button disabled={busy} onClick={() => run(lg => { cpuFillRosters(lg); startNewSeason(lg); })} className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-semibold text-sm pressable touch-target disabled:opacity-50">Begin Next Season</button>
        )}
      </div>
    </div>
  );
}

function MobileBar() {
  const league = useStore(s => s.league)!;
  const [busy, run] = useBusyMutate();
  const isFinished = isRegularComplete(league);
  return (
    <div className="fixed right-3 lg:hidden flex flex-col gap-2 z-40" style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}>
      {league.phase === "regular" && !isFinished && (
        <>
          <button disabled={busy} onClick={() => run(lg => { simNDays(lg, 30); })} className="w-12 h-12 rounded-full bg-ink-700 text-white text-xs pressable touch-target shadow-xl flex flex-col items-center justify-center disabled:opacity-50" aria-label="+30 days">
            <FastForward size={16} /><span className="text-[9px]">+30d</span>
          </button>
          <button disabled={busy} onClick={() => run(lg => { simNDays(lg, 7); })} className="w-12 h-12 rounded-full bg-ink-700 text-white text-xs pressable touch-target shadow-xl flex flex-col items-center justify-center disabled:opacity-50" aria-label="+7 days">
            <SkipForward size={16} /><span className="text-[9px]">+7d</span>
          </button>
          <button disabled={busy} onClick={() => run(lg => { simDay(lg); })} className="w-14 h-14 rounded-full bg-accent text-ink-950 font-semibold pressable touch-target shadow-2xl flex flex-col items-center justify-center disabled:opacity-50" aria-label="Sim 1 day">
            {busy ? <Loader size={20} className="animate-spin" /> : <Play size={20} />}<span className="text-[10px]">{busy ? "..." : "Sim"}</span>
          </button>
        </>
      )}
      {league.phase === "regular" && isFinished && (
        <button disabled={busy} onClick={() => run(lg => startPlayoffs(lg))} className="px-4 h-14 rounded-full bg-accent text-ink-950 font-semibold text-sm pressable touch-target shadow-2xl disabled:opacity-50">Playoffs</button>
      )}
      {league.phase === "playoffs" && (
        <button disabled={busy} onClick={() => run(lg => { simCurrentRound(lg); })} className="px-4 h-14 rounded-full bg-accent text-ink-950 font-semibold text-sm pressable touch-target shadow-2xl disabled:opacity-50">Sim Round</button>
      )}
      {league.phase === "offseason" && !league.draft && (
        <button disabled={busy} onClick={() => run(lg => initDraft(lg))} className="px-4 h-14 rounded-full bg-accent text-ink-950 font-semibold text-sm pressable touch-target shadow-2xl disabled:opacity-50">Draft</button>
      )}
      {league.phase === "freeagency" && (
        <button disabled={busy} onClick={() => run(lg => { cpuFillRosters(lg); startNewSeason(lg); })} className="px-4 h-14 rounded-full bg-accent text-ink-950 font-semibold text-sm pressable touch-target shadow-2xl disabled:opacity-50">Next Season</button>
      )}
    </div>
  );
}
