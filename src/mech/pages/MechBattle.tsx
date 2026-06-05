// Mech Combat — watchable battle screen. Builds a sim against a random
// league-scaled rival, then plays the frames out at ~30 FPS with HP
// bars, an attack log, and visible weapon discharges (color-tinted
// pulses on the target). On KO, shows the result + prize and writes
// the battle to the save's history.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Zap, Skull } from "lucide-react";
import { useMech } from "../store";
import { simulateBattle, findMatch, generateEnemy, matchupOdds, botPower, type BattleFrame, type BattleResult } from "../combat";
import { activeBotHpFrac, LEAGUE_CHAMPION_NAMES } from "../store";
import { repairCost } from "../parts";
import { LEAGUE_INFO, LEAGUE_ORDER } from "../types";
import { getActiveProfileId, recordGameSession, loadProfiles } from "../../profiles/store";
import { addMemory } from "../../profiles/memory";
import { postActivity } from "../../sync/liveActivity";
import { playSfx, unlockAudio } from "../../art";
import { publishSession, clearSession } from "../../sync/liveSession";
import { useActiveProfile } from "../../profiles/store";

const PLAY_SPEED = 1.0; // 1.0 = real-time (30 sim fps)

export default function MechBattle() {
  const navigate = useNavigate();
  const { save, activeBot } = useMech();
  useEffect(() => { unlockAudio(); }, []);
  // Family Roster -> "DUEL" handoff: the Roster page stashes a challenger
  // bot in sessionStorage and routes here. Pick it up exactly once; if
  // present, fight that bot. Otherwise generate a procedural rival.
  const challenger = useMemo<{ bot: import("../types").Bot; label: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem("dd_mech_challenger");
      if (!raw) return null;
      sessionStorage.removeItem("dd_mech_challenger");
      return JSON.parse(raw);
    } catch { return null; }
  }, []);

  // Promotion-match handoff from MechHub: a sessionStorage flag means
  // we generate a tougher league champion + treat a win as a promotion
  // (calls promoteLeague) rather than a regular league win.
  const isPromotion = useMemo<boolean>(() => {
    try {
      const v = sessionStorage.getItem("dd_mech_promotion");
      if (v === "1") {
        sessionStorage.removeItem("dd_mech_promotion");
        return true;
      }
    } catch {}
    return false;
  }, []);

  // Generate the opponent once per battle screen mount. findMatch
  // narrows enemy power to a ±15% band of the player's, so fights
  // feel earned. Challenger override (family duel handoff) bypasses.
  // Promotion match generates a tougher "league champion" enemy.
  const opponent = useMemo<import("../types").Bot | null>(() => {
    if (!activeBot) return null;
    if (challenger?.bot) return challenger.bot;
    if (isPromotion) {
      // Loop a few times to find the strongest band-matched candidate.
      let best = findMatch(activeBot, save.league);
      let bestPow = botPower(best);
      for (let i = 0; i < 6; i++) {
        const cand = findMatch(activeBot, save.league);
        const p = botPower(cand);
        if (p > bestPow) { best = cand; bestPow = p; }
      }
      // Re-skin as the named league champion + bump stats ~25%.
      return {
        ...best,
        name: LEAGUE_CHAMPION_NAMES[save.league],
        paint: "#ef4444",
        personality: "balanced",
        derived: {
          ...best.derived,
          hp:    Math.round(best.derived.hp    * 1.25),
          armor: Math.round(best.derived.armor * 1.20),
          power: Math.round(best.derived.power * 1.20),
        },
      };
    }
    return findMatch(activeBot, save.league);
  }, [activeBot?.id, save.league, challenger, isPromotion]);

  // Pre-fight modal — show matchup before playback. User taps FIGHT
  // to actually begin the sim playback.
  const [preFight, setPreFight] = useState(true);
  const startHpFrac = activeBot ? activeBotHpFrac(save) : 1;

  const result = useMemo<BattleResult | null>(() => {
    if (!activeBot || !opponent || preFight) return null;
    return simulateBattle(activeBot, opponent, { leftStartHpFrac: startHpFrac });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBot?.id, opponent, preFight]);

  const [frameIdx, setFrameIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [recentEvents, setRecentEvents] = useState<string[]>([]);
  const [flashLeft, setFlashLeft] = useState(0);
  const [flashRight, setFlashRight] = useState(0);
  // Live projectile overlays — each is a fire-and-forget animation from
  // attacker -> target with a kind that drives the visual (rail, missile,
  // beam, etc.). Spawned on every "shot" event, cleaned up by their own
  // onAnimationComplete callback.
  const [shots, setShots] = useState<Array<{
    id: number; from: "left" | "right"; kind: string; color: string; hit: boolean;
  }>>([]);
  const shotIdRef = useRef(0);
  // Screen-shake intensity (decays each frame). Bumped on hits.
  const [shake, setShake] = useState(0);
  const rafRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  // Broadcast live-session presence so other family devices see you're
  // in a Mech fight. Clear on unmount or when the battle ends.
  const profile = useActiveProfile();
  useEffect(() => {
    if (!profile || !activeBot) return;
    publishSession({
      profileId: profile.id,
      profileName: profile.handle || profile.name,
      profileColor: profile.color,
      gameId: "mech",
      label: `${LEAGUE_INFO[save.league].label} fight`,
      detail: activeBot.name,
      emoji: "🤖",
      phase: "active",
      startedAt: Date.now(),
    });
    return () => { clearSession(profile.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeBot?.id, save.league]);

  // Playback loop — advance through frames at the configured speed.
  useEffect(() => {
    if (!result || done) return;
    let last = performance.now();
    let acc = 0;
    const FPS = 30;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      acc += dt * PLAY_SPEED * FPS;
      while (acc >= 1) {
        acc -= 1;
        setFrameIdx(prev => {
          if (prev >= result.frames.length - 1) return prev;
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [result, done]);

  // Process events on the current frame — show flashes + push to log.
  useEffect(() => {
    if (!result) return;
    const frame = result.frames[frameIdx];
    if (!frame) return;
    for (const e of frame.events) {
      if (e.kind === "shot") {
        // Always spawn a visible projectile (even on misses) — Contra-style
        // attack telegraph so the player SEES the weapon fire.
        const id = ++shotIdRef.current;
        setShots(prev => [...prev, {
          id, from: e.from, kind: e.weapon.kind, color: e.weapon.color, hit: e.hit,
        }]);
        if (e.hit) {
          if (e.from === "left") setFlashRight(8);
          else setFlashLeft(8);
          setShake(s => Math.min(12, s + 4));
          setRecentEvents(prev => [
            `${e.from === "left" ? activeBot?.name : "Rival"} fires ${e.weapon.name} — ${e.damage} DMG`,
            ...prev,
          ].slice(0, 6));
        }
      } else if (e.kind === "ko") {
        setRecentEvents(prev => [`💥 KO — ${e.side === "left" ? activeBot?.name : "Rival"} drops!`, ...prev].slice(0, 6));
      } else if (e.kind === "log") {
        setRecentEvents(prev => [e.text, ...prev].slice(0, 6));
      }
    }
    // Decay flashes + screen shake
    if (flashLeft > 0) setFlashLeft(f => Math.max(0, f - 1));
    if (flashRight > 0) setFlashRight(f => Math.max(0, f - 1));
    if (shake > 0) setShake(s => Math.max(0, s - 1.5));

    // End of playback?
    if (frameIdx >= result.frames.length - 1 && !done) {
      setDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx, result]);

  // On battle end: write to save, record stats + memory.
  const mech = useMech();
  useEffect(() => {
    if (!done || !result || recordedRef.current || !activeBot) return;
    recordedRef.current = true;
    const won = result.winner === "left";
    playSfx(won ? "voYouWin" : "voYouLose", { volume: 0.9 });
    playSfx("explosionBig", { volume: 0.6 });
    const prize = won ? LEAGUE_INFO[save.league].prize : Math.round(LEAGUE_INFO[save.league].prize * 0.25);
    const scrapGain = won ? Math.round(LEAGUE_INFO[save.league].prize / 20) : 4;

    // Mutate save: money, scrap, wins/losses, recent battle.
    const battle = {
      id: `b_${Date.now()}`,
      whenMs: Date.now(),
      left: { botName: activeBot.name },
      right: { botName: challenger ? `${result.frames[0]?.right.bot.name} (${challenger.label})` : (result.frames[0]?.right.bot.name ?? "Rival") },
      league: save.league,
      winner: result.winner,
      durationMs: result.durationMs,
      summary: result.summary,
    };
    mech.save.battles; // touch
    // Apply via update — pulling out the raw `update` would be nicer but
    // useMech doesn't expose it. Reuse customize as a side-effect channel
    // by calling addBot would be wrong — instead, mutate localStorage
    // directly and trigger a re-render via promoteLeague would be wrong.
    // Cleanest: use mech.customize for unrelated patch; we need real
    // mutation. Implement an inline tweak by reading the persisted blob,
    // updating, and writing back — same path useMech uses internally.
    try {
      const key = `prof_${getActiveProfileId() ?? "guest"}::dd_mech_save_v1`;
      const raw = localStorage.getItem(key);
      const cur = raw ? JSON.parse(raw) : save;
      cur.money = (cur.money ?? 0) + prize;
      cur.scrap = (cur.scrap ?? 0) + scrapGain;
      cur.wins  = (cur.wins  ?? 0) + (won ? 1 : 0);
      cur.losses= (cur.losses?? 0) + (won ? 0 : 1);
      cur.battles = [battle, ...(cur.battles ?? [])].slice(0, 20);
      // Persist residual HP fraction on the active bot so the next
      // fight (or the Repair Bay) sees the chip damage.
      if (activeBot) {
        const remainingFrac = result.leftHpFrac;
        const botHp = { ...(cur.botHp ?? {}) };
        botHp[activeBot.id] = Math.max(0, Math.min(1, remainingFrac));
        cur.botHp = botHp;
      }
      // League progression: promotion match wins climb the ladder;
      // regular wins increment the per-league counter that unlocks the
      // next promotion match.
      if (won) {
        if (isPromotion) {
          // Promote!
          const idx = LEAGUE_ORDER.indexOf(cur.league);
          const nextLeague = LEAGUE_ORDER[Math.min(LEAGUE_ORDER.length - 1, idx + 1)];
          if (nextLeague !== cur.league) {
            const lw = { ...(cur.leagueWins ?? {}) };
            lw[nextLeague] = 0;
            cur.leagueWins = lw;
            cur.league = nextLeague;
            cur.trophies = [
              ...(cur.trophies ?? []),
              { league: cur.league, wonAt: Date.now(), bracket: "Promotion Match" },
            ];
            // Promotion prize bonus on top of regular prize.
            const newLeagueInfo = LEAGUE_INFO[cur.league as keyof typeof LEAGUE_INFO];
            const bonusPrize = Math.round(((newLeagueInfo?.prize) ?? 100) * 0.5);
            cur.money = (cur.money ?? 0) + bonusPrize;
          }
        } else {
          // Regular win — bump the league win counter.
          const lw = { ...(cur.leagueWins ?? {}) };
          lw[cur.league] = (lw[cur.league] ?? 0) + 1;
          cur.leagueWins = lw;
        }
      }
      cur.modifiedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(cur));
      // Trigger active-profile event so useMech re-loads
      window.dispatchEvent(new CustomEvent("arcade-active-profile-changed", { detail: getActiveProfileId() }));
    } catch { /* ignore */ }
    // Check for newly-met achievements. Defer so the save above persists
    // first; claimAchievements reads from the in-hook save copy.
    setTimeout(() => {
      try {
        const unlocked = mech.claimAchievements();
        if (unlocked.length > 0) {
          setRecentEvents(prev => [
            ...unlocked.map(a => `${a.emoji} Achievement: ${a.name} (+$${a.rewardCash})`),
            ...prev,
          ].slice(0, 8));
        }
      } catch { /* ignore */ }
    }, 200);

    // Family stats + memory
    const pid = getActiveProfileId();
    if (pid) {
      recordGameSession(pid, "mech", {
        sessions: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        seconds: Math.round(result.durationMs / 1000),
      });
      addMemory({
        profileId: pid, gameId: "mech",
        kind: won ? "achievement" : "loss",
        emoji: won ? "🏆" : "💥",
        text: result.summary,
      });
      const profile = loadProfiles().find(p => p.id === pid);
      if (profile) {
        postActivity({
          profileId: pid,
          profileName: profile.handle || profile.name,
          profileColor: profile.color,
          gameId: "mech",
          kind: won ? "mech_win" : "mech_duel",
          emoji: won ? "🏆" : "🤖",
          text: `${profile.handle || profile.name}: ${result.summary}`,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // No bot configured.
  if (!activeBot || !opponent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "#0a0508", color: "#fef3c7" }}>
        <div className="font-display text-xl mb-2">No bot ready</div>
        <button onClick={() => navigate("/mech")} className="px-4 py-2 rounded-full pressable touch-target"
          style={{ background: "#fb923c", color: "#1a0505", minHeight: 44 }}>Back</button>
      </div>
    );
  }

  // Pre-fight matchup screen.
  if (preFight || !result) {
    const odds = matchupOdds(activeBot, opponent);
    const repairNeeded = repairCost(startHpFrac, save.league);
    return (
      <PreFightScreen
        activeBot={activeBot}
        opponent={opponent}
        odds={odds}
        league={save.league}
        startHpFrac={startHpFrac}
        repairNeeded={repairNeeded}
        money={save.money}
        onRepair={() => mech.repairActiveBot()}
        onFight={() => setPreFight(false)}
        onBack={() => navigate("/mech")}
      />
    );
  }

  const frame: BattleFrame = result.frames[Math.min(frameIdx, result.frames.length - 1)];
  const enemy = frame.right.bot;
  const leftHpFrac = Math.max(0, frame.left.hp / frame.left.maxHp);
  const rightHpFrac = Math.max(0, frame.right.hp / frame.right.maxHp);
  const distance = Math.abs(frame.right.x - frame.left.x);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 18% 0%, rgba(252,165,165,0.16), transparent 60%), " +
          "radial-gradient(900px 600px at 82% 100%, rgba(251,191,36,0.14), transparent 60%), " +
          "linear-gradient(180deg, #1a0808 0%, #0a0a08 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/mech")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>{LEAGUE_INFO[save.league].label}</div>
          <h1 className="font-display text-xl tracking-wider" style={{ color: "#fde047" }}>BATTLE</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {/* HP bars at the top */}
        <section className="grid grid-cols-2 gap-2">
          <FighterBar bot={activeBot} hpFrac={leftHpFrac} energy={frame.left.energy/frame.left.maxEnergy} side="left" flash={flashLeft} />
          <FighterBar bot={enemy} hpFrac={rightHpFrac} energy={frame.right.energy/frame.right.maxEnergy} side="right" flash={flashRight} />
        </section>

        {/* Arena — Contra-style scrolling backdrop, projectile overlay,
            screen-shake on hits, parallax stars + horizon hex grid. */}
        <motion.section className="rounded-2xl p-4 relative overflow-hidden"
          animate={shake > 0 ? { x: [0, -shake, shake, 0] } : { x: 0 }}
          transition={{ duration: 0.1 }}
          style={{
            background:
              "radial-gradient(800px 200px at 50% 110%, rgba(252,165,165,0.18), transparent 60%), " +
              "linear-gradient(180deg, rgba(80,40,20,0.55), rgba(20,8,8,0.95))",
            border: "1px solid rgba(252,165,165,0.35)",
            minHeight: 220,
          }}>
          {/* Animated background — parallax dots + scanning grid */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(1px 1px at 10% 30%, #fde047, transparent), " +
                "radial-gradient(1px 1px at 40% 20%, #fde047, transparent), " +
                "radial-gradient(1px 1px at 70% 50%, #fbbf24, transparent), " +
                "radial-gradient(1px 1px at 90% 25%, #fde047, transparent)",
              animation: "mech-pan 22s linear infinite",
            }} />
          {/* Horizon hex grid */}
          <svg aria-hidden="true" className="absolute left-0 right-0 bottom-0 pointer-events-none opacity-25"
            style={{ height: 90 }} viewBox="0 0 600 90" preserveAspectRatio="none">
            {Array.from({ length: 10 }).map((_, row) => (
              <g key={row} stroke="#fca5a5" strokeWidth="0.5" fill="none">
                <line x1={0} y1={row * 10} x2={600} y2={row * 10} opacity={1 - row * 0.08} />
              </g>
            ))}
            {Array.from({ length: 14 }).map((_, col) => {
              const x = (col - 7) * 40;
              return <line key={col} x1={300 + x} y1={0} x2={300 + x * 2.8} y2={90} stroke="#fca5a5" strokeWidth="0.5" opacity="0.6" />;
            })}
          </svg>
          {/* Ground line */}
          <div aria-hidden="true" className="absolute left-0 right-0"
            style={{ bottom: 36, height: 2, background: "linear-gradient(90deg, transparent, rgba(252,165,165,0.5), transparent)" }} />
          {/* Bots */}
          <div className="relative h-40">
            <div className="absolute" style={{ left: `${(frame.left.x / 600) * 100}%`, bottom: 28, transform: "translateX(-50%)" }}>
              <SilhouetteBot paint={activeBot.paint} flash={flashLeft} overdrive={leftHpFrac > 0 && leftHpFrac < 0.25} />
              {flashLeft > 0 && <ImpactBurst color="#fff" />}
            </div>
            <div className="absolute" style={{ left: `${(frame.right.x / 600) * 100}%`, bottom: 28, transform: "translateX(-50%) scaleX(-1)" }}>
              <SilhouetteBot paint={enemy.paint} flash={flashRight} overdrive={rightHpFrac > 0 && rightHpFrac < 0.25} />
              {flashRight > 0 && <ImpactBurst color="#fff" />}
            </div>
            {/* Projectiles — each frame's shot events spawn one of these */}
            <AnimatePresence>
              {shots.map(s => (
                <ProjectileFX key={s.id} kind={s.kind} color={s.color} from={s.from}
                  leftX={frame.left.x} rightX={frame.right.x}
                  onDone={() => setShots(prev => prev.filter(p => p.id !== s.id))} />
              ))}
            </AnimatePresence>
          </div>
          <div className="text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(252,165,165,0.7)" }}>
            range: {Math.round(distance)}
          </div>
        </motion.section>

        {/* Attack log */}
        <section className="rounded-xl p-3"
          style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[9px] uppercase tracking-[0.3em] mb-1.5" style={{ color: "#fca5a5" }}>Attack Log</div>
          <AnimatePresence initial={false}>
            <ul className="space-y-0.5">
              {recentEvents.map((e, i) => (
                <motion.li key={`${e}_${i}`}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px]" style={{ color: i === 0 ? "#fef3c7" : "rgba(229,231,235,0.55)" }}>
                  {e}
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        </section>

        {/* Result panel */}
        {done && (
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 text-center"
            style={{
              background: result.winner === "left"
                ? "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(20,8,8,0.95))"
                : "linear-gradient(135deg, rgba(248,113,113,0.18), rgba(20,8,8,0.95))",
              border: `1.5px solid ${result.winner === "left" ? "#86efac" : "#f87171"}`,
            }}>
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: result.winner === "left" ? "#86efac" : "#f87171" }}>
              {result.winner === "left" ? <Trophy size={20} aria-hidden="true" /> : <Skull size={20} aria-hidden="true" />}
              <div className="font-display text-xl tracking-widest">
                {result.winner === "left" ? "VICTORY" : "DEFEAT"}
              </div>
            </div>
            <div className="text-[12px] mb-3" style={{ color: "#fef3c7" }}>{result.summary}</div>
            <div className="flex items-center gap-3 justify-center text-[12px]" style={{ color: "#fde047" }}>
              <Zap size={14} aria-hidden="true" />
              <span>+${result.winner === "left" ? LEAGUE_INFO[save.league].prize : Math.round(LEAGUE_INFO[save.league].prize * 0.25)} cash</span>
              <span style={{ color: "#86efac" }}>+{result.winner === "left" ? Math.round(LEAGUE_INFO[save.league].prize / 20) : 4} scrap</span>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => navigate("/mech")} className="px-4 py-2.5 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7", minHeight: 44 }}>
                BACK TO HUB
              </button>
              <button onClick={() => location.reload()} className="px-4 py-2.5 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
                style={{ background: "linear-gradient(135deg, #fb923c, #ef4444)", color: "#1a0505", minHeight: 44 }}>
                FIGHT AGAIN
              </button>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}

function FighterBar({ bot, hpFrac, energy, side, flash }: { bot: { name: string; paint: string }; hpFrac: number; energy: number; side: "left" | "right"; flash: number }) {
  return (
    <div className="rounded-xl p-2.5"
      style={{
        background: `linear-gradient(${side === "left" ? "135deg" : "225deg"}, ${bot.paint}22, rgba(0,0,0,0.5))`,
        border: `1px solid ${bot.paint}66`,
        boxShadow: flash > 0 ? `0 0 ${flash * 3}px ${bot.paint}` : undefined,
      }}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fef3c7" }}>{bot.name}</div>
        {hpFrac > 0 && hpFrac < 0.25 && (
          <span className="text-[8px] tracking-[0.25em] font-display px-1.5 py-0.5 rounded"
            style={{ background: "#ef4444", color: "#fef3c7", animation: "pulse 0.8s infinite" }}>
            OVERDRIVE
          </span>
        )}
      </div>
      <div className="h-2.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <motion.div
          animate={{ width: `${Math.max(0, hpFrac * 100)}%` }}
          transition={{ duration: 0.1 }}
          className="h-full"
          style={{ background: hpFrac > 0.5 ? "#86efac" : hpFrac > 0.25 ? "#fbbf24" : "#f87171" }} />
      </div>
      <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <motion.div animate={{ width: `${Math.max(0, energy * 100)}%` }} transition={{ duration: 0.1 }}
          className="h-full" style={{ background: "#a78bfa" }} />
      </div>
    </div>
  );
}

/** Weapon-kind-specific projectile animator. Lasts ~0.45s and travels
 *  from attacker -> target. Shape depends on weapon kind:
 *   - rail/cannon  : tracer bolt with a quick fade
 *   - missile      : rocket with an exhaust trail (multiple stacked particles)
 *   - beam         : full-width laser pulse (Hadouken energy beam)
 *   - cluster      : 4-shot fan spread
 *   - flamer       : warm gradient cone
 *   - saw / shock  : melee arc / lightning forks
 */
function ProjectileFX({ kind, color, from, leftX, rightX, onDone }: {
  kind: string; color: string; from: "left" | "right";
  leftX: number; rightX: number;
  onDone: () => void;
}) {
  const startLeftPct = (leftX / 600) * 100;
  const startRightPct = (rightX / 600) * 100;
  const startPct = from === "left" ? startLeftPct : startRightPct;
  const endPct = from === "left" ? startRightPct : startLeftPct;
  const direction = from === "left" ? 1 : -1;

  // Beam — full bright stripe; doesn't travel, just flashes.
  if (kind === "beam") {
    return (
      <motion.div
        initial={{ opacity: 0, scaleY: 0.3 }}
        animate={{ opacity: [0, 1, 1, 0], scaleY: [0.3, 1, 1, 0.6] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55 }}
        onAnimationComplete={onDone}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: `${Math.min(startPct, endPct)}%`,
          width: `${Math.abs(endPct - startPct)}%`,
          bottom: 60,
          height: 10,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 18px ${color}, 0 0 36px ${color}88`,
          borderRadius: 5,
        }} />
    );
  }

  // Shock — quick lightning bolt overlay.
  if (kind === "shock") {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 0.6 }}
        animate={{ opacity: [1, 1, 0], scale: [0.6, 1.2, 1.3] }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={onDone}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: `${Math.min(startPct, endPct)}%`,
          width: `${Math.abs(endPct - startPct)}%`,
          bottom: 56,
          height: 16,
          background:
            `repeating-linear-gradient(90deg, transparent 0 6px, ${color} 6px 8px, transparent 8px 14px)`,
          filter: `drop-shadow(0 0 8px ${color})`,
        }} />
    );
  }

  // Saw — melee arc at target, only fires when close.
  if (kind === "saw") {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 0.4, rotate: 0 }}
        animate={{ opacity: [1, 1, 0], scale: [0.4, 1.4, 1.6], rotate: 540 }}
        transition={{ duration: 0.5 }}
        onAnimationComplete={onDone}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: `${endPct}%`,
          bottom: 56,
          transform: "translateX(-50%)",
          width: 32, height: 32,
          background: `radial-gradient(circle, ${color}, ${color}66 60%, transparent)`,
          borderRadius: "50%",
          boxShadow: `0 0 14px ${color}`,
        }} />
    );
  }

  // Cluster — 4-shot fan spread, each with slight offset.
  if (kind === "cluster") {
    return (
      <>
        {[-12, -4, 4, 12].map((yo, i) => (
          <motion.div key={i}
            initial={{ left: `${startPct}%`, opacity: 1 }}
            animate={{ left: `${endPct}%`, opacity: [1, 1, 0] }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            onAnimationComplete={i === 3 ? onDone : undefined}
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              bottom: 60 + yo,
              transform: "translateX(-50%)",
              width: 14, height: 6,
              background: `radial-gradient(ellipse, ${color}, transparent 70%)`,
              borderRadius: 3,
              boxShadow: `0 0 8px ${color}`,
            }} />
        ))}
      </>
    );
  }

  // Flamer — warm cone that hangs at the muzzle.
  if (kind === "flamer") {
    return (
      <motion.div
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: [0, 1, 1, 0], scaleX: [0.4, 1.0, 1.0, 0.7] }}
        transition={{ duration: 0.55 }}
        onAnimationComplete={onDone}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: `${startPct + direction * 4}%`,
          bottom: 58,
          width: `${Math.abs(endPct - startPct) * 0.55}%`,
          height: 28,
          transformOrigin: from === "left" ? "left center" : "right center",
          background: `linear-gradient(${from === "left" ? "90deg" : "270deg"}, ${color} 0%, #fbbf24 50%, transparent 100%)`,
          filter: "blur(2px)",
          borderRadius: 14,
        }} />
    );
  }

  // Missile — rocket with multi-segment exhaust trail.
  if (kind === "missile") {
    return (
      <>
        <motion.div
          initial={{ left: `${startPct}%`, opacity: 1 }}
          animate={{ left: `${endPct}%`, opacity: [1, 1, 0] }}
          transition={{ duration: 0.7 }}
          onAnimationComplete={onDone}
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            bottom: 64,
            transform: "translateX(-50%) " + (from === "right" ? "scaleX(-1)" : ""),
            width: 18, height: 8,
            background: `linear-gradient(90deg, ${color}, #fef3c7)`,
            borderRadius: 4,
            boxShadow: `0 0 12px ${color}, 0 0 20px ${color}66`,
          }} />
        {/* Exhaust trail */}
        {[0.05, 0.10, 0.15].map((d, i) => (
          <motion.div key={i}
            initial={{ left: `${startPct}%`, opacity: 0.6 - i * 0.15 }}
            animate={{ left: `${endPct}%`, opacity: 0 }}
            transition={{ duration: 0.7, delay: d }}
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              bottom: 64,
              transform: "translateX(-50%)",
              width: 12 - i * 2, height: 12 - i * 2,
              background: `radial-gradient(circle, #fbbf24, transparent 70%)`,
              borderRadius: "50%",
              filter: "blur(1px)",
            }} />
        ))}
      </>
    );
  }

  // Default — rail/cannon: bright tracer bolt.
  return (
    <motion.div
      initial={{ left: `${startPct}%`, opacity: 1, scale: 1 }}
      animate={{ left: `${endPct}%`, opacity: [1, 1, 0], scale: [1, 1, 1.4] }}
      transition={{ duration: 0.35 }}
      onAnimationComplete={onDone}
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        bottom: 62,
        transform: "translateX(-50%)",
        width: 18, height: 5,
        background: `linear-gradient(90deg, transparent, ${color}, #fef3c7, ${color}, transparent)`,
        borderRadius: 3,
        boxShadow: `0 0 14px ${color}, 0 0 24px ${color}aa`,
      }} />
  );
}

/** Tiny radial impact burst on a hit. Mounted briefly over the target. */
function ImpactBurst({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 0.4 }}
      animate={{ opacity: 0, scale: 1.7 }}
      transition={{ duration: 0.35 }}
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        top: -8, left: "50%", transform: "translateX(-50%)",
        width: 50, height: 50, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}, ${color}66 50%, transparent 80%)`,
        boxShadow: `0 0 20px ${color}`,
      }} />
  );
}

function SilhouetteBot({ paint, flash, overdrive }: { paint: string; flash: number; overdrive?: boolean }) {
  // Combat-scaled bot — same Contra/Stardew chunky silhouette as the Hub,
  // sized smaller for the arena.
  const shadow = "#0a0a0a";
  const id = `bb-${paint.replace("#", "")}`;
  return (
    <svg viewBox="0 0 64 80" width={56} height={70} aria-hidden="true"
      style={{
        filter: flash > 0
          ? `drop-shadow(0 0 ${flash * 1.5}px #fff) brightness(1.3)`
          : overdrive
            ? `drop-shadow(0 0 14px #ef4444) drop-shadow(0 4px 10px #ef444488) hue-rotate(-12deg)`
            : `drop-shadow(0 4px 10px ${paint}99)`,
        animation: overdrive ? "mech-overdrive 0.6s ease-in-out infinite" : undefined,
      }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paint} stopOpacity="1" />
          <stop offset="100%" stopColor={paint} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="78" rx="18" ry="2.4" fill="#000" opacity="0.45" />
      {/* Legs */}
      <rect x="19" y="52" width="9"  height="12" rx="1.5" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      <rect x="36" y="52" width="9"  height="12" rx="1.5" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      <rect x="17" y="66" width="13" height="9"  rx="2" fill="#3a3a3a" stroke={shadow} strokeWidth="1.4" />
      <rect x="34" y="66" width="13" height="9"  rx="2" fill="#3a3a3a" stroke={shadow} strokeWidth="1.4" />
      {/* Chest */}
      <rect x="13" y="22" width="38" height="32" rx="5" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.8" />
      <circle cx="17" cy="26" r="1.3" fill="#1a1a1a" />
      <circle cx="47" cy="26" r="1.3" fill="#1a1a1a" />
      <rect x="18" y="29" width="28" height="11" rx="2" fill="#0a0a0a" opacity="0.9" />
      <rect x="20" y="31" width="10" height="2" fill={paint} opacity="0.6" />
      <circle cx="32" cy="46" r="2.2" fill={paint} stroke={shadow} strokeWidth="1" />
      <circle cx="32" cy="46" r="1.0" fill="#fef3c7" />
      {/* Arms */}
      <rect x="2"  y="22" width="12" height="10" rx="2" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      <rect x="50" y="22" width="12" height="10" rx="2" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      <rect x="3"  y="32" width="10" height="18" rx="2" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      <rect x="51" y="32" width="10" height="18" rx="2" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.4" />
      {/* Head */}
      <rect x="22" y="4" width="20" height="16" rx="3" fill={`url(#${id})`} stroke={shadow} strokeWidth="1.6" />
      <line x1="27" y1="2" x2="27" y2="-2" stroke={shadow} strokeWidth="1.4" />
      <rect x="25" y="10" width="14" height="3" rx="1" fill="#0a0a0a" />
      <rect x="27" y="11" width="3"  height="1" fill={paint} opacity="0.95" />
      <rect x="34" y="11" width="3"  height="1" fill={paint} opacity="0.95" />
      <rect x="28" y="15" width="8" height="2" fill="#0a0a0a" />
    </svg>
  );
}

// ── Pre-fight matchup screen ─────────────────────────────────────────
function PreFightScreen({
  activeBot, opponent, odds, league, startHpFrac, repairNeeded, money,
  onRepair, onFight, onBack,
}: {
  activeBot: import("../types").Bot;
  opponent: import("../types").Bot;
  odds: { leftPct: number; rightPct: number };
  league: import("../types").League;
  startHpFrac: number;
  repairNeeded: number;
  money: number;
  onRepair: () => void;
  onFight: () => void;
  onBack: () => void;
}) {
  const lp = botPower(activeBot);
  const rp = botPower(opponent);
  const hpPct = Math.round(startHpFrac * 100);
  const canRepair = repairNeeded > 0 && money >= repairNeeded;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 18% 0%, rgba(252,165,165,0.16), transparent 60%), " +
          "radial-gradient(900px 600px at 82% 100%, rgba(251,191,36,0.14), transparent 60%), " +
          "linear-gradient(180deg, #1a0808 0%, #0a0a08 100%)",
        color: "#fef3c7",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={onBack} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>{LEAGUE_INFO[league].label}</div>
          <h1 className="font-display text-xl tracking-wider" style={{ color: "#fde047" }}>MATCHUP</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {/* Two-bot comparison */}
        <section className="grid grid-cols-2 gap-3">
          <FighterColumn bot={activeBot} side="left" hpFrac={startHpFrac} oddsPct={odds.leftPct} power={lp} />
          <FighterColumn bot={opponent}  side="right" hpFrac={1}         oddsPct={odds.rightPct} power={rp} />
        </section>

        {/* Odds bar */}
        <section className="rounded-md p-3" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-[10px] tracking-[0.3em] uppercase mb-2 text-center" style={{ color: "#fbbf24" }}>WIN ODDS</div>
          <div className="h-3 rounded overflow-hidden flex" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${odds.leftPct}%`,  background: activeBot.paint }} />
            <div style={{ width: `${odds.rightPct}%`, background: opponent.paint }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span style={{ color: activeBot.paint }}>{activeBot.name}: {odds.leftPct}%</span>
            <span style={{ color: opponent.paint }}>{opponent.name}: {odds.rightPct}%</span>
          </div>
        </section>

        {/* Repair callout — if bot needs HP, give a one-tap repair before fight */}
        {repairNeeded > 0 && (
          <section className="rounded-md p-3"
            style={{
              background: hpPct < 60 ? "rgba(252,165,165,0.15)" : "rgba(251,191,36,0.10)",
              border: `1px solid ${hpPct < 60 ? "#fca5a566" : "#fbbf2455"}`,
            }}>
            <div className="text-[11px] mb-2">
              Your bot's at <span style={{ color: hpPct < 60 ? "#fca5a5" : "#fbbf24" }}>{hpPct}% HP</span> from prior fights.
              Repair for <span style={{ color: "#fbbf24" }}>${repairNeeded}</span>?
            </div>
            <button onClick={onRepair} disabled={!canRepair}
              className="w-full px-3 py-2 rounded-md text-[11px] tracking-widest pressable touch-target"
              style={{
                background: canRepair ? "linear-gradient(135deg, #fb923c, #f97316)" : "rgba(255,255,255,0.05)",
                color: canRepair ? "#1a0505" : "#9ca3af",
                cursor: canRepair ? "pointer" : "not-allowed",
                minHeight: 40,
              }}>
              {canRepair ? `REPAIR ($${repairNeeded})` : `NEED $${repairNeeded - money}`}
            </button>
          </section>
        )}

        {/* FIGHT button */}
        <button onClick={onFight}
          className="w-full px-3 py-4 rounded-xl font-display tracking-[0.3em] pressable touch-target"
          style={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fef3c7", fontSize: 18, minHeight: 56,
          }}>
          FIGHT →
        </button>
      </main>
    </div>
  );
}

function FighterColumn({ bot, side, hpFrac, oddsPct, power }: {
  bot: import("../types").Bot; side: "left" | "right"; hpFrac: number; oddsPct: number; power: number;
}) {
  const hpPct = Math.round(hpFrac * 100);
  return (
    <div className="rounded-md p-3 flex flex-col items-center gap-2"
      style={{
        background: `linear-gradient(180deg, ${bot.paint}22, rgba(0,0,0,0.5))`,
        border: `1px solid ${bot.paint}55`,
      }}>
      <div className="text-[9px] tracking-[0.2em] uppercase" style={{ color: bot.paint }}>{side === "left" ? "YOU" : "RIVAL"}</div>
      <SilhouetteBot paint={bot.paint} flash={0} />
      <div className="font-display text-sm text-center" style={{ color: "#fef3c7" }}>{bot.name}</div>
      <div className="text-[9px] uppercase opacity-70 capitalize">{bot.personality}</div>
      <div className="w-full text-[10px] space-y-1 mt-1">
        <StatRow label="HP"     v={bot.derived.hp}    c="#86efac" />
        <StatRow label="ARMOR"  v={bot.derived.armor} c="#7dd3fc" />
        <StatRow label="POWER"  v={bot.derived.power} c="#fbbf24" />
        <StatRow label="SPEED"  v={bot.derived.speed} c="#67e8f9" />
        <StatRow label="POWER#" v={power}             c="#fca5a5" />
      </div>
      <div className="w-full mt-1">
        <div className="text-[9px] opacity-70">Integrity: {hpPct}%</div>
        <div className="h-1.5 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div style={{ width: `${hpPct}%`, height: "100%", background: hpPct >= 70 ? "#86efac" : hpPct >= 40 ? "#fbbf24" : "#fca5a5" }} />
        </div>
      </div>
      {bot.weapons.left && <div className="text-[9px] opacity-80 text-center">L: {bot.weapons.left.name}</div>}
      {bot.weapons.right && <div className="text-[9px] opacity-80 text-center">R: {bot.weapons.right.name}</div>}
    </div>
  );
}

function StatRow({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: c, opacity: 0.7 }}>{label}</span>
      <span style={{ color: "#fef3c7" }}>{v}</span>
    </div>
  );
}
