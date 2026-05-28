// Studio Manage — the user's primary control surface. Sub-tabs:
// Scripts (your library), Productions (in-flight pipeline), Talent
// (under contract), Facilities, Finance (cash + loans + upgrades).
import { useMogul } from "../store";
import { useMemo, useState } from "react";
import {
  greenlightMovie, runTestScreening, takeLoan, repayLoan, upgradeFacility,
  dropTalent, runCoverage, releaseSoundtrack,
} from "../engine";
import type { Genre, Production, Talent, Script, CaveatId, ContentRating, RequiredRole } from "../types";
import { checkCastingCompat, evaluateOffer, ratingReachModifier } from "../engine";
import { Coins, Briefcase, Film, Building2, Users, Hammer, AlertTriangle, Sparkles, X, Check, Search, Gem, ChevronDown, ChevronUp } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Sub = "scripts" | "productions" | "talent" | "facilities" | "finance";

export default function StudioManage() {
  const studio = useMogul(s => s.studio)!;
  const [sub, setSub] = useState<Sub>("productions");

  const tabs: { id: Sub; label: string; icon: any }[] = [
    { id: "productions", label: "Productions", icon: Film },
    { id: "scripts", label: "Scripts", icon: Briefcase },
    { id: "talent", label: "Talent", icon: Users },
    { id: "facilities", label: "Facilities", icon: Hammer },
    { id: "finance", label: "Finance", icon: Coins },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} className="px-3 py-2 rounded-xl text-xs font-display tracking-widest whitespace-nowrap touch-target pressable inline-flex items-center gap-1.5" style={{
            background: sub === t.id ? "#D4AF37" : "rgba(255,255,255,0.05)",
            color: sub === t.id ? "#0a0a0a" : "#fff",
            border: sub === t.id ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.10)",
            touchAction: "manipulation",
          }}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {sub === "productions" && <ProductionsTab />}
      {sub === "scripts" && <ScriptsTab />}
      {sub === "talent" && <TalentTab />}
      {sub === "facilities" && <FacilitiesTab />}
      {sub === "finance" && <FinanceTab />}
    </div>
  );
}

// ─── PRODUCTIONS ──────────────────────────────────────────────

function ProductionsTab() {
  const studio = useMogul(s => s.studio)!;
  const player = studio.player;
  const mine = studio.productions.filter(p => p.studioId === player.id && p.stage !== "cancelled" && p.stage !== "released");
  const recent = studio.releases.filter(r => r.studioId === player.id).slice(0, 5);
  const [greenlightOpen, setGreenlightOpen] = useState(false);
  const ownedScripts = studio.scripts.filter(s => s.studioId === player.id && !s.used);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3" style={{ background: "rgba(20,12,28,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">IN PRODUCTION · {mine.length}</div>
          <button
            onClick={() => setGreenlightOpen(true)}
            disabled={ownedScripts.length === 0}
            className="px-4 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target inline-flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: "#D4AF37", color: "#0a0a0a", minHeight: 44, touchAction: "manipulation" }}
          >
            <Sparkles size={12} /> Greenlight
          </button>
        </div>
        {mine.length === 0 ? (
          <div className="text-[12px] text-ink-300 italic">No active productions. {ownedScripts.length === 0 ? "Buy a script first." : `You own ${ownedScripts.length} script${ownedScripts.length === 1 ? "" : "s"} — greenlight one.`}</div>
        ) : (
          <div className="space-y-2">
            {mine.map(p => <ProductionRow key={p.id} production={p} />)}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: "rgba(20,12,28,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">RECENT RELEASES</div>
          {recent.map(r => <ReleasedMovieRow key={r.id} movie={r} />)}
        </div>
      )}

      {greenlightOpen && <GreenlightWizard onClose={() => setGreenlightOpen(false)} />}
    </div>
  );
}

function ProductionRow({ production }: { production: Production }) {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const [open, setOpen] = useState(false);
  const dir = production.directorId ? studio.talent.find(t => t.id === production.directorId) : null;
  const star = production.starId ? studio.talent.find(t => t.id === production.starId) : null;
  const totalBudget = production.budget.production + production.budget.fx + production.budget.marketing;

  const onTest = () => mutate(s => { runTestScreening(s, production.id); });

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left pressable touch-target">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display tracking-wide truncate">"{production.title}"</div>
            <div className="text-[10px] text-ink-300">
              {production.genre} · {prettyStage(production.stage)} ({production.monthsLeftInStage}mo)
            </div>
          </div>
          <div className="text-right text-[11px] shrink-0">
            <div className="font-mono text-ink-100">${totalBudget.toFixed(0)}M</div>
            <div className="text-[10px] text-ink-300">→ {MONTHS[production.releaseMonth - 1]} {production.releaseYear}</div>
          </div>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && (
        <div className="mt-2 pt-2 border-t border-white/8 space-y-1 text-[11px]">
          <div><span className="text-ink-300">Director:</span> {dir ? `${dir.name} (${"★".repeat(dir.star)})` : <em className="text-ink-400">— none —</em>}</div>
          <div><span className="text-ink-300">Lead:</span> {star ? `${star.name} (${"★".repeat(star.star)})` : <em className="text-ink-400">— none —</em>}</div>
          <div><span className="text-ink-300">Budgets:</span> Prod ${production.budget.production}M · FX ${production.budget.fx}M · Mktg ${production.budget.marketing}M</div>
          <div><span className="text-ink-300">Spent:</span> ${production.spent.toFixed(1)}M of ${totalBudget.toFixed(0)}M</div>
          <div><span className="text-ink-300">Quality est:</span> {production.testScreened ? `${production.testScreenScore} / 100 (test)` : "Unknown (run a test screening?)"}</div>
          {production.stage === "postProduction" && !production.testScreened && (
            <button onClick={onTest} className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] pressable touch-target" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
              <Search size={11} /> Run Test Screening ($0.5M)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function prettyStage(s: string): string {
  return s === "development" ? "Development" : s === "preProduction" ? "Pre-Production" : s === "filming" ? "Filming" : "Post-Production";
}

function ReleasedMovieRow({ movie }: { movie: import("../types").ReleasedMovie }) {
  const mutate = useMogul(s => s.mutate);
  const [open, setOpen] = useState(false);
  const profitColor = movie.profit >= 0 ? "#34d399" : "#f87171";

  return (
    <div className="rounded-md mb-1 last:mb-0" style={{ background: "rgba(255,255,255,0.03)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 pressable touch-target">
        <span className="font-display flex-1 truncate text-left">"{movie.title}"</span>
        <span className="text-[10px] text-ink-300 font-mono">${movie.totalBO.toFixed(1)}M</span>
        <span className="text-[10px] font-mono" style={{ color: profitColor }}>
          {movie.profit >= 0 ? "+" : ""}${movie.profit.toFixed(1)}M
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 pb-2.5 text-[11px] space-y-1.5">
          {movie.criticReview && (
            <div className="rounded-md p-2" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <div className="text-[9px] tracking-widest text-amber-300 mb-0.5">REVIEW · {movie.criticReview.critic}</div>
              <div className="italic text-ink-100">"{movie.criticReview.quote}"</div>
              <div className="text-[10px] text-ink-300 mt-1">Score: {movie.criticScore}/100</div>
            </div>
          )}
          <div className="text-ink-300">
            Quality <span className="text-white font-mono">{movie.quality.toFixed(0)}/100</span>
            <span className="opacity-60 mx-1">·</span>
            Audience <span className="text-white font-mono">{movie.audienceScore}/100</span>
          </div>
          <div className="text-ink-300">
            Opening <span className="text-white font-mono">${movie.opening.toFixed(1)}M</span>
            <span className="opacity-60 mx-1">·</span>
            Budget <span className="text-white font-mono">${movie.budget.toFixed(1)}M</span>
          </div>
          {movie.foreign && (
            <div className="rounded-md p-2" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.18)" }}>
              <div className="text-[9px] tracking-widest text-sky-300 mb-1">FOREIGN BOX OFFICE</div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                <div className="text-center"><div className="text-ink-300">🇨🇳 China</div><div className="font-mono">${movie.foreign.china.toFixed(1)}M</div></div>
                <div className="text-center"><div className="text-ink-300">🇪🇺 Europe</div><div className="font-mono">${movie.foreign.europe.toFixed(1)}M</div></div>
                <div className="text-center"><div className="text-ink-300">🇯🇵 Japan</div><div className="font-mono">${movie.foreign.japan.toFixed(1)}M</div></div>
                <div className="text-center"><div className="text-ink-300">🌎 LATAM</div><div className="font-mono">${movie.foreign.southAmerica.toFixed(1)}M</div></div>
              </div>
            </div>
          )}
          {movie.awards.length > 0 && (
            <div className="text-[10px]" style={{ color: "#D4AF37" }}>
              🏆 {movie.awards.join(" · ")}
            </div>
          )}
          {!movie.soundtrack?.released ? (
            <button onClick={() => mutate(s => { releaseSoundtrack(s, movie.id); })} className="w-full mt-1 px-2 py-1.5 rounded-md text-[11px] pressable touch-target inline-flex items-center justify-center gap-1.5" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
              🎵 Release Soundtrack Album
            </button>
          ) : (
            <div className="text-[10px] text-ink-300">🎵 Soundtrack released — +${movie.soundtrack.revenue.toFixed(1)}M</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GREENLIGHT WIZARD V2 ─────────────────────────────────────
// Project-centric flow: pick a script, then fill each required cast
// slot (with content-rating compatibility + caveat negotiation), pick
// a director, set budgets + rating + release date, greenlight.

function GreenlightWizard({ onClose }: { onClose: () => void }) {
  const studio = useMogul(s => s.studio)!;
  const player = studio.player;
  const mutate = useMogul(s => s.mutate);
  const ownedScripts = studio.scripts.filter(s => s.studioId === player.id && !s.used);

  const [scriptId, setScriptId] = useState<string>(ownedScripts[0]?.id ?? "");
  const script = studio.scripts.find(sc => sc.id === scriptId);
  // Cast: slot → talentId
  const [cast, setCast] = useState<Record<string, string>>({});
  const [grantedCaveats, setGrantedCaveats] = useState<Record<string, CaveatId[]>>({});
  const [directorId, setDirectorId] = useState<string>("");
  // Default target rating = the script's natural rating; user can soften.
  const [targetRating, setTargetRating] = useState<ContentRating>(script?.rating ?? "PG-13");
  const [production, setProduction] = useState(15);
  const [fx, setFx] = useState(2);
  const [marketing, setMarketing] = useState(3);
  const [pressTour, setPressTour] = useState(0);
  const [releaseMonths, setReleaseMonths] = useState(6);
  const [err, setErr] = useState<string | null>(null);
  const [hiringFor, setHiringFor] = useState<{ role: RequiredRole; isLead: boolean } | "director" | null>(null);

  // Reset cast when script changes.
  const onScriptChange = (id: string) => {
    setScriptId(id);
    setCast({});
    setGrantedCaveats({});
    const sc = studio.scripts.find(x => x.id === id);
    setTargetRating(sc?.rating ?? "PG-13");
  };

  const requiredRoles = script?.requiredRoles ?? [];
  const allRolesFilled = requiredRoles.every(r => cast[r.slot]);

  const onCast = (slot: string, talentId: string, granted: CaveatId[]) => {
    setCast(prev => ({ ...prev, [slot]: talentId }));
    setGrantedCaveats(prev => ({ ...prev, [talentId]: granted }));
    setHiringFor(null);
  };

  const onCastDirector = (talentId: string, granted: CaveatId[]) => {
    setDirectorId(talentId);
    setGrantedCaveats(prev => ({ ...prev, [talentId]: granted }));
    setHiringFor(null);
  };

  const submit = () => {
    setErr(null);
    if (!allRolesFilled) {
      setErr(`Fill all ${requiredRoles.length} cast slots before greenlighting.`);
      return;
    }
    const leadSlot = requiredRoles.find(r => r.isLead)?.slot ?? requiredRoles[0]?.slot;
    const starId = leadSlot ? cast[leadSlot] : null;
    const supportingIds = Object.entries(cast)
      .filter(([slot]) => slot !== leadSlot)
      .map(([, id]) => id);
    mutate(s => {
      const res = greenlightMovie(s, {
        scriptId, directorId: directorId || null, starId: starId ?? null,
        supportingIds, cast, grantedCaveats, targetRating,
        budgetProduction: production, budgetFx: fx, budgetMarketing: marketing,
        budgetPressTour: pressTour, releaseMonthsOut: releaseMonths,
      });
      if (!res.ok) setErr(res.reason);
    });
    setTimeout(() => { if (!err) onClose(); }, 50);
  };

  const audience = ratingReachModifier(targetRating);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md rounded-2xl p-4 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, rgba(20,12,28,0.98), rgba(8,4,12,0.98))", border: "1px solid rgba(212,175,55,0.45)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display tracking-widest" style={{ color: "#D4AF37" }}>GREENLIGHT A PROJECT</div>
          <button onClick={onClose} className="text-ink-300 pressable touch-target" style={{ minWidth: 32, minHeight: 32 }}><X size={16} /></button>
        </div>
        {ownedScripts.length === 0 ? (
          <div className="text-sm text-ink-200">You don't own any unproduced scripts. Buy one from Industry → Script Market.</div>
        ) : (
          <>
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">SCRIPT</label>
            <select value={scriptId} onChange={e => onScriptChange(e.target.value)} className="w-full px-2 py-2 mb-2 rounded-lg bg-white/10 border border-white/15 text-sm" style={{ minHeight: 44 }}>
              {ownedScripts.map(s => <option key={s.id} value={s.id}>"{s.title}" — {s.genre} ({"★".repeat(s.scoutedQuality)})</option>)}
            </select>
            {script?.premise && (
              <div className="text-[11px] text-ink-200 italic mb-2 px-1">{script.premise}</div>
            )}

            {/* CONTENT RATING */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1 mt-2">CONTENT RATING</label>
            <div className="grid grid-cols-5 gap-1 mb-1">
              {(["G", "PG", "PG-13", "R", "NC-17"] as ContentRating[]).map(r => {
                const isNatural = script?.rating === r;
                const selected = targetRating === r;
                return (
                  <button
                    key={r}
                    onClick={() => setTargetRating(r)}
                    className="px-2 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
                    style={{
                      background: selected ? "#D4AF37" : "rgba(255,255,255,0.05)",
                      color: selected ? "#0a0a0a" : "#fff",
                      border: `1px solid ${selected ? "#D4AF37" : "rgba(255,255,255,0.10)"}`,
                      minHeight: 44,
                      touchAction: "manipulation",
                    }}
                  >{r}{isNatural && <span className="opacity-60 text-[8px] block">natural</span>}</button>
                );
              })}
            </div>
            <div className="text-[10px] text-ink-300 mb-3 italic">
              Audience reach: ×{audience.toFixed(2)}
              {targetRating === "R" && " — R cuts kids/families from the box."}
              {targetRating === "NC-17" && " — NC-17 closes many theaters."}
              {targetRating === "G" && " — G expands family appeal but caps adult interest."}
            </div>

            {/* CAST SLOTS */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">CAST ({Object.keys(cast).length}/{requiredRoles.length})</label>
            <div className="space-y-1.5 mb-3">
              {requiredRoles.map(role => {
                const filled = cast[role.slot];
                const t = filled ? studio.talent.find(x => x.id === filled) : null;
                const grantedHere = filled ? grantedCaveats[filled] ?? [] : [];
                return (
                  <button
                    key={role.slot}
                    onClick={() => setHiringFor({ role, isLead: !!role.isLead })}
                    className="w-full text-left px-3 py-2.5 rounded-lg pressable touch-target flex items-center gap-2"
                    style={{
                      background: filled ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${filled ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.10)"}`,
                      minHeight: 48,
                      touchAction: "manipulation",
                    }}
                  >
                    <span className="font-display tracking-widest text-[10px] text-ink-300 w-20 shrink-0">{role.label.toUpperCase()}</span>
                    {t ? (
                      <>
                        <span className="flex-1 text-sm truncate">{t.name}</span>
                        <span className="text-[10px] text-amber-300">{"★".repeat(t.star)}</span>
                        {grantedHere.length > 0 && <span className="text-[9px] text-amber-300">+{grantedHere.length} caveat{grantedHere.length === 1 ? "" : "s"}</span>}
                      </>
                    ) : (
                      <span className="flex-1 text-sm italic text-ink-400">Tap to cast</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* DIRECTOR */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">DIRECTOR</label>
            <button
              onClick={() => setHiringFor("director")}
              className="w-full text-left px-3 py-2.5 rounded-lg pressable touch-target flex items-center gap-2 mb-3"
              style={{
                background: directorId ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${directorId ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.10)"}`,
                minHeight: 48,
                touchAction: "manipulation",
              }}
            >
              {directorId ? (
                <>
                  <span className="flex-1 truncate text-sm">{studio.talent.find(t => t.id === directorId)?.name}</span>
                  <span className="text-[10px] text-amber-300">{"★".repeat(studio.talent.find(t => t.id === directorId)?.star ?? 0)}</span>
                </>
              ) : <span className="flex-1 italic text-sm text-ink-400">Tap to hire a director (optional — mediocre without)</span>}
            </button>

            {/* BUDGETS */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">BUDGETS ($M)</label>
            <div className="space-y-2 mb-3">
              <BudgetSlider label="Production" value={production} max={80} onChange={setProduction} />
              <BudgetSlider label="Special FX" value={fx} max={40} onChange={setFx} />
              <BudgetSlider label="Marketing" value={marketing} max={40} onChange={setMarketing} />
              <BudgetSlider label="Press Tour" value={pressTour} max={10} onChange={setPressTour} />
            </div>
            <div className="text-[11px] text-ink-200 mb-3">
              Total: <span className="font-mono">${(production + fx + marketing + pressTour).toFixed(0)}M</span>
              <span className="opacity-60 mx-1.5">·</span>
              Cash: <span className="font-mono">${player.cash.toFixed(1)}M</span>
            </div>

            {/* RELEASE WINDOW */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">RELEASE WINDOW</label>
            <select value={releaseMonths} onChange={e => setReleaseMonths(Number(e.target.value))} className="w-full px-2 py-2 mb-3 rounded-lg bg-white/10 border border-white/15 text-sm" style={{ minHeight: 44 }}>
              <option value={5}>5 months out (rushed)</option>
              <option value={6}>6 months out</option>
              <option value={9}>9 months out</option>
              <option value={12}>12 months out (prestige slot)</option>
              <option value={18}>18 months out (long lead)</option>
            </select>

            {err && (
              <div className="rounded-lg p-2 mb-3 text-[12px]" style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}>
                {err}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target" style={{ minHeight: 44 }}>Cancel</button>
              <button onClick={submit} disabled={!allRolesFilled} className="px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: "#D4AF37", color: "#0a0a0a", minHeight: 44 }}>
                <Check size={12} /> Greenlight
              </button>
            </div>
          </>
        )}
      </div>

      {/* HIRING MODAL */}
      {hiringFor && script && (
        <HiringModal
          studio={studio}
          requirements={script.requirements}
          targetRating={targetRating}
          role={hiringFor === "director" ? "director" : "actor"}
          slotLabel={hiringFor === "director" ? "Director" : hiringFor.role.label}
          genderFilter={hiringFor === "director" ? "any" : hiringFor.role.gender}
          excludeIds={Object.values(cast).concat(directorId ? [directorId] : []).filter(Boolean)}
          onClose={() => setHiringFor(null)}
          onConfirm={(talentId, granted) => {
            if (hiringFor === "director") onCastDirector(talentId, granted);
            else onCast(hiringFor.role.slot, talentId, granted);
          }}
        />
      )}
    </div>
  );
}

// ─── HIRING MODAL ─────────────────────────────────────────────
// Filters the talent pool by role, gender, and content-rating
// compatibility. For each result, shows the talent's caveats inline —
// the user toggles which to grant before confirming the hire.

function HiringModal({
  studio, requirements, targetRating, role, slotLabel, genderFilter,
  excludeIds, onClose, onConfirm,
}: {
  studio: import("../types").Studio;
  requirements: import("../types").ContentComfort;
  targetRating: ContentRating;
  role: "actor" | "director";
  slotLabel: string;
  genderFilter: "M" | "F" | "any";
  excludeIds: string[];
  onClose: () => void;
  onConfirm: (talentId: string, granted: CaveatId[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grantedHere, setGrantedHere] = useState<CaveatId[]>([]);
  const player = studio.player;

  const pool = studio.talent.filter(t =>
    t.role === role &&
    !t.retired &&
    !excludeIds.includes(t.id) &&
    (genderFilter === "any" || (t.gender ?? "any") === "any" || t.gender === genderFilter) &&
    (t.studioId === null || t.studioId === player.id)
  );

  // Compatibility check; show comfort-blocked talent muted.
  const ranked = pool.map(t => ({
    t,
    compat: checkCastingCompat(t, requirements),
  })).sort((a, b) => {
    const aOk = a.compat.ok ? 1 : 0;
    const bOk = b.compat.ok ? 1 : 0;
    if (aOk !== bOk) return bOk - aOk;
    return b.t.star - a.t.star;
  });

  const selected = selectedId ? studio.talent.find(t => t.id === selectedId) : null;
  const offer = selected ? evaluateOffer(selected, grantedHere) : null;

  const toggleCaveat = (id: CaveatId) => {
    setGrantedHere(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirm = () => {
    if (!selected || !offer) return;
    // Simulate negotiation outcome: probabilistic accept based on
    // acceptanceProb. If they walk, surface a refusal toast instead.
    if (Math.random() > offer.acceptanceProb) {
      alert(`${selected.name} walks. They wanted more of their asks granted.`);
      return;
    }
    onConfirm(selected.id, grantedHere);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="w-full max-w-md rounded-2xl p-4 shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, rgba(25,15,30,0.98), rgba(10,5,12,0.98))", border: "1px solid rgba(212,175,55,0.5)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display tracking-widest text-sm" style={{ color: "#D4AF37" }}>HIRING · {slotLabel.toUpperCase()}</div>
          <button onClick={onClose} className="text-ink-300 pressable touch-target" style={{ minWidth: 32, minHeight: 32 }}><X size={16} /></button>
        </div>

        {!selected && (
          <>
            <div className="text-[11px] text-ink-300 mb-2">
              Target rating: <span className="text-white font-mono">{targetRating}</span> · {ranked.filter(x => x.compat.ok).length} compatible · {ranked.filter(x => !x.compat.ok).length} declined
            </div>
            <div className="space-y-1.5">
              {ranked.slice(0, 18).map(({ t, compat }) => (
                <button
                  key={t.id}
                  onClick={() => { if (compat.ok) { setSelectedId(t.id); setGrantedHere([]); } }}
                  disabled={!compat.ok}
                  className="w-full text-left px-3 py-2.5 rounded-lg pressable touch-target flex items-center gap-3 disabled:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    minHeight: 56,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm truncate">{t.name}</div>
                    <div className="text-[10px] text-ink-300">
                      Age {t.age} · {"★".repeat(t.star)}
                      {t.specialties.length > 0 && ` · ${t.specialties.join(", ")}`}
                    </div>
                    {!compat.ok && <div className="text-[10px] text-red-300 mt-0.5">⚠️ {compat.reason}</div>}
                    {compat.ok && (t.caveats?.length ?? 0) > 0 && <div className="text-[10px] text-amber-300 mt-0.5">📋 {t.caveats!.length} contract ask{t.caveats!.length === 1 ? "" : "s"}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs">${t.fee.toFixed(1)}M</div>
                  </div>
                </button>
              ))}
              {ranked.length === 0 && <div className="text-sm text-ink-300 italic text-center py-4">No matching talent available. Try a different rating.</div>}
            </div>
          </>
        )}

        {selected && offer && (
          <>
            <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.35)" }}>
              <div className="font-display text-sm">{selected.name}</div>
              <div className="text-[10px] text-ink-200">Age {selected.age} · {"★".repeat(selected.star)} · Base fee ${selected.fee.toFixed(1)}M</div>
            </div>

            {(selected.caveats?.length ?? 0) > 0 ? (
              <>
                <div className="text-[10px] tracking-widest font-display text-ink-200 mb-1.5">CONTRACT ASKS</div>
                <div className="text-[10px] text-ink-300 mb-2 italic">Granting builds trust + quality; refusing risks they walk.</div>
                <div className="space-y-1.5 mb-3">
                  {selected.caveats!.map(c => {
                    const granted = grantedHere.includes(c.id);
                    const costColor = c.cost === "small" ? "#86efac" : c.cost === "medium" ? "#fbbf24" : "#f87171";
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCaveat(c.id)}
                        className="w-full text-left px-3 py-2 rounded-lg pressable touch-target flex items-center gap-2"
                        style={{
                          background: granted ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${granted ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.10)"}`,
                          minHeight: 44,
                          touchAction: "manipulation",
                        }}
                      >
                        <span className="text-base">{granted ? "✓" : "○"}</span>
                        <span className="flex-1 text-sm">{c.label}</span>
                        <span className="text-[9px] font-display tracking-widest" style={{ color: costColor }}>{c.cost.toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-ink-300 italic mb-3">No contract asks. They'll sign for the base fee.</div>
            )}

            <div className="rounded-lg p-2.5 mb-3 text-[11px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between">
                <span className="text-ink-300">Likelihood they accept</span>
                <span className="font-mono">{Math.round(offer.acceptanceProb * 100)}%</span>
              </div>
              {offer.missing.length > 0 && (
                <div className="text-[10px] text-amber-300 mt-1">Missing: {offer.missing.map(m => m.label).join(", ")}</div>
              )}
              {offer.feeAdjust !== 0 && (
                <div className="text-[10px] text-ink-300 mt-1">Fee adjustment: {offer.feeAdjust >= 0 ? "+" : ""}${offer.feeAdjust.toFixed(1)}M</div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={() => { setSelectedId(null); setGrantedHere([]); }} className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target" style={{ minHeight: 44 }}>← Other talent</button>
              <button onClick={confirm} className="px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target inline-flex items-center gap-1.5" style={{ background: "#D4AF37", color: "#0a0a0a", minHeight: 44 }}>
                <Check size={12} /> Send Offer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BudgetSlider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-ink-300 mb-0.5"><span>{label}</span><span className="font-mono">${value}M</span></div>
      <input type="range" min={0} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

// ─── SCRIPTS ──────────────────────────────────────────────────

function ScriptsTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const mine = studio.scripts.filter(s => s.studioId === studio.player.id);

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">YOUR SCRIPTS · {mine.length}</div>
      {mine.length === 0 && (
        <div className="rounded-xl p-4 text-center text-ink-300 text-sm italic" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          You don't own any scripts. Head to Industry → Script Market to buy one.
        </div>
      )}
      {mine.map(s => <ScriptRow key={s.id} script={s} mode="owned" onCoverage={() => mutate(st => { runCoverage(st, s.id); })} />)}
    </div>
  );
}

export function ScriptRow({ script, mode, onCoverage, onBuy }: {
  script: Script;
  mode: "owned" | "market";
  onCoverage?: () => void;
  onBuy?: () => void;
}) {
  const showGem = script.coverageRuns >= 3 && script.trueQuality > script.scoutedQuality + 1;
  const range = script.coverageRuns >= 3 ? `${script.trueQuality}` : `${Math.max(1, script.scoutedQuality - 1)}–${Math.min(5, script.scoutedQuality + 1)}`;
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${showGem ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="flex-1 min-w-0">
        <div className="font-display tracking-wide truncate flex items-center gap-1.5">
          "{script.title}"
          {showGem && <Gem size={12} className="text-purple-300" />}
        </div>
        <div className="text-[10px] text-ink-300">{script.genre} · Scout: <span className="text-white">{"★".repeat(script.scoutedQuality)}</span> ({range}) · {script.coverageRuns} reads</div>
      </div>
      <div className="text-right shrink-0">
        {mode === "market" && (
          <>
            <div className="font-mono text-xs">${script.price.toFixed(1)}M</div>
            <button onClick={onBuy} className="text-[10px] px-2 py-1 rounded mt-1 pressable touch-target" style={{ background: "#D4AF37", color: "#0a0a0a" }}>Buy</button>
          </>
        )}
        {mode === "owned" && (
          <button onClick={onCoverage} disabled={script.coverageRuns >= 3} className="text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 pressable touch-target disabled:opacity-30" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
            <Search size={10} /> Coverage ($0.2M)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TALENT (under contract) ─────────────────────────────────

function TalentTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const mine = studio.talent.filter(t => t.studioId === studio.player.id && !t.retired);

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">UNDER CONTRACT · {mine.length}</div>
      {mine.length === 0 && (
        <div className="rounded-xl p-4 text-center text-ink-300 text-sm italic" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          No talent under contract. Sign actors and directors from Industry → Talent Pool.
        </div>
      )}
      {mine.map(t => (
        <div key={t.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-wide truncate">{t.name}</div>
            <div className="text-[10px] text-ink-300">{prettyRole(t.role)} · Age {t.age} · {"★".repeat(t.star)}{t.revealed && t.trueRating >= 75 ? ` · True rating ${t.trueRating}` : ""}</div>
            <div className="text-[10px] text-ink-300">{t.contractMoviesLeft} movie{t.contractMoviesLeft === 1 ? "" : "s"} left · Fee ${t.fee.toFixed(1)}M</div>
          </div>
          <button onClick={() => mutate(s => dropTalent(s, t.id))} className="text-[10px] px-2 py-1.5 rounded pressable touch-target text-red-300" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
            Release
          </button>
        </div>
      ))}
    </div>
  );
}

function prettyRole(r: Talent["role"]): string {
  return r === "actor" ? "Actor" : r === "director" ? "Director" : "Writer";
}

// ─── FACILITIES ───────────────────────────────────────────────

function FacilitiesTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const f = studio.player.facilities;

  const items: { key: keyof typeof f; label: string; tier: number; max: number; cost: number; desc: string; locked?: string }[] = [
    { key: "soundStages", label: "Sound Stages", tier: f.soundStages, max: 5, cost: 8, desc: "More stages = more concurrent productions." },
    { key: "backlots", label: "Backlots", tier: f.backlots, max: 3, cost: 5, desc: "Outdoor sets. Lowers production costs." },
    { key: "postProduction", label: "Post-Production", tier: f.postProduction, max: 3, cost: 3, desc: "Faster post, higher-quality FX." },
    { key: "scriptDept", label: "Script Department", tier: f.scriptDept, max: 2, cost: 2, desc: "Develop scripts in-house." },
    { key: "marketingDept", label: "Marketing Division", tier: f.marketingDept, max: 2, cost: 4, desc: "Run your own marketing campaigns." },
    {
      key: "studioTours", label: "Studio Tours", tier: f.studioTours, max: 2, cost: 10,
      desc: "Passive monthly income. Tier 1 → $0.5M/mo, Tier 2 → $1.2M/mo.",
      locked: studio.player.prestige < 2 ? "Requires ★★ prestige" : undefined,
    },
    {
      key: "themePark", label: "Theme Park", tier: f.themePark, max: 1, cost: 300,
      desc: "Late-game empire flex. Pays $4M / month forever.",
      locked: studio.player.prestige < 4 || studio.player.totalRevenue < 800 ? "Requires ★★★★ prestige + $800M revenue" : undefined,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">STUDIO FACILITIES</div>
      {items.map(it => (
        <div key={it.key} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="font-display tracking-wide">{it.label}</div>
              <div className="text-[10px] text-ink-300">Tier {it.tier} / {it.max}</div>
            </div>
            <div className="text-[10px] text-ink-300">{it.desc}</div>
            {it.locked && <div className="text-[10px] text-red-300 mt-0.5">🔒 {it.locked}</div>}
          </div>
          <button
            disabled={it.tier >= it.max || studio.player.cash < it.cost || !!it.locked}
            onClick={() => mutate(s => { upgradeFacility(s, it.key); })}
            className="text-[11px] px-3 py-2 rounded pressable touch-target disabled:opacity-30 inline-flex items-center gap-1"
            style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37", minHeight: 40, touchAction: "manipulation" }}
          >
            <Hammer size={11} /> {it.tier >= it.max ? "Max" : `Upgrade $${it.cost}M`}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── FINANCE ──────────────────────────────────────────────────

function FinanceTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const player = studio.player;
  const [borrowAmt, setBorrowAmt] = useState(10);
  const [repayAmt, setRepayAmt] = useState(5);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Cash" value={`$${player.cash.toFixed(1)}M`} color={player.cash < 5 ? "#f87171" : "#fff"} />
        <Stat label="Loan" value={`$${player.loan.toFixed(1)}M`} color={player.loan > 0 ? "#fbbf24" : "#fff"} />
        <Stat label="Profit" value={`${player.totalProfit >= 0 ? "+" : ""}$${player.totalProfit.toFixed(1)}M`} color={player.totalProfit >= 0 ? "#34d399" : "#f87171"} />
      </div>

      <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">BANK</div>
        {player.loan > 0 && (
          <div className="text-[11px] text-ink-200 mb-2">
            Loan: <span className="font-mono">${player.loan.toFixed(1)}M</span> @ {(player.loanRate * 100).toFixed(0)}% · due in <span className="text-yellow-300">{player.loanMonthsLeft}mo</span>
          </div>
        )}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-ink-300">Borrow $M (max ${(player.cash * 2 + 5).toFixed(0)}M)</label>
              <span className="font-mono text-xs">${borrowAmt}M</span>
            </div>
            <input type="range" min={1} max={Math.max(5, Math.floor(player.cash * 2 + 5))} value={borrowAmt} onChange={e => setBorrowAmt(Number(e.target.value))} className="w-full" />
            <button onClick={() => mutate(s => { takeLoan(s, borrowAmt); })} className="mt-1 w-full px-3 py-1.5 rounded text-xs pressable touch-target" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
              Take Loan
            </button>
          </div>
          {player.loan > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-ink-300">Repay $M (up to ${Math.min(player.cash, player.loan).toFixed(1)}M)</label>
                <span className="font-mono text-xs">${repayAmt}M</span>
              </div>
              <input type="range" min={1} max={Math.max(1, Math.floor(Math.min(player.cash, player.loan)))} value={repayAmt} onChange={e => setRepayAmt(Number(e.target.value))} className="w-full" />
              <button onClick={() => mutate(s => repayLoan(s, repayAmt))} className="mt-1 w-full px-3 py-1.5 rounded text-xs pressable touch-target bg-white/5 border border-white/10">
                Repay
              </button>
            </div>
          )}
        </div>
      </div>

      {player.defaults > 0 && (
        <div className="rounded-xl p-3 text-[11px]" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-red-300" />
            <span className="font-display tracking-widest text-red-300">CREDIT WARNING</span>
          </div>
          <div className="text-red-200">
            {player.defaults} default{player.defaults === 1 ? "" : "s"} on record. Future loans carry higher interest. 3+ defaults trigger bankruptcy.
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[9px] tracking-widest font-display text-ink-300">{label}</div>
      <div className="font-display text-lg mt-0.5" style={{ color: color ?? "#fff" }}>{value}</div>
    </div>
  );
}
