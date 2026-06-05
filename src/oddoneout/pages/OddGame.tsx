// Odd One Out — gameplay screen. Shows the player their private role
// card (secret word OR "ODD ONE OUT"), runs the turn-synced clue
// phase, discussion timer, voting, and reveal. Host advances state.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, EyeOff, Volume2 } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import {
  subscribeRoom, subscribePrivate, submitClue, extendDiscussion, openVoting,
  submitVote, resolveVote, leaveRoom, startRound, endMatch,
  type OddRoom,
} from "../room";
import { getPack } from "../packs";
import { useOddStats } from "../store";
import type { OddPrivate } from "../types";
import { playSfx } from "../../art";

export default function OddGame() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const profile = useActiveProfile();
  const { recordMatch } = useOddStats();
  const [room, setRoom] = useState<OddRoom | null>(null);
  const [priv, setPriv] = useState<OddPrivate | null>(null);
  const [clueDraft, setClueDraft] = useState("");
  const [cardRevealed, setCardRevealed] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [voteAutoResolved, setVoteAutoResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, setRoom);
  }, [code]);

  useEffect(() => {
    if (!code || !profile) return;
    return subscribePrivate(code, profile.id, setPriv);
  }, [code, profile?.id]);

  // Whenever the round number changes, hide the card again so the new
  // role isn't pre-spoiled on re-mount.
  useEffect(() => { setCardRevealed(false); setClueDraft(""); }, [room?.state.round?.num]);

  const me = profile && room ? room.state.players.find(p => p.profileId === profile.id) : null;
  const isHost = !!profile && !!room && room.hostId === profile.id;
  const round = room?.state.round ?? null;
  const phase = room?.state.phase ?? "lobby";

  // ── Host: auto-resolve vote once all players have submitted ─────────
  useEffect(() => {
    if (!isHost || !room || !code || !round) return;
    if (round.phase !== "voting") return;
    const voteCount = Object.keys(round.votes ?? {}).length;
    const total = room.state.players.length;
    const key = `${round.num}_${voteCount}`;
    if (voteAutoResolved === key) return;
    if (voteCount >= total) {
      setVoteAutoResolved(key);
      const t = setTimeout(() => { void resolveVote(code); }, 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, round?.phase, room?.state.players.length, Object.keys(round?.votes ?? {}).length]);

  // ── Host: auto-flip discussion → voting when timer expires ──────────
  useEffect(() => {
    if (!isHost || !room || !code || !round) return;
    if (round.phase !== "discussion") return;
    const startedAt = round.discussionStartedAt ?? 0;
    const dur = (round.discussionDurationSec ?? 60) * 1000;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= dur) { void openVoting(code); return; }
    const remaining = dur - elapsed;
    const t = setTimeout(() => { void openVoting(code); }, remaining + 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, round?.phase, round?.discussionStartedAt, round?.discussionDurationSec]);

  // ── Record once on match end ────────────────────────────────────────
  useEffect(() => {
    if (!room || room.state.phase !== "ended" || recorded || !profile || !priv) return;
    setRecorded(true);
    const myScore = room.state.scores[profile.id] ?? 0;
    // Winner = highest score across players.
    const top = Math.max(...Object.values(room.state.scores ?? {}));
    const youWon = myScore === top && top > 0;
    // Was I more often the Odd One? Heuristic: if I won and my final
    // score is >= 2 from any single round, treat as Odd win. Simpler:
    // just check current priv flag for the last round.
    const wonAsOdd = youWon && priv.isOdd;
    const opponentIds = room.state.players.filter(p => p.profileId !== profile.id).map(p => p.profileId);
    recordMatch({
      wonAsCrew: youWon && !wonAsOdd,
      wonAsOdd,
      roundsPlayed: room.state.round?.num ?? 1,
      opponentProfileIds: opponentIds,
    });
    playSfx(youWon ? "voYouWin" : "voYouLose", { volume: 0.9 });
  }, [room?.state.phase, recorded, profile?.id]);

  // Audio cues on phase transitions
  useEffect(() => {
    const ph = room?.state.round?.phase;
    if (ph === "voting") playSfx("buzzer", { volume: 0.5 });
    else if (ph === "reveal") playSfx("ding", { volume: 0.7, pitch: 1.3 });
  }, [room?.state.round?.phase]);

  if (!profile) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Pick a profile first.</div>;
  if (!code) return <NoRoom onBack={() => navigate("/odd")} />;
  if (!room) return <div className="p-8 text-center" style={{ color: "rgba(229,231,235,0.7)" }}>Connecting…</div>;
  if (!me) return <NoRoom onBack={() => navigate("/odd")} />;

  const pack = (round ? getPack(round.packId) : null) ?? null;
  const myTurn = round && round.phase === "clues" && round.clueOrder[round.currentClueIdx] === profile.id;
  const currentClueGiver = round ? room.state.players.find(p => p.profileId === round.clueOrder[round.currentClueIdx]) : null;
  const myVote = round?.votes?.[profile.id];

  function onSubmitClue() {
    if (!code || !profile || !clueDraft.trim()) return;
    void submitClue(code, profile.id, clueDraft);
    setClueDraft("");
  }
  function onVote(targetId: string) {
    if (!code || !profile || !round || round.phase !== "voting") return;
    void submitVote(code, profile.id, targetId);
  }
  function onSpeak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(244,114,182,0.14), transparent 60%), " +
          "linear-gradient(180deg, #0a0814 0%, #050308 100%)",
      }}>
      <header className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => { if (code && profile) void leaveRoom(code, profile.id); navigate("/odd"); }}
          aria-label="Quit"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f9a8d4" }}>
            ROOM {room.code} · {room.state.players.length} PLAYERS
          </div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>
            {pack ? `${pack.emoji} ${pack.name}` : "Odd One Out"} · Round {round?.num ?? "—"}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-md mx-auto w-full space-y-3">
        {/* Private role card — tap to flip */}
        {priv && phase !== "ended" && (
          <RoleCard
            priv={priv}
            pack={pack}
            revealed={cardRevealed}
            onReveal={() => setCardRevealed(true)}
          />
        )}

        {/* Score strip */}
        <ScoreStrip players={room.state.players} scores={room.state.scores ?? {}} myProfileId={profile.id} />

        {/* Phase-specific UI */}
        {round?.phase === "clues" && (
          <ClueBoard
            round={round}
            players={room.state.players}
            myProfileId={profile.id}
            myTurn={!!myTurn}
            clueDraft={clueDraft}
            onClueChange={setClueDraft}
            onSubmitClue={onSubmitClue}
            onSpeak={onSpeak}
            currentName={currentClueGiver?.profileName ?? ""}
          />
        )}

        {round?.phase === "discussion" && (
          <DiscussionBoard
            round={round}
            players={room.state.players}
            onSpeak={onSpeak}
            isHost={isHost}
            onExtend={() => { if (code) void extendDiscussion(code); }}
            onCallVote={() => { if (code) void openVoting(code); }}
          />
        )}

        {round?.phase === "voting" && (
          <VoteBoard
            round={round}
            players={room.state.players}
            myProfileId={profile.id}
            myVote={myVote}
            onVote={onVote}
          />
        )}

        {round?.phase === "reveal" && round.reveal && (
          <RevealBoard
            round={round}
            reveal={round.reveal}
            players={room.state.players}
            isHost={isHost}
            onNextRound={() => { if (code) void startRound(code, round.num + 1); }}
            onEnd={() => { if (code) void endMatch(code); }}
          />
        )}

        {phase === "ended" && (
          <EndCard room={room} myProfileId={profile.id} onBack={() => navigate("/odd")} />
        )}

        {room.state.lastEvent && phase !== "ended" && (
          <div className="text-[11px] text-center italic" style={{ color: "#fde047" }}>{room.state.lastEvent}</div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function RoleCard({ priv, pack, revealed, onReveal }: {
  priv: OddPrivate;
  pack: { emoji: string; name: string } | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (!revealed) {
    return (
      <button onClick={onReveal}
        className="w-full rounded-2xl p-6 pressable touch-target text-center"
        style={{
          background: "linear-gradient(135deg, rgba(244,114,182,0.18), rgba(15,8,18,0.95))",
          border: "2px solid #f9a8d4",
        }}>
        <EyeOff size={30} style={{ color: "#f9a8d4", margin: "0 auto" }} />
        <div className="font-display text-lg tracking-wider mt-2" style={{ color: "#f9a8d4" }}>
          TAP TO SEE YOUR CARD
        </div>
        <div className="text-[11px] mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>
          Keep your screen private — don't show anyone else.
        </div>
      </button>
    );
  }
  if (priv.isOdd) {
    return (
      <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-5 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(15,5,5,0.95))",
          border: "2px solid #ef4444",
        }}>
        <div className="text-[10px] tracking-[0.4em]" style={{ color: "#fca5a5" }}>YOU ARE THE</div>
        <div className="font-display text-3xl tracking-wider mt-1" style={{ color: "#fca5a5" }}>ODD ONE OUT</div>
        <div className="text-[12px] mt-3 leading-relaxed" style={{ color: "#fef3c7" }}>
          You don't know the secret word. Listen to clues, then bluff one of your own when it's your turn.
        </div>
        {priv.categoryHint && (
          <div className="mt-2 text-[11px] italic" style={{ color: "#fbbf24" }}>
            Category: {priv.categoryHint}
          </div>
        )}
        <div className="text-[10px] mt-2 opacity-75" style={{ color: "rgba(229,231,235,0.6)" }}>
          Win by surviving the vote.
        </div>
      </motion.section>
    );
  }
  return (
    <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl p-5 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(5,12,8,0.95))",
        border: "2px solid #86efac",
      }}>
      <div className="text-[10px] tracking-[0.4em]" style={{ color: "#86efac" }}>YOUR SECRET WORD</div>
      <div className="font-display text-4xl tracking-wider mt-1" style={{ color: "#fef3c7" }}>
        {priv.secretWord ?? "—"}
      </div>
      <div className="text-[12px] mt-3 leading-relaxed" style={{ color: "#fef3c7" }}>
        Drop a clue that PROVES you're in — but don't say it outright. One person doesn't know this word.
      </div>
      {pack && (
        <div className="mt-2 text-[10px] opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>
          {pack.emoji} {pack.name}
        </div>
      )}
    </motion.section>
  );
}

function ScoreStrip({ players, scores, myProfileId }: {
  players: { profileId: string; profileName: string; profileColor: string }[];
  scores: Record<string, number>;
  myProfileId: string;
}) {
  return (
    <div className="rounded-xl p-2 flex gap-1.5 overflow-x-auto"
      style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {players.map(p => (
        <div key={p.profileId}
          className="shrink-0 rounded-md px-2 py-1 text-center"
          style={{
            background: `${p.profileColor}1f`,
            border: `1px solid ${p.profileColor}55`,
            minWidth: 56,
          }}>
          <div className="text-[8px] tracking-widest opacity-75 truncate" style={{ color: p.profileColor }}>
            {p.profileName.toUpperCase()}{p.profileId === myProfileId ? "*" : ""}
          </div>
          <div className="font-display text-base" style={{ color: "#fde047" }}>{scores[p.profileId] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function ClueBoard({ round, players, myProfileId, myTurn, clueDraft, onClueChange, onSubmitClue, onSpeak, currentName }: {
  round: NonNullable<OddRoom["state"]["round"]>;
  players: { profileId: string; profileName: string; profileColor: string }[];
  myProfileId: string;
  myTurn: boolean;
  clueDraft: string;
  onClueChange: (s: string) => void;
  onSubmitClue: () => void;
  onSpeak: (text: string) => void;
  currentName: string;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.30)" }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#f9a8d4" }}>
        CLUE PHASE · {round.currentClueIdx + 1} of {round.clueOrder.length}
      </div>

      {/* Whose turn indicator */}
      <div className="rounded-lg px-3 py-2 mb-2 text-center"
        style={{ background: "rgba(0,0,0,0.40)", border: "1px solid rgba(244,114,182,0.30)" }}>
        <div className="text-[10px] tracking-widest" style={{ color: "#f9a8d4" }}>
          {myTurn ? "🎯 YOUR TURN" : "Waiting on"}
        </div>
        <div className="font-display text-[15px]" style={{ color: "#fef3c7" }}>
          {myTurn ? "Drop one clue about your word" : currentName}
        </div>
      </div>

      {/* Clue input — only the current giver. */}
      {myTurn && (
        <div className="space-y-2">
          <textarea
            value={clueDraft}
            onChange={e => onClueChange(e.target.value.slice(0, 80))}
            placeholder="Say one thing about your word (not the word itself)…"
            rows={2}
            className="w-full rounded-lg p-2 text-[12px] resize-none"
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(244,114,182,0.40)",
              color: "#fef3c7",
            }}
          />
          <button onClick={onSubmitClue} disabled={!clueDraft.trim()}
            className="w-full py-2.5 rounded-lg pressable touch-target font-display tracking-widest text-[12px]"
            style={{
              background: clueDraft.trim() ? "#f9a8d4" : "rgba(255,255,255,0.05)",
              color: clueDraft.trim() ? "#0a0a14" : "#9aa6bf",
              minHeight: 44,
            }}>
            🔒 LOCK MY CLUE
          </button>
          <div className="text-[10px] text-center opacity-65" style={{ color: "rgba(229,231,235,0.7)" }}>
            Tip: vague enough to bluff, specific enough to prove you're in.
          </div>
        </div>
      )}

      {/* Clue feed */}
      {round.clues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[9px] tracking-widest mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>CLUES SO FAR</div>
          <ul className="space-y-1.5">
            {round.clues.map((c, i) => {
              const p = players.find(pp => pp.profileId === c.profileId);
              return (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: p?.profileColor ?? "#9aa6bf" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-widest" style={{ color: p?.profileColor ?? "#9aa6bf" }}>
                      {p?.profileName?.toUpperCase() ?? "?"}
                    </div>
                    <div className="text-[12px] italic" style={{ color: "#fef3c7" }}>"{c.text}"</div>
                  </div>
                  <button onClick={() => onSpeak(c.text)}
                    aria-label="Read clue aloud"
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#9aa6bf" }}>
                    <Volume2 size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function DiscussionBoard({ round, players, onSpeak, isHost, onExtend, onCallVote }: {
  round: NonNullable<OddRoom["state"]["round"]>;
  players: { profileId: string; profileName: string; profileColor: string }[];
  onSpeak: (text: string) => void;
  isHost: boolean;
  onExtend: () => void;
  onCallVote: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const startedAt = round.discussionStartedAt ?? now;
  const elapsed = (now - startedAt) / 1000;
  const remain = Math.max(0, Math.round(round.discussionDurationSec - elapsed));
  const pct = Math.max(0, Math.min(100, (remain / round.discussionDurationSec) * 100));

  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(253,224,71,0.08)", border: "1px solid rgba(253,224,71,0.30)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em]" style={{ color: "#fde047" }}>DISCUSSION</div>
        <div className="font-display text-base tabular-nums" style={{ color: "#fde047" }}>{remain}s</div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="h-full transition-all"
          style={{ width: `${pct}%`, background: pct < 25 ? "#ef4444" : pct < 50 ? "#fbbf24" : "#fde047" }} />
      </div>
      <div className="text-[12px] mb-2 italic" style={{ color: "rgba(229,231,235,0.85)" }}>
        Talk it out — IRL or in the clue feed below. Who feels off?
      </div>

      <div className="space-y-1.5 max-h-40 overflow-auto mb-3">
        {round.clues.map((c, i) => {
          const p = players.find(pp => pp.profileId === c.profileId);
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1"
              style={{ background: `${p?.profileColor ?? "#9aa6bf"}1f`, border: `1px solid ${p?.profileColor ?? "#9aa6bf"}44` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] tracking-widest" style={{ color: p?.profileColor ?? "#9aa6bf" }}>
                  {p?.profileName?.toUpperCase() ?? "?"}
                </div>
                <div className="text-[12px] italic" style={{ color: "#fef3c7" }}>"{c.text}"</div>
              </div>
              <button onClick={() => onSpeak(c.text)} aria-label="Read aloud"
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", color: "#9aa6bf" }}>
                <Volume2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {isHost && (
        <div className="flex gap-2">
          <button onClick={onExtend}
            className="flex-1 py-2.5 rounded-lg pressable touch-target font-display tracking-widest text-[11px]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
            +30s
          </button>
          <button onClick={onCallVote}
            className="flex-1 py-2.5 rounded-lg pressable touch-target font-display tracking-widest text-[11px]"
            style={{ background: "#fde047", color: "#0a0a14" }}>
            🗳 VOTE NOW
          </button>
        </div>
      )}
    </section>
  );
}

function VoteBoard({ round, players, myProfileId, myVote, onVote }: {
  round: NonNullable<OddRoom["state"]["round"]>;
  players: { profileId: string; profileName: string; profileColor: string }[];
  myProfileId: string;
  myVote?: string;
  onVote: (targetId: string) => void;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)" }}>
      <div className="text-[10px] tracking-[0.3em] mb-2 text-center" style={{ color: "#fca5a5" }}>
        VOTE FOR THE ODD ONE OUT
      </div>
      <div className="space-y-1.5">
        {players.map(p => {
          const isMyVote = myVote === p.profileId;
          const isMe = p.profileId === myProfileId;
          const voteCount = Object.values(round.votes ?? {}).filter(v => v === p.profileId).length;
          return (
            <button key={p.profileId}
              onClick={() => !isMe && onVote(p.profileId)}
              disabled={isMe}
              aria-pressed={isMyVote}
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
              {voteCount > 0 && (
                <span className="text-[9px] tracking-widest" style={{ color: p.profileColor }}>
                  {voteCount} vote{voteCount > 1 ? "s" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RevealBoard({ round, reveal, players, isHost, onNextRound, onEnd }: {
  round: NonNullable<OddRoom["state"]["round"]>;
  reveal: NonNullable<NonNullable<OddRoom["state"]["round"]>["reveal"]>;
  players: { profileId: string; profileName: string; profileColor: string }[];
  isHost: boolean;
  onNextRound: () => void;
  onEnd: () => void;
}) {
  const oddPlayer = players.find(p => p.profileId === reveal.oddOneId);
  const evictedPlayer = reveal.evictedId ? players.find(p => p.profileId === reveal.evictedId) : null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 text-center"
      style={{
        background: reveal.oddOneWon
          ? "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(15,5,5,0.95))"
          : "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(5,12,8,0.95))",
        border: `2px solid ${reveal.oddOneWon ? "#fca5a5" : "#86efac"}`,
      }}>
      <Trophy size={28} style={{ color: reveal.oddOneWon ? "#fca5a5" : "#86efac", margin: "0 auto" }} />
      <div className="font-display text-2xl tracking-wider mt-2" style={{ color: reveal.oddOneWon ? "#fca5a5" : "#86efac" }}>
        {reveal.wasTie ? "TIED VOTE" : reveal.oddOneWon ? "ODD ONE WINS!" : "CREW WINS!"}
      </div>
      <div className="mt-3 space-y-1 text-[12px]" style={{ color: "#fef3c7" }}>
        <div>
          The Odd One was <strong style={{ color: oddPlayer?.profileColor ?? "#fca5a5" }}>{oddPlayer?.profileName ?? "Unknown"}</strong>.
        </div>
        <div>
          The secret word was <strong style={{ color: "#fde047" }}>{reveal.secretWord}</strong>.
        </div>
        {evictedPlayer && (
          <div className="text-[11px] opacity-85">
            Voted out: <strong style={{ color: evictedPlayer.profileColor }}>{evictedPlayer.profileName}</strong>
          </div>
        )}
      </div>

      {isHost && (
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
          <button onClick={onNextRound}
            className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
            style={{ background: "#fde047", color: "#0a0a14" }}>
            ▶ NEXT ROUND
          </button>
          <button onClick={onEnd}
            className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
            END MATCH
          </button>
        </div>
      )}
      {!isHost && (
        <div className="text-[10px] mt-3" style={{ color: "rgba(229,231,235,0.6)" }}>
          Host will start the next round or end the match.
        </div>
      )}
    </motion.section>
  );
}

function EndCard({ room, myProfileId, onBack }: {
  room: OddRoom; myProfileId: string; onBack: () => void;
}) {
  const scores = room.state.scores ?? {};
  const sorted = room.state.players.slice().sort((a, b) =>
    (scores[b.profileId] ?? 0) - (scores[a.profileId] ?? 0));
  const winner = sorted[0];
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))",
        border: "2px solid #fde047",
      }}>
      <Trophy size={32} style={{ color: "#fde047", margin: "0 auto" }} />
      <div className="font-display text-2xl tracking-wider mt-2" style={{ color: "#fde047" }}>
        {winner ? `${winner.profileName} WINS!` : "MATCH ENDED"}
      </div>
      <div className="mt-3 space-y-1">
        {sorted.map((p, i) => (
          <div key={p.profileId}
            className="flex justify-between rounded-lg px-2 py-1"
            style={{
              background: `${p.profileColor}1f`,
              border: `1px solid ${p.profileColor}44`,
              color: "#fef3c7",
            }}>
            <span className="font-display text-[12px]">
              {i + 1}. {p.profileName}{p.profileId === myProfileId ? " (you)" : ""}
            </span>
            <span className="font-display text-[12px]" style={{ color: "#fde047" }}>
              {scores[p.profileId] ?? 0}
            </span>
          </div>
        ))}
      </div>
      <button onClick={onBack}
        className="mt-4 px-5 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
        style={{ background: "#fde047", color: "#0a0a14" }}>
        BACK TO LOBBY
      </button>
    </motion.section>
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
          style={{ background: "#f9a8d4", color: "#0a0a14" }}>
          Odd One Out Lobby
        </button>
      </div>
    </div>
  );
}
