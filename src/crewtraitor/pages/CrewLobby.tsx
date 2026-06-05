// Crew Traitor lobby — host creates a room, guests join with the
// 6-char code, everyone taps READY, host starts.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Wifi, X } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import {
  createRoom, joinRoom, leaveRoom, setReady, startGame,
  subscribeRoom, heartbeat, normalizeRoomCode, type CrewRoom,
} from "../room";

type Step = "choose" | "join_input" | "lobby";

export default function CrewLobby() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const profile = useActiveProfile();
  const [step, setStep] = useState<Step>("choose");
  const [code, setCode] = useState<string | null>(params.get("code"));
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [room, setRoom] = useState<CrewRoom | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Subscribe whenever code changes.
  useEffect(() => {
    if (!code) { setRoom(null); setHydrated(true); return; }
    setHydrated(false);
    return subscribeRoom(code, next => { setRoom(next); setHydrated(true); });
  }, [code]);

  // Heartbeat every 20s while in the room.
  useEffect(() => {
    if (!code || !profile?.id || !room) return;
    const inRoom = room.state.players.some(p => p.profileId === profile.id);
    if (!inRoom) return;
    const tick = () => { void heartbeat(code, profile.id); };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [code, profile?.id, room?.state.players.length]);

  // When the game starts, route everyone into the game screen.
  useEffect(() => {
    if (room?.status === "playing" || room?.status === "meeting") {
      navigate(`/crew/game?code=${code}`);
    }
  }, [room?.status, code]);

  // If we have a code already, jump to lobby view.
  useEffect(() => {
    if (code && step !== "lobby") setStep("lobby");
  }, [code, step]);

  if (!profile) {
    return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  }

  async function doCreate() {
    if (busy) return;
    setBusy(true);
    const newCode = await createRoom({
      profileId: profile!.id,
      profileName: profile!.handle || profile!.name,
      profileColor: profile!.color,
    });
    setBusy(false);
    if (!newCode) { alert("Couldn't create a room. Are you online?"); return; }
    setCode(newCode);
    setStep("lobby");
  }

  async function doJoin() {
    if (busy) return;
    setJoinError(null);
    const c = normalizeRoomCode(joinCode);
    if (!c) { setJoinError("Codes are 6 letters/numbers."); return; }
    setBusy(true);
    const result = await joinRoom(c, {
      profileId: profile!.id,
      profileName: profile!.handle || profile!.name,
      profileColor: profile!.color,
    });
    setBusy(false);
    if (!result.ok) {
      const msg =
        result.reason === "not_found" ? "No room with that code."
        : result.reason === "full" ? "That room is full."
        : result.reason === "playing" ? "That game has already started."
        : "Network problem. Try again?";
      setJoinError(msg); return;
    }
    setCode(c);
    setStep("lobby");
  }

  async function doLeave() {
    if (code && profile) await leaveRoom(code, profile.id);
    setCode(null);
    setStep("choose");
  }

  function copyCode() {
    if (!code) return;
    try {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  async function flipReady() {
    if (!code || !profile || !room) return;
    const me = room.state.players.find(p => p.profileId === profile.id);
    await setReady(code, profile.id, !me?.ready);
  }

  async function doStart() {
    if (!code) return;
    setBusy(true);
    await startGame(code);
    setBusy(false);
  }

  const me = profile && room ? room.state.players.find(p => p.profileId === profile.id) : null;
  const isHost = !!me && room?.hostId === profile?.id;
  const playerCount = room?.state.players.length ?? 0;
  const allReady = !!room && playerCount >= 3 && room.state.players.every(p => p.ready);
  const canStart = isHost && allReady;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(155,227,255,0.18), transparent 60%), " +
          "linear-gradient(180deg, #050a14 0%, #02050a 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#9be3ff" }}>
            🛰️ CREW TRAITOR · ONLINE
          </div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>STATION GAMMA</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-md mx-auto w-full space-y-3">
        {step === "choose" && (
          <>
            <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(229,231,235,0.78)" }}>
              Crew vs Traitors. Play online with the family OR solo against the CPU.
            </p>
            <button onClick={doCreate} disabled={busy}
              className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
              style={{ background: "linear-gradient(135deg, #9be3ff, #38bdf8)", color: "#0a0a14", minHeight: 64 }}>
              🚀 HOST A NEW ROOM
            </button>
            <button onClick={() => setStep("join_input")}
              className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
              style={{ background: "rgba(155,227,255,0.10)", border: "1px solid rgba(155,227,255,0.40)", color: "#9be3ff", minHeight: 64 }}>
              🔑 JOIN WITH CODE
            </button>
            <button onClick={() => navigate("/crew/solo")}
              className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
              style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.50)", color: "#a78bfa", minHeight: 64 }}>
              🤖 VS CPU · ONE DEVICE
            </button>
          </>
        )}

        {step === "join_input" && (
          <>
            <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(229,231,235,0.78)" }}>
              Type the 6-character code the host shared.
            </p>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD23"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
              aria-label="Room code"
              className="w-full text-center font-display text-3xl tracking-[0.3em] rounded-xl py-3"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(155,227,255,0.40)",
                color: "#fde047",
              }}
            />
            {joinError && <div className="text-[11px] text-center" style={{ color: "#fca5a5" }}>{joinError}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep("choose")}
                className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", color: "#9aa6bf" }}>
                CANCEL
              </button>
              <button onClick={doJoin} disabled={busy || joinCode.length < 6}
                className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
                style={{ background: "#9be3ff", color: "#0a0a14", minHeight: 48, opacity: (busy || joinCode.length < 6) ? 0.55 : 1 }}>
                {busy ? "..." : "JOIN"}
              </button>
            </div>
          </>
        )}

        {step === "lobby" && room && (
          <>
            <section className="rounded-2xl p-4 text-center"
              style={{ background: "linear-gradient(135deg, rgba(155,227,255,0.10), rgba(10,15,20,0.85))", border: "1.5px solid #9be3ff" }}>
              <div className="text-[9px] tracking-[0.4em]" style={{ color: "#9be3ff" }}>ROOM CODE</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="font-display text-4xl tracking-[0.3em]" style={{ color: "#fde047" }}>{room.code}</div>
                <button onClick={copyCode} aria-label="Copy code"
                  className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
                  style={{ background: "rgba(253,224,71,0.15)", border: "1px solid rgba(253,224,71,0.40)", color: "#fde047" }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="text-[10px] mt-2 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
                {playerCount}/10 players · need 3+ to start · share this code
              </div>
            </section>

            <section className="rounded-2xl p-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#9be3ff" }}>CREW</div>
              <div className="space-y-1.5">
                {room.state.players.map(p => (
                  <div key={p.profileId}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                    style={{ background: `${p.profileColor}1f`, border: `1px solid ${p.profileColor}55` }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full" style={{ background: p.profileColor }} />
                      <div className="font-display text-[12px] truncate" style={{ color: "#fef3c7" }}>
                        {p.profileName}{p.profileId === room.hostId ? " (host)" : ""}
                      </div>
                    </div>
                    {p.ready && (
                      <span className="text-[8px] tracking-widest font-display px-2 py-0.5 rounded-full"
                        style={{ background: "#86efac", color: "#0a0a14" }}>READY</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button onClick={flipReady}
              className="w-full py-3 rounded-xl pressable touch-target font-display tracking-widest text-[12px]"
              style={{
                background: me?.ready ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${me?.ready ? "#86efac" : "rgba(255,255,255,0.18)"}`,
                color: me?.ready ? "#86efac" : "#fef3c7",
                minHeight: 48,
              }}>
              {me?.ready ? "✓ READY" : "TAP WHEN READY"}
            </button>

            {isHost && (
              <button onClick={doStart} disabled={!canStart || busy}
                className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
                style={{
                  background: canStart ? "linear-gradient(135deg, #fde047, #f59e0b)" : "rgba(255,255,255,0.05)",
                  color: canStart ? "#0a0a14" : "#9aa6bf",
                  border: canStart ? "none" : "1px solid rgba(255,255,255,0.18)",
                  minHeight: 56,
                }}>
                {playerCount < 3 ? "Need at least 3 players"
                  : !allReady ? "Waiting on READY taps…"
                  : "🚀 START THE MATCH"}
              </button>
            )}
            {!isHost && (
              <div className="text-center text-[11px]" style={{ color: "rgba(229,231,235,0.7)" }}>
                Host will start when everyone's ready.
              </div>
            )}

            <button onClick={() => { void doLeave(); }}
              className="w-full py-2 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
              style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5" }}>
              LEAVE ROOM
            </button>
          </>
        )}

        {step === "lobby" && !room && hydrated && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(252,165,165,0.40)" }}>
            <X size={28} style={{ color: "#fca5a5", margin: "0 auto" }} />
            <div className="font-display text-base mt-2" style={{ color: "#fef3c7" }}>Room closed</div>
            <button onClick={() => { setCode(null); setStep("choose"); }}
              className="mt-3 px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
              style={{ background: "#9be3ff", color: "#0a0a14" }}>
              BACK
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
