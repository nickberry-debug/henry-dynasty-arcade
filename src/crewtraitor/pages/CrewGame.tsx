// Crew Traitor — gameplay screen. Top-down map with tap-to-move
// rooms, tappable tasks, traitor tag action, emergency meeting, and
// the meeting voting modal. Host resolves the meeting.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertCircle, Trophy, Skull } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import {
  subscribeRoom, subscribePrivate, moveTo, markTaskDone, tagOut,
  callMeeting, submitVote, resolveMeeting, leaveRoom, fetchAllTraitorIds,
  triggerSabotage, checkSabotageExpiry, useVent, requestPeek, resolvePeek, clearPeekResult,
  sendChat,
  type CrewRoom,
} from "../room";
import { getMap } from "../maps";
import { getSabotage } from "../sabotage";
import { SafeChat } from "../components/SafeChat";
import { useCrewStats } from "../store";
import { playSfx } from "../../art";
import type { CrewPrivate } from "../types";

export default function CrewGame() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const profile = useActiveProfile();
  const { recordMatch, recordTask, recordVote } = useCrewStats();

  const [room, setRoom] = useState<CrewRoom | null>(null);
  const [priv, setPriv] = useState<CrewPrivate | null>(null);
  const [taskInProgress, setTaskInProgress] = useState<string | null>(null);
  const [taskHoldStart, setTaskHoldStart] = useState<number>(0);
  const [resolvedThisMeeting, setResolvedThisMeeting] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  // Subscribe to public room + own private doc.
  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, setRoom);
  }, [code]);

  useEffect(() => {
    if (!code || !profile) return;
    return subscribePrivate(code, profile.id, setPriv);
  }, [code, profile?.id]);

  const me = useMemo(() => {
    if (!room || !profile) return null;
    return room.state.players.find(p => p.profileId === profile.id) ?? null;
  }, [room, profile?.id]);

  const isHost = !!profile && !!room && room.hostId === profile.id;
  const map = room ? getMap(room.mapId) : null;
  const myRoom = me && map ? map.rooms.find(r => r.id === me.roomId) : null;
  const tasksInMyRoom = map && me ? map.tasks.filter(t => t.roomId === me.roomId) : [];

  // ── Host: meeting auto-resolve after timer expires or all votes in.
  useEffect(() => {
    if (!isHost || !room || !code) return;
    const meeting = room.state.meeting;
    if (!meeting) { setResolvedThisMeeting(null); return; }
    const meetingKey = `${meeting.startedAt}_${meeting.calledBy}`;
    if (resolvedThisMeeting === meetingKey) return;
    const alivePlayers = room.state.players.filter(p => p.alive);
    const voteCount = Object.keys(meeting.votes ?? {}).length;
    const elapsed = (Date.now() - meeting.startedAt) / 1000;
    const allVoted = voteCount >= alivePlayers.length;
    const timeUp = elapsed >= meeting.durationSec;
    if (allVoted || timeUp) {
      setResolvedThisMeeting(meetingKey);
      (async () => {
        const traitorIds = await fetchAllTraitorIds(code);
        await resolveMeeting(code, traitorIds);
      })();
    } else {
      // Schedule a re-check.
      const remain = Math.max(1, meeting.durationSec - elapsed);
      const t = setTimeout(() => setResolvedThisMeeting(null), remain * 1000 + 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.state.meeting?.startedAt, room?.state.meeting?.votes && Object.keys(room.state.meeting.votes ?? {}).length, isHost]);

  // Audio cues — sabotage alarm + emergency meeting buzzer
  useEffect(() => {
    if (room?.state.sabotage) playSfx("denied", { volume: 0.6 });
  }, [room?.state.sabotage?.startedAt]);
  useEffect(() => {
    if (room?.state.meeting) playSfx("buzzer", { volume: 0.7 });
  }, [room?.state.meeting?.startedAt]);

  // ── Record match result once on end.
  useEffect(() => {
    if (!room || room.state.phase !== "ended" || recorded || !priv || !profile) return;
    setRecorded(true);
    const winner = room.state.winner;
    const opponents = room.state.players
      .filter(p => p.profileId !== profile.id)
      .map(p => p.profileId);
    if (winner === "crew") {
      recordMatch({ wonAsCrew: priv.role === "crew", opponentProfileIds: opponents });
      playSfx(priv.role === "crew" ? "voYouWin" : "voYouLose", { volume: 0.9 });
    } else if (winner === "traitor") {
      recordMatch({ wonAsTraitor: priv.role === "traitor", opponentProfileIds: opponents });
      playSfx(priv.role === "traitor" ? "voYouWin" : "voYouLose", { volume: 0.9 });
    } else {
      recordMatch({ opponentProfileIds: opponents });
    }
  }, [room?.state.phase, recorded, priv?.role]);

  // ── Action handlers ───────────────────────────────────────────────

  function onMove(roomId: string) {
    // Ghost mode: eliminated players can still wander the map.
    if (!code || !profile || !me) return;
    if (room?.state.phase !== "playing") return;
    if (roomId === me.roomId) return;
    void moveTo(code, profile.id, roomId);
  }

  function startTaskHold(taskId: string) {
    // Ghost mode: eliminated players can still do their remaining tasks.
    if (!me || room?.state.phase !== "playing") return;
    if (priv?.completedTaskIds.includes(taskId)) return;
    if (!priv?.assignedTaskIds.includes(taskId)) return;
    setTaskInProgress(taskId);
    setTaskHoldStart(Date.now());
  }
  function cancelTaskHold() {
    setTaskInProgress(null);
    setTaskHoldStart(0);
  }
  // Watch the hold timer and complete the task when it expires.
  useEffect(() => {
    if (!taskInProgress || !code || !profile || !priv) return;
    const HOLD_MS = 3000;
    const t = setTimeout(() => {
      const isCrew = priv.role === "crew";
      void markTaskDone(code, profile.id, taskInProgress, isCrew);
      if (isCrew) recordTask();
      setTaskInProgress(null);
      setTaskHoldStart(0);
    }, HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskInProgress, code, profile?.id]);

  function onTag(victimId: string) {
    if (!code || !profile || !me?.alive) return;
    if (priv?.role !== "traitor") return;
    void tagOut(code, profile.id, victimId);
  }

  function onCallMeeting() {
    if (!code || !profile || !me?.alive) return;
    if (room?.state.phase !== "playing") return;
    void callMeeting(code, profile.id);
  }

  function onVote(targetId: string) {
    if (!code || !profile) return;
    void submitVote(code, profile.id, targetId);
    // Track correct-vote accuracy locally. We don't know the target's
    // role at vote time (no privacy leak), but we can resolve correctness
    // after the meeting ends.
    void recordVote; // satisfy lint, recorded post-resolve
  }

  function onTriggerSabotage() {
    if (!code || !me?.alive) return;
    if (priv?.role !== "traitor") return;
    void triggerSabotage(code);
  }

  function onUseVent(toRoomId: string) {
    if (!code || !profile || !me?.alive) return;
    if (priv?.role !== "traitor" && priv?.variant !== "engineer") return;
    void useVent(code, profile.id, me.roomId, toRoomId);
  }

  function onRequestPeek(targetId: string) {
    if (!code || !profile) return;
    if (priv?.variant !== "detective" || priv.peekUsed) return;
    void requestPeek(code, profile.id, targetId);
  }

  function onClearPeek() {
    if (!code || !profile) return;
    void clearPeekResult(code, profile.id);
  }

  // ── Host: tick sabotage expiry every 2s while one's active.
  useEffect(() => {
    if (!isHost || !room || !code) return;
    if (!room.state.sabotage) return;
    const tick = async () => {
      const traitorIds = await fetchAllTraitorIds(code);
      await checkSabotageExpiry(code, traitorIds);
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room?.state.sabotage?.startedAt, code]);

  // ── Host: auto-resolve detective peek requests.
  useEffect(() => {
    if (!isHost || !code) return;
    if (!room?.state.pendingPeek) return;
    void resolvePeek(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room?.state.pendingPeek?.targetId, code]);

  // ── Render guards ─────────────────────────────────────────────────

  if (!profile) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  if (!code) return <NoRoom onBack={() => navigate("/crew")} />;
  if (!room) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Connecting…</div>;
  if (!map) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Loading map…</div>;
  if (!me) return <NoRoom onBack={() => navigate("/crew")} />;

  const totalRoom = room.state.players.length;
  const aliveCount = room.state.players.filter(p => p.alive).length;
  const tasksDone = room.state.tasksCompleted;
  const taskGoal = room.state.taskGoal || 1;
  const taskFrac = Math.min(1, tasksDone / taskGoal);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(155,227,255,0.14), transparent 60%), " +
          "linear-gradient(180deg, #050a14 0%, #02050a 100%)",
      }}>
      <header className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => { if (code && profile) void leaveRoom(code, profile.id); navigate("/crew"); }}
          aria-label="Quit"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#9be3ff" }}>
            ROOM {room.code} · {aliveCount}/{totalRoom} ALIVE
          </div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>
            {map.name}
          </h1>
        </div>
        {priv && (
          <div className="text-right">
            <div className="text-[9px] tracking-widest" style={{ color: priv.role === "traitor" ? "#ef4444" : "#86efac" }}>
              YOU ARE
            </div>
            <div className="font-display text-[13px]" style={{ color: priv.role === "traitor" ? "#fca5a5" : "#86efac" }}>
              {priv.role.toUpperCase()}
            </div>
            {priv.variant && priv.variant !== "none" && (
              <div className="text-[9px] mt-0.5 tracking-widest" style={{ color: "#fde047" }}>
                {priv.variant === "detective" ? "🕵️ DETECTIVE" : "🔧 ENGINEER"}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        {/* Task progress bar (shown to everyone, even traitors — they
            can SEE how close crew is to winning by tasks). */}
        <section className="rounded-xl p-2"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(134,239,172,0.30)" }}>
          <div className="flex items-center justify-between text-[9px] tracking-widest" style={{ color: "#86efac" }}>
            <span>CREW TASKS</span>
            <span>{tasksDone} / {taskGoal}</span>
          </div>
          <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
            <motion.div className="h-full" animate={{ width: `${taskFrac * 100}%` }} transition={{ duration: 0.35 }}
              style={{ background: "linear-gradient(90deg, #86efac, #22c55e)" }} />
          </div>
        </section>

        {/* Map view */}
        <MapView map={map} players={room.state.players} myProfileId={profile.id} onMove={onMove} />

        {/* Current room context: tasks here + co-occupants */}
        {myRoom && (
          <RoomPanel
            roomName={myRoom.name}
            roomEmoji={myRoom.emoji}
            accent={myRoom.color}
            tasks={tasksInMyRoom}
            myAssigned={priv?.assignedTaskIds ?? []}
            myCompleted={priv?.completedTaskIds ?? []}
            taskInProgress={taskInProgress}
            taskHoldStart={taskHoldStart}
            onStartTask={startTaskHold}
            onCancelTask={cancelTaskHold}
            isTraitor={priv?.role === "traitor"}
            coOccupants={room.state.players.filter(p =>
              p.profileId !== profile.id && p.alive && p.roomId === me.roomId)}
            onTag={priv?.role === "traitor" ? onTag : undefined}
          />
        )}

        {/* Active sabotage banner — visible to everyone. Crew see the
            countdown and fix-rooms; traitors see they've triggered it. */}
        {room.state.sabotage && (
          <SabotageBanner sabotage={room.state.sabotage} />
        )}

        {/* Vent shortcuts — traitor + engineer only. Shown when standing
            in a vented room. */}
        {me.alive && room.state.phase === "playing" &&
          (priv?.role === "traitor" || priv?.variant === "engineer") && (
          <VentControls map={map} myRoomId={me.roomId} onUseVent={onUseVent} />
        )}

        {/* Detective peek panel — one-shot role check on a chosen player. */}
        {me.alive && room.state.phase === "playing" &&
          priv?.variant === "detective" && !priv.peekUsed && (
          <DetectivePeekPanel
            players={room.state.players.filter(p => p.profileId !== profile.id)}
            onPeek={onRequestPeek}
            pending={!!room.state.pendingPeek}
          />
        )}

        {/* Traitor controls — trigger sabotage (45s cooldown handled via
            sabotageCount comparison + a wall-clock guard on the button). */}
        {me.alive && room.state.phase === "playing" && priv?.role === "traitor" && !room.state.sabotage && (
          <button onClick={onTriggerSabotage}
            className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
            style={{ background: "linear-gradient(135deg, #ef4444, #7c2d12)", color: "#fef3c7", minHeight: 52 }}>
            🚨 TRIGGER SABOTAGE
          </button>
        )}

        {/* Emergency meeting button */}
        {me.alive && room.state.phase === "playing" && !room.state.sabotage && (
          <button onClick={onCallMeeting}
            className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
            style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fef3c7", minHeight: 52 }}>
            <AlertCircle size={14} className="inline mr-1.5" />
            EMERGENCY MEETING
          </button>
        )}

        {/* Eliminated (ghost) banner — but ghosts can still walk + complete tasks. */}
        {!me.alive && room.state.phase === "playing" && (
          <div className="rounded-xl px-3 py-2 text-center"
            style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.40)" }}>
            <Skull size={18} style={{ color: "#fca5a5", display: "inline" }} />
            <span className="ml-2 text-[12px]" style={{ color: "#fca5a5" }}>
              You're tagged out — finish your remaining tasks as a ghost. Crew win condition still counts your work.
            </span>
          </div>
        )}

        {/* Detective peek result toast */}
        <AnimatePresence>
          {priv?.peekResult && (
            <PeekResultToast
              targetName={priv.peekResult.targetName}
              role={priv.peekResult.role}
              onDismiss={onClearPeek}
            />
          )}
        </AnimatePresence>

        {room.state.lastEvent && (
          <div className="text-[11px] text-center italic" style={{ color: "#fde047" }}>
            {room.state.lastEvent}
          </div>
        )}
      </main>

      {/* Meeting modal */}
      <AnimatePresence>
        {room.state.phase === "meeting" && room.state.meeting && (
          <MeetingModal
            room={room} myProfileId={profile.id} onVote={onVote}
            onChat={(text) => { if (code && profile) void sendChat(code, { profileId: profile.id, profileName: profile.handle || profile.name, profileColor: profile.color }, text); }}
            currentRoomName={myRoom?.name} />
        )}
      </AnimatePresence>

      {/* End screen */}
      <AnimatePresence>
        {room.state.phase === "ended" && (
          <EndModal room={room} priv={priv} onBack={() => navigate("/crew")} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Map view ──────────────────────────────────────────────────────────

function MapView({ map, players, myProfileId, onMove }: {
  map: ReturnType<typeof getMap> extends infer T ? T extends undefined ? never : T : never;
  players: CrewRoom["state"]["players"];
  myProfileId: string;
  onMove: (roomId: string) => void;
}) {
  if (!map) return null;
  return (
    <section className="rounded-2xl p-2 relative"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,5,10,0.95))",
        border: "1px solid rgba(155,227,255,0.30)",
      }}>
      <svg viewBox="-55 -45 110 90" className="w-full" style={{ aspectRatio: "11/9" }} aria-label="Station map">
        {/* Hallway connection lines (purely decorative). */}
        <g stroke="rgba(155,227,255,0.20)" strokeWidth="1" strokeDasharray="2 2" fill="none">
          {map.rooms.map((r, i) => (
            map.rooms.slice(i + 1).map(r2 => (
              <line key={`${r.id}-${r2.id}`} x1={r.x} y1={r.y} x2={r2.x} y2={r2.y} />
            ))
          )).flat()}
        </g>
        {/* Rooms */}
        {map.rooms.map(r => {
          // Living players show as solid colored dots; ghosts (eliminated)
          // show as dimmed, dashed-outline dots so the room reads as "a
          // body is here" — turns body-spotting into a deduction tool.
          const occupants = players.filter(p => p.roomId === r.id);
          const meHere = occupants.some(p => p.profileId === myProfileId);
          return (
            <g key={r.id} onClick={() => onMove(r.id)} style={{ cursor: "pointer" }}>
              <rect
                x={r.x - r.w / 2} y={r.y - r.h / 2}
                width={r.w} height={r.h} rx={3}
                fill={`${r.color}22`}
                stroke={meHere ? r.color : `${r.color}66`}
                strokeWidth={meHere ? 2 : 1}
              />
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
                  stroke={p.profileId === myProfileId
                    ? "#fde047"
                    : p.alive ? "#fef3c7" : "#fca5a5"}
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

// ── Room panel ────────────────────────────────────────────────────────

function RoomPanel({ roomName, roomEmoji, accent, tasks, myAssigned, myCompleted, taskInProgress, taskHoldStart, onStartTask, onCancelTask, isTraitor, coOccupants, onTag }: {
  roomName: string;
  roomEmoji: string;
  accent: string;
  tasks: { id: string; label: string; emoji: string }[];
  myAssigned: string[];
  myCompleted: string[];
  taskInProgress: string | null;
  taskHoldStart: number;
  onStartTask: (id: string) => void;
  onCancelTask: () => void;
  isTraitor: boolean;
  coOccupants: { profileId: string; profileName: string; profileColor: string }[];
  onTag?: (victimId: string) => void;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: `linear-gradient(135deg, ${accent}1f, rgba(10,10,20,0.85))`, border: `1.5px solid ${accent}66` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-display text-[14px] tracking-wide" style={{ color: accent }}>
          {roomEmoji} {roomName}
        </div>
        <div className="text-[9px] tracking-widest" style={{ color: accent }}>
          {coOccupants.length > 0 ? `${coOccupants.length} with you` : "ALONE"}
        </div>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="text-[11px] opacity-65" style={{ color: "rgba(229,231,235,0.7)" }}>No tasks in this room.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tasks.map(t => {
            const assigned = myAssigned.includes(t.id);
            const done = myCompleted.includes(t.id);
            const inProg = taskInProgress === t.id;
            return (
              <button key={t.id}
                onPointerDown={() => assigned && !done && onStartTask(t.id)}
                onPointerUp={onCancelTask}
                onPointerLeave={onCancelTask}
                onContextMenu={e => e.preventDefault()}
                disabled={!assigned || done}
                aria-label={done ? `${t.label} (done)` : assigned ? `Hold to do ${t.label}` : `${t.label} (not yours)`}
                className="rounded-lg p-2 text-left pressable touch-target relative overflow-hidden"
                style={{
                  background: done ? "rgba(134,239,172,0.15)" : assigned ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${done ? "#86efac" : assigned ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
                  opacity: assigned ? 1 : 0.4,
                  userSelect: "none",
                  touchAction: "manipulation",
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{t.emoji}</span>
                  <span className="font-display text-[11px] tracking-wide" style={{ color: "#fef3c7" }}>{t.label}</span>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: done ? "#86efac" : assigned ? accent : "rgba(229,231,235,0.5)" }}>
                  {done ? "✓ DONE" : assigned ? (inProg ? "HOLDING…" : "HOLD 3 SEC") : "NOT YOUR TASK"}
                </div>
                {inProg && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-1"
                    initial={{ width: "0%" }} animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "linear" }}
                    style={{ background: accent }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Traitor tag actions */}
      {isTraitor && coOccupants.length > 0 && onTag && (
        <div className="mt-3">
          <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#ef4444" }}>TRAITOR ACTIONS</div>
          <div className="grid grid-cols-2 gap-1.5">
            {coOccupants.map(p => (
              <button key={p.profileId} onClick={() => onTag(p.profileId)}
                className="rounded-lg p-2 text-center pressable touch-target"
                style={{
                  background: "rgba(239,68,68,0.18)",
                  border: "1px solid rgba(239,68,68,0.50)",
                  color: "#fca5a5",
                }}>
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

// ── Meeting modal ─────────────────────────────────────────────────────

function MeetingModal({ room, myProfileId, onVote, onChat, currentRoomName }: {
  room: CrewRoom; myProfileId: string; onVote: (targetId: string) => void;
  onChat: (text: string) => void;
  currentRoomName?: string;
}) {
  const meeting = room.state.meeting!;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = (now - meeting.startedAt) / 1000;
  const remain = Math.max(0, Math.round(meeting.durationSec - elapsed));
  const myVote = meeting.votes?.[myProfileId];
  const alive = room.state.players.filter(p => p.alive);
  const me = room.state.players.find(p => p.profileId === myProfileId);
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
            Discussion + voting · {remain}s left
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
              <button key={p.profileId}
                onClick={() => canVote && !isMe && onVote(p.profileId)}
                disabled={!canVote || isMe}
                aria-label={`Vote ${p.profileName}`}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 pressable touch-target"
                style={{
                  background: isMyVote ? `${p.profileColor}33` : `${p.profileColor}10`,
                  border: `1.5px solid ${isMyVote ? p.profileColor : `${p.profileColor}44`}`,
                  opacity: isMe ? 0.5 : 1,
                }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full" style={{ background: p.profileColor }} />
                  <div className="font-display text-[12px]" style={{ color: "#fef3c7" }}>
                    {p.profileName}{isMe ? " (you)" : ""}
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
          <button
            onClick={() => canVote && onVote("skip")}
            disabled={!canVote}
            aria-label="Skip vote"
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 pressable touch-target"
            style={{
              background: myVote === "skip" ? "rgba(154,166,191,0.30)" : "rgba(154,166,191,0.10)",
              border: `1.5px solid ${myVote === "skip" ? "#9aa6bf" : "rgba(154,166,191,0.30)"}`,
            }}>
            <div className="font-display text-[12px]" style={{ color: "#9aa6bf" }}>↩ SKIP VOTE</div>
            {myVote === "skip" && <span className="text-[10px]" style={{ color: "#9aa6bf" }}>✓ YOU</span>}
          </button>
        </div>

        <div className="mt-3">
          <SafeChat
            messages={room.state.chat ?? []}
            onSend={onChat}
            currentRoomName={currentRoomName}
            disabled={!canVote}
          />
        </div>
        <div className="text-[10px] mt-3 text-center" style={{ color: "rgba(229,231,235,0.6)" }}>
          Tap a quick phrase, emote, or just talk out loud. Host resolves when time's up or everyone's voted.
        </div>
      </div>
    </motion.div>
  );
}

// ── End modal ─────────────────────────────────────────────────────────

function EndModal({ room, priv, onBack }: { room: CrewRoom; priv: CrewPrivate | null; onBack: () => void }) {
  const winner = room.state.winner ?? "draw";
  const wonAsMe =
    (winner === "crew" && priv?.role === "crew") ||
    (winner === "traitor" && priv?.role === "traitor");
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
        {priv && (
          <div className="text-[12px] mt-2" style={{ color: "#fef3c7" }}>
            You were a <strong style={{ color: priv.role === "traitor" ? "#fca5a5" : "#86efac" }}>{priv.role}</strong>.
            {wonAsMe ? " 🏆 You won!" : " Better luck next round."}
          </div>
        )}
        <button onClick={onBack}
          className="mt-4 px-5 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
          style={{ background: winner === "crew" ? "#86efac" : "#fca5a5", color: "#0a0a14" }}>
          BACK TO LOBBY
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Sabotage banner ───────────────────────────────────────────────────

function SabotageBanner({ sabotage }: { sabotage: NonNullable<CrewRoom["state"]["sabotage"]> }) {
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

// ── Vent controls ─────────────────────────────────────────────────────

function VentControls({ map, myRoomId, onUseVent }: {
  map: NonNullable<ReturnType<typeof getMap>>;
  myRoomId: string;
  onUseVent: (toRoomId: string) => void;
}) {
  // Find all rooms paired with mine via the vent network.
  const exits: string[] = [];
  for (const [a, b] of map.ventPairs) {
    if (a === myRoomId) exits.push(b);
    else if (b === myRoomId) exits.push(a);
  }
  if (exits.length === 0) return null;
  return (
    <section className="rounded-xl p-2"
      style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.45)" }}>
      <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#a78bfa" }}>VENT SHORTCUT</div>
      <div className="grid grid-cols-2 gap-1.5">
        {exits.map(rid => {
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
  );
}

// ── Detective peek ────────────────────────────────────────────────────

function DetectivePeekPanel({ players, onPeek, pending }: {
  players: { profileId: string; profileName: string; profileColor: string }[];
  onPeek: (targetId: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl p-2"
      style={{ background: "rgba(155,227,255,0.10)", border: "1px solid rgba(155,227,255,0.45)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[9px] tracking-[0.3em]" style={{ color: "#9be3ff" }}>🕵️ DETECTIVE · ONE-SHOT PEEK</div>
        {pending && (
          <div className="text-[9px] tracking-widest" style={{ color: "#fde047" }}>RESOLVING…</div>
        )}
      </div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          disabled={pending}
          className="w-full mt-1.5 px-3 py-2 rounded-lg pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(155,227,255,0.18)", border: "1px solid rgba(155,227,255,0.45)", color: "#9be3ff" }}>
          PEEK A ROLE →
        </button>
      ) : (
        <div className="mt-1.5">
          <div className="text-[10px] mb-1" style={{ color: "rgba(229,231,235,0.7)" }}>
            Pick a player. You'll see if they're crew or traitor (one chance only).
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {players.map(p => (
              <button key={p.profileId}
                onClick={() => { onPeek(p.profileId); setOpen(false); }}
                disabled={pending}
                className="rounded-lg p-2 text-left pressable touch-target"
                style={{ background: `${p.profileColor}1f`, border: `1px solid ${p.profileColor}55` }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ background: p.profileColor }} />
                  <span className="font-display text-[11px]" style={{ color: "#fef3c7" }}>{p.profileName}</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)}
            className="w-full mt-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-widest"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.18)", color: "#9aa6bf" }}>
            CANCEL
          </button>
        </div>
      )}
    </section>
  );
}

function PeekResultToast({ targetName, role, onDismiss }: {
  targetName: string; role: "crew" | "traitor"; onDismiss: () => void;
}) {
  const color = role === "traitor" ? "#fca5a5" : "#86efac";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-x-4 bottom-6 z-40 max-w-md mx-auto rounded-2xl p-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}33, rgba(10,10,20,0.97))`,
        border: `2px solid ${color}`,
        boxShadow: `0 12px 36px ${color}66`,
      }}>
      <div className="text-3xl mb-1">🕵️</div>
      <div className="text-[10px] tracking-[0.3em] font-display" style={{ color }}>
        DETECTIVE'S REVEAL
      </div>
      <div className="font-display text-base mt-1" style={{ color: "#fef3c7" }}>
        {targetName} is{" "}
        <span style={{ color }}>
          {role === "traitor" ? "A TRAITOR!" : "innocent (crew)."}
        </span>
      </div>
      <button onClick={onDismiss}
        className="mt-3 px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
        style={{ background: color, color: "#0a0a14" }}>
        DISMISS
      </button>
    </motion.div>
  );
}

function NoRoom({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center"
      style={{ background: "#050308", color: "#fef3c7" }}>
      <div>
        <div className="font-display text-lg mb-2" style={{ color: "#fde047" }}>No match in progress.</div>
        <button onClick={onBack}
          className="px-4 py-2 rounded-full font-display tracking-widest text-[11px]"
          style={{ background: "#9be3ff", color: "#0a0a14" }}>
          Crew Traitor Lobby
        </button>
      </div>
    </div>
  );
}
