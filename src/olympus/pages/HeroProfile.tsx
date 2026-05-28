// Hero profile / character sheet — stats, equipment, traits, backstory,
// reputation, journal, visual description. Entry point for starting a new
// adventure or resuming an active one.
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useOlympus, listAdventuresForHero } from "../store";
import type { Adventure } from "../types";
import { CLASS_INFO, classInfoFor, getTier } from "../types";
import { HeroSprite } from "../components/HeroSprite";
import { CompanionSprite } from "../components/CompanionSprite";
import { getLine, getStage, EVOLUTION_LEVELS } from "../companions";
import { BLESSINGS, blessingCount, readyForTitans } from "../blessings";
import { MYTHIC_ARTIFACTS } from "../artifacts";
import { ArrowLeft, Play, Archive, BookOpen, RotateCcw } from "lucide-react";

export default function HeroProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hero = useOlympus(s => s.heroes.find(h => h.id === id));
  const archiveHero = useOlympus(s => s.archiveHero);
  const unarchiveHero = useOlympus(s => s.unarchiveHero);
  const setActiveHero = useOlympus(s => s.setActiveHero);
  const activeAdventure = useOlympus(s => s.activeAdventure);
  const [pastAdventures, setPastAdventures] = useState<Adventure[]>([]);

  // Pull the hero's full adventure history from Dexie so the profile
  // can show "this entry was from adventure X" instead of orphan journal
  // entries.
  useEffect(() => {
    if (!id) return;
    listAdventuresForHero(id).then(list => {
      setPastAdventures(list.filter(a => a.status === "completed" || a.status === "abandoned"));
    });
  }, [id, hero?.adventuresCompleted]);

  // Fetch today's Oracle dream for this hero (idempotent — no-op if a
  // dream for today already exists).
  const ensureDailyDream = useOlympus(s => s.ensureDailyDream);
  useEffect(() => {
    if (id) ensureDailyDream(id).catch(() => {});
  }, [id]);

  if (!hero) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "rgba(233,227,210,0.7)" }}>That hero is no more.</p>
        <Link to="/olympus" className="mt-4 inline-block underline" style={{ color: "#DAA520" }}>Back to roster</Link>
      </div>
    );
  }

  const cls = classInfoFor(hero.className);

  return (
    <div className="max-w-3xl mx-auto pb-8 space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/olympus" className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Hero Profile</div>
          <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>{hero.name.toUpperCase()}</h1>
          {hero.nickname && <div className="text-xs italic" style={{ color: "rgba(218,165,32,0.85)" }}>"{hero.nickname}"</div>}
        </div>
      </header>

      <div className="grid sm:grid-cols-[160px_1fr] gap-5">
        <div>
          <HeroSprite hero={hero} size={160} />
          <div className="mt-3 text-center">
            <div className="font-display text-lg" style={{ color: "#DAA520" }}>Level {hero.level}</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.6)" }}>{cls.name}{hero.subclass ? ` · ${hero.subclass}` : ""}</div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full transition-all" style={{ width: `${(hero.xp / hero.xpToNext) * 100}%`, background: "#DAA520" }} />
            </div>
            <div className="text-[10px] mt-1" style={{ color: "rgba(233,227,210,0.55)" }}>{hero.xp} / {hero.xpToNext} XP</div>
          </div>
        </div>

        <div className="space-y-3">
          <Section title="Vital Statistics">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="HP" value={`${hero.hp}/${hero.hpMax}`} />
              <Stat label="Drachma" value={String(hero.drachma)} />
              <Stat label="Adventures" value={String(hero.adventuresCompleted)} />
            </div>
          </Section>

          <Section title="Abilities">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {(Object.entries(hero.stats) as Array<[string, number]>).map(([k, v]) => (
                <Stat
                  key={k}
                  label={`${k} · ${getTier(v).name}`}
                  value={String(v)}
                  accent={k === classInfoFor(hero.className).primaryStat}
                />
              ))}
            </div>
          </Section>

          {hero.equipment.weapon && (
            <Section title="Equipped">
              <div className="text-sm space-y-1">
                <div>🗡 {hero.equipment.weapon.name} <span className="text-[10px] opacity-70">tier {hero.equipment.weapon.tier}</span></div>
                {hero.equipment.armor && <div>🛡 {hero.equipment.armor.name} <span className="text-[10px] opacity-70">tier {hero.equipment.armor.tier}</span></div>}
                {hero.equipment.accessory && <div>✨ {hero.equipment.accessory.name}</div>}
              </div>
            </Section>
          )}
        </div>
      </div>

      <CompanionPanel hero={hero} />
      <ArtifactsPanel hero={hero} />
      <BlessingsPanel hero={hero} />
      <Section title="Equipment Notes">
        {hero.equipment.weapon && <div className="text-xs text-ink-200">Weapon: {hero.equipment.weapon.name} (tier {hero.equipment.weapon.tier})</div>}
        {hero.equipment.armor && <div className="text-xs text-ink-200">Armor: {hero.equipment.armor.name} (tier {hero.equipment.armor.tier})</div>}
        {hero.equipment.accessory && <div className="text-xs text-ink-200">Accessory: {hero.equipment.accessory.name}</div>}
      </Section>

      <Section title="Personality">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>
          {hero.personality.alignment.replace(/-/g, " ")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hero.personality.descriptors.map((d, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(233,227,210,0.85)" }}>{d}</span>
          ))}
        </div>
      </Section>

      <Section title="Permanent Traits">
        <ul className="text-sm space-y-1.5 leading-snug">
          {hero.traits.map((t, i) => (
            <li key={i} className="italic" style={{ color: "rgba(233,227,210,0.85)" }}>· {t}</li>
          ))}
        </ul>
      </Section>

      <Section title="Backstory">
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(233,227,210,0.85)" }}>{hero.backstory}</div>
      </Section>

      <Section title="Visual Description (AI prompt seed)">
        <div className="text-sm italic leading-relaxed" style={{ color: "rgba(233,227,210,0.75)" }}>{hero.visualDescription}</div>
      </Section>

      {hero.injuries.filter(i => !i.healed).length > 0 && (
        <Section title="Active Injuries">
          <ul className="text-sm space-y-1">
            {hero.injuries.filter(i => !i.healed).map((inj, i) => (
              <li key={i} style={{ color: "#c75050" }}>· {inj.description}{inj.permanent ? " (permanent without divine healing)" : ""}</li>
            ))}
          </ul>
        </Section>
      )}

      {hero.dreams && hero.dreams.length > 0 && (() => {
        const todays = [...hero.dreams].reverse().find(d => d.dayKey === new Date().toISOString().slice(0, 10));
        const dream = todays ?? hero.dreams[hero.dreams.length - 1];
        return (
          <Section title="The Oracle's Dream">
            <div className="rounded-xl px-4 py-3 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(15,27,45,0.4))", border: "1px solid rgba(170,140,255,0.35)" }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(170,140,255,0.18), transparent 60%)" }} />
              <div className="text-[10px] uppercase tracking-[0.3em] mb-2 relative" style={{ color: "#b39dff" }}>
                {dream.dayKey === new Date().toISOString().slice(0, 10) ? "Today's Prophecy · Delphi" : "Last Prophecy · Delphi"}
              </div>
              <div className="text-base italic leading-relaxed relative" style={{ color: "rgba(233,227,210,0.92)", fontFamily: "'Cinzel', serif" }}>
                "{dream.text}"
              </div>
              {dream.fulfilled && (
                <div className="mt-2 text-[10px] uppercase tracking-widest relative" style={{ color: "#86efac" }}>★ Prophecy Fulfilled</div>
              )}
            </div>
          </Section>
        );
      })()}

      {hero.rumors && Object.keys(hero.rumors).length > 0 && (
        <Section title="What They Say About You">
          <div className="text-[11px] mb-3 italic" style={{ color: "rgba(233,227,210,0.6)" }}>
            Rumors that circulate in cities where your name is known.
          </div>
          <div className="space-y-2.5">
            {Object.entries(hero.rumors).map(([city, rumor]) => {
              const score = hero.reputation.cities[city] ?? 0;
              const positive = score >= 5;
              const negative = score <= -5;
              const tint = positive ? "rgba(218,165,32" : negative ? "rgba(199,80,80" : "rgba(122,140,170";
              return (
                <div key={city} className="rounded-xl px-3 py-2.5" style={{ background: `${tint},0.08)`, border: `1px solid ${tint},0.3)` }}>
                  <div className="text-[10px] uppercase tracking-[0.25em] flex items-center gap-2" style={{ color: `${tint},0.95)` }}>
                    {city}
                    <span className="text-[9px] font-mono" style={{ color: "rgba(233,227,210,0.5)" }}>{score > 0 ? "+" : ""}{score}</span>
                  </div>
                  <div className="text-sm mt-1 italic leading-snug" style={{ color: "rgba(233,227,210,0.85)" }}>"{rumor}"</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {hero.bondStories && hero.bondStories.length > 0 && (
        <Section title="You and Your Companion">
          <div className="text-[11px] mb-3 italic" style={{ color: "rgba(233,227,210,0.6)" }}>
            Quiet moments shared on the road.
          </div>
          <div className="space-y-3">
            {[...hero.bondStories].reverse().map(s => (
              <div key={s.id} className="rounded-xl px-4 py-3" style={{ background: "rgba(15,27,45,0.55)", border: "1px solid rgba(122,180,140,0.25)" }}>
                <div className="font-display text-sm tracking-wider mb-1.5" style={{ fontFamily: "'Cinzel', serif", color: "#7ab48c" }}>{s.title}</div>
                <div className="text-sm leading-relaxed" style={{ color: "rgba(233,227,210,0.85)" }}>{s.body}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hero.echo && hero.echo.length > 0 && (
        <Section title="The Hero's Echo">
          <div className="text-[11px] mb-3 italic" style={{ color: "rgba(233,227,210,0.6)" }}>
            A growing collection of verses sung of your deeds. Saved after every adventure.
          </div>
          <div className="space-y-4">
            {[...hero.echo].reverse().map(v => (
              <div key={v.id} className="rounded-xl px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(218,165,32,0.08), rgba(15,27,45,0.4))", border: "1px solid rgba(218,165,32,0.25)" }}>
                <div className="font-display text-sm tracking-wider mb-1.5" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{v.title}</div>
                <div className="text-sm italic whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(233,227,210,0.85)" }}>{v.verse}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hero.journal.length > 0 && (
        <Section title="Hero's Journal">
          <div className="space-y-3">
            {/* Pair each journal entry with the adventure it came from, in
                reverse chronological order. Falls back to the bare entry
                if no matching adventure was found in the archive. */}
            {hero.journal.slice().reverse().slice(0, 5).map((entry, i) => {
              // hero.journal[k] corresponds to the kth completed adventure.
              // We reversed, so this is hero.journal.length - 1 - i in the
              // original order — which lines up with the kth past adventure
              // (also reversed by listAdventuresForHero).
              const reverseIdx = i;
              const matchingAdv = pastAdventures[reverseIdx];
              return (
                <article key={i} className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: "rgba(15,27,45,0.5)", borderLeft: "2px solid #DAA520" }}>
                  {matchingAdv && (
                    <div className="text-[10px] uppercase tracking-[0.25em] mb-1.5 flex items-center justify-between gap-2" style={{ color: "rgba(218,165,32,0.85)", fontFamily: "'Cinzel', serif" }}>
                      <span className="truncate">{matchingAdv.title}</span>
                      <span className="text-[9px]" style={{ color: "rgba(233,227,210,0.5)" }}>
                        {matchingAdv.outcome ?? matchingAdv.status} · {matchingAdv.scenes.length} scenes
                      </span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap" style={{ color: "rgba(233,227,210,0.85)" }}>{entry}</div>
                </article>
              );
            })}
          </div>
        </Section>
      )}

      {pastAdventures.length > 5 && (
        <Section title={`All Adventures (${pastAdventures.length})`}>
          <div className="text-xs space-y-1">
            {pastAdventures.slice(5).map(adv => (
              <div key={adv.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: "rgba(15,27,45,0.4)" }}>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(218,165,32,0.7)" }}>
                  {adv.outcome ?? adv.status}
                </span>
                <span className="flex-1 truncate" style={{ fontFamily: "'Cinzel', serif", color: "#e9e3d2" }}>{adv.title}</span>
                <span className="text-[10px]" style={{ color: "rgba(233,227,210,0.5)" }}>{adv.scenes.length} scenes</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Reputation">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(hero.reputation.cities).map(([city, score]) => (
            <div key={city} className="px-2.5 py-1.5 rounded-md" style={{ background: "rgba(15,27,45,0.5)" }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.5)" }}>{city}</div>
              <div className="font-mono text-sm" style={{ color: score > 30 ? "#3fcc6a" : score < -30 ? "#c75050" : "#DAA520" }}>{score > 0 ? "+" : ""}{score}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2 pt-2">
        {activeAdventure && activeAdventure.heroId === hero.id ? (
          <button
            onClick={() => navigate("/olympus/adventure")}
            className="px-5 py-3 rounded-2xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            <Play size={16} /> Resume Adventure
          </button>
        ) : hero.archived ? (
          <div className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(233,227,210,0.55)" }}>
            <Archive size={14} /> Unarchive to begin new adventures
          </div>
        ) : (
          <button
            onClick={async () => { await setActiveHero(hero.id); navigate("/olympus/adventure/new"); }}
            className="px-5 py-3 rounded-2xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            <BookOpen size={16} /> Begin New Adventure
          </button>
        )}
        {!hero.archived ? (
          <button
            onClick={async () => {
              if (window.confirm(`Archive ${hero.name}? Their story is preserved but they're no longer on the active roster.`)) {
                await archiveHero(hero.id);
                navigate("/olympus");
              }
            }}
            className="px-4 py-3 rounded-2xl text-sm pressable touch-target flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(233,227,210,0.7)" }}
          >
            <Archive size={14} /> Archive
          </button>
        ) : (
          <button
            onClick={async () => {
              await unarchiveHero(hero.id);
              navigate("/olympus");
            }}
            className="px-4 py-3 rounded-2xl text-sm pressable touch-target flex items-center gap-2"
            style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.3)", color: "#DAA520" }}
          >
            <RotateCcw size={14} /> Unarchive
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-1.5" style={{ color: "#DAA520" }}>{title}</div>
      <div>{children}</div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: accent ? "rgba(218,165,32,0.15)" : "rgba(15,27,45,0.5)", border: accent ? "1px solid rgba(218,165,32,0.3)" : "1px solid rgba(255,255,255,0.05)" }}>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.55)" }}>{label}</div>
      <div className="font-display text-lg" style={{ color: accent ? "#DAA520" : "#e9e3d2" }}>{value}</div>
    </div>
  );
}

function BlessingsPanel({ hero }: { hero: any }) {
  const collected = new Set(hero.equipment.blessings.map((b: any) => b.god));
  const count = blessingCount(hero);
  const allDone = readyForTitans(hero);
  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-1.5 flex items-center gap-2" style={{ color: "#DAA520" }}>
        <span>Blessings of the Gods</span>
        <span className="text-[10px]" style={{ color: "rgba(233,227,210,0.55)" }}>{count} / {BLESSINGS.length}</span>
        {allDone && <span className="text-[9px] px-1.5 py-0.5 rounded font-display tracking-widest" style={{ background: "#DAA520", color: "#0F1B2D" }}>TITANS</span>}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {BLESSINGS.map((b: any) => {
          const owned = collected.has(b.god);
          return (
            <div
              key={b.god}
              className="rounded-lg px-2 py-2 text-center"
              style={{
                background: owned ? `${b.hue}22` : "rgba(15,27,45,0.5)",
                border: owned ? `1px solid ${b.hue}66` : "1px solid rgba(255,255,255,0.06)",
                opacity: owned ? 1 : 0.45,
                filter: owned ? undefined : "grayscale(1)",
              }}
              title={`${b.god}: ${b.desc}`}
            >
              <div className="text-2xl">{b.emoji}</div>
              <div className="text-[10px] font-display tracking-wide mt-0.5" style={{ color: owned ? b.hue : "rgba(233,227,210,0.5)" }}>{b.god}</div>
            </div>
          );
        })}
      </div>
      {hero.equipment.blessings.length > 0 && (
        <div className="mt-2 space-y-1">
          {hero.equipment.blessings.map((b: any, i: number) => {
            const def = BLESSINGS.find((d: any) => d.god === b.god);
            return (
              <div key={i} className="text-[11px] flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: "rgba(15,27,45,0.4)" }}>
                <span>{def?.emoji ?? "✨"}</span>
                <span className="font-display tracking-wide" style={{ color: def?.hue ?? "#DAA520" }}>{b.god}</span>
                <span style={{ color: "rgba(233,227,210,0.65)" }}>· {b.name}</span>
                {def?.desc && <span className="hidden sm:inline text-ink-300 truncate flex-1 text-right">{def.desc}</span>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompanionPanel({ hero }: { hero: any }) {
  const evolveCompanion = useOlympus(s => s.evolveCompanion);
  const c = hero.companion;
  if (!c) return null;
  const line = getLine(c.lineId);
  if (!line) return null;
  const stage = getStage(c.lineId, c.stage);
  if (!stage) return null;
  const nextStage = c.stage < 3 ? getStage(c.lineId, (c.stage + 1) as 2 | 3) : null;
  const canEvolveNow = c.stage < 3 && c.level >= EVOLUTION_LEVELS[c.stage + 1];
  const xpPct = Math.min(100, Math.round((c.xp / Math.max(1, c.xpToNext)) * 100));
  return (
    <Section title="Your Companion">
      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <CompanionSprite lineId={c.lineId} stage={c.stage} accentColor={c.accentColor} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.55)" }}>Stage {c.stage} of 3 · sacred to {line.mythLink}</div>
          <div className="font-display tracking-wide text-2xl truncate" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{c.name}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(233,227,210,0.7)" }}>The {stage.name} · Level {c.level}</div>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(233,227,210,0.85)" }}>{stage.description}</p>
          <div className="text-[11px] mt-2 italic" style={{ color: "#DAA520" }}>{stage.ability}</div>

          {/* XP bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>
              <span>XP toward Level {c.level + 1}</span>
              <span>{c.xp} / {c.xpToNext}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full transition-all" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #DAA520, #FFD700)" }} />
            </div>
          </div>

          {/* Skills */}
          {c.skills && c.skills.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#86efac" }}>Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(134,239,172,0.1)", border: "1px solid rgba(134,239,172,0.3)", color: "#86efac" }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Evolution path */}
          {nextStage && (
            <div className="mt-4 rounded-xl px-3 py-2.5" style={{ background: canEvolveNow ? "rgba(134,239,172,0.08)" : "rgba(218,165,32,0.06)", border: canEvolveNow ? "1px solid rgba(134,239,172,0.4)" : "1px solid rgba(218,165,32,0.2)" }}>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: canEvolveNow ? "#86efac" : "#DAA520" }}>
                {canEvolveNow ? "★ Ready to evolve" : `Next evolution at Level ${EVOLUTION_LEVELS[c.stage + 1]}`}
              </div>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(233,227,210,0.85)" }}>
                <span>{stage.name}</span>
                <span style={{ color: "rgba(233,227,210,0.45)" }}>→</span>
                <span>{nextStage.name}</span>
              </div>
              {canEvolveNow && (
                <button
                  onClick={() => evolveCompanion(hero.id)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-display tracking-wider pressable touch-target"
                  style={{ background: "#86efac", color: "#0a1a10" }}
                >
                  ★ Evolve into {nextStage.name}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function ArtifactsPanel({ hero }: { hero: any }) {
  const owned = new Set<string>(hero.mythicArtifacts ?? []);
  const ownedCount = owned.size;
  const total = MYTHIC_ARTIFACTS.length;
  return (
    <Section title={`Mythic Artifacts · ${ownedCount} / ${total}`}>
      <div className="text-[11px] mb-3 italic" style={{ color: "rgba(233,227,210,0.6)" }}>
        Once-only legendary items. Awarded by gods, recovered from defeated bosses, or found in mythic sites. Cannot be lost, sold, or destroyed.
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {MYTHIC_ARTIFACTS.map(a => {
          const has = owned.has(a.id);
          return (
            <div
              key={a.id}
              className="rounded-xl p-2.5 text-center pressable touch-target"
              style={{
                background: has ? "linear-gradient(135deg, rgba(218,165,32,0.18), rgba(15,27,45,0.4))" : "rgba(15,27,45,0.4)",
                border: has ? "1px solid rgba(218,165,32,0.45)" : "1px solid rgba(255,255,255,0.06)",
                filter: has ? undefined : "grayscale(1) opacity(0.55)",
              }}
              title={has ? `${a.name} — ${a.storyUse}` : "Locked"}
            >
              <div className="text-2xl">{has ? a.icon : "❓"}</div>
              <div className="text-[10px] mt-1 font-display tracking-wider truncate" style={{ color: has ? "#DAA520" : "rgba(233,227,210,0.4)", fontFamily: "'Cinzel', serif" }}>
                {has ? a.name : "???"}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
