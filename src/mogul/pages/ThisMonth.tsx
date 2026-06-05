// This Month — the studio hub. Shows news, your active productions,
// scheduled releases (yours + rivals'), and time-advancement buttons.
import { useMogul } from "../store";
import { advanceWeeks, advanceMonths, isBankrupt } from "../engine";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FastForward, SkipForward, Play, ArrowRight, AlertTriangle, Newspaper } from "lucide-react";
import { playSfx, unlockAudio } from "../../art";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ThisMonth() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const [busy, setBusy] = useState(false);

  const tick = async (kind: "week" | "month" | "quarter") => {
    if (busy) return;
    setBusy(true);
    unlockAudio();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    // Premieres trigger when a release lands this period — count releases
    // before/after to detect a premiere-this-tick and play the moment.
    const releasesBefore = studio.releases.length;
    try {
      await mutate(s => {
        if (kind === "week") advanceWeeks(s, 1);
        else if (kind === "month") advanceMonths(s, 1);
        else advanceMonths(s, 3);
      });
    } finally {
      setBusy(false);
      // Premiere chime if any movie released this tick
      const releasesAfter = useMogul.getState().studio?.releases.length ?? releasesBefore;
      if (releasesAfter > releasesBefore) {
        playSfx("crowdCheer", { volume: 0.6 });
        playSfx("ding", { volume: 0.6, pitch: 1.3 });
      } else {
        playSfx("click", { volume: 0.35 });
      }
    }
  };

  const player = studio.player;
  const myProductions = studio.productions.filter(p => p.studioId === player.id && p.stage !== "released" && p.stage !== "cancelled");
  const myReleases = studio.releases.filter(r => r.studioId === player.id).slice(0, 5);
  const scheduledMine = studio.productions
    .filter(p => p.studioId === player.id && p.stage !== "cancelled" && p.stage !== "released")
    .slice()
    .sort((a, b) => (a.releaseYear - b.releaseYear) * 12 + (a.releaseMonth - b.releaseMonth));
  const scheduledRivals = studio.productions
    .filter(p => p.studioId !== player.id && p.stage !== "cancelled" && p.stage !== "released")
    .slice()
    .sort((a, b) => (a.releaseYear - b.releaseYear) * 12 + (a.releaseMonth - b.releaseMonth))
    .slice(0, 4);

  const myNews = (() => {
    const mine = studio.newsLog.filter(n => Array.isArray(n.studioIds) && n.studioIds!.includes(player.id)).slice(0, 4);
    const others = studio.newsLog.filter(n => !mine.includes(n)).slice(0, Math.max(0, 5 - mine.length));
    return [...mine, ...others].slice(0, 5);
  })();

  // Actions needed.
  const tasks: { emoji: string; label: string; href?: string }[] = [];
  if (myProductions.length === 0 && studio.scripts.filter(s => s.studioId === player.id && !s.used).length === 0) {
    tasks.push({ emoji: "📝", label: "No scripts in development — browse the market", href: "/mogul/studio/industry" });
  }
  if (studio.scripts.filter(s => s.studioId === player.id && !s.used).length > 0 && myProductions.length === 0) {
    tasks.push({ emoji: "🎬", label: "You own scripts — greenlight a production", href: "/mogul/studio/manage" });
  }
  if (player.cash < 5) {
    tasks.push({ emoji: "🚨", label: "Cash running low — review finances", href: "/mogul/studio/manage" });
  }
  if (player.loan > 0 && player.loanMonthsLeft <= 6) {
    tasks.push({ emoji: "🏦", label: `Bank loan due in ${player.loanMonthsLeft}mo — $${player.loan.toFixed(1)}M outstanding`, href: "/mogul/studio/manage" });
  }
  if (studio.awards[0] && !studio.awards[0].ceremonyDone && studio.month >= 1 && studio.month <= 3) {
    tasks.push({ emoji: "🏛️", label: `Golden Reel ceremony approaching — check nominations`, href: "/mogul/studio/awards" });
  }
  if (studio.blackList && !studio.blackList.resolved) {
    tasks.push({ emoji: "📜", label: `The ${studio.blackList.year} Black List dropped — pre-vetted scripts available now`, href: "/mogul/studio/industry" });
  }

  const bankrupt = isBankrupt(studio);

  return (
    <div className="space-y-5">
      {/* STUDIO HERO */}
      <div
        className="rounded-3xl relative overflow-hidden"
        style={{ border: `1px solid ${player.primary}66` }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${player.primary} 0%, ${player.primary}cc 45%, rgba(8,4,12,0.95))` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(900px 380px at 88% -8%, ${player.accent}55, transparent 55%)` }} />
        <div className="relative p-5 lg:p-7">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-3xl shadow-xl" style={{ background: player.primary, color: player.accent, border: `2px solid ${player.accent}` }}>
              🎬
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.35em] font-display" style={{ color: player.accent }}>YOUR STUDIO</div>
              <div className="font-display text-3xl lg:text-4xl leading-none" style={{ color: player.accent, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
                {player.name.toUpperCase()}
              </div>
              <div className="text-white/90 text-sm mt-2">
                Mogul: {player.moguleName}
                <span className="text-white/50 mx-1.5">·</span>
                <span className="font-mono">${player.cash.toFixed(1)}M</span>
                <span className="text-white/50 mx-1.5">·</span>
                {"★".repeat(player.prestige)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bankrupt && (
        <BankruptcyBanner studio={studio} />
      )}

      {/* ACTIONS */}
      {tasks.length > 0 && !bankrupt && (
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.20), rgba(255,140,0,0.08))", border: "1px solid rgba(212,175,55,0.55)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <AlertTriangle size={13} style={{ color: "#D4AF37" }} />
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#D4AF37" }}>ACTIONS NEEDED · {tasks.length}</div>
          </div>
          <ul className="space-y-1">
            {tasks.map((t, i) => t.href ? (
              <li key={i}>
                <Link to={t.href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 pressable touch-target">
                  <span className="text-base">{t.emoji}</span>
                  <span className="flex-1 text-sm text-white">{t.label}</span>
                  <ArrowRight size={12} style={{ color: "#D4AF37" }} />
                </Link>
              </li>
            ) : (
              <li key={i} className="flex items-center gap-2.5 px-2 py-2 text-sm text-white/90">
                <span className="text-base">{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ADVANCE TIME */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(20,12,28,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-3">ADVANCE TIME</div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => tick("week")} disabled={busy} className="rounded-xl px-3 py-3 pressable touch-target text-center min-h-[64px] disabled:opacity-40" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", touchAction: "manipulation" }}>
            <div className="flex items-center justify-center gap-1.5"><SkipForward size={14} style={{ color: "#D4AF37" }} /><span className="font-display tracking-widest text-xs">+1 Week</span></div>
            <div className="text-[10px] text-ink-300 mt-1">Box office update</div>
          </button>
          <button onClick={() => tick("month")} disabled={busy} className="rounded-xl px-3 py-3 pressable touch-target text-center min-h-[64px] disabled:opacity-40" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))", border: "1px solid rgba(212,175,55,0.45)", touchAction: "manipulation" }}>
            <div className="flex items-center justify-center gap-1.5"><FastForward size={14} style={{ color: "#D4AF37" }} /><span className="font-display tracking-widest text-xs" style={{ color: "#D4AF37" }}>+1 Month</span></div>
            <div className="text-[10px] text-ink-300 mt-1">Productions tick</div>
          </button>
          <button onClick={() => tick("quarter")} disabled={busy} className="rounded-xl px-3 py-3 pressable touch-target text-center min-h-[64px] disabled:opacity-40" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", touchAction: "manipulation" }}>
            <div className="flex items-center justify-center gap-1.5"><FastForward size={14} style={{ color: "#fff" }} /><span className="font-display tracking-widest text-xs">+3 Months</span></div>
            <div className="text-[10px] text-ink-300 mt-1">Big jumps</div>
          </button>
        </div>
        {busy && <div className="text-[10px] text-ink-300 italic mt-2 text-center">Advancing the calendar…</div>}
      </div>

      {/* YOUR PRODUCTIONS */}
      <div className="rounded-2xl p-4 card-elevated" style={{ background: "rgba(20,12,28,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">YOUR PRODUCTIONS</div>
          <Link to="/mogul/studio/manage" className="text-[11px] inline-flex items-center gap-1 pressable touch-target" style={{ color: "#D4AF37" }}>
            Manage <ArrowRight size={11} />
          </Link>
        </div>
        {myProductions.length === 0 ? (
          <div className="text-[12px] text-ink-300 italic">
            Nothing in development. Head to <Link to="/mogul/studio/industry" className="underline" style={{ color: "#D4AF37" }}>Industry → Script Market</Link> to find a story worth telling.
          </div>
        ) : (
          <div className="space-y-2">
            {myProductions.map(p => (
              <Link key={p.id} to="/mogul/studio/manage" className="block rounded-xl px-3 py-2.5 pressable touch-target" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display tracking-wide truncate">"{p.title}"</div>
                    <div className="text-[10px] text-ink-300">{p.genre} · {prettyStage(p.stage)} ({p.monthsLeftInStage}mo left)</div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="font-mono text-ink-100">${(p.budget.production + p.budget.fx).toFixed(0)}M</div>
                    <div className="text-[10px] text-ink-300">→ {MONTHS[p.releaseMonth - 1]} {p.releaseYear}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* NEWS */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(20,12,28,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Newspaper size={14} style={{ color: "#D4AF37" }} />
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-100">INDUSTRY NEWS</div>
        </div>
        {myNews.length === 0 && <div className="text-[12px] text-ink-300 italic">Quiet so far. Advance time to see the trades fire up.</div>}
        <div className="space-y-1">
          {myNews.map(n => {
            const isMine = Array.isArray(n.studioIds) && n.studioIds!.includes(player.id);
            return (
              <div
                key={n.id}
                className="block px-2 py-1.5 rounded-lg"
                style={{ borderLeft: isMine ? `2px solid ${player.accent}` : "2px solid transparent" }}
              >
                <div className="text-[9px] uppercase tracking-widest text-ink-300">{n.category}</div>
                <div className={`text-[13px] leading-snug ${n.important ? "font-semibold" : ""} ${isMine ? "text-white" : "text-ink-100"}`}>
                  <span className="mr-1.5">{n.emoji ?? "📰"}</span>{n.headline}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SCHEDULED RELEASES — yours and rivals */}
      {(scheduledMine.length > 0 || scheduledRivals.length > 0) && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(20,12,28,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">SCHEDULED RELEASES</div>
          <div className="space-y-1">
            {[...scheduledMine, ...scheduledRivals]
              .sort((a, b) => (a.releaseYear - b.releaseYear) * 12 + (a.releaseMonth - b.releaseMonth))
              .slice(0, 8)
              .map(p => {
                const mine = p.studioId === player.id;
                const studioName = mine ? player.abbr : studio.rivals.find(r => r.id === p.studioId)?.abbr ?? "—";
                return (
                  <div key={p.id} className="flex items-center gap-2 text-[12px] px-2 py-1.5 rounded-md" style={{ background: mine ? `${player.primary}22` : "transparent" }}>
                    <span className="font-mono text-ink-300 w-16 shrink-0">{MONTHS[p.releaseMonth - 1]} {p.releaseYear}</span>
                    <span className="flex-1 truncate">"{p.title}"</span>
                    <span className="font-display text-[10px] tracking-widest" style={{ color: mine ? player.accent : "#94a3b8" }}>{mine ? "YOU" : studioName}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* YOUR RECENT RELEASES */}
      {myReleases.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(20,12,28,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">YOUR RECENT RELEASES</div>
          <div className="space-y-1">
            {myReleases.map(r => {
              const profitColor = r.profit > 0 ? "#34d399" : "#f87171";
              return (
                <div key={r.id} className="flex items-center gap-2 text-[12px] px-2 py-1.5 rounded-md" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="font-display flex-1 truncate">"{r.title}"</span>
                  <span className="font-mono text-ink-300">${r.totalBO.toFixed(1)}M BO</span>
                  <span className="font-mono" style={{ color: profitColor }}>{r.profit >= 0 ? "+" : ""}${r.profit.toFixed(1)}M</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function prettyStage(s: string): string {
  switch (s) {
    case "development": return "Development";
    case "preProduction": return "Pre-Production";
    case "filming": return "Filming";
    case "postProduction": return "Post-Production";
    default: return s;
  }
}

function BankruptcyBanner({ studio }: { studio: ReturnType<typeof useMogul.getState>["studio"] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.30), rgba(80,0,0,0.6))", border: "1px solid rgba(239,68,68,0.6)" }}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-red-300" />
        <div className="font-display tracking-widest text-red-300">BANKRUPTCY</div>
      </div>
      <div className="text-sm text-white/90 mb-3">
        {studio!.player.name} has defaulted too many times. Banks won't lend, productions can't fund.
      </div>
      <div className="text-[11px] text-red-200">
        What went wrong? Likely a combination of {studio!.player.totalRevenue < 50 ? "thin revenue, " : ""}{studio!.player.defaults} loan default{studio!.player.defaults === 1 ? "" : "s"}, and high burn ({studio!.player.cash.toFixed(1)}M on hand). Try a new studio with tighter budgets — fewer A-list signings, lean productions, faster releases.
      </div>
    </div>
  );
}
