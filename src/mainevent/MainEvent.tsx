// Main Event — wrestling booking sim page. Single-screen workflow:
//   1. View upcoming show card.
//   2. Add segments (matches or promos) — pick participants + match type.
//   3. Simulate the show — see ratings + story.
//   4. Watch promotion grow Indie → Global.
//
// Per-profile save with cloud blob sync.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, Trophy, Star, Trash2, Flame, Users, Mic, X } from "lucide-react";
import { getActiveProfileId, profileKey, recordGameSession, useActiveProfile } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { BEATS, MATCH_TYPES, TIERS } from "./data";
import { playSfx, unlockAudio } from "../art";
import {
  newGame, simulateShow, startFeud, resolveFeud,
  type BookerState, type SegmentDraft, type SegmentResult,
} from "./engine";
import { Crest } from "../art/CrestGenerator";

const BASE_KEY = "dd_mainevent_v1";
const BLOB_KEY = "main_event_v1";
function saveKey() { return profileKey(BASE_KEY); }

function loadSave(): BookerState | null {
  try {
    const raw = localStorage.getItem(saveKey());
    return raw ? (JSON.parse(raw) as BookerState) : null;
  } catch { return null; }
}
function persist(s: BookerState) {
  try { localStorage.setItem(saveKey(), JSON.stringify(s)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, BLOB_KEY, s); } catch { /* ignore */ }
}

export default function MainEvent() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [state, setState] = useState<BookerState>(() => loadSave() ?? newGame());
  const [editing, setEditing] = useState<SegmentDraft | null>(null);
  const [report, setReport] = useState<{ showId: string; results: SegmentResult[] } | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    return cloudSubscribe<BookerState>(profile.id, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      setState(remote);
      try { localStorage.setItem(saveKey(), JSON.stringify(remote)); } catch { /* ignore */ }
    });
  }, [profile?.id]);

  const current = state.schedule.find(s => !s.results);
  const tierCfg = TIERS.find(t => t.id === state.tier)!;
  const nextTier = TIERS[TIERS.indexOf(tierCfg) + 1];

  function update(next: BookerState) {
    setState(next); persist(next);
  }

  function addSegment(kind: "match" | "promo") {
    if (!current) return;
    const draft: SegmentDraft = {
      id: `seg-${Date.now()}`,
      kind,
      type: kind === "match" ? "singles" : "callout",
      participants: [],
    };
    setEditing(draft);
  }

  function commitEdit(draft: SegmentDraft) {
    if (!current) return;
    if (draft.participants.length < (draft.kind === "match" ? 2 : 1)) {
      setEditing(null); return;
    }
    const showIdx = state.schedule.findIndex(s => s.id === current.id);
    const newSched = state.schedule.map(s => ({ ...s, segments: [...s.segments] }));
    const existingIdx = newSched[showIdx].segments.findIndex(s => s.id === draft.id);
    if (existingIdx >= 0) {
      newSched[showIdx].segments[existingIdx] = draft;
    } else {
      newSched[showIdx].segments.push(draft);
    }
    update({ ...state, schedule: newSched });
    setEditing(null);
  }

  function removeSegment(segId: string) {
    if (!current) return;
    const showIdx = state.schedule.findIndex(s => s.id === current.id);
    const newSched = state.schedule.map(s => ({ ...s, segments: [...s.segments] }));
    newSched[showIdx].segments = newSched[showIdx].segments.filter(s => s.id !== segId);
    update({ ...state, schedule: newSched });
  }

  function simulate() {
    if (!current || current.segments.length === 0) return;
    unlockAudio();
    playSfx("metalBell", { volume: 0.7 });  // wrestling ring bell
    const next = simulateShow(state, current.id);
    update(next);
    const played = next.schedule.find(s => s.id === current.id);
    if (played?.results) {
      setReport({ showId: current.id, results: played.results });
      // Crowd cheer if it was a hot show
      if ((played.overallRating ?? 0) >= 4) playSfx("crowdCheer", { volume: 0.7 });
    }
    // Record session
    const pid = getActiveProfileId();
    if (pid) recordGameSession(pid, "mainevent", {
      sessions: 1,
      seconds: 60,
      level: next.showsBooked,
    });
  }

  function reset() {
    if (!confirm("Wipe the save and start a new promotion?")) return;
    const fresh = newGame();
    update(fresh);
    setReport(null);
  }

  return (
    <div className="min-h-screen pb-12" style={{
      background: "radial-gradient(900px 600px at 50% 0%, rgba(248,113,113,0.18), transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
    }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto safe-top">
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f87171" }}>🤼 BOOKING SIM</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>MAIN EVENT</h1>
        </div>
        <button onClick={reset} aria-label="Reset"
          className="px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
          style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5" }}>
          NEW PROMOTION
        </button>
      </header>

      <main className="px-4 max-w-5xl mx-auto space-y-3">
        {/* Top KPI strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KPI label="TIER" value={tierCfg.name} color={tierCfg.color} />
          <KPI label="FANS" value={fmtNum(state.fans)} color="#67e8f9" sub={nextTier ? `→ ${fmtNum(tierCfg.fansNeeded)}` : undefined} />
          <KPI label="CASH" value={"$" + fmtNum(state.cash)} color="#86efac" />
          <KPI label="TOP RATING" value={`${state.topRating.toFixed(1)}★`} color="#fde047" />
        </section>

        {/* Titles */}
        <section className="rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1" style={{ color: "#fde047" }}>
            <Trophy size={11} /> CHAMPIONSHIPS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {state.titles.map(t => {
              const holder = state.roster.find(r => r.id === t.currentHolderId);
              return (
                <div key={t.id} className="rounded-lg p-2"
                  style={{ background: `${t.color}14`, border: `1px solid ${t.color}55` }}>
                  <div className="text-[9px] tracking-widest font-display" style={{ color: t.color }}>{t.name.toUpperCase()}</div>
                  <div className="font-display text-sm mt-0.5" style={{ color: "#fef3c7" }}>
                    {holder ? holder.name : "VACANT"}
                  </div>
                  {holder && (
                    <div className="text-[9px] opacity-70" style={{ color: "#fef3c7" }}>
                      Reign #{t.reignNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming show */}
        {current && (
          <section className="rounded-2xl p-3"
            style={{
              background: current.kind === "ppv"
                ? "linear-gradient(135deg, rgba(248,113,113,0.18), rgba(8,8,14,0.95))"
                : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${current.kind === "ppv" ? "#f87171" : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: current.kind === "ppv" ? "#f87171" : "#fde047" }}>
                  {current.kind === "ppv" ? "⚡ MONTHLY PPV" : "📺 WEEKLY TV"}
                </div>
                <div className="font-display text-lg" style={{ color: "#fef3c7" }}>{current.label}</div>
              </div>
              <button onClick={simulate} disabled={current.segments.length === 0}
                className="px-4 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
                style={{
                  background: current.segments.length === 0 ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #f87171, #dc2626)",
                  color: current.segments.length === 0 ? "#9aa6bf" : "#fef3c7",
                  opacity: current.segments.length === 0 ? 0.55 : 1,
                }}>
                <ChevronRight size={13} className="inline mr-1" />SIMULATE
              </button>
            </div>
            <div className="space-y-1.5">
              {current.segments.map((seg, i) => {
                const isMain = i === current.segments.length - 1;
                const wrestlers = seg.participants.map(id => state.roster.find(r => r.id === id)).filter(Boolean);
                return (
                  <div key={seg.id} className="rounded-lg p-2 flex items-center gap-2"
                    style={{
                      background: isMain ? "rgba(248,113,113,0.15)" : "rgba(0,0,0,0.3)",
                      border: `1px solid ${isMain ? "#f87171" : "rgba(255,255,255,0.10)"}`,
                    }}>
                    <span className="font-mono text-[9px] opacity-70" style={{ color: "#fef3c7" }}>
                      {isMain ? "MAIN" : `#${i + 1}`}
                    </span>
                    <span className="text-[10px] font-display tracking-widest px-1.5 py-0.5 rounded" style={{
                      background: seg.kind === "match" ? "rgba(251,146,60,0.25)" : "rgba(167,139,250,0.25)",
                      color: seg.kind === "match" ? "#fb923c" : "#a78bfa",
                    }}>
                      {seg.kind === "match"
                        ? (MATCH_TYPES.find(m => m.id === seg.type)?.name ?? seg.type).toUpperCase()
                        : BEATS[seg.type as keyof typeof BEATS]?.label.toUpperCase() ?? "PROMO"}
                    </span>
                    <span className="flex-1 truncate text-[11px]" style={{ color: "#fef3c7" }}>
                      {wrestlers.length > 0 ? wrestlers.map((w: any) => w.name).join(" vs ") : "(empty)"}
                    </span>
                    {seg.titleId && <Trophy size={11} style={{ color: "#fde047" }} />}
                    <button onClick={() => setEditing(seg)} aria-label="Edit"
                      className="text-[10px] px-2 py-0.5 rounded font-display tracking-widest pressable"
                      style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
                      EDIT
                    </button>
                    <button onClick={() => removeSegment(seg.id)} aria-label="Remove"
                      className="w-6 h-6 rounded flex items-center justify-center pressable"
                      style={{ background: "rgba(252,165,165,0.10)", color: "#fca5a5" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
              <div className="flex gap-2 mt-2">
                <button onClick={() => addSegment("match")}
                  className="flex-1 py-2 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: "rgba(251,146,60,0.18)", border: "1px solid #fb923c", color: "#fb923c" }}>
                  <Plus size={12} className="inline mr-1" />ADD MATCH
                </button>
                <button onClick={() => addSegment("promo")}
                  className="flex-1 py-2 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: "rgba(167,139,250,0.18)", border: "1px solid #a78bfa", color: "#a78bfa" }}>
                  <Plus size={12} className="inline mr-1" />ADD PROMO
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Active feuds */}
        {state.feuds.filter(f => !f.resolvedShowId).length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1" style={{ color: "#fb923c" }}>
              <Flame size={11} /> ACTIVE FEUDS
            </div>
            <div className="space-y-1.5">
              {state.feuds.filter(f => !f.resolvedShowId).map(f => {
                const a = state.roster.find(r => r.id === f.aId);
                const b = state.roster.find(r => r.id === f.bId);
                return (
                  <div key={f.id} className="rounded-lg p-2 text-[11px]"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: a?.color }}>{a?.name}</span>
                      <span className="opacity-60">vs</span>
                      <span style={{ color: b?.color }}>{b?.name}</span>
                      <span className="ml-auto font-mono text-[10px]" style={{ color: "#fb923c" }}>HEAT {Math.round(f.heat)}</span>
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>
                      {f.history[f.history.length - 1]?.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Roster */}
        <section className="rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1" style={{ color: "#67e8f9" }}>
            <Users size={11} /> ROSTER · {state.roster.length}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-auto">
            {state.roster.map(w => (
              <div key={w.id} className="rounded-lg p-2"
                style={{ background: `${w.color}11`, border: `1px solid ${w.color}55` }}>
                <div className="flex items-center justify-between">
                  <Crest spec={{ id: w.id, abbr: w.name.split(" ")[0].slice(0, 3), primary: w.color, secondary: "#fef3c7", mascot: w.mascot }} size={36} />
                  <span className="text-[8px] tracking-widest font-display px-1 py-0.5 rounded" style={{
                    background: w.alignment === "face" ? "rgba(134,239,172,0.25)" :
                              w.alignment === "heel" ? "rgba(248,113,113,0.25)" : "rgba(253,224,71,0.25)",
                    color: w.alignment === "face" ? "#86efac" :
                          w.alignment === "heel" ? "#f87171" : "#fde047",
                  }}>
                    {w.alignment.toUpperCase()}
                  </span>
                </div>
                <div className="font-display text-[12px] mt-1 truncate" style={{ color: "#fef3c7" }}>{w.name}</div>
                <div className="text-[9px] opacity-70 truncate" style={{ color: "rgba(229,231,235,0.7)" }}>{w.gimmick}</div>
                <div className="text-[9px] mt-1 flex gap-2">
                  <span style={{ color: "#fde047" }}>POP {w.popularity}</span>
                  <span style={{ color: "#67e8f9" }}>MOM {Math.round(w.momentum)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Last results compact */}
        {state.schedule.filter(s => s.results).slice(-1).map(s => (
          <section key={s.id} className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>LATEST: {s.label}</div>
              <div className="font-display text-[14px]" style={{ color: "#fde047" }}>{s.overallRating?.toFixed(1)}★</div>
            </div>
            <div className="text-[10px] opacity-80" style={{ color: "#fef3c7" }}>
              Attendance {fmtNum(s.attendance ?? 0)} · ${fmtNum(s.revenue ?? 0)} revenue
            </div>
          </section>
        ))}
      </main>

      {/* Segment editor modal */}
      {editing && (
        <SegmentEditor draft={editing} state={state}
          onCancel={() => setEditing(null)}
          onCommit={commitEdit} />
      )}

      {/* Show report modal */}
      {report && (
        <ShowReport state={state} report={report} onClose={() => setReport(null)} />
      )}
    </div>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────

function KPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-2"
      style={{ background: `${color}14`, border: `1px solid ${color}55` }}>
      <div className="text-[8px] tracking-widest opacity-70" style={{ color }}>{label}</div>
      <div className="font-display text-lg" style={{ color: "#fef3c7" }}>{value}</div>
      {sub && <div className="text-[9px] opacity-60" style={{ color }}>{sub}</div>}
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Segment editor ────────────────────────────────────────────────────

function SegmentEditor({ draft, state, onCancel, onCommit }: {
  draft: SegmentDraft; state: BookerState;
  onCancel: () => void; onCommit: (d: SegmentDraft) => void;
}) {
  const [local, setLocal] = useState<SegmentDraft>(draft);
  const maxParticipants = local.kind === "match" && local.type === "tag" ? 4
    : local.kind === "match" && local.type === "battleroyal" ? 8
    : local.kind === "match" ? 2
    : 2;

  function toggle(id: string) {
    if (local.participants.includes(id)) {
      setLocal({ ...local, participants: local.participants.filter(x => x !== id) });
    } else if (local.participants.length < maxParticipants) {
      setLocal({ ...local, participants: [...local.participants, id] });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className="max-w-lg w-full rounded-2xl p-4 max-h-[85vh] overflow-auto"
        style={{ background: "rgba(15,8,22,0.97)", border: "1.5px solid #f87171" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display tracking-widest text-sm" style={{ color: "#f87171" }}>
            {local.kind === "match" ? "BOOK MATCH" : "BOOK PROMO"}
          </div>
          <button onClick={onCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.10)", color: "#fef3c7" }}>
            <X size={12} />
          </button>
        </div>

        {/* Type picker */}
        <div className="mb-3">
          <div className="text-[9px] tracking-widest mb-1.5 opacity-70" style={{ color: "#fef3c7" }}>
            {local.kind === "match" ? "MATCH TYPE" : "PROMO TYPE"}
          </div>
          <div className="flex flex-wrap gap-1">
            {(local.kind === "match" ? MATCH_TYPES : Object.values(BEATS)).map(t => {
              const id = "id" in t ? t.id : t.kind;
              return (
                <button key={id} onClick={() => setLocal({ ...local, type: id, participants: [] })}
                  className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: local.type === id ? "rgba(248,113,113,0.30)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${local.type === id ? "#f87171" : "rgba(255,255,255,0.15)"}`,
                    color: local.type === id ? "#f87171" : "#fef3c7",
                  }}>
                  {"emoji" in t ? t.emoji : ""} {("name" in t ? t.name : t.label)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional title (matches only) */}
        {local.kind === "match" && (
          <div className="mb-3">
            <div className="text-[9px] tracking-widest mb-1.5 opacity-70" style={{ color: "#fde047" }}>TITLE ON THE LINE (OPTIONAL)</div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setLocal({ ...local, titleId: undefined })}
                className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
                style={{
                  background: !local.titleId ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${!local.titleId ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)"}`,
                  color: "#fef3c7",
                }}>
                NONE
              </button>
              {state.titles.map(t => (
                <button key={t.id} onClick={() => setLocal({ ...local, titleId: t.id })}
                  className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: local.titleId === t.id ? `${t.color}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${local.titleId === t.id ? t.color : "rgba(255,255,255,0.10)"}`,
                    color: local.titleId === t.id ? t.color : "#fef3c7",
                  }}>
                  🏆 {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Participants picker */}
        <div className="mb-3">
          <div className="text-[9px] tracking-widest mb-1.5 flex items-center gap-1 opacity-70" style={{ color: "#fef3c7" }}>
            <Users size={9} /> PARTICIPANTS ({local.participants.length}/{maxParticipants})
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-auto">
            {state.roster.map(w => {
              const selected = local.participants.includes(w.id);
              const idx = local.participants.indexOf(w.id);
              return (
                <button key={w.id} onClick={() => toggle(w.id)}
                  className="rounded-lg p-1.5 text-left flex items-center gap-1.5 pressable touch-target"
                  style={{
                    background: selected ? `${w.color}33` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selected ? w.color : "rgba(255,255,255,0.10)"}`,
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold"
                    style={{
                      background: selected ? w.color : "rgba(255,255,255,0.10)",
                      color: selected ? "#0a0a14" : "#fef3c7",
                    }}>
                    {selected ? (idx + 1) : ""}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-display truncate" style={{ color: "#fef3c7" }}>{w.name}</div>
                    <div className="text-[8px] opacity-70" style={{ color: w.color }}>
                      {w.archetype.toUpperCase()} · POP {w.popularity}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => onCommit(local)}
          disabled={local.participants.length < (local.kind === "match" ? 2 : 1)}
          className="w-full py-2.5 rounded-xl font-display tracking-widest text-[12px] pressable touch-target"
          style={{
            background: local.participants.length < (local.kind === "match" ? 2 : 1) ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #f87171, #dc2626)",
            color: local.participants.length < (local.kind === "match" ? 2 : 1) ? "#9aa6bf" : "#fef3c7",
            opacity: local.participants.length < (local.kind === "match" ? 2 : 1) ? 0.5 : 1,
          }}>
          LOCK IT IN
        </button>
      </div>
    </div>
  );
}

// ── Show report ────────────────────────────────────────────────────────

function ShowReport({ state, report, onClose }: {
  state: BookerState; report: { showId: string; results: SegmentResult[] }; onClose: () => void;
}) {
  const show = state.schedule.find(s => s.id === report.showId);
  const overall = show?.overallRating ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
      <div className="max-w-lg w-full rounded-2xl p-4 max-h-[85vh] overflow-auto"
        style={{
          background: "rgba(15,8,22,0.97)",
          border: `1.5px solid ${overall >= 4 ? "#fde047" : overall >= 3 ? "#86efac" : overall >= 2 ? "#fb923c" : "#f87171"}`,
        }}>
        <div className="text-center mb-3">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f87171" }}>SHOW REPORT</div>
          <div className="font-display text-xl" style={{ color: "#fef3c7" }}>{show?.label}</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={18}
                fill={i < Math.floor(overall) ? "#fde047" : "transparent"}
                style={{ color: "#fde047" }} />
            ))}
            <span className="ml-2 font-display text-lg" style={{ color: "#fde047" }}>{overall.toFixed(1)}</span>
          </div>
          <div className="text-[10px] mt-1" style={{ color: "rgba(229,231,235,0.85)" }}>
            {fmtNum(show?.attendance ?? 0)} attendance · ${fmtNum(show?.revenue ?? 0)}
          </div>
        </div>
        <div className="space-y-1.5">
          {report.results.map((r, i) => (
            <div key={r.draft.id} className="rounded-lg p-2"
              style={{
                background: r.rating >= 4 ? "rgba(253,224,71,0.15)" : r.rating >= 3 ? "rgba(134,239,172,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${r.rating >= 4 ? "#fde047" : r.rating >= 3 ? "#86efac" : "rgba(255,255,255,0.10)"}`,
              }}>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[9px] opacity-70" style={{ color: "#fef3c7" }}>
                  {i === report.results.length - 1 ? "MAIN" : `#${i + 1}`}
                </span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={10}
                      fill={j < r.rating ? "#fde047" : "transparent"}
                      style={{ color: "#fde047" }} />
                  ))}
                </div>
                <span className="ml-auto text-[10px] font-mono" style={{ color: "#fde047" }}>{r.rating.toFixed(1)}</span>
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#fef3c7" }}>{r.story}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full mt-3 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
          style={{ background: "linear-gradient(135deg, #f87171, #dc2626)", color: "#fef3c7" }}>
          BOOK NEXT SHOW
        </button>
      </div>
    </div>
  );
}
