// Football — interactive Draft.
//
// Mirrors Baseball's offseason Draft UI: pool of rookies sorted best-
// available, team on the clock, user picks for their team, CPU picks for
// others (or hits "Let CPU pick" / "Auto-complete"). Pool entries are
// `lg.currentDraft.pool[]`, picks recorded in `lg.currentDraft.picks[]`.
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader, Gem } from "lucide-react";
import { useState } from "react";
import { useFootball } from "../store";
import {
  makeFootballDraftPick,
  cpuFootballDraftPick,
  autoCompleteFootballDraft,
  scoutRookie,
} from "../development";

export default function FootballDraft() {
  const lg = useFootball(s => s.league);
  const mutate = useFootball(s => s.mutate);
  const [busy, setBusy] = useState(false);

  if (!lg) return <div className="p-8 text-ink-200">No league.</div>;
  const draft = lg.currentDraft;

  // If no draft is active, point the user to the offseason flow.
  if (!draft) {
    return (
      <div className="space-y-4 pb-32">
        <header className="flex items-center gap-3">
          <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>Offseason</div>
            <h1 className="font-display text-3xl">DRAFT</h1>
          </div>
        </header>
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-2">🎓</div>
          <div className="font-display text-lg mb-1">No active draft</div>
          <div className="text-sm text-ink-200 max-w-md mx-auto">
            The draft opens after each season ends. Finish your current season, crown a champion, and the draft will appear here.
          </div>
        </div>
      </div>
    );
  }

  const teamOnClock = lg.teams.find(t => t.id === draft.pickOrder[draft.currentPick % draft.pickOrder.length]);
  const totalPicks = draft.pickOrder.length * draft.rounds;
  const round = Math.ceil((draft.currentPick + 1) / draft.pickOrder.length);
  const pickInRound = (draft.currentPick % draft.pickOrder.length) + 1;
  const userTeamUp = teamOnClock?.id === lg.userTeamId;
  const userTeam = lg.teams.find(t => t.id === lg.userTeamId);

  const top = draft.pool.slice(0, 30);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>
            Class of {draft.season} · {draft.pool.length} available
          </div>
          <h1 className="font-display text-3xl">DRAFT</h1>
        </div>
      </header>

      {draft.completed ? (
        <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.18), rgba(8,12,20,0.85))", border: "1px solid rgba(52,211,153,0.45)" }}>
          <div className="text-4xl mb-2">✅</div>
          <div className="font-display text-xl mb-1">Draft Complete</div>
          <div className="text-sm text-ink-200 mb-4">
            All {totalPicks} picks recorded. Head back to the home page to start the new season.
          </div>
          <Link to="/football" className="inline-block px-4 py-2 rounded-xl pressable touch-target font-display tracking-wider text-sm"
            style={{ background: "#FFB81C", color: "#0a0d13" }}>
            ← Back to Home
          </Link>
        </div>
      ) : (
        <>
          {/* On-the-clock */}
          <section className="rounded-2xl p-4"
            style={{
              background: userTeamUp
                ? `linear-gradient(135deg, ${teamOnClock?.primary ?? "#FFB81C"}55, rgba(15,20,28,0.85))`
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${userTeamUp ? teamOnClock?.accent ?? "#FFB81C" : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="flex items-center gap-3">
              {teamOnClock && (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-lg shrink-0"
                  style={{ background: teamOnClock.primary, color: teamOnClock.accent, border: `2px solid ${teamOnClock.accent}` }}>
                  {teamOnClock.abbr}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: userTeamUp ? teamOnClock?.accent : "#FFB81C" }}>
                  On the Clock — Round {round} · Pick {pickInRound}
                </div>
                <div className="font-display text-lg truncate">
                  {teamOnClock ? `${teamOnClock.city} ${teamOnClock.name}` : "—"}
                  {userTeamUp && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: teamOnClock?.accent, color: "#0a0d13" }}>YOU</span>}
                </div>
                <div className="text-[11px] text-ink-200 mt-0.5">
                  Pick {draft.currentPick + 1} of {totalPicks} · {draft.picks.length} made
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {!userTeamUp && (
                <button onClick={() => withBusy(() => mutate(lgs => { cpuFootballDraftPick(lgs); }))}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl text-xs font-display tracking-wider pressable touch-target disabled:opacity-50 inline-flex items-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                  {busy && <Loader size={12} className="animate-spin" />}
                  CPU pick →
                </button>
              )}
              <button onClick={() => withBusy(() => mutate(lgs => { autoCompleteFootballDraft(lgs); }))}
                disabled={busy}
                className="px-3 py-2 rounded-xl text-xs font-display tracking-wider pressable touch-target disabled:opacity-50 inline-flex items-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                {busy && <Loader size={12} className="animate-spin" />}
                Auto-complete draft
              </button>
            </div>
          </section>

          {/* Best available */}
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#FFB81C" }}>
              BEST AVAILABLE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {top.map((p, i) => {
                const visits = (p as any).scoutVisits ?? 0;
                const scoutedPot: number = (p as any).scoutedPotential ?? p.potential;
                const noise = visits >= 3 ? 0 : visits === 2 ? 3 : visits === 1 ? 7 : 12;
                const potDisplay = noise === 0 ? `${scoutedPot}` : `${Math.max(40, scoutedPot - noise)}–${Math.min(99, scoutedPot + noise)}`;
                const revealedGem = visits >= 3 && (p as any).hiddenGem;
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm"
                    style={{
                      background: revealedGem ? "rgba(168,85,247,0.10)" : "rgba(0,0,0,0.3)",
                      border: `1px solid ${revealedGem ? "rgba(168,85,247,0.50)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span className="font-mono text-[10px] text-ink-300 w-6 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display tracking-wide truncate flex items-center gap-1.5">
                        {p.name}
                        {revealedGem && <Gem size={11} className="text-purple-400" />}
                      </div>
                      <div className="text-[10px] text-ink-300">
                        {p.position} · Age {p.age} · Pot {potDisplay} <span className="opacity-70">({visits} scout{visits === 1 ? "" : "s"})</span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-base w-8 text-right ${p.overall >= 85 ? "text-emerald-300" : p.overall >= 75 ? "text-amber-300" : "text-ink-200"}`}>{p.overall}</span>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => withBusy(() => mutate(lgs => { scoutRookie(lgs.currentDraft!.pool.find(x => x.id === p.id) ?? p); }))}
                        disabled={busy || visits >= 3}
                        title="Scout to tighten the potential estimate (3 scouts reveals truth)"
                        className="text-[10px] px-2 py-1 rounded-md pressable touch-target inline-flex items-center gap-1 disabled:opacity-30"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}>
                        <Search size={9} /> {visits >= 3 ? "✓" : "Scout"}
                      </button>
                      <button onClick={() => withBusy(() => mutate(lgs => { makeFootballDraftPick(lgs, p.id); }))}
                        disabled={busy || !userTeamUp}
                        title={userTeamUp ? "Draft this player for your team" : "Not your team's pick"}
                        className="text-[10px] px-2 py-1 rounded-md font-display tracking-widest pressable touch-target disabled:opacity-30"
                        style={{ background: userTeamUp ? "#FFB81C" : "rgba(255,255,255,0.06)", color: userTeamUp ? "#0a0d13" : "rgba(255,255,255,0.5)" }}>
                        Draft
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent picks */}
          {draft.picks.length > 0 && (
            <section className="rounded-2xl p-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#FFB81C" }}>
                RECENT PICKS
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {draft.picks.slice().reverse().slice(0, 20).map(pk => {
                  const team = lg.teams.find(t => t.id === pk.teamId);
                  const p = lg.players.find(pl => pl.id === pk.playerId);
                  if (!team || !p) return null;
                  const isUser = team.id === lg.userTeamId;
                  return (
                    <div key={pk.pick} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                      style={{
                        background: isUser ? `${team.primary}33` : "rgba(0,0,0,0.20)",
                        border: isUser ? `1px solid ${team.accent}66` : "1px solid rgba(255,255,255,0.05)",
                      }}>
                      <span className="font-mono text-ink-300 w-10 text-right">R{pk.round}.{pk.pick}</span>
                      <span className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-display"
                        style={{ background: team.primary, color: team.accent }}>{team.abbr.slice(0, 3)}</span>
                      <span className="font-semibold">{team.abbr}</span>
                      <span className="text-ink-300">selects</span>
                      <Link to={`/football/player/${p.id}`} className="flex-1 truncate pressable">{p.name}</Link>
                      <span className="text-ink-400 text-[10px]">{p.position}</span>
                      <span className="font-mono text-amber-300">{p.overall}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
