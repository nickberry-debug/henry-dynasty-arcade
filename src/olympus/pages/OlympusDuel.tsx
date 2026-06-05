// Olympus — head-to-head hero duel (#15). Cross-profile combat: pick a
// hero from any family member's roster against your own, watch a brief
// stat-driven exchange resolve, and the result posts to the family
// Activity feed.
//
// Lightweight by design — this isn't the rich Adventure system. It's
// the Family Roster's "VS" button taken further: hero A vs hero B,
// turn-based exchange that respects their stats + level, ~6-10 rounds.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Swords, Trophy } from "lucide-react";
import type { Hero } from "../types";
import { db } from "../../db/dexie";
import { HeroSprite } from "../components/HeroSprite";
import { OlympusDivider } from "../components/OlympusDivider";
import { useActiveProfile, loadProfiles } from "../../profiles/store";
import { postActivity } from "../../sync/liveActivity";
import { publishSession, clearSession } from "../../sync/liveSession";
import { playSfx, unlockAudio } from "../../art";

interface NavState {
  myHeroId: string;
  theirHeroId: string;
  theirProfileId: string;
  theirProfileName: string;
}

interface TurnLog {
  side: "mine" | "theirs";
  text: string;
  damage: number;
}

function totalStats(h: Hero): number {
  return Object.values(h.stats).reduce((a, b) => a + b, 0);
}

/** Roll a single round of damage based on the attacker's strength +
 *  magic, mitigated by the defender's endurance + intuition. Range is
 *  tuned so a duel takes 5–10 rounds. */
function rollDamage(att: Hero, def: Hero, rand: () => number): number {
  const offense = att.stats.strength + att.stats.magic + att.level * 2;
  const defense = def.stats.endurance + def.stats.intuition + def.level;
  const variance = 0.7 + rand() * 0.6;
  const base = (offense * 0.6 - defense * 0.35) * variance;
  return Math.max(3, Math.round(base));
}

function arePilotStatsClose(a: Hero, b: Hero): boolean {
  return Math.abs(totalStats(a) - totalStats(b)) < 30;
}

export default function OlympusDuel() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as NavState | null;
  const profile = useActiveProfile();

  const [myHero, setMyHero] = useState<Hero | null>(null);
  const [theirHero, setTheirHero] = useState<Hero | null>(null);
  const [myHp, setMyHp] = useState(0);
  const [theirHp, setTheirHp] = useState(0);
  const [log, setLog] = useState<TurnLog[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "fighting" | "done">("loading");
  const [winner, setWinner] = useState<"mine" | "theirs" | "draw" | null>(null);

  // Load both heroes from Dexie (cross-profile).
  useEffect(() => {
    if (!navState) { setPhase("ready"); return; }
    (async () => {
      try {
        const a = await db.olympusHeroes.get(navState.myHeroId);
        const b = await db.olympusHeroes.get(navState.theirHeroId);
        if (a && b) {
          setMyHero(a as Hero);
          setTheirHero(b as Hero);
          setMyHp(a.hpMax);
          setTheirHp(b.hpMax);
          setPhase("ready");
        } else {
          setPhase("ready");
        }
      } catch { setPhase("ready"); }
    })();
  }, [navState?.myHeroId, navState?.theirHeroId]);

  // Live-session presence — broadcast that this player is in a hero duel.
  useEffect(() => {
    if (!profile || !myHero || !theirHero) return;
    publishSession({
      profileId: profile.id,
      profileName: profile.handle || profile.name,
      profileColor: profile.color,
      gameId: "olympus",
      label: "Hero duel",
      detail: `${myHero.name} vs ${theirHero.name}`,
      emoji: "⚔️",
      phase: "active",
      startedAt: Date.now(),
    });
    return () => { clearSession(profile.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, myHero?.id, theirHero?.id]);

  // Helper: deterministic-ish RNG seeded on hero ids so a given matchup
  // doesn't swing wildly between attempts.
  const rand = useMemo(() => {
    const seed = `${navState?.myHeroId}-${navState?.theirHeroId}-${Date.now()}`;
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
  }, [navState?.myHeroId, navState?.theirHeroId]);

  // Run the duel as a sequence of timed turns.
  function startDuel() {
    if (!myHero || !theirHero) return;
    setPhase("fighting");
    let mh = myHp, th = theirHp;
    const turns: TurnLog[] = [];
    // Who goes first — higher agility wins, ties go to luck.
    let attackerIsMine =
      myHero.stats.agility > theirHero.stats.agility ||
      (myHero.stats.agility === theirHero.stats.agility && myHero.stats.luck >= theirHero.stats.luck);
    for (let i = 0; i < 20 && mh > 0 && th > 0; i++) {
      if (attackerIsMine) {
        const d = rollDamage(myHero, theirHero, rand);
        th = Math.max(0, th - d);
        turns.push({ side: "mine", text: `${myHero.name} strikes ${theirHero.name}!`, damage: d });
      } else {
        const d = rollDamage(theirHero, myHero, rand);
        mh = Math.max(0, mh - d);
        turns.push({ side: "theirs", text: `${theirHero.name} strikes ${myHero.name}!`, damage: d });
      }
      attackerIsMine = !attackerIsMine;
    }
    // Schedule the UI playback so the player sees each turn land.
    let i = 0;
    let liveMh = myHero.hpMax;
    let liveTh = theirHero.hpMax;
    const step = () => {
      if (i >= turns.length) {
        const w = mh <= 0 && th <= 0 ? "draw"
          : mh <= 0 ? "theirs"
          : th <= 0 ? "mine"
          : (arePilotStatsClose(myHero, theirHero) ? "draw" : (totalStats(myHero) >= totalStats(theirHero) ? "mine" : "theirs"));
        setWinner(w);
        setPhase("done");
        playSfx(w === "mine" ? "voYouWin" : w === "theirs" ? "voYouLose" : "voTie", { volume: 0.9 });
        playSfx("metalBell", { volume: 0.5 });
        // Post to family activity.
        try {
          if (profile && navState) {
            const summary =
              w === "mine"  ? `${myHero.name} defeated ${theirHero.name} in a duel.` :
              w === "theirs"? `${theirHero.name} bested ${myHero.name} in a duel.` :
              `${myHero.name} and ${theirHero.name} fought to a draw.`;
            postActivity({
              profileId: profile.id,
              profileName: profile.handle || profile.name,
              profileColor: profile.color,
              gameId: "olympus",
              kind: "olympus_complete",
              text: summary,
              emoji: "⚔️",
            });
          }
        } catch { /* ignore */ }
        return;
      }
      const t = turns[i++];
      if (t.side === "mine") liveTh = Math.max(0, liveTh - t.damage);
      else liveMh = Math.max(0, liveMh - t.damage);
      setMyHp(liveMh);
      setTheirHp(liveTh);
      setLog(prev => [t, ...prev].slice(0, 8));
      setTimeout(step, 650);
    };
    step();
  }

  if (!navState) {
    return (
      <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>
        <p>No matchup selected.</p>
        <button onClick={() => navigate("/family/roster")} className="mt-4 underline" style={{ color: "#DAA520" }}>
          Pick from the Family Roster
        </button>
      </div>
    );
  }

  if (!myHero || !theirHero) {
    return <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>Loading heroes…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-8 space-y-4">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Hero Duel</div>
          <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>
            VS
          </h1>
          <OlympusDivider variant={3} />
        </div>
        <div style={{ width: 40 }} aria-hidden="true" />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <FighterCard hero={myHero} hp={myHp} label="You" winner={winner === "mine"} />
        <FighterCard hero={theirHero} hp={theirHp} label={navState.theirProfileName} winner={winner === "theirs"} flipped />
      </div>

      {phase === "ready" && (
        <button onClick={startDuel}
          className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
          style={{ background: "#DAA520", color: "#0F1B2D", minHeight: 56 }}>
          <Swords size={14} className="inline mr-1.5" /> START DUEL
        </button>
      )}

      {(phase === "fighting" || phase === "done") && (
        <section className="rounded-2xl p-3"
          style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.30)" }}>
          <div className="text-[10px] uppercase tracking-[0.3em] mb-1.5" style={{ color: "#DAA520" }}>Combat Log</div>
          <ul className="space-y-1 text-[11px]">
            <AnimatePresence initial={false}>
              {log.map((t, i) => (
                <motion.li key={`${t.text}_${i}`}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    color: i === 0 ? "#fef3c7" : "rgba(229,231,235,0.5)",
                  }}>
                  · {t.text} <span style={{ color: t.side === "mine" ? "#86efac" : "#fca5a5" }}>−{t.damage} HP</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {phase === "done" && winner && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-center"
          style={{
            background: winner === "draw"
              ? "linear-gradient(135deg, rgba(218,165,32,0.10), rgba(15,27,45,0.7))"
              : winner === "mine"
                ? "linear-gradient(135deg, rgba(134,239,172,0.10), rgba(15,27,45,0.7))"
                : "linear-gradient(135deg, rgba(252,165,165,0.10), rgba(15,27,45,0.7))",
            border: "1.5px solid rgba(218,165,32,0.6)",
          }}>
          <Trophy size={28} style={{ color: "#DAA520", margin: "0 auto" }} />
          <div className="font-display text-xl tracking-[0.15em] mt-1" style={{ color: "#DAA520" }}>
            {winner === "draw" ? "DRAW"
              : winner === "mine" ? `${myHero.name.toUpperCase()} WINS!`
              : `${theirHero.name.toUpperCase()} WINS!`}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FighterCard({ hero, hp, label, winner, flipped }: {
  hero: Hero; hp: number; label: string; winner?: boolean; flipped?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (hp / hero.hpMax) * 100));
  return (
    <div className="rounded-2xl p-3"
      style={{
        background: winner
          ? "linear-gradient(135deg, rgba(218,165,32,0.18), rgba(15,27,45,0.6))"
          : "rgba(15,27,45,0.5)",
        border: `1px solid ${winner ? "#DAA520" : "rgba(218,165,32,0.25)"}`,
      }}>
      <div className={`flex items-center gap-2 ${flipped ? "flex-row-reverse" : ""}`}>
        <HeroSprite hero={hero} size={64} />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-widest" style={{ color: "#DAA520" }}>{label}</div>
          <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fef3c7" }}>{hero.name}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,227,210,0.65)" }}>
            L{hero.level} · {hero.className}
          </div>
        </div>
      </div>
      <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
        <motion.div className="h-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }}
          style={{ background: pct > 50 ? "#86efac" : pct > 25 ? "#fbbf24" : "#f87171" }} />
      </div>
      <div className="text-[10px] mt-0.5 text-right" style={{ color: "rgba(233,227,210,0.7)" }}>
        {hp} / {hero.hpMax}
      </div>
    </div>
  );
}

/** Static helper used by the Family Roster button to navigate here. */
export function buildDuelNavState(args: {
  myHeroId: string;
  theirHeroId: string;
  theirProfileId: string;
}): NavState | null {
  const theirProfile = loadProfiles().find(p => p.id === args.theirProfileId);
  if (!theirProfile) return null;
  return {
    myHeroId: args.myHeroId,
    theirHeroId: args.theirHeroId,
    theirProfileId: args.theirProfileId,
    theirProfileName: theirProfile.handle || theirProfile.name,
  };
}
