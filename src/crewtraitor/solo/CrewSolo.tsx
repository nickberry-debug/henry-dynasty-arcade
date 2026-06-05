// Crew Traitor — solo (vs-CPU) game page. Single-device, no Firestore.
// Player drives their own character; bots tick on a 2.5s loop. Same
// rules as online (sabotage, tag-out, meetings, voting, vents,
// detective peek, ghost mode).

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertCircle, Trophy, Skull, Users, Cpu } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import { getMap, DEFAULT_MAP } from "../maps";
import { getSabotage } from "../sabotage";
import { useCrewStats } from "../store";
import {
  newSoloGame, botTick, botVote, resolveMeeting,
  applyMove, applyCompleteTask, applyTagOut, applyTriggerSabotage,
  applyCallMeeting, applyVote, tickSabotageExpiry, traitorIdsOf,
  type SoloState, type SoloPlayer, type Difficulty,
} from "./engine";

const BOT_TICK_MS = 2500;
const SABOTAGE_CHECK_MS = 1000;

type Step = "setup" | "play" | "done";

export default function CrewSolo() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const { recordMatch } = useCrewStats();
  const [step, setStep] = useState<Step>("setup");
  const [state, setState] = useState<SoloState | null>(null);
  const [botCount, setBotCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("chill");
  const [forceRole, setForceRole] = useState<"random" | "crew" | "traitor">("random");
  const [taskInProgress, setTaskInProgress] = useState<string | null>(null);
  const [taskHoldStart, setTaskHoldStart] = useState(0);
  const [voteResolved, setVoteResolved] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const map = getMap(DEFAULT_MAP)!;

  // ── Bot tick loop while playing ────────────────────────────────────
  useEffect(() => {
    if (step !== "play" || !state || state.phase !== "playing") return;
    const id = setInterval(() => {
      setState(prev => prev ? botTick(prev, difficulty) : prev);
    }, BOT_TICK_MS);
    return () => clearInterval(id);
  }, [step, state?.phase, difficulty]);

  // ── Sabotage expiry watcher ────────────────────────────────────────
  useEffect(() => {
    if (step !== "play" || !state?.sabotage) return;
    const id = setInterval(() => {
      setState(prev => prev ? tickSabotageExpiry(prev) : prev);
    }, SABOTAGE_CHECK_MS);
    return () => clearInterval(id);
  }, [step, state?.sabotage?.startedAt]);

  // ── Meeting: bot voting + auto-resolve when all voted or time's up ─
  useEffect(() => {
    if (step !== "play" || state?.phase !== "meeting" || !state.meeting) return;
    setVoteResolved(false);
    // Bots vote after a short delay (feels like discussion).
    const t1 = setTimeout(() => {
      setState(prev => prev ? botVote(prev, difficulty) : prev);
    }, 1500);
    return () => clearTimeout(t1);
  }, [step, state?.meeting?.startedAt, difficulty]);

  useEffect(() => {
    if (step !== "play" || state?.phase !== "meeting" || !state.meeting || voteResolved) return;
    const meeting = state.meeting;
    const alive = state.players.filter(p => p.alive);
    const voteCount = Object.keys(meeting.votes ?? {}).length;
    const elapsed = (Date.now() - meeting.startedAt) / 1000;
    if (voteCount >= alive.length || elapsed >= meeting.durationSec) {
      setVoteResolved(true);
      const t = setTimeout(() => {
        setState(prev => prev ? resolveMeeting(prev) : prev);
      }, 800);
      return () => clearTimeout(t);
    }
    // Keep re-checking.
    const id = setInterval(() => {
      setState(s => s ? { ...s } : s); // force re-render to re-eval timer
    }, 1000);
    return () => clearInterval(id);
  }, [step, state?.meeting?.startedAt, state?.meeting?.votes, voteResolved]);

  // ── Game end → record stats ────────────────────────────────────────
  useEffect(() => {
    if (state?.phase !== "ended" || recorded || !profile || !state) return;
    setRecorded(true);
    setStep("done");
    const priv = state.privates[profile.id];
    if (!priv) return;
    recordMatch({
      wonAsCrew: state.winner === "crew" && priv.role === "crew",
      wonAsTraitor: state.winner === "traitor" && priv.role === "traitor",
    });
  }, [state?.phase, recorded, profile?.id]);

  // ── Task hold-to-complete ──────────────────────────────────────────
  useEffect(() => {
    if (!taskInProgress || !profile || !state) return;
    const t = setTimeout(() => {
      setState(prev => prev ? applyCompleteTask(prev, profile.id, taskInProgress) : prev);
      setTaskInProgress(null);
      setTaskHoldStart(0);
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskInProgress, profile?.id]);

  if (!profile) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  }

  // ── SETUP ──────────────────────────────────────────────────────────
  if (step === "setup") {
    function start() {
      const game = newSoloGame({
        human: {
          profileId: profile!.id,
          profileName: profile!.handle || profile!.name,
          profileColor: profile!.color,
        },
        botCount,
        difficulty,
        forceHumanRole: forceRole === "random" ? undefined : forceRole,
      });
      setState(game);
      setStep("play");
      setRecorded(false);
    }
    return (
      <div className="min-h-screen flex flex-col"
        style={{
          background:
            "radial-gradient(900px 600px at 50% 0%, rgba(155,227,255,0.18), transparent 60%), " +
            "linear-gradient(180deg, #050a14 0%, #02050a 100%)",
        }}>
        <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
          <button onClick={() => navigate("/crew")} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#9be3ff" }}>
              🛰️ CREW TRAITOR · VS CPU
            </div>
            <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>SOLO LAUNCH</h1>
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 max-w-md mx-auto w-full space-y-3">
          <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(229,231,235,0.78)" }}>
            One device. Bots ARE your crewmates AND your suspects. Pick how many and how sharp.
          </p>
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: "#9be3ff" }}>BOT COUNT</div>
            <div className="grid grid-cols-5 gap-1.5">
              {[3, 4, 5, 6, 7].map(n => (
                <button key={n} onClick={() => setBotCount(n)} aria-pressed={botCount === n}
                  className="py-2.5 rounded-lg pressable touch-target font-display tracking-widest text-[11px]"
                  style={{
                    background: botCount === n ? "rgba(155,227,255,0.30)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${botCount === n ? "#9be3ff" : "rgba(255,255,255,0.15)"}`,
                    color: botCount === n ? "#9be3ff" : "#fef3c7",
                  }}>{n}</button>
              ))}
            </div>
            <div className="text-[10px] text-center mt-1.5" style={{ color: "rgba(229,231,235,0.6)" }}>
              {botCount} bots + you = {botCount + 1} players ·{" "}
              {botCount + 1 <= 5 ? "1 traitor" : botCount + 1 <= 8 ? "2 traitors" : "3 traitors"}
            </div>
          </section>
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: "#9be3ff" }}>DIFFICULTY</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDifficulty("chill")} aria-pressed={difficulty === "chill"}
                className="rounded-xl p-2.5 pressable touch-target text-left"
                style={{
                  background: difficulty === "chill" ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${difficulty === "chill" ? "#86efac" : "rgba(255,255,255,0.15)"}`,
                }}>
                <div className="font-display tracking-widest text-[12px]" style={{ color: "#86efac" }}>CHILL</div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
                  Slower bots, more random voting. Good for first games.
                </div>
              </button>
              <button onClick={() => setDifficulty("sharp")} aria-pressed={difficulty === "sharp"}
                className="rounded-xl p-2.5 pressable touch-target text-left"
                style={{
                  background: difficulty === "sharp" ? "rgba(252,165,165,0.20)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${difficulty === "sharp" ? "#fca5a5" : "rgba(255,255,255,0.15)"}`,
                }}>
                <div className="font-display tracking-widest text-[12px]" style={{ color: "#fca5a5" }}>SHARP</div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
                  Faster tags, smarter voting. Real challenge.
                </div>
              </button>
            </div>
          </section>
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-1.5" style={{ color: "#9be3ff" }}>YOUR ROLE</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["random", "crew", "traitor"] as const).map(r => (
                <button key={r} onClick={() => setForceRole(r)} aria-pressed={forceRole === r}
                  className="rounded-lg p-2 pressable touch-target text-center"
                  style={{
                    background: forceRole === r ? "rgba(253,224,71,0.25)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${forceRole === r ? "#fde047" : "rgba(255,255,255,0.15)"}`,
                  }}>
                  <div className="font-display tracking-widest text-[10px]"
                    style={{ color: forceRole === r ? "#fde047" : "#fef3c7" }}>
                    {r === "random" ? "🎲 RANDOM" : r === "crew" ? "👥 CREW" : "⚔️ TRAITOR"}
                  </div>
                </button>
              ))}
            </div>
          </section>
          <button onClick={start}
            className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
            style={{ background: "linear-gradient(135deg, #9be3ff, #38bdf8)", color: "#0a0a14", minHeight: 64 }}>
            <Cpu size={14} className="inline mr-1.5" /> LAUNCH VS CPU
          </button>
        </main>
      </div>
    );
  }

  if (!state) return null;
  const priv = profile ? state.privates[profile.id] : null;
  const me = state.players.find(p => p.profileId === profile.id) ?? null;
  if (!me || !priv) return null;
  const myRoom = map.rooms.find(r => r.id === me.roomId);
  const tasksInMyRoom = map.tasks.filter(t => t.roomId === me.roomId);
  const aliveCount = state.players.filter(p => p.alive).length;
  const totalRoom = state.players.length;
  const taskFrac = Math.min(1, state.tasksCompleted / Math.max(1, state.taskGoal));
  const coOccupants = state.players.filter(p =>
    p.profileId !== profile.id && p.alive && p.roomId === me.roomId);
  const canTag = me.alive && priv.role === "traitor";
  const ventExits: string[] = [];
  if (priv.role === "traitor" || priv.variant === "engineer") {
    for (const [a, b] of map.ventPairs) {
      if (a === me.roomId) ventExits.push(b);
      else if (b === me.roomId) ventExits.push(a);
    }
  }

  // ── PLAY ───────────────────────────────────────────────────────────
  function onMove(roomId: string) {
    if (!me?.alive) return;
    if (state?.phase !== "playing") return;
    if (roomId === me.roomId) return;
    setState(prev => prev ? applyMove(prev, profile!.id, roomId) : prev);
  }
  function onTag(victimId: string) {
    if (!canTag) return;
    setState(prev => prev ? applyTagOut(prev, profile!.id, victimId) : prev);
  }
  function onTriggerSabotage() {
    if (priv?.role !== "traitor" || !me?.alive) return;
    setState(prev => prev ? applyTriggerSabotage(prev) : prev);
  }
  function onCallMeeting() {
    if (!me?.alive || state?.sabotage) return;
    setState(prev => prev ? applyCallMeeting(prev, profile!.id) : prev);
  }
  function onVoteCast(targetId: string) {
    setState(prev => prev ? applyVote(prev, profile!.id, targetId) : prev);
  }
  function onUseVent(toRoomId: string) {
    if (!me?.alive) return;
    onMove(toRoomId);
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(155,227,255,0.14), transparent 60%), " +
          "linear-gradient(180deg, #050a14 0%, #02050a 100%)",
      }}>
      <header className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/crew")} aria-label="Quit"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#9be3ff" }}>
            VS CPU · {aliveCount}/{totalRoom} ALIVE
          </div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>{map.name}</h1>
        </div>
        <div className="text-right">
          <div className="text-[9px] tracking-widest" style={{ color: priv.role === "traitor" ? "#ef4444" : "#86efac" }}>YOU ARE</div>
          <div className="font-display text-[13px]" style={{ color: priv.role === "traitor" ? "#fca5a5" : "#86efac" }}>
            {priv.role.toUpperCase()}
          </div>
          {priv.variant && priv.variant !== "none" && (
            <div className="text-[9px] mt-0.5 tracking-widest" style={{ color: "#fde047" }}>
              {priv.variant === "detective" ? "🕵️ DETECTIVE" : "🔧 ENGINEER"}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        {/* Crew task progress */}
        <section className="rounded-xl p-2"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(134,239,172,0.30)" }}>
          <div className="flex items-center justify-between text-[9px] tracking-widest" style={{ color: "#86efac" }}>
            <span>CREW TASKS</span>
            <span>{state.tasksCompleted} / {state.taskGoal}</span>
          </div>
          <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
            <motion.div className="h-full" animate={{ width: `${taskFrac * 100}%` }} transition={{ duration: 0.35 }}
              style={{ background: "linear-gradient(90deg, #86efac, #22c55e)" }} />
          </div>
        </section>

        {/* Map */}
        <SoloMap map={map} players={state.players} myProfileId={profile.id} onMove={onMove} />

        {/* Sabotage banner */}
        {state.sabotage && <SoloSabotageBanner sabotage={state.sabotage} />}

        {/* Vent shortcuts */}
        {me.alive && state.phase === "playing" && ventExits.length > 0 && (
          <section className="rounded-xl p-2"
            style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.45)" }}>
            <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#a78bfa" }}>VENT SHORTCUT</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ventExits.map(rid => {
                const r = map.rooms.find(rr => rr.id === rid);
                if (!r) return null;
                return (
                  <button key={rid} onClick={() => onUseVent(rid)}
                    className="rounded-lg p-2 text-left pressable touch-target"
                    style={{ background: "rgba(167,139,250,0.18)", border: "1px solid rgba(167,139,250,0.45)" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🕳️</span>
                      <span className="font-display text-[11px] tracking-widest" style={{ color: "#fef3c7" }}>
                        → {r.name.toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Current room panel */}
        {myRoom && (
          <SoloRoomPanel
            roomName={myRoom.name} roomEmoji={myRoom.emoji} accent={myRoom.color}
            tasks={tasksInMyRoom}
            myAssigned={priv.assignedTaskIds}
            myCompleted={priv.completedTaskIds}
            taskInProgress={taskInProgress}
            onStartTask={(taskId) => {
              if (!me?.alive || state.phase !== "playing") return;
              if (priv.completedTaskIds.includes(taskId)) return;
              if (!priv.assignedTaskIds.includes(taskId)) return;
              setTaskInProgress(taskId);
              setTaskHoldStart(Date.now());
            }}
            onCancelTask={() => { setTaskInProgress(null); setTaskHoldStart(0); }}
            isTraitor={priv.role === "traitor"}
            coOccupants={coOccupants}
            onTag={canTag ? onTag : undefined}
          />
        )}

        {/* Traitor sabotage trigger */}
        {me.alive && state.phase === "playing" && priv.role === "traitor" && !state.sabotage && (
          <button onClick={onTriggerSabotage}
            className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
            style={{ background: "linear-gradient(135deg, #ef4444, #7c2d12)", color: "#fef3c7", minHeight: 52 }}>
            🚨 TRIGGER SABOTAGE
          </button>
        )}

        {/* Emergency meeting */}
        {me.alive && state.phase === "playing" && !state.sabotage && (
          <button onClick={onCallMeeting}
            className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
            style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fef3c7", minHeight: 52 }}>
            <AlertCircle size={14} className="inline mr-1.5" /> EMERGENCY MEETING
          </button>
        )}

        {/* Ghost banner */}
        {!me.alive && state.phase === "playing" && (
          <div className="rounded-xl px-3 py-2 text-center"
            style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.40)" }}>
            <Skull size={18} style={{ color: "#fca5a5", display: "inline" }} />
            <span className="ml-2 text-[12px]" style={{ color: "#fca5a5" }}>
              You're a ghost — finish your tasks anyway. Crew win condition still counts your work.
            </span>
          </div>
        )}

        {state.lastEvent && (
          <div className="text-[11px] text-center italic" style={{ color: "#fde047" }}>{state.lastEvent}</div>
        )}
      </main>

      {/* Meeting modal */}
      <AnimatePresence>
        {state.phase === "meeting" && state.meeting && (
          <SoloMeetingModal state={state} myProfileId={profile.id} onVote={onVoteCast} />
        )}
      </AnimatePresence>

      {/* End modal */}
      <AnimatePresence>
        {state.phase === "ended" && (
          <SoloEndModal state={state} priv={priv} onAgain={() => {
            setState(null); setStep("setup"); setRecorded(false);
          }} onBack={() => navigate("/crew")} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components (lean variants of the online ones) ─────────────────

function SoloMap({ map, players, myProfileId, onMove }: {
  map: NonNullable<ReturnType<typeof getMap>>;
  players: SoloPlayer[];
  myProfileId: string;
  onMove: (roomId: string) => void;
}) {
  return (
    <section className="rounded-2xl p-2 relative"
      style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,5,10,0.95))", border: "1px solid rgba(155,227,255,0.30)" }}>
      <svg viewBox="-55 -45 110 90" className="w-full" style={{ aspectRatio: "11/9" }} aria-label="Station map">
        <g stroke="rgba(155,227,255,0.20)" strokeWidth="1" strokeDasharray="2 2" fill="none">
          {map.rooms.map((r, i) =>
            map.rooms.slice(i + 1).map(r2 => (
              <line key={`${r.id}-${r2.id}`} x1={r.x} y1={r.y} x2={r2.x} y2={r2.y} />
            ))
          ).flat()}
        </g>
        {map.rooms.map(r => {
          const occupants = players.filter(p => p.roomId === r.id);
          const meHere = occupants.some(p => p.profileId === myProfileId);
          return (
            <g key={r.id} onClick={() => onMove(r.id)} style={{ cursor: "pointer" }}>
              <rect x={r.x - r.w / 2} y={r.y - r.h / 2} width={r.w} height={r.h} rx={3}
                fill={`${r.color}22`}
                stroke={meHere ? r.color : `${r.color}66`}
                strokeWidth={meHere ? 2 : 1} />
              <text x={r.x} y={r.y - 1} fontSize={4} textAnchor="middle"
                fill={meHere ? r.color : "#fef3c7"} style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
                {r.emoji} {r.name}
              </text>
              {occupants.map((p, i) => (
                <circle key={p.profileId}
                  cx={r.x - (r.w / 2) + 3 + (i % 5) * 3}
                  cy={r.y + (r.h / 2) - 3 - Math.floor(i / 5) * 3}
                  r={p.alive ? 1.6 : 1.4}
                  fill={p.alive ? p.profileColor : "#9aa6bf"}
                  fillOpacity={p.alive ? 1 : 0.4}
                  stroke={p.profileId === myProfileId ? "#fde047" : p.alive ? "#fef3c7" : "#fca5a5"}
                  strokeWidth={p.profileId === myProfileId ? 0.6 : 0.3}
                  strokeDasharray={p.alive ? undefined : "1 0.8"} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] mt-1 text-center opacity-65" style={{ color: "#9be3ff" }}>
        Tap a room to walk there.
      </div>
    </section>
  );
}

function SoloSabotageBanner({ sabotage }: { sabotage: NonNullable<SoloState["sabotage"]> }) {
  const def = getSabotage(sabotage.id);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, sabotage.durationMs - (now - sabotage.startedAt));
  const remainSec = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainingMs / sabotage.durationMs) * 100));
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(15,5,5,0.95))",
        border: "1.5px solid #ef4444",
        boxShadow: "0 0 20px rgba(239,68,68,0.40)",
      }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display tracking-wide text-[14px]" style={{ color: "#fca5a5" }}>
          {def?.emoji ?? "🚨"} {def?.label ?? sabotage.id}
        </div>
        <div className="font-display tracking-widest text-base tabular-nums" style={{ color: "#fde047" }}>
          {remainSec}s
        </div>
      </div>
      <div className="text-[11px] mb-1.5" style={{ color: "rgba(229,231,235,0.85)" }}>
        {def?.flavor ?? "Fix it!"}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="h-full transition-all"
          style={{ width: `${pct}%`, background: pct < 25 ? "#ef4444" : pct < 50 ? "#fbbf24" : "#86efac" }} />
      </div>
      {sabotage.remainingRoomIds.length > 0 && (
        <div className="text-[10px] mt-1.5 flex flex-wrap gap-1">
          <span style={{ color: "rgba(229,231,235,0.7)" }}>Crew → tap these rooms:</span>
          {sabotage.remainingRoomIds.map(r => (
            <span key={r} className="px-1.5 py-0.5 rounded font-display tracking-widest"
              style={{ background: "rgba(252,165,165,0.18)", border: "1px solid rgba(252,165,165,0.40)", color: "#fef3c7" }}>
              {r.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function SoloRoomPanel(props: {
  roomName: string; roomEmoji: string; accent: string;
  tasks: { id: string; label: string; emoji: string }[];
  myAssigned: string[]; myCompleted: string[];
  taskInProgress: string | null;
  onStartTask: (id: string) => void;
  onCancelTask: () => void;
  isTraitor: boolean;
  coOccupants: SoloPlayer[];
  onTag?: (victimId: string) => void;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: `linear-gradient(135deg, ${props.accent}1f, rgba(10,10,20,0.85))`, border: `1.5px solid ${props.accent}66` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-display text-[14px] tracking-wide" style={{ color: props.accent }}>
          {props.roomEmoji} {props.roomName}
        </div>
        <div className="text-[9px] tracking-widest" style={{ color: props.accent }}>
          {props.coOccupants.length > 0 ? `${props.coOccupants.length} with you` : "ALONE"}
        </div>
      </div>
      {props.tasks.length === 0 ? (
        <div className="text-[11px] opacity-65" style={{ color: "rgba(229,231,235,0.7)" }}>No tasks in this room.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {props.tasks.map(t => {
            const assigned = props.myAssigned.includes(t.id);
            const done = props.myCompleted.includes(t.id);
            const inProg = props.taskInProgress === t.id;
            return (
              <button key={t.id}
                onPointerDown={() => assigned && !done && props.onStartTask(t.id)}
                onPointerUp={props.onCancelTask}
                onPointerLeave={props.onCancelTask}
                onContextMenu={e => e.preventDefault()}
                disabled={!assigned || done}
                className="rounded-lg p-2 text-left pressable touch-target relative overflow-hidden"
                style={{
                  background: done ? "rgba(134,239,172,0.15)" : assigned ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${done ? "#86efac" : assigned ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
                  opacity: assigned ? 1 : 0.4, userSelect: "none", touchAction: "manipulation",
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{t.emoji}</span>
                  <span className="font-display text-[11px] tracking-wide" style={{ color: "#fef3c7" }}>{t.label}</span>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: done ? "#86efac" : assigned ? props.accent : "rgba(229,231,235,0.5)" }}>
                  {done ? "✓ DONE" : assigned ? (inProg ? "HOLDING…" : "HOLD 3 SEC") : "NOT YOUR TASK"}
                </div>
                {inProg && (
                  <motion.div className="absolute bottom-0 left-0 h-1"
                    initial={{ width: "0%" }} animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "linear" }}
                    style={{ background: props.accent }} />
                )}
              </button>
            );
          })}
        </div>
      )}
      {props.isTraitor && props.coOccupants.length > 0 && props.onTag && (
        <div className="mt-3">
          <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#ef4444" }}>TRAITOR ACTIONS</div>
          <div className="grid grid-cols-2 gap-1.5">
            {props.coOccupants.map(p => (
              <button key={p.profileId} onClick={() => props.onTag!(p.profileId)}
                className="rounded-lg p-2 text-center pressable touch-target"
                style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.50)", color: "#fca5a5" }}>
                <div className="text-[10px] tracking-widest font-display">⚔️ TAG OUT</div>
                <div className="text-[11px] mt-0.5" style={{ color: "#fef3c7" }}>{p.profileName}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SoloMeetingModal({ state, myProfileId, onVote }: {
  state: SoloState; myProfileId: string; onVote: (targetId: string) => void;
}) {
  const meeting = state.meeting!;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const elapsed = (now - meeting.startedAt) / 1000;
  const remain = Math.max(0, Math.round(meeting.durationSec - elapsed));
  const myVote = meeting.votes?.[myProfileId];
  const alive = state.players.filter(p => p.alive);
  const me = state.players.find(p => p.profileId === myProfileId);
  const canVote = me?.alive ?? false;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(239,68,68,0.25), transparent 60%), " +
          "rgba(0,0,0,0.85)",
      }}>
      <div className="max-w-md w-full rounded-2xl p-4 max-h-[90vh] overflow-auto"
        style={{ background: "linear-gradient(180deg, #1a0808 0%, #050308 100%)", border: "2px solid #ef4444" }}>
        <div className="text-center mb-3">
          <AlertCircle size={28} style={{ color: "#fca5a5", margin: "0 auto" }} />
          <div className="font-display text-2xl tracking-wider mt-1" style={{ color: "#fca5a5" }}>EMERGENCY MEETING</div>
          <div className="text-[11px] mt-1" style={{ color: "rgba(229,231,235,0.78)" }}>
            Bots are weighing in · {remain}s left
          </div>
        </div>
        <div className="text-[9px] tracking-[0.3em] mb-2 text-center" style={{ color: "#fca5a5" }}>
          VOTE WHO TO EJECT
        </div>
        <div className="space-y-1.5">
          {alive.map(p => {
            const isMyVote = myVote === p.profileId;
            const isMe = p.profileId === myProfileId;
            const voteCount = Object.values(meeting.votes ?? {}).filter(v => v === p.profileId).length;
            return (
              <button key={p.profileId} onClick={() => canVote && !isMe && onVote(p.profileId)}
                disabled={!canVote || isMe}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 pressable touch-target"
                style={{
                  background: isMyVote ? `${p.profileColor}33` : `${p.profileColor}10`,
                  border: `1.5px solid ${isMyVote ? p.profileColor : `${p.profileColor}44`}`,
                  opacity: isMe ? 0.5 : 1,
                }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full" style={{ background: p.profileColor }} />
                  <div className="font-display text-[12px]" style={{ color: "#fef3c7" }}>
                    {p.profileName}{isMe ? " (you)" : ""}{!p.isHuman ? " 🤖" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {voteCount > 0 && (
                    <div className="text-[9px] tracking-widest" style={{ color: p.profileColor }}>
                      {voteCount} vote{voteCount > 1 ? "s" : ""}
                    </div>
                  )}
                  {isMyVote && <span className="text-[10px]" style={{ color: p.profileColor }}>✓ YOU</span>}
                </div>
              </button>
            );
          })}
          <button onClick={() => canVote && onVote("skip")}
            disabled={!canVote}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 pressable touch-target"
            style={{
              background: myVote === "skip" ? "rgba(154,166,191,0.30)" : "rgba(154,166,191,0.10)",
              border: `1.5px solid ${myVote === "skip" ? "#9aa6bf" : "rgba(154,166,191,0.30)"}`,
            }}>
            <div className="font-display text-[12px]" style={{ color: "#9aa6bf" }}>↩ SKIP VOTE</div>
            {myVote === "skip" && <span className="text-[10px]" style={{ color: "#9aa6bf" }}>✓ YOU</span>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SoloEndModal({ state, priv, onAgain, onBack }: {
  state: SoloState; priv: ReturnType<typeof Object>; onAgain: () => void; onBack: () => void;
}) {
  const winner = state.winner ?? "draw";
  const myRole = (priv as { role: "crew" | "traitor" } | null)?.role;
  const wonAsMe =
    (winner === "crew" && myRole === "crew") ||
    (winner === "traitor" && myRole === "traitor");
  const headline =
    winner === "crew" ? "CREW WINS" :
    winner === "traitor" ? "TRAITORS WIN" :
    "DRAW";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }}
        className="max-w-md w-full rounded-2xl p-6 text-center"
        style={{
          background: winner === "crew"
            ? "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(5,10,8,0.95))"
            : "linear-gradient(135deg, rgba(252,165,165,0.18), rgba(15,5,5,0.95))",
          border: `2px solid ${winner === "crew" ? "#86efac" : "#fca5a5"}`,
        }}>
        <Trophy size={36} style={{ color: winner === "crew" ? "#86efac" : "#fca5a5", margin: "0 auto" }} />
        <div className="font-display text-3xl tracking-wider mt-2" style={{ color: winner === "crew" ? "#86efac" : "#fca5a5" }}>
          {headline}
        </div>
        {myRole && (
          <div className="text-[12px] mt-2" style={{ color: "#fef3c7" }}>
            You were a <strong style={{ color: myRole === "traitor" ? "#fca5a5" : "#86efac" }}>{myRole}</strong>.
            {wonAsMe ? " 🏆 You won!" : " Better luck next round."}
          </div>
        )}
        <div className="flex gap-2 justify-center mt-4">
          <button onClick={onAgain}
            className="px-5 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
            style={{ background: winner === "crew" ? "#86efac" : "#fca5a5", color: "#0a0a14" }}>
            <Users size={12} className="inline mr-1" /> PLAY AGAIN
          </button>
          <button onClick={onBack}
            className="px-5 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
            LOBBY
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
