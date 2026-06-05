// Versus Online — lobby + room flow. Two entry paths:
//   1) HOST: create a new room → see the 6-char code → share it
//   2) GUEST: type a code → join an existing room
//
// Once both players are in and have picked teams, the host taps START
// and we route into BaseballVersusOnline or FootballVersusOnline.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Wifi, X } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import { BASEBALL_TEAMS, FOOTBALL_TEAMS, type BaseballTeam, type FootballTeam } from "../teams";
import {
  createRoom, joinRoom, leaveRoom, setReady, setTeam, startMatch,
  normalizeRoomCode, type VersusRoom,
} from "../../multiplayer/match";
import { useMatchRoom } from "../../multiplayer/useMatchRoom";
import type { BaseballState, FootballState } from "../types";

type Step = "choose" | "host_setup" | "join_setup" | "lobby";

export default function VersusOnlineLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = useActiveProfile();
  const [step, setStep] = useState<Step>("choose");
  const [sport, setSport] = useState<"baseball" | "football">("baseball");
  const [length, setLength] = useState(3);
  const [code, setCode] = useState<string | null>(searchParams.get("code"));
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const { room, seat, hydrated } = useMatchRoom(code, profile?.id ?? null);

  // If we have a code in the URL or state, jump to the lobby view.
  useEffect(() => {
    if (code && step !== "lobby") setStep("lobby");
  }, [code, step]);

  if (!profile) {
    return (
      <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>
        Pick a profile first.
      </div>
    );
  }

  async function doCreate() {
    if (busy) return;
    setBusy(true);
    const newCode = await createRoom({
      sport, length,
      host: {
        profileId: profile!.id,
        profileName: profile!.handle || profile!.name,
        profileColor: profile!.color,
      },
    });
    setBusy(false);
    if (!newCode) {
      alert("Couldn't create a room. Are you online?");
      return;
    }
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
        result.reason === "not_found" ? "No room with that code. Double-check it."
        : result.reason === "full" ? "That room already has two players."
        : result.reason === "ended" ? "That match already wrapped up."
        : "Network problem. Try again?";
      setJoinError(msg);
      return;
    }
    setCode(c);
    setStep("lobby");
  }

  async function doLeave() {
    if (code) await leaveRoom(code);
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
    if (!room || !code || !seat) return;
    const curr = (seat === "host" ? room.host?.ready : room.guest?.ready) ?? false;
    await setReady(code, seat, !curr);
  }

  async function pickTeam(teamId: string) {
    if (!room || !code || !seat) return;
    await setTeam(code, seat, teamId);
  }

  async function doStart() {
    if (!room || !code || seat !== "host") return;
    // Build the sport-specific initial state and write it.
    const initial: BaseballState | FootballState = room.sport === "baseball"
      ? {
          inning: 0, topHalf: true, outs: 0, balls: 0, strikes: 0,
          bases: [false, false, false], score: [0, 0], innings: room.length,
        }
      : {
          quarter: 1, quarters: room.length, clock: 90,
          possession: "A", ballOn: 25, down: 1, togo: 10, score: [0, 0],
        };
    await startMatch(code, initial);
  }

  // Auto-route to the game page when the host starts.
  useEffect(() => {
    if (!room) return;
    if (room.status === "playing") {
      const path = room.sport === "baseball" ? "/versus/online/baseball" : "/versus/online/football";
      navigate(`${path}?code=${code}`);
    }
  }, [room?.status, room?.sport, code]);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(134,239,172,0.18), transparent 60%), " +
          "linear-gradient(180deg, #050a08 0%, #02050a 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/versus")} aria-label="Back to Versus hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#86efac" }}>VERSUS · ONLINE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>
            <Wifi size={18} className="inline mb-1 mr-1" /> CROSS-DEVICE
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-md mx-auto w-full space-y-3">
        {step === "choose" && (
          <ChoosePath
            onHost={() => setStep("host_setup")}
            onJoin={() => setStep("join_setup")}
          />
        )}
        {step === "host_setup" && (
          <HostSetup
            sport={sport} setSport={setSport}
            length={length} setLength={setLength}
            onCreate={doCreate} busy={busy}
            onCancel={() => setStep("choose")}
          />
        )}
        {step === "join_setup" && (
          <JoinSetup
            joinCode={joinCode} setJoinCode={setJoinCode}
            onJoin={doJoin} busy={busy} error={joinError}
            onCancel={() => setStep("choose")}
          />
        )}
        {step === "lobby" && room && (
          <LobbyView
            room={room} seat={seat}
            myProfileColor={profile.color}
            onCopyCode={copyCode} copied={copied}
            onLeave={doLeave}
            onPickTeam={pickTeam}
            onToggleReady={flipReady}
            onStart={doStart}
          />
        )}
        {step === "lobby" && !room && hydrated && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(252,165,165,0.40)" }}>
            <X size={28} style={{ color: "#fca5a5", margin: "0 auto" }} />
            <div className="font-display text-base mt-2" style={{ color: "#fef3c7" }}>Room closed</div>
            <div className="text-[12px] mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>
              The host left or the match ended.
            </div>
            <button onClick={() => { setCode(null); setStep("choose"); }}
              className="mt-3 px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
              style={{ background: "#86efac", color: "#0a0a14" }}>
              BACK
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-views ──────────────────────────────────────────────────────────

function ChoosePath({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) {
  return (
    <>
      <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(229,231,235,0.78)" }}>
        Play Versus across two devices. One person hosts, the other joins with the 6-char code.
      </p>
      <button onClick={onHost}
        className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
        style={{ background: "linear-gradient(135deg, #86efac, #22c55e)", color: "#0a0a14", minHeight: 64 }}>
        🎯 CREATE A ROOM
      </button>
      <button onClick={onJoin}
        className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
        style={{ background: "rgba(134,239,172,0.10)", border: "1px solid rgba(134,239,172,0.40)", color: "#86efac", minHeight: 64 }}>
        🔑 JOIN WITH CODE
      </button>
    </>
  );
}

function HostSetup({ sport, setSport, length, setLength, onCreate, busy, onCancel }: {
  sport: "baseball" | "football"; setSport: (s: "baseball" | "football") => void;
  length: number; setLength: (n: number) => void;
  onCreate: () => void; busy: boolean; onCancel: () => void;
}) {
  return (
    <>
      <section>
        <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#86efac" }}>SPORT</div>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceTile selected={sport === "baseball"} accent="#fbbf24" emoji="⚾" label="BASEBALL"
            onClick={() => { setSport("baseball"); setLength(3); }} />
          <ChoiceTile selected={sport === "football"} accent="#FFB81C" emoji="🏈" label="FOOTBALL"
            onClick={() => { setSport("football"); setLength(2); }} />
        </div>
      </section>
      <section>
        <div className="text-[9px] tracking-[0.3em] mb-1.5" style={{ color: "#86efac" }}>
          {sport === "baseball" ? "INNINGS" : "QUARTERS"}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(sport === "baseball" ? [3, 5, 9] : [1, 2, 4]).map(n => (
            <ChoiceTile key={n} selected={length === n} accent="#86efac" emoji="" label={`${n}`}
              onClick={() => setLength(n)} />
          ))}
        </div>
      </section>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", color: "#9aa6bf" }}>
          CANCEL
        </button>
        <button onClick={onCreate} disabled={busy}
          className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
          style={{ background: "linear-gradient(135deg, #86efac, #22c55e)", color: "#0a0a14", minHeight: 48, opacity: busy ? 0.6 : 1 }}>
          {busy ? "..." : "CREATE ROOM"}
        </button>
      </div>
    </>
  );
}

function JoinSetup({ joinCode, setJoinCode, onJoin, busy, error, onCancel }: {
  joinCode: string; setJoinCode: (s: string) => void;
  onJoin: () => void; busy: boolean; error: string | null; onCancel: () => void;
}) {
  return (
    <>
      <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(229,231,235,0.78)" }}>
        Type the 6-character room code your friend shared.
      </p>
      <input
        value={joinCode}
        onChange={e => setJoinCode(e.target.value.toUpperCase())}
        placeholder="ABCD23"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        aria-label="Room code"
        className="w-full text-center font-display text-3xl tracking-[0.4em] rounded-xl py-3"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1.5px solid rgba(134,239,172,0.40)",
          color: "#fde047",
          letterSpacing: "0.3em",
        }}
      />
      {error && (
        <div className="text-[11px] text-center" style={{ color: "#fca5a5" }}>{error}</div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", color: "#9aa6bf" }}>
          CANCEL
        </button>
        <button onClick={onJoin} disabled={busy || joinCode.length < 6}
          className="flex-1 py-3 rounded-xl pressable touch-target text-[12px] font-display tracking-widest"
          style={{ background: "linear-gradient(135deg, #86efac, #22c55e)", color: "#0a0a14", minHeight: 48, opacity: (busy || joinCode.length < 6) ? 0.55 : 1 }}>
          {busy ? "..." : "JOIN"}
        </button>
      </div>
    </>
  );
}

function LobbyView({ room, seat, myProfileColor, onCopyCode, copied, onLeave, onPickTeam, onToggleReady, onStart }: {
  room: VersusRoom; seat: "host" | "guest" | null;
  myProfileColor: string;
  onCopyCode: () => void; copied: boolean;
  onLeave: () => Promise<void>;
  onPickTeam: (teamId: string) => Promise<void>;
  onToggleReady: () => Promise<void>;
  onStart: () => Promise<void>;
}) {
  const teams = room.sport === "baseball" ? BASEBALL_TEAMS : FOOTBALL_TEAMS;
  const meReady = (seat === "host" ? room.host?.ready : room.guest?.ready) ?? false;
  const guestPresent = !!room.guest;
  const bothReady = room.host?.ready && room.guest?.ready;
  const bothHaveTeams = !!room.host?.teamId && !!room.guest?.teamId;
  const teamsDifferent = room.host?.teamId !== room.guest?.teamId;
  const canStart = seat === "host" && guestPresent && bothReady && bothHaveTeams && teamsDifferent;

  const mineTeam = seat === "host" ? room.host?.teamId : room.guest?.teamId;
  const theirSeat = seat === "host" ? room.guest : room.host;

  return (
    <>
      <section className="rounded-2xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, rgba(134,239,172,0.10), rgba(10,15,10,0.85))", border: "1.5px solid #86efac" }}>
        <div className="text-[9px] tracking-[0.4em]" style={{ color: "#86efac" }}>ROOM CODE</div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="font-display text-4xl tracking-[0.3em]" style={{ color: "#fde047" }}>{room.code}</div>
          <button onClick={onCopyCode} aria-label="Copy code"
            className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(253,224,71,0.15)", border: "1px solid rgba(253,224,71,0.40)", color: "#fde047" }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="text-[10px] mt-2 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
          {room.sport === "baseball" ? `${room.length} innings` : `${room.length} quarters`} · share this code with your opponent
        </div>
      </section>

      <SeatCard
        title={seat === "host" ? "YOU (HOST)" : "HOST"}
        player={room.host}
        accent={seat === "host" ? myProfileColor : (room.host?.profileColor ?? "#9aa6bf")}
        teams={teams}
        canPick={seat === "host"}
        selectedTeam={room.host?.teamId}
        otherTeam={room.guest?.teamId}
        onPickTeam={onPickTeam}
      />
      <SeatCard
        title={seat === "guest" ? "YOU (GUEST)" : "GUEST"}
        player={room.guest}
        accent={seat === "guest" ? myProfileColor : (room.guest?.profileColor ?? "#9aa6bf")}
        teams={teams}
        canPick={seat === "guest"}
        selectedTeam={room.guest?.teamId}
        otherTeam={room.host?.teamId}
        onPickTeam={onPickTeam}
        waiting={!room.guest}
      />

      {/* Ready toggle (both) */}
      {seat && (
        <button onClick={onToggleReady} disabled={!mineTeam}
          className="w-full py-3 rounded-xl pressable touch-target font-display tracking-widest text-[12px]"
          style={{
            background: meReady ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.06)",
            border: `1.5px solid ${meReady ? "#86efac" : "rgba(255,255,255,0.18)"}`,
            color: meReady ? "#86efac" : "#fef3c7",
            opacity: mineTeam ? 1 : 0.5,
            minHeight: 48,
          }}>
          {meReady ? "✓ READY" : "TAP WHEN READY"}
        </button>
      )}

      {seat === "host" && (
        <button onClick={onStart} disabled={!canStart}
          className="w-full py-4 rounded-2xl pressable touch-target font-display tracking-widest text-[14px]"
          style={{
            background: canStart ? "linear-gradient(135deg, #fde047, #f59e0b)" : "rgba(255,255,255,0.05)",
            color: canStart ? "#0a0a14" : "#9aa6bf",
            border: canStart ? "none" : "1px solid rgba(255,255,255,0.18)",
            minHeight: 56,
          }}>
          {!guestPresent ? "Waiting for opponent…"
            : !bothHaveTeams ? "Both players need a team"
            : !teamsDifferent ? "Pick different teams"
            : !bothReady ? "Waiting on both READY taps…"
            : "🏟️ START MATCH"}
        </button>
      )}

      {seat === "guest" && (
        <div className="text-center text-[11px] mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>
          Host {theirSeat?.profileName ? `(${theirSeat.profileName})` : ""} will start when both are ready.
        </div>
      )}

      <button onClick={() => { void onLeave(); }}
        className="w-full py-2 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
        style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5" }}>
        LEAVE ROOM
      </button>
    </>
  );
}

function SeatCard({ title, player, accent, teams, canPick, selectedTeam, otherTeam, onPickTeam, waiting }: {
  title: string;
  player?: { profileName: string; profileColor: string; teamId?: string; ready?: boolean };
  accent: string;
  teams: (BaseballTeam | FootballTeam)[];
  canPick: boolean;
  selectedTeam?: string;
  otherTeam?: string;
  onPickTeam: (teamId: string) => Promise<void>;
  waiting?: boolean;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: player ? `linear-gradient(135deg, ${accent}1f, rgba(10,10,20,0.85))` : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${player ? accent : "rgba(255,255,255,0.12)"}`,
      }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-[9px] tracking-[0.3em]" style={{ color: accent }}>{title}</div>
          <div className="font-display text-base" style={{ color: "#fef3c7" }}>
            {player?.profileName ?? (waiting ? "Waiting…" : "—")}
          </div>
        </div>
        {player?.ready && (
          <span className="text-[9px] tracking-widest px-2 py-1 rounded-full font-display"
            style={{ background: "#86efac", color: "#0a0a14" }}>READY</span>
        )}
      </div>
      {player && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {teams.map(t => {
            const sel = selectedTeam === t.id;
            const isOther = otherTeam === t.id && !sel;
            return (
              <button key={t.id}
                onClick={() => canPick && !isOther && onPickTeam(t.id)}
                disabled={!canPick || isOther}
                aria-pressed={sel}
                className="shrink-0 rounded-lg px-2 py-1.5 pressable touch-target"
                style={{
                  background: sel ? t.primary : "rgba(255,255,255,0.04)",
                  border: `1px solid ${sel ? t.primary : "rgba(255,255,255,0.12)"}`,
                  color: sel ? "#fef3c7" : "rgba(229,231,235,0.78)",
                  minWidth: 60,
                  opacity: isOther ? 0.3 : 1,
                }}>
                <div className="text-base leading-none">{t.emoji}</div>
                <div className="text-[9px] tracking-widest mt-0.5 font-display">{t.abbr}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChoiceTile({ selected, accent, emoji, label, onClick }: {
  selected: boolean; accent: string; emoji: string; label: string; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} aria-pressed={selected}
      className="rounded-xl p-3 text-center pressable touch-target"
      style={{
        background: selected ? `linear-gradient(135deg, ${accent}33, rgba(10,10,20,0.85))` : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.12)"}`,
        minHeight: 60,
      }}>
      {emoji && <div className="text-xl">{emoji}</div>}
      <div className="font-display tracking-wide text-[12px] mt-0.5" style={{ color: selected ? accent : "#fef3c7" }}>{label}</div>
    </motion.button>
  );
}
