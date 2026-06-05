// Family Roster Browser — every profile's named creations in one view.
// Heroes (Olympus), pilots (Cosmic), agents (Temporal), studios (Mogul).
//
// This is the VIEWABLE half of A.6 — same-device versus mode that picks
// from each profile's roster is deferred to per-game integration sessions
// (Battle Forge / Mech / Creature will each need their own pick UX). For
// now any kid can scout the family's collective progress here.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sword, Rocket, Hourglass, Film, Cpu, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { useProfiles, getActiveProfileId } from "./store";
import { loadAllFamilyRosters, type RosterEntry } from "./familyRosters";
import { SyncIndicator } from "../components/SyncIndicator";
import { RosterDetailModal } from "./RosterDetailModal";
import { CompareModal, type CompareKind } from "./CompareModal";
import type { Bot } from "../mech/types";

const SECTIONS: Array<{ kind: RosterEntry["kind"]; label: string; icon: typeof Sword; accent: string }> = [
  { kind: "mech",   label: "Mech Bots",       icon: Cpu,       accent: "#fb923c" },
  { kind: "hero",   label: "Olympus Heroes",  icon: Sword,     accent: "#DAA520" },
  { kind: "cosmic", label: "Cosmic Pilots",   icon: Rocket,    accent: "#9be3ff" },
  { kind: "agent",  label: "Temporal Agents", icon: Hourglass, accent: "#f5c518" },
  { kind: "studio", label: "Movie Studios",   icon: Film,      accent: "#D4AF37" },
];

/** Mech challenge — stash the opponent bot in sessionStorage so the
 *  battle page can pick it up without a URL param (the Bot is too big
 *  to serialize cleanly into a query string). */
function challengeToMechDuel(navigate: ReturnType<typeof import("react-router-dom").useNavigate>, opponent: Bot, opponentLabel: string): void {
  try {
    sessionStorage.setItem("dd_mech_challenger", JSON.stringify({ bot: opponent, label: opponentLabel }));
  } catch { /* ignore */ }
  navigate("/mech/battle");
}

/** Olympus cross-profile duel. Pulls the active player's freshest hero
 *  from Dexie, then routes to /olympus/duel with both hero ids in
 *  location state. The duel page loads both via Dexie regardless of
 *  which profile they belong to. */
async function challengeToOlympusDuel(
  navigate: ReturnType<typeof import("react-router-dom").useNavigate>,
  theirHeroId: string,
  theirProfileId: string,
  theirProfileName: string,
): Promise<void> {
  try {
    const myPid = getActiveProfileId();
    if (!myPid) return;
    const { db } = await import("../db/dexie");
    const mine = await db.olympusHeroes.where("profileId").equals(myPid).toArray();
    const myHero = (mine as Array<{ id: string; modifiedAt: number; archived?: boolean }>)
      .filter(h => !h.archived)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    if (!myHero) {
      alert("Forge a hero in Olympus before challenging someone else's.");
      return;
    }
    navigate("/olympus/duel", { state: { myHeroId: myHero.id, theirHeroId, theirProfileId, theirProfileName } });
  } catch (e) {
    console.warn("[FamilyRoster] olympus duel route failed", e);
  }
}

export function FamilyRoster() {
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  const [entries, setEntries] = useState<RosterEntry[] | null>(null);
  const [detail, setDetail] = useState<RosterEntry | null>(null);
  const [compare, setCompare] = useState<RosterEntry | null>(null);

  const profileById = useMemo(() => {
    const m = new Map<string, { name: string; color: string; handle: string; avatar: string }>();
    for (const p of profiles) m.set(p.id, { name: p.name, color: p.color, handle: p.handle, avatar: p.avatar });
    return m;
  }, [profiles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadAllFamilyRosters(profiles.map(p => p.id));
      if (!cancelled) setEntries(list);
    })();
    return () => { cancelled = true; };
    // Refresh when profiles list changes (new family member added on
    // another device); profiles updates live via cloud subscribe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length, profiles.map(p => p.id).join(",")]);

  const bySection = useMemo(() => {
    const out = new Map<RosterEntry["kind"], RosterEntry[]>();
    for (const s of SECTIONS) out.set(s.kind, []);
    for (const e of entries ?? []) out.get(e.kind)?.push(e);
    return out;
  }, [entries]);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.18), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.14), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c9b6f0" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#ffd54a" }}>FAMILY ROSTER</h1>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 px-4 pb-8 max-w-5xl mx-auto w-full space-y-5">
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(229,231,235,0.65)" }}>
          Every named creation across the family. Heroes, pilots, agents, studios — see who's been busy.
          Versus-mode picks from these will land per game.
        </p>

        {!entries && (
          <div className="flex items-center gap-2 justify-center py-12" style={{ color: "rgba(229,231,235,0.7)" }}>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span className="text-sm">Loading every family member's creations…</span>
          </div>
        )}

        {entries && entries.length === 0 && (
          <div className="rounded-xl p-6 text-center"
            style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.3)", color: "#fef3c7" }}>
            <div className="font-display text-base mb-1">Nothing here yet.</div>
            <div className="text-[12px] opacity-80">Forge a hero in Olympus, launch a Cosmic pilot, or recruit a Temporal agent. Once any family member creates one, it'll show up here.</div>
          </div>
        )}

        {entries && entries.length > 0 && SECTIONS.map(section => {
          const list = bySection.get(section.kind) ?? [];
          if (list.length === 0) return null;
          const Icon = section.icon;
          return (
            <section key={section.kind}>
              <header className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color: section.accent }} aria-hidden="true" />
                <h2 className="font-display text-sm tracking-[0.2em] uppercase" style={{ color: section.accent }}>{section.label}</h2>
                <span className="text-[10px] opacity-70" style={{ color: section.accent }}>
                  {list.length} total
                </span>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map((e, i) => {
                  const prof = profileById.get(e.profileId);
                  const accent = prof?.color ?? section.accent;
                  return (
                    <motion.article
                      key={e.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(0.4, i * 0.015) }}
                      onClick={() => setDetail(e)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setDetail(e); } }}
                      aria-label={`View ${e.name} details`}
                      className="rounded-xl p-3 flex items-center gap-3 pressable touch-target"
                      style={{
                        background: `linear-gradient(135deg, ${accent}1f, rgba(10,10,20,0.85))`,
                        border: `1px solid ${accent}55`,
                        cursor: "pointer",
                      }}>
                      {prof && (
                        <div className="shrink-0" style={{
                          width: 40, height: 40, borderRadius: "50%",
                          background: `${accent}22`, border: `1.5px solid ${accent}88`,
                          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                        }}>
                          <img src={prof.avatar} alt="" aria-hidden="true" draggable={false}
                            style={{ width: 34, height: 34, imageRendering: "pixelated", objectFit: "contain" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fff" }}>
                          {e.name}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: accent }}>
                          {e.subtitle}
                        </div>
                        {e.description && (
                          <div className="text-[10px] truncate" style={{ color: "rgba(229,231,235,0.65)" }}>
                            {e.description}
                          </div>
                        )}
                        <div className="text-[9px] mt-1" style={{ color: "rgba(229,231,235,0.5)" }}>
                          {prof?.handle ?? e.profileId}
                        </div>
                      </div>
                      {/* Mech-only: full combat duel. Other kinds get a
                          stat-comparison VS modal. Skips own profile. */}
                      {e.profileId !== getActiveProfileId() && e.kind === "mech" && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); challengeToMechDuel(navigate, e.payload as Bot, prof?.handle ?? "Rival"); }}
                          aria-label={`Challenge ${e.name} to a Mech duel`}
                          className="shrink-0 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest pressable touch-target inline-flex items-center gap-1"
                          style={{
                            background: `linear-gradient(135deg, #fb923c, #ef4444)`,
                            color: "#1a0505",
                            minHeight: 34,
                          }}>
                          <Swords size={12} aria-hidden="true" /> DUEL
                        </button>
                      )}
                      {e.profileId !== getActiveProfileId() && e.kind === "hero" && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); challengeToOlympusDuel(navigate, e.id, e.profileId, prof?.handle ?? "Rival"); }}
                          aria-label={`Challenge ${e.name} to a hero duel`}
                          className="shrink-0 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest pressable touch-target inline-flex items-center gap-1"
                          style={{
                            background: "linear-gradient(135deg, #DAA520, #8b6914)",
                            color: "#0F1B2D",
                            minHeight: 34,
                          }}>
                          <Swords size={12} aria-hidden="true" /> DUEL
                        </button>
                      )}
                      {e.profileId !== getActiveProfileId() && e.kind !== "mech" && e.kind !== "studio" && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setCompare(e); }}
                          aria-label={`Compare to your ${e.kind}`}
                          className="shrink-0 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest pressable touch-target inline-flex items-center gap-1"
                          style={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                            color: "#0a0a14",
                            minHeight: 34,
                          }}>
                          <Swords size={12} aria-hidden="true" /> VS
                        </button>
                      )}
                      {e.profileId !== getActiveProfileId() && e.kind === "studio" && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setCompare(e); }}
                          aria-label="Compare studios"
                          className="shrink-0 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest pressable touch-target inline-flex items-center gap-1"
                          style={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                            color: "#0a0a14",
                            minHeight: 34,
                          }}>
                          <Swords size={12} aria-hidden="true" /> VS
                        </button>
                      )}
                    </motion.article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="text-center text-[10px] mt-6 pt-3 border-t border-white/10" style={{ color: "rgba(229,231,235,0.55)" }}>
          Tap any card for full details · Mech bots have a DUEL button.
        </div>
      </main>
      {detail && (
        <RosterDetailModal
          entry={detail}
          profileName={profileById.get(detail.profileId)?.name ?? detail.profileId}
          profileColor={profileById.get(detail.profileId)?.color ?? "#fbbf24"}
          onClose={() => setDetail(null)}
        />
      )}
      {compare && compare.kind !== "mech" && (
        <CompareModal
          kind={compare.kind as CompareKind}
          rivalId={compare.id}
          rivalProfileId={compare.profileId}
          rivalProfileName={profileById.get(compare.profileId)?.handle ?? profileById.get(compare.profileId)?.name ?? compare.profileId}
          rivalColor={profileById.get(compare.profileId)?.color ?? "#fbbf24"}
          onClose={() => setCompare(null)}
        />
      )}
    </div>
  );
}
