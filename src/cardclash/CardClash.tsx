// Card Clash — the match page. 3 locations, 6 turns, simultaneous reveal,
// Go Bold push-or-fold. Solo vs AI (3 difficulty tiers).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Flame, Trophy, X, Eye, EyeOff } from "lucide-react";
import { getActiveProfileId, profileKey, recordGameSession } from "../profiles/store";
import { playSfx, unlockAudio } from "../art";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { CARDS, STARTER_DECK_IDS, type CardDef } from "./cards";
import { LOCATIONS } from "./locations";
import {
  newMatch, queuePlay, unqueuePlay, endTurn, callBold, retreat, canRetreat,
  cloneMatch,
  type Match,
} from "./engine";
import { Card, CardDetailModal } from "./Card";

const SAVE_KEY = "dd_cardclash_v1";
const BLOB_KEY = "cardclash_v1";
function saveK() { return profileKey(SAVE_KEY); }

interface Save {
  decks: { id: string; name: string; cardIds: string[] }[];
  activeDeckId: string;
  collection: string[]; // unlocked card ids
  rank: number;
  wins: number; losses: number;
}

function defaultSave(): Save {
  return {
    decks: [{ id: "starter", name: "Starter Deck", cardIds: [...STARTER_DECK_IDS] }],
    activeDeckId: "starter",
    collection: CARDS.map(c => c.id), // generous starter — all unlocked
    rank: 0, wins: 0, losses: 0,
  };
}

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(saveK());
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSave();
}
function persist(s: Save) {
  try { localStorage.setItem(saveK(), JSON.stringify(s)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, BLOB_KEY, s); } catch { /* ignore */ }
}

type Phase = "menu" | "deck" | "match" | "result";

export default function CardClash() {
  const navigate = useNavigate();
  const [save, setSave] = useState<Save>(() => loadSave());
  const [phase, setPhase] = useState<Phase>("menu");
  const [match, setMatch] = useState<Match | null>(null);
  const [showOppPending, setShowOppPending] = useState(false);
  // Tap-to-reveal card details — when set, the modal overlay opens
  // showing full ability text + stats. Available from any context
  // (hand, board, deck builder, collection).
  const [viewingCard, setViewingCard] = useState<CardDef | null>(null);
  const showCardDetails = (c: CardDef) => setViewingCard(c);

  useEffect(() => {
    const pid = getActiveProfileId();
    if (!pid) return;
    return cloudSubscribe<Save>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      setSave({ ...defaultSave(), ...remote });
      try { localStorage.setItem(saveK(), JSON.stringify(remote)); } catch { /* ignore */ }
    });
  }, []);

  function startMatch() {
    unlockAudio();
    const deck = save.decks.find(d => d.id === save.activeDeckId) ?? save.decks[0];
    const m = newMatch(deck.cardIds);
    setMatch(m);
    setPhase("match");
  }

  function commitTurn() {
    if (!match) return;
    playSfx("cardReveal", { volume: 0.6 });
    const next = endTurn(match);
    setMatch(next);
    if (next.state === "ended") {
      setTimeout(() => {
        finalizeResult(next);
      }, 600);
    }
  }

  function finalizeResult(m: Match) {
    const wonStakes = m.stakes;
    let next: Save = save;
    if (m.result === "win") {
      next = { ...save, wins: save.wins + 1, rank: save.rank + 10 * wonStakes };
    } else if (m.result === "loss") {
      next = { ...save, losses: save.losses + 1, rank: Math.max(0, save.rank - 8 * wonStakes) };
    } else if (m.result === "retreatOpponent") {
      next = { ...save, wins: save.wins + 1, rank: save.rank + 5 * wonStakes };
    } else if (m.result === "retreatPlayer") {
      next = { ...save, losses: save.losses + 1, rank: Math.max(0, save.rank - 4) };
    }
    setSave(next); persist(next);
    const pid = getActiveProfileId();
    if (pid) recordGameSession(pid, "cardclash", {
      sessions: 1,
      wins: (m.result === "win" || m.result === "retreatOpponent") ? 1 : 0,
      losses: (m.result === "loss" || m.result === "retreatPlayer") ? 1 : 0,
      level: next.rank,
    });
    setPhase("result");
  }

  // ── Phase: menu ─────────────────────────────────────────────────────
  if (phase === "menu") {
    const deck = save.decks.find(d => d.id === save.activeDeckId)!;
    return (
      <>
      <div className="min-h-screen pb-12" style={{
        background: "radial-gradient(900px 600px at 50% 0%, rgba(167,139,250,0.18), transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
      }}>
        <header className="px-4 py-4 flex items-center gap-3 max-w-4xl mx-auto safe-top">
          <button onClick={() => navigate("/")} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#a78bfa" }}>🃏 SNAP-STYLE BATTLER</div>
            <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>CARD CLASH</h1>
          </div>
          <div className="text-right">
            <div className="text-[9px] tracking-widest opacity-70" style={{ color: "#a78bfa" }}>RANK</div>
            <div className="font-mono text-[13px]" style={{ color: "#fde047" }}>{save.rank}</div>
          </div>
        </header>
        <main className="px-4 max-w-4xl mx-auto space-y-3">
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#a78bfa" }}>ACTIVE DECK · {deck.name}</div>
              <span className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>{deck.cardIds.length} cards</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {deck.cardIds.map(id => {
                const c = CARDS.find(x => x.id === id);
                if (!c) return null;
                return <Card key={id} card={c} size="sm" onInfo={() => showCardDetails(c)} />;
              })}
            </div>
            <button onClick={() => setPhase("deck")}
              className="mt-2 w-full py-2 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{ background: "rgba(167,139,250,0.18)", border: "1px solid #a78bfa", color: "#a78bfa" }}>
              EDIT DECK
            </button>
          </section>

          <button onClick={startMatch}
            className="w-full py-4 rounded-2xl font-display tracking-widest text-[14px] pressable touch-target"
            style={{ background: "linear-gradient(135deg, #a78bfa, #6d28d9)", color: "#0a0a14" }}>
            ⚔️ PLAY VS AI
          </button>

          <div className="grid grid-cols-2 gap-2">
            <KPI label="WINS" value={String(save.wins)} color="#86efac" />
            <KPI label="LOSSES" value={String(save.losses)} color="#f87171" />
          </div>

          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fde047" }}>HOW TO PLAY</div>
            <ul className="text-[11px] space-y-1" style={{ color: "rgba(229,231,235,0.85)" }}>
              <li>· 3 locations reveal one per turn (turns 1–3)</li>
              <li>· 6 turns total. Energy = turn number (1→6)</li>
              <li>· Both players place cards face-down. Reveal happens simultaneously</li>
              <li>· Win 2 of 3 locations</li>
              <li>· Call <b style={{ color: "#fde047" }}>GO BOLD</b> to double stakes — opponent can match or retreat</li>
            </ul>
          </section>
        </main>
      </div>
      <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />
      </>
    );
  }

  // ── Phase: deck builder ─────────────────────────────────────────────
  if (phase === "deck") {
    const deck = save.decks.find(d => d.id === save.activeDeckId)!;
    function addToDeck(id: string) {
      if (deck.cardIds.length >= 12) return;
      const updated: Save = {
        ...save,
        decks: save.decks.map(d => d.id === deck.id ? { ...d, cardIds: [...d.cardIds, id] } : d),
      };
      setSave(updated); persist(updated);
    }
    function removeFromDeck(idx: number) {
      const updated: Save = {
        ...save,
        decks: save.decks.map(d => d.id === deck.id ? { ...d, cardIds: d.cardIds.filter((_, i) => i !== idx) } : d),
      };
      setSave(updated); persist(updated);
    }
    return (
      <>
      <div className="min-h-screen pb-12" style={{
        background: "radial-gradient(900px 600px at 50% 0%, rgba(167,139,250,0.18), transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
      }}>
        <header className="px-4 py-4 flex items-center gap-3 max-w-4xl mx-auto safe-top">
          <button onClick={() => setPhase("menu")} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#a78bfa" }}>DECK BUILDER · {deck.cardIds.length}/12</div>
            <h1 className="font-display text-xl tracking-wider" style={{ color: "#fef3c7" }}>{deck.name}</h1>
          </div>
        </header>
        <main className="px-4 max-w-4xl mx-auto">
          <section className="rounded-2xl p-3 mb-3"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.40)" }}>
            <div className="flex flex-wrap gap-1.5">
              {deck.cardIds.map((id, i) => {
                const c = CARDS.find(x => x.id === id);
                if (!c) return null;
                return (
                  <div key={i} className="relative">
                    <Card card={c} size="sm" onInfo={() => showCardDetails(c)} />
                    <button onClick={() => removeFromDeck(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center pressable"
                      style={{ background: "#f87171", color: "#0a0a14" }}>
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
              {deck.cardIds.length === 0 && (
                <div className="text-[11px] py-2" style={{ color: "rgba(229,231,235,0.6)" }}>Empty — add cards from the collection.</div>
              )}
            </div>
          </section>
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#67e8f9" }}>COLLECTION · {save.collection.length} CARDS</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {save.collection.map(id => {
                const c = CARDS.find(x => x.id === id);
                if (!c) return null;
                const inDeck = deck.cardIds.includes(id);
                return (
                  <div key={id} className="flex justify-center">
                    <Card card={c} size="sm"
                      disabled={inDeck || deck.cardIds.length >= 12}
                      onClick={() => addToDeck(id)}
                      onInfo={() => showCardDetails(c)} />
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
      <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />
      </>
    );
  }

  // ── Phase: match ───────────────────────────────────────────────────
  if (phase === "match" && match) {
    return (
      <>
      <MatchView
        match={match}
        showOppPending={showOppPending}
        onToggleShowOpp={() => setShowOppPending(s => !s)}
        onCardInfo={showCardDetails}
        onPlay={(cardIdx, locIdx) => {
          playSfx("cardPlay", { volume: 0.55 });
          const next: Match = cloneMatch(match);
          queuePlay(next.player, cardIdx, locIdx, next);
          setMatch(next);
        }}
        onUnplay={(pendingIdx) => {
          playSfx("blip", { volume: 0.4 });
          const next: Match = cloneMatch(match);
          unqueuePlay(next.player, pendingIdx, next);
          setMatch(next);
        }}
        onEndTurn={commitTurn}
        onCallBold={() => { playSfx("powerUp", { volume: 0.7 }); setMatch(callBold(match, "player")); }}
        onRetreat={() => {
          const next = retreat(match, "player");
          setMatch(next);
          setTimeout(() => finalizeResult(next), 400);
        }}
        onAbort={() => { setMatch(null); setPhase("menu"); }}
      />
      <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />
      </>
    );
  }

  // ── Phase: result ───────────────────────────────────────────────────
  if (phase === "result" && match) {
    return (
      <>
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: `radial-gradient(800px 500px at 50% 50%, ${match.result === "win" ? "rgba(134,239,172,0.20)" : "rgba(248,113,113,0.20)"}, transparent), #0a0814`,
      }}>
        <div className="max-w-sm w-full rounded-2xl p-5 text-center"
          style={{
            background: match.result === "win"
              ? "linear-gradient(135deg, rgba(134,239,172,0.25), rgba(8,8,14,0.95))"
              : "linear-gradient(135deg, rgba(248,113,113,0.25), rgba(8,8,14,0.95))",
            border: `1.5px solid ${match.result === "win" ? "#86efac" : "#f87171"}`,
          }}>
          <div className="inline-flex items-center gap-2 mb-2" style={{ color: match.result === "win" ? "#86efac" : "#f87171" }}>
            <Trophy size={20} />
            <div className="font-display tracking-widest text-xl">
              {match.result === "win" ? "VICTORY"
                : match.result === "loss" ? "DEFEAT"
                : match.result === "retreatOpponent" ? "THEY RETREATED"
                : match.result === "retreatPlayer" ? "RETREATED"
                : "DRAW"}
            </div>
          </div>
          <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>
            Stakes ×{match.stakes}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {match.locations.map((l, i) => (
              <div key={i} className="rounded p-1.5 text-center"
                style={{
                  background: l.totals.player > l.totals.opponent ? "rgba(134,239,172,0.15)"
                    : l.totals.opponent > l.totals.player ? "rgba(248,113,113,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${l.totals.player > l.totals.opponent ? "#86efac"
                    : l.totals.opponent > l.totals.player ? "#f87171"
                    : "rgba(255,255,255,0.10)"}`,
                }}>
                <div className="text-[9px] tracking-widest truncate" style={{ color: l.loc.color }}>{l.loc.name}</div>
                <div className="font-mono text-[11px]" style={{ color: "#fef3c7" }}>
                  {l.totals.player} – {l.totals.opponent}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => { setMatch(null); setPhase("menu"); }}
              className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
              MENU
            </button>
            <button onClick={() => startMatch()}
              className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
              style={{ background: "linear-gradient(135deg, #a78bfa, #6d28d9)", color: "#0a0a14" }}>
              REMATCH
            </button>
          </div>
        </div>
      </div>
      <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />
      </>
    );
  }

  return null;
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-2"
      style={{ background: `${color}14`, border: `1px solid ${color}55` }}>
      <div className="text-[8px] tracking-widest opacity-70" style={{ color }}>{label}</div>
      <div className="font-display text-lg" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}

// ── Match view ────────────────────────────────────────────────────────

function MatchView({ match, onPlay, onUnplay, onEndTurn, onCallBold, onRetreat, onAbort, showOppPending, onToggleShowOpp, onCardInfo }: {
  match: Match;
  onPlay: (cardIdx: number, locIdx: number) => void;
  onUnplay: (pendingIdx: number) => void;
  onEndTurn: () => void;
  onCallBold: () => void;
  onRetreat: () => void;
  onAbort: () => void;
  showOppPending: boolean;
  onToggleShowOpp: () => void;
  onCardInfo: (card: CardDef) => void;
}) {
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  // ── Drag and drop ────────────────────────────────────────────────
  //
  // Touch/mouse drag from a hand card to a location. Hit-tests via
  // data-loc-index attribute on the location div. Falls back to
  // tap-to-select + tap-location flow for accessibility.
  const [drag, setDrag] = useState<{ cardIdx: number; x: number; y: number; hoverLi: number | null } | null>(null);

  function startDrag(cardIdx: number, e: React.PointerEvent) {
    const card = match.player.hand[cardIdx];
    if (!card || card.cost > match.player.energy) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ cardIdx, x: e.clientX, y: e.clientY, hoverLi: null });
  }
  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const locEl = el?.closest("[data-loc-index]") as HTMLElement | null;
    const locIdx = locEl ? parseInt(locEl.getAttribute("data-loc-index") ?? "-1", 10) : -1;
    setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY, hoverLi: locIdx >= 0 ? locIdx : null } : d);
  }
  function endDrag(e: React.PointerEvent) {
    if (!drag) return;
    if (drag.hoverLi !== null && match.locations[drag.hoverLi]?.revealed) {
      onPlay(drag.cardIdx, drag.hoverLi);
    }
    setDrag(null);
    setSelectedCardIdx(null);
  }
  const draggedCard = drag !== null ? match.player.hand[drag.cardIdx] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "radial-gradient(1000px 600px at 50% 0%, rgba(167,139,250,0.10), transparent), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
    }}
      onPointerMove={drag ? moveDrag : undefined}
      onPointerUp={drag ? endDrag : undefined}
      onPointerCancel={drag ? endDrag : undefined}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={onAbort} aria-label="Abort"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[11px] font-display tracking-widest">
          <span style={{ color: "#a78bfa" }}>TURN {Math.min(6, match.turn)}/6</span>
          <span style={{ color: "#fde047" }}>⚡ {match.player.energy}</span>
          {match.stakes > 1 && <span style={{ color: "#fb923c" }}>×{match.stakes} CUBE{match.stakes === 1 ? "" : "S"}</span>}
          <span style={{ color: match.priority === "player" ? "#86efac" : "#f87171", fontSize: 10 }}>
            ▶ {match.priority === "player" ? "YOU" : "OPP"} FIRST
          </span>
        </div>
        <button onClick={onToggleShowOpp} aria-label="Toggle opponent reveal"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          {showOppPending ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </header>

      {/* Opponent hand size + pending */}
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(248,113,113,0.06)", borderBottom: "1px solid rgba(248,113,113,0.20)" }}>
        <div className="text-[10px] tracking-widest" style={{ color: "#f87171" }}>OPPONENT</div>
        <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.7)" }}>
          {match.opponent.hand.length} hand · {match.opponent.pending.length} pending
        </div>
      </div>

      {/* Locations */}
      <main className="flex-1 px-2 py-2 grid grid-cols-3 gap-2 overflow-auto">
        {match.locations.map((loc, li) => {
          const opponentPending = match.opponent.pending.filter(p => p.locationIndex === li);
          return (
            <div key={li} className="rounded-xl p-1.5 flex flex-col gap-1"
              data-loc-index={li}
              style={{
                background: loc.revealed
                  ? (drag?.hoverLi === li
                      ? `linear-gradient(180deg, ${loc.loc.color}66, rgba(8,8,14,0.85))`
                      : `linear-gradient(180deg, ${loc.loc.color}33, rgba(8,8,14,0.85))`)
                  : "rgba(20,20,30,0.7)",
                border: `1.5px solid ${drag?.hoverLi === li ? "#fde047" : loc.revealed ? loc.loc.color : "rgba(255,255,255,0.15)"}`,
                boxShadow: drag?.hoverLi === li ? `0 0 24px ${loc.loc.color}99` : undefined,
                minHeight: 360,
                transition: "border 0.12s, background 0.12s, box-shadow 0.12s",
              }}>
              {/* Location title */}
              <div className="text-center">
                {loc.revealed ? (
                  <>
                    <div className="font-display text-[11px] tracking-widest" style={{ color: loc.loc.color }}>
                      {loc.loc.name.toUpperCase()}
                    </div>
                    <div className="text-[9px] opacity-80 leading-tight px-1" style={{ color: "rgba(229,231,235,0.85)" }}>
                      {loc.loc.description}
                    </div>
                  </>
                ) : (
                  <div className="font-display text-[11px] tracking-widest opacity-50" style={{ color: "#fef3c7" }}>
                    REVEALS TURN {li + 1}
                  </div>
                )}
              </div>
              {/* Score */}
              {loc.revealed && (
                <div className="text-center">
                  <span className="font-mono text-[12px]" style={{ color: loc.totals.player > loc.totals.opponent ? "#86efac" : "#fef3c7" }}>
                    {loc.totals.player}
                  </span>
                  <span className="opacity-50 mx-1" style={{ color: "#fef3c7" }}>–</span>
                  <span className="font-mono text-[12px]" style={{ color: loc.totals.opponent > loc.totals.player ? "#f87171" : "#fef3c7" }}>
                    {loc.totals.opponent}
                  </span>
                </div>
              )}
              {/* Opponent cards */}
              <div className="min-h-[80px] flex flex-wrap gap-1 justify-center items-start">
                {loc.cards.opponent.map(c => (
                  <Card key={c.uid} card={c.def} size="sm" power={c.power} onInfo={() => onCardInfo(c.def)} />
                ))}
                {opponentPending.map((p, pi) => (
                  <Card key={`opp-pending-${pi}`} card={p.def} size="sm" facedown={!showOppPending} power={p.def.power}
                    onInfo={showOppPending ? () => onCardInfo(p.def) : undefined} />
                ))}
              </div>
              <div className="h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              {/* Player cards */}
              <div className="min-h-[80px] flex flex-wrap gap-1 justify-center items-start">
                {loc.cards.player.map(c => (
                  <Card key={c.uid} card={c.def} size="sm" power={c.power} onInfo={() => onCardInfo(c.def)} />
                ))}
                {match.player.pending.filter(p => p.locationIndex === li).map((p) => {
                  const pendingIdx = match.player.pending.findIndex(x => x.cardUid === p.cardUid);
                  return (
                    <Card key={`p-pending-${p.cardUid}`} card={p.def} size="sm" power={p.def.power}
                      highlighted onClick={() => onUnplay(pendingIdx)}
                      onInfo={() => onCardInfo(p.def)} />
                  );
                })}
                {/* Play target */}
                {loc.revealed && selectedCardIdx !== null && (
                  <button onClick={() => { onPlay(selectedCardIdx, li); setSelectedCardIdx(null); }}
                    className="rounded-lg pressable touch-target font-display tracking-widest text-[10px]"
                    style={{
                      width: 70, height: 100, background: "rgba(167,139,250,0.18)",
                      border: "1.5px dashed #a78bfa", color: "#a78bfa",
                    }}>
                    PLAY HERE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* Player hand — drag a card up to a revealed location to play it */}
      <section className="px-2 pt-2 pb-1 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="text-[10px] tracking-widest mb-1" style={{ color: "#67e8f9" }}>
          YOUR HAND ({match.player.hand.length}) · {drag ? "DROP ON A LOCATION" : "DRAG A CARD TO PLAY"}
        </div>
        <div className="flex gap-1.5">
          {match.player.hand.map((c, i) => {
            const canAfford = c.cost <= match.player.energy;
            const isDragging = drag?.cardIdx === i;
            return (
              <div key={i}
                onPointerDown={(e) => canAfford && startDrag(i, e)}
                style={{
                  touchAction: "none",
                  opacity: isDragging ? 0.35 : 1,
                  transition: "opacity 0.1s",
                  cursor: canAfford ? "grab" : "default",
                }}>
                <Card card={c} size="sm"
                  disabled={!canAfford}
                  highlighted={selectedCardIdx === i}
                  onClick={() => canAfford && setSelectedCardIdx(selectedCardIdx === i ? null : i)}
                  onInfo={() => onCardInfo(c)} />
              </div>
            );
          })}
          {match.player.hand.length === 0 && (
            <div className="text-[11px] py-3 px-2" style={{ color: "rgba(229,231,235,0.6)" }}>No cards in hand.</div>
          )}
        </div>
      </section>

      {/* Action bar */}
      <div className="px-3 py-2 flex gap-2" style={{ background: "rgba(0,0,0,0.6)", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        {!match.playerBoldCalled && match.turn >= 2 && match.turn <= 4 && (
          <button onClick={onCallBold}
            className="px-3 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
            style={{ background: "rgba(253,224,71,0.20)", border: "1px solid #fde047", color: "#fde047" }}>
            <Flame size={11} className="inline mr-1" />GO BOLD
          </button>
        )}
        {match.stakes > 1 && (
          <button onClick={onRetreat}
            disabled={!canRetreat(match, "player")}
            className="px-3 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: "rgba(252,165,165,0.10)",
              border: "1px solid rgba(252,165,165,0.30)",
              color: "#fca5a5",
              opacity: canRetreat(match, "player") ? 1 : 0.4,
            }}
            title={canRetreat(match, "player") ? "Retreat — lose half stakes" : "Locked this turn (you just snapped)"}>
            RETREAT
          </button>
        )}
        <button onClick={onEndTurn}
          className="ml-auto px-4 py-2 rounded-lg font-display tracking-widest text-[12px] pressable touch-target"
          style={{ background: "linear-gradient(135deg, #a78bfa, #6d28d9)", color: "#0a0a14" }}>
          END TURN <ChevronRight size={13} className="inline ml-1" />
        </button>
      </div>

      {/* Log strip */}
      {match.log.length > 0 && (
        <div className="px-3 py-1 text-[10px] truncate" style={{ background: "rgba(0,0,0,0.6)", color: "rgba(229,231,235,0.8)" }}>
          {match.log[match.log.length - 1]}
        </div>
      )}

      {/* Floating drag preview — follows pointer with card sprite */}
      {drag && draggedCard && (
        <div style={{
          position: "fixed",
          left: drag.x - 35,
          top: drag.y - 50,
          pointerEvents: "none",
          zIndex: 100,
          transform: "rotate(-4deg) scale(1.1)",
          transition: "transform 0.08s",
        }}>
          <Card card={draggedCard} size="sm"
            highlighted={drag.hoverLi !== null} />
        </div>
      )}
    </div>
  );
}
