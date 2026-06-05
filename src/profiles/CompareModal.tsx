// Cross-profile comparison modal. Pits another family member's
// Olympus hero / Cosmic pilot / Temporal agent / Movie studio against
// the active player's equivalent, side by side, with a clear winner
// badge driven by a single headline metric per kind.
//
// This is the lightweight versus-mode for the four kinds that don't
// have a turn-based battle engine. Mech bots go through their own full
// combat sim (MechBattle); everything else compares stats here.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, Trophy } from "lucide-react";
import { db } from "../db/dexie";
import { useEffect, useState } from "react";
import type { Hero } from "../olympus/types";
import type { Studio } from "../mogul/types";
import type { Save as CosmicSave } from "../cosmic/types";
import type { AgentSave } from "../temporal/types";
import { postActivity } from "../sync/liveActivity";
import { loadProfiles, getActiveProfileId } from "./store";

type Kind = "hero" | "cosmic" | "agent" | "studio";

interface Props {
  kind: Kind;
  rivalId: string;         // the roster entry's underlying record id
  rivalProfileId: string;
  rivalProfileName: string;
  rivalColor: string;
  onClose: () => void;
}

interface ComparisonRow {
  label: string;
  mine: number | string;
  theirs: number | string;
  /** Whose value "wins" this row, for color tinting; null = tie/neutral. */
  winner: "mine" | "theirs" | null;
}

interface Comparison {
  myName: string;
  theirName: string;
  rows: ComparisonRow[];
  /** Headline winner — drives the trophy banner. */
  winner: "mine" | "theirs" | "tie";
  /** Score margin string for the banner. */
  margin: string;
}

const KIND_LABELS: Record<Kind, { label: string; metric: string }> = {
  hero:   { label: "Olympus Hero",   metric: "Total stats" },
  cosmic: { label: "Cosmic Pilot",   metric: "Rank points" },
  agent:  { label: "Temporal Agent", metric: "Level + integrity" },
  studio: { label: "Movie Studio",   metric: "Total box office" },
};

function num(a: number, b: number): "mine" | "theirs" | null {
  if (a > b) return "mine";
  if (b > a) return "theirs";
  return null;
}

// ── Per-kind comparison builders ───────────────────────────────────────────

function compareHeroes(mine: Hero, theirs: Hero): Comparison {
  const rows: ComparisonRow[] = [
    { label: "Level",     mine: mine.level,                theirs: theirs.level,                winner: num(mine.level, theirs.level) },
    { label: "HP",        mine: mine.hpMax,                theirs: theirs.hpMax,                winner: num(mine.hpMax, theirs.hpMax) },
    { label: "Strength",  mine: mine.stats.strength,       theirs: theirs.stats.strength,       winner: num(mine.stats.strength, theirs.stats.strength) },
    { label: "Endurance", mine: mine.stats.endurance,      theirs: theirs.stats.endurance,      winner: num(mine.stats.endurance, theirs.stats.endurance) },
    { label: "Agility",   mine: mine.stats.agility,        theirs: theirs.stats.agility,        winner: num(mine.stats.agility, theirs.stats.agility) },
    { label: "Magic",     mine: mine.stats.magic,          theirs: theirs.stats.magic,          winner: num(mine.stats.magic, theirs.stats.magic) },
    { label: "Class",     mine: mine.className,            theirs: theirs.className,            winner: null },
  ];
  const myTot    = mine.level + mine.hpMax + mine.stats.strength + mine.stats.endurance + mine.stats.agility + mine.stats.magic;
  const theirTot = theirs.level + theirs.hpMax + theirs.stats.strength + theirs.stats.endurance + theirs.stats.agility + theirs.stats.magic;
  return {
    myName: mine.name,
    theirName: theirs.name,
    rows,
    winner: myTot > theirTot ? "mine" : theirTot > myTot ? "theirs" : "tie",
    margin: `${Math.round(myTot)} vs ${Math.round(theirTot)} total`,
  };
}

function compareCosmic(mine: CosmicSave, theirs: CosmicSave): Comparison {
  const rows: ComparisonRow[] = [
    { label: "Rank",        mine: mine.rank,                       theirs: theirs.rank,                       winner: num(mine.rank, theirs.rank) },
    { label: "Rank Pts",    mine: mine.rankPoints,                 theirs: theirs.rankPoints,                 winner: num(mine.rankPoints, theirs.rankPoints) },
    { label: "Missions",    mine: mine.completedMissions.length,   theirs: theirs.completedMissions.length,   winner: num(mine.completedMissions.length, theirs.completedMissions.length) },
    { label: "Wingmen",     mine: mine.wingmen.length,             theirs: theirs.wingmen.length,             winner: num(mine.wingmen.length, theirs.wingmen.length) },
    { label: "Credits",     mine: mine.credits,                    theirs: theirs.credits,                    winner: num(mine.credits, theirs.credits) },
    { label: "Memorial",    mine: mine.memorial.length,            theirs: theirs.memorial.length,            winner: num(theirs.memorial.length, mine.memorial.length) }, // fewer = better here
  ];
  const myScore    = mine.rankPoints + mine.completedMissions.length * 10;
  const theirScore = theirs.rankPoints + theirs.completedMissions.length * 10;
  return {
    myName: mine.callsign || mine.pilotName,
    theirName: theirs.callsign || theirs.pilotName,
    rows,
    winner: myScore > theirScore ? "mine" : theirScore > myScore ? "theirs" : "tie",
    margin: `${Math.max(myScore, theirScore)} vs ${Math.min(myScore, theirScore)} rank score`,
  };
}

function compareAgents(mine: AgentSave, theirs: AgentSave): Comparison {
  const rows: ComparisonRow[] = [
    { label: "Level",     mine: mine.level,                     theirs: theirs.level,                     winner: num(mine.level, theirs.level) },
    { label: "Integrity", mine: mine.integrity,                 theirs: theirs.integrity,                 winner: num(mine.integrity, theirs.integrity) },
    { label: "Missions",  mine: mine.missionsCompleted.length,  theirs: theirs.missionsCompleted.length,  winner: num(mine.missionsCompleted.length, theirs.missionsCompleted.length) },
    { label: "Trophies",  mine: mine.trophies.length,           theirs: theirs.trophies.length,           winner: num(mine.trophies.length, theirs.trophies.length) },
    { label: "XP",        mine: mine.xp,                        theirs: theirs.xp,                        winner: num(mine.xp, theirs.xp) },
  ];
  const myScore    = mine.level * 10 + mine.integrity;
  const theirScore = theirs.level * 10 + theirs.integrity;
  return {
    myName: mine.agentName,
    theirName: theirs.agentName,
    rows,
    winner: myScore > theirScore ? "mine" : theirScore > myScore ? "theirs" : "tie",
    margin: `${Math.max(myScore, theirScore)} vs ${Math.min(myScore, theirScore)} agent score`,
  };
}

function compareStudios(mine: Studio, theirs: Studio): Comparison {
  const myReleased    = mine.releases.filter(r => r.studioId === mine.player.id);
  const theirReleased = theirs.releases.filter(r => r.studioId === theirs.player.id);
  const myBO    = myReleased.reduce((s, r) => s + r.totalBO, 0);
  const theirBO = theirReleased.reduce((s, r) => s + r.totalBO, 0);
  const myAwards    = myReleased.reduce((s, r) => s + r.awards.length, 0);
  const theirAwards = theirReleased.reduce((s, r) => s + r.awards.length, 0);
  const rows: ComparisonRow[] = [
    { label: "Year",        mine: mine.year,           theirs: theirs.year,           winner: num(mine.year, theirs.year) },
    { label: "Releases",    mine: myReleased.length,   theirs: theirReleased.length,  winner: num(myReleased.length, theirReleased.length) },
    { label: "Total BO ($M)", mine: Math.round(myBO),  theirs: Math.round(theirBO),   winner: num(myBO, theirBO) },
    { label: "Awards",      mine: myAwards,            theirs: theirAwards,           winner: num(myAwards, theirAwards) },
    { label: "Cash ($M)",   mine: Math.round(mine.player.cash),   theirs: Math.round(theirs.player.cash),   winner: num(mine.player.cash, theirs.player.cash) },
  ];
  return {
    myName: mine.player.name,
    theirName: theirs.player.name,
    rows,
    winner: myBO > theirBO ? "mine" : theirBO > myBO ? "theirs" : "tie",
    margin: `$${Math.round(Math.max(myBO, theirBO))}M vs $${Math.round(Math.min(myBO, theirBO))}M box office`,
  };
}

// ── Async loaders ──────────────────────────────────────────────────────────

async function loadHero(id: string): Promise<Hero | null> {
  return (await db.olympusHeroes.get(id)) ?? null;
}
async function loadStudio(id: string): Promise<Studio | null> {
  const rec = await db.mogulStudios.get(id);
  return rec?.data ?? null;
}
function loadCosmicLocal(profileId: string, saveId: string): CosmicSave | null {
  try {
    const raw = localStorage.getItem(`prof_${profileId}::dd_cosmic_saves`);
    if (!raw) return null;
    const arr: CosmicSave[] = JSON.parse(raw);
    return arr.find(s => s.id === saveId) ?? null;
  } catch { return null; }
}
function loadAgentLocal(profileId: string, saveId: string): AgentSave | null {
  try {
    const raw = localStorage.getItem(`prof_${profileId}::dd_temporal_saves`);
    if (!raw) return null;
    const arr: AgentSave[] = JSON.parse(raw);
    return arr.find(s => s.id === saveId) ?? null;
  } catch { return null; }
}

export function CompareModal({ kind, rivalId, rivalProfileId, rivalProfileName, rivalColor, onClose }: Props) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const myProfileId = getActiveProfileId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!myProfileId) { setError("Pick a profile first."); return; }
        // Load both sides — mine first.
        const cmp = await buildComparison(kind, myProfileId, rivalProfileId, rivalId);
        if (cancelled) return;
        if (!cmp) {
          setError(`Your roster has no ${KIND_LABELS[kind].label} to compare. Play that game first.`);
          return;
        }
        setComparison(cmp);
        // Post a one-shot live activity event so other family devices see
        // the showdown happen in their feed.
        const myProf = loadProfiles().find(p => p.id === myProfileId);
        if (myProf) {
          const winnerName = cmp.winner === "mine" ? cmp.myName
                          : cmp.winner === "theirs" ? cmp.theirName
                          : "Tie";
          postActivity({
            profileId: myProfileId,
            profileName: myProf.handle || myProf.name,
            profileColor: myProf.color,
            gameId: kind === "hero" ? "olympus" : kind === "studio" ? "mogul" : kind,
            kind: "generic",
            emoji: "⚖️",
            text: `${myProf.handle || myProf.name}'s ${cmp.myName} vs ${rivalProfileName}'s ${cmp.theirName} — ${winnerName}!`,
          });
        }
      } catch (err) {
        console.warn("[compare] failed", err);
        if (!cancelled) setError("Couldn't load the comparison.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Compare ${KIND_LABELS[kind].label}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl max-w-md w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${rivalColor}26, rgba(8,8,14,0.96))`,
          border: `1.5px solid ${rivalColor}88`,
          boxShadow: `0 12px 36px -8px ${rivalColor}66`,
        }}>
        <header className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: rivalColor }}>SHOWDOWN</div>
            <h2 className="font-display text-lg tracking-wide" style={{ color: "#fef3c7" }}>{KIND_LABELS[kind].label} — head to head</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="pressable rounded-full"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="p-4">
          {error && (
            <div className="rounded-md p-3 text-[12px]"
              style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", color: "#fef3c7" }}>
              {error}
            </div>
          )}
          {!error && !comparison && (
            <div className="text-[12px] text-center py-6" style={{ color: "rgba(229,231,235,0.7)" }}>Comparing…</div>
          )}
          {comparison && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-70" style={{ color: "#86efac" }}>You</div>
                  <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fef3c7" }}>{comparison.myName}</div>
                </div>
                <div className="text-[10px] font-display opacity-70">VS</div>
                <div className="flex-1 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-70" style={{ color: rivalColor }}>{rivalProfileName}</div>
                  <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fef3c7" }}>{comparison.theirName}</div>
                </div>
              </div>

              <ul className="space-y-1.5">
                {comparison.rows.map(r => (
                  <li key={r.label} className="grid grid-cols-3 items-center text-[12px]">
                    <span className="text-right pr-2 font-mono tabular-nums"
                      style={{ color: r.winner === "mine" ? "#86efac" : "rgba(229,231,235,0.8)", fontWeight: r.winner === "mine" ? 700 : 400 }}>{r.mine}</span>
                    <span className="text-center text-[10px] uppercase tracking-widest opacity-70">{r.label}</span>
                    <span className="text-left pl-2 font-mono tabular-nums"
                      style={{ color: r.winner === "theirs" ? rivalColor : "rgba(229,231,235,0.8)", fontWeight: r.winner === "theirs" ? 700 : 400 }}>{r.theirs}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl p-3 text-center"
                style={{
                  background: comparison.winner === "mine" ? "rgba(134,239,172,0.18)" :
                              comparison.winner === "theirs" ? `${rivalColor}26` :
                              "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${comparison.winner === "mine" ? "#86efac" : comparison.winner === "theirs" ? rivalColor : "rgba(255,255,255,0.15)"}`,
                }}>
                <div className="inline-flex items-center gap-2" style={{ color: comparison.winner === "mine" ? "#86efac" : comparison.winner === "theirs" ? rivalColor : "#fde047" }}>
                  <Trophy size={16} aria-hidden="true" />
                  <span className="font-display tracking-widest text-[13px]">
                    {comparison.winner === "tie"
                      ? "DEAD HEAT"
                      : comparison.winner === "mine"
                        ? `${comparison.myName} WINS`
                        : `${comparison.theirName} WINS`}
                  </span>
                </div>
                <div className="text-[11px] mt-0.5 opacity-80">{comparison.margin}</div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

async function buildComparison(kind: Kind, myProfileId: string, rivalProfileId: string, rivalRecordId: string): Promise<Comparison | null> {
  if (kind === "hero") {
    const theirs = await loadHero(rivalRecordId);
    if (!theirs) return null;
    const heroes = await db.olympusHeroes.where("profileId").equals(myProfileId).toArray();
    const mine = heroes.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    if (!mine) return null;
    return compareHeroes(mine as Hero, theirs);
  }
  if (kind === "studio") {
    const theirs = await loadStudio(rivalRecordId);
    if (!theirs) return null;
    const studios = await db.mogulStudios.where("profileId").equals(myProfileId).toArray();
    const mineRec = studios.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    if (!mineRec) return null;
    return compareStudios(mineRec.data, theirs);
  }
  if (kind === "cosmic") {
    const theirs = loadCosmicLocal(rivalProfileId, rivalRecordId);
    if (!theirs) return null;
    const raw = localStorage.getItem(`prof_${myProfileId}::dd_cosmic_saves`);
    if (!raw) return null;
    const arr: CosmicSave[] = JSON.parse(raw);
    const mine = arr.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    if (!mine) return null;
    return compareCosmic(mine, theirs);
  }
  if (kind === "agent") {
    const theirs = loadAgentLocal(rivalProfileId, rivalRecordId);
    if (!theirs) return null;
    const raw = localStorage.getItem(`prof_${myProfileId}::dd_temporal_saves`);
    if (!raw) return null;
    const arr: AgentSave[] = JSON.parse(raw);
    const mine = arr.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    if (!mine) return null;
    return compareAgents(mine, theirs);
  }
  return null;
}

// Re-export the kind type so the Roster page can pass it correctly.
export type CompareKind = Kind;

// useMemo is imported above but unused — kept for callers that might
// want to memoize their own slice; otherwise the lint will silently
// allow the unused symbol since the function body doesn't reference it.
void useMemo;
