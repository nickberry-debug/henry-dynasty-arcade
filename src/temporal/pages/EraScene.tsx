// Temporal Order — era investigation scene. The player picks NPCs
// to interview, locations to examine. NPC dialogue is AI-generated;
// clue discoveries auto-populate the journal. When ready, the player
// names a culprit and chooses a resolution.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, BookOpen, X, Send, Loader2, Award, Crown, MapPin } from "lucide-react";
import { TemporalShell, TEMPORAL_GOLD } from "../components/TemporalShell";
import { useTemporal } from "../store";
import { getEra, getMission } from "../data/eras";
import { generateNpcLine } from "../ai";
import { npcPalette, portraitDataUrl, characterDataUrl } from "../engine/sprites";
import { speak } from "../../wordplay/voice";
import { useModal, dialogProps } from "../../a11y";
import type { NpcDialogueLine } from "../types";

export default function EraScene() {
  const { slotId, eraId } = useParams<{ slotId: string; eraId: string }>();
  const navigate = useNavigate();
  const saves = useTemporal(s => s.saves);
  const updateActive = useTemporal(s => s.updateActive);
  const pushNote = useTemporal(s => s.pushNote);
  const load = useTemporal(s => s.load);

  useEffect(() => { load(); }, []);

  const save = saves.find(s => s.id === slotId);
  const era = eraId ? getEra(eraId) : undefined;
  const mission = save?.activeMission ? getMission(save.activeMission.templateId) : undefined;
  const variation = save?.activeMission?.variation;

  const [activeNpc, setActiveNpc] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showResolution, setShowResolution] = useState(false);

  if (!save || !era || !mission || !variation) {
    return <TemporalShell title="Era" backTo={`/temporal/play/${slotId}`}><div className="text-center text-amber-100/85 py-12">No active mission.</div></TemporalShell>;
  }

  const active = save.activeMission!;

  // List of NPCs in this era: mission figures + suspects + perpetrator.
  const npcSet = new Set<string>([
    ...mission.figures,
    ...variation.suspects.map(s => s.name),
    variation.perpetrator.name,
  ]);
  const npcs = Array.from(npcSet);

  // Locations to examine — derived from clue locations + perpetrator's hideout.
  const locationSet = new Set<string>(variation.clues.map(c => c.location));
  const locations = Array.from(locationSet);

  const examineLocation = (loc: string) => {
    // Find clues here that haven't been found yet.
    const undiscovered = variation.clues.filter(c => c.location === loc && !active.cluesFound.includes(c.id));
    if (undiscovered.length === 0) {
      pushNote(save.id, `Examined ${loc} again — nothing new.`);
      return;
    }
    // Reveal one clue.
    const found = undiscovered[0];
    updateActive(save.id, { cluesFound: [...active.cluesFound, found.id] });
    pushNote(save.id, `[Clue ${found.id}] ${found.description} (${loc})`);
  };

  return (
    <TemporalShell
      title={era.name}
      subtitle={`${era.year} · ${mission.title}`}
      backTo={`/temporal/play/${save.id}`}
      flag={era.flag}
      right={
        <button onClick={() => setShowJournal(true)}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded font-display tracking-widest text-[10px] pressable touch-target"
          style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${TEMPORAL_GOLD}66`, color: "#fef3c7", minHeight: 44 }}>
          <BookOpen size={12} /> JOURNAL
          <span className="ml-1 px-1.5 py-0.5 rounded" style={{ background: TEMPORAL_GOLD, color: "#1a1308" }}>
            {active.cluesFound.length}/{variation.clues.length}
          </span>
        </button>
      }>
      {/* Scene backdrop */}
      <EraBackdrop era={era} />

      {/* NPCs row */}
      <section className="mt-3">
        <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>
          PEOPLE OF {era.year.toUpperCase()}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {npcs.map(name => {
            const spoken = active.spokenWith.includes(name);
            const sprite = characterDataUrl(npcPalette(name));
            return (
              <button key={name} onClick={() => setActiveNpc(name)}
                className="rounded-lg p-2.5 flex items-center gap-2 pressable touch-target text-left"
                style={{
                  background: spoken ? `${era.palette.accent}22` : "rgba(0,0,0,0.45)",
                  border: `1px solid ${spoken ? era.palette.accent : "rgba(255,255,255,0.08)"}`,
                  minHeight: 76,
                }}>
                <img src={sprite} alt="" style={{ width: 32, height: 48, imageRendering: "pixelated" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-display text-amber-50 truncate">{name}</div>
                  <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: era.palette.accent }}>
                    <MessageCircle size={9} /> {spoken ? "Spoken" : "Approach"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Locations */}
      <section className="mt-4">
        <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: TEMPORAL_GOLD }}>LOCATIONS</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {locations.map(loc => {
            const cluesHere = variation.clues.filter(c => c.location === loc);
            const foundHere = cluesHere.filter(c => active.cluesFound.includes(c.id)).length;
            const fullyExplored = foundHere >= cluesHere.length;
            return (
              <button key={loc} onClick={() => examineLocation(loc)}
                disabled={fullyExplored}
                className="rounded-lg p-2.5 flex items-center gap-2 pressable touch-target text-left disabled:opacity-50"
                style={{
                  background: fullyExplored ? "rgba(134,239,172,0.08)" : "rgba(0,0,0,0.45)",
                  border: `1px solid ${fullyExplored ? "rgba(134,239,172,0.4)" : "rgba(255,255,255,0.08)"}`,
                  minHeight: 56,
                }}>
                <MapPin size={14} style={{ color: era.palette.accent }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-display text-amber-50 truncate">{loc}</div>
                  <div className="text-[10px] text-amber-100/80 flex items-center gap-1 mt-0.5">
                    <Search size={9} /> {foundHere}/{cluesHere.length} found
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Resolve button */}
      <button onClick={() => setShowResolution(true)}
        disabled={active.cluesFound.length === 0}
        className="w-full mt-4 px-4 py-3 rounded flex items-center justify-center gap-2 font-display tracking-[0.3em] text-sm pressable touch-target disabled:opacity-40"
        style={{ background: TEMPORAL_GOLD, color: "#1a1308", minHeight: 56 }}>
        <Award size={14} /> RESOLVE THE ANOMALY
      </button>

      <div className="text-[10px] text-center mt-1 text-amber-100/80">
        {active.cluesFound.length === 0 ? "Find at least one clue to make an accusation" : "You can resolve at any time — more clues means a smarter resolution"}
      </div>

      {/* Dialogue overlay */}
      <AnimatePresence>
        {activeNpc && (
          <DialogueOverlay
            npcName={activeNpc}
            era={era}
            missionContext={`Title: ${mission.title}. Anomaly: ${variation.anomaly}. Suspects: ${variation.suspects.map(s => s.name).join(", ")}.`}
            isCulprit={variation.perpetrator.name === activeNpc}
            onClose={() => setActiveNpc(null)}
            onConverse={(line) => {
              if (!active.spokenWith.includes(activeNpc!)) {
                updateActive(save.id, { spokenWith: [...active.spokenWith, activeNpc!] });
              }
              if (line) pushNote(save.id, `${activeNpc} said: "${line.slice(0, 120)}${line.length > 120 ? "…" : ""}"`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Journal overlay */}
      <AnimatePresence>
        {showJournal && (
          <JournalOverlay onClose={() => setShowJournal(false)} />
        )}
      </AnimatePresence>

      {/* Resolution overlay */}
      <AnimatePresence>
        {showResolution && (
          <ResolutionOverlay
            onClose={() => setShowResolution(false)}
            onPicked={(resolutionId, suspectName) => {
              navigate(`/temporal/play/${save.id}/mission/${mission.id}/resolve?r=${resolutionId}&s=${encodeURIComponent(suspectName)}`);
            }}
          />
        )}
      </AnimatePresence>
    </TemporalShell>
  );
}

function EraBackdrop({ era }: { era: ReturnType<typeof getEra> }) {
  if (!era) return null;
  // Pixel art backdrop — sky/floor bands with simple landmarks per era.
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${era.palette.accent}44` }}>
      <svg viewBox="0 0 240 90" width="100%" style={{ display: "block", imageRendering: "pixelated", aspectRatio: "240/90" }}>
        {/* Sky */}
        <rect x="0" y="0" width="240" height="30" fill={era.palette.sky} shapeRendering="crispEdges" />
        {/* Distant silhouette */}
        <rect x="0" y="20" width="240" height="10" fill={era.palette.wall} opacity="0.6" shapeRendering="crispEdges" />
        {/* Floor */}
        <rect x="0" y="30" width="240" height="60" fill={era.palette.floor} shapeRendering="crispEdges" />
        <rect x="0" y="34" width="240" height="2" fill={era.palette.floorAlt} shapeRendering="crispEdges" />
        {/* Floor tiles */}
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={i * 15} y={30} width="1" height="60" fill={era.palette.floorAlt} opacity="0.5" shapeRendering="crispEdges" />
        ))}
        {/* Era landmarks */}
        {era.id === "egypt" && (
          <>
            <polygon points="80,30 110,5 140,30" fill={era.palette.wall} stroke={era.palette.accent} strokeWidth="0.5" />
            <polygon points="130,30 160,12 190,30" fill={era.palette.wall} stroke={era.palette.accent} strokeWidth="0.5" />
            <circle cx="50" cy="14" r="6" fill={era.palette.accent} />
          </>
        )}
        {era.id === "greece" && (
          <>
            {[60, 80, 100, 120, 140].map(x => (
              <rect key={x} x={x} y={10} width="6" height="20" fill={era.palette.wall} stroke={era.palette.accent} strokeWidth="0.4" shapeRendering="crispEdges" />
            ))}
            <rect x="58" y="8" width="90" height="3" fill={era.palette.wall} shapeRendering="crispEdges" />
          </>
        )}
        {era.id === "viking" && (
          <>
            {[40, 90, 150, 200].map((x, i) => (
              <g key={i}>
                <rect x={x} y="14" width="22" height="16" fill={era.palette.wall} shapeRendering="crispEdges" />
                <polygon points={`${x - 2},14 ${x + 11},6 ${x + 24},14`} fill={era.palette.accent} stroke="#000" strokeWidth="0.4" />
              </g>
            ))}
          </>
        )}
        {era.id === "renaissance" && (
          <>
            {[30, 70, 110, 150, 190].map(x => (
              <g key={x}>
                <rect x={x} y="10" width="22" height="20" fill={era.palette.wall} shapeRendering="crispEdges" />
                <rect x={x + 5} y="14" width="4" height="4" fill={era.palette.sky} />
                <rect x={x + 13} y="14" width="4" height="4" fill={era.palette.sky} />
                <polygon points={`${x - 1},10 ${x + 11},4 ${x + 23},10`} fill={era.palette.accent} />
              </g>
            ))}
          </>
        )}
        {era.id === "revolution" && (
          <>
            <rect x="40" y="10" width="50" height="20" fill={era.palette.wall} shapeRendering="crispEdges" />
            <rect x="100" y="14" width="40" height="16" fill={era.palette.wall} shapeRendering="crispEdges" />
            <rect x="150" y="8" width="60" height="22" fill={era.palette.wall} shapeRendering="crispEdges" />
            <polygon points="170,8 180,2 190,8" fill={era.palette.accent} />
            <rect x="178" y="2" width="1" height="6" fill="#fff" />
          </>
        )}
        {era.id === "hollywood" && (
          <>
            <rect x="20" y="14" width="80" height="16" fill={era.palette.wall} shapeRendering="crispEdges" />
            <rect x="120" y="8" width="40" height="22" fill={era.palette.wall} shapeRendering="crispEdges" />
            <rect x="180" y="14" width="40" height="16" fill={era.palette.wall} shapeRendering="crispEdges" />
            {[30, 36, 42, 48, 54, 60, 66, 72, 78, 84].map(x => (
              <rect key={x} x={x} y={4} width="2" height="6" fill={era.palette.accent} shapeRendering="crispEdges" />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Dialogue Overlay ───────────────────────────────────────

function DialogueOverlay({ npcName, era, missionContext, isCulprit, onClose, onConverse }: {
  npcName: string;
  era: NonNullable<ReturnType<typeof getEra>>;
  missionContext: string;
  isCulprit: boolean;
  onClose: () => void;
  onConverse: (npcLine: string | null) => void;
}) {
  const [lines, setLines] = useState<NpcDialogueLine[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const portrait = portraitDataUrl(npcPalette(npcName));
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });

  // First approach line — fire on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setThinking(true);
      const opener = await generateNpcLine({
        npcName, era, playerInput: "(approaches respectfully)",
        missionContext, recentLines: [], isCulprit,
      });
      if (cancelled) return;
      setLines([{ speaker: npcName, text: opener }]);
      onConverse(opener);
      speak(opener);
      setThinking(false);
    })();
    return () => { cancelled = true; };
  }, [npcName]);

  const send = async () => {
    if (!input.trim() || thinking) return;
    const userLine: NpcDialogueLine = { speaker: "you", text: input.trim() };
    setLines(prev => [...prev, userLine]);
    setInput("");
    setThinking(true);
    const npcLine = await generateNpcLine({
      npcName, era, playerInput: userLine.text,
      missionContext, recentLines: [...lines, userLine], isCulprit,
    });
    setLines(prev => [...prev, { speaker: npcName, text: npcLine }]);
    onConverse(npcLine);
    speak(npcLine);
    setThinking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.7)", fontFamily: "ui-monospace, monospace" }}
      onClick={onClose}>
      <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }}
        ref={dialogRef}
        {...dialogProps("dialogue-title")}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl rounded-lg flex flex-col"
        style={{ background: "linear-gradient(180deg, #2a1a08, #0a0604)", border: `2px solid ${TEMPORAL_GOLD}`, maxHeight: "90vh" }}>
        <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: `${TEMPORAL_GOLD}55` }}>
          <img src={portrait} alt="" aria-hidden="true" style={{ width: 48, height: 72, imageRendering: "pixelated", background: era.palette.wall, padding: 2, border: `2px solid ${TEMPORAL_GOLD}` }} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em]" style={{ color: TEMPORAL_GOLD }}>SPEAKING WITH</div>
            <h2 id="dialogue-title" className="font-display text-lg text-amber-50 truncate">{npcName}</h2>
          </div>
          <button onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${TEMPORAL_GOLD}55`, color: "#fef3c7", minWidth: 44, minHeight: 44 }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" aria-live="polite" aria-label="Conversation log">
          {lines.map((l, i) => (
            <div key={i} className={`rounded p-2.5 ${l.speaker === "you" ? "ml-8" : "mr-8"}`}
              style={{
                background: l.speaker === "you" ? "rgba(245,197,24,0.12)" : "rgba(0,0,0,0.45)",
                border: `1px solid ${l.speaker === "you" ? `${TEMPORAL_GOLD}55` : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="text-[9px] tracking-[0.3em] mb-0.5" style={{ color: l.speaker === "you" ? TEMPORAL_GOLD : "#e2e8f0" }}>
                {l.speaker === "you" ? "YOU" : l.speaker.toUpperCase()}
              </div>
              <div className="text-[13px] text-amber-50 leading-relaxed">{l.text}</div>
            </div>
          ))}
          {thinking && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 text-amber-100/80 text-[11px] italic">
              <Loader2 size={11} className="animate-spin" aria-hidden="true" /> {npcName} considers their words…
            </div>
          )}
        </div>

        <div className="p-2 flex gap-2 border-t" style={{ borderColor: `${TEMPORAL_GOLD}33` }}>
          <input value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="What do you say?"
            aria-label={`Your reply to ${npcName}`}
            disabled={thinking}
            className="flex-1 px-3 py-2.5 rounded bg-black/50 text-amber-50 outline-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
            style={{ border: `1px solid ${TEMPORAL_GOLD}44`, fontFamily: "ui-monospace, monospace" }} />
          <button onClick={send} disabled={thinking || !input.trim()}
            className="px-3 rounded font-display tracking-widest text-xs pressable touch-target disabled:opacity-40"
            style={{ background: TEMPORAL_GOLD, color: "#1a1308", minWidth: 48, minHeight: 44 }}>
            <Send size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Journal Overlay ────────────────────────────────────────

function JournalOverlay({ onClose }: { onClose: () => void }) {
  const saves = useTemporal(s => s.saves);
  const activeId = useTemporal(s => s.activeId);
  const save = saves.find(s => s.id === activeId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });
  if (!save?.activeMission) return null;
  const a = save.activeMission;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.7)", fontFamily: "ui-monospace, monospace" }}
      onClick={onClose}>
      <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }}
        ref={dialogRef}
        {...dialogProps("journal-title")}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-lg flex flex-col"
        style={{ background: "linear-gradient(180deg, #1f1808, #0a0604)", border: `2px solid ${TEMPORAL_GOLD}`, maxHeight: "85vh" }}>
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: `${TEMPORAL_GOLD}55` }}>
          <div>
            <div className="text-[10px] tracking-[0.3em]" style={{ color: TEMPORAL_GOLD }}>FIELD JOURNAL</div>
            <h2 id="journal-title" className="font-display text-amber-50 text-base">{getMission(a.templateId)?.title}</h2>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${TEMPORAL_GOLD}55`, color: "#fef3c7", minWidth: 44, minHeight: 44 }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Found clues */}
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: TEMPORAL_GOLD }}>CLUES — {a.cluesFound.length} of {a.variation.clues.length}</div>
            {a.cluesFound.length === 0 && <div className="text-[12px] text-amber-100/80 italic">No clues yet. Investigate locations.</div>}
            {a.variation.clues.filter(c => a.cluesFound.includes(c.id)).map(c => (
              <div key={c.id} className="rounded p-2.5 mb-1.5" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[11px] text-amber-50">{c.description}</div>
                <div className="text-[10px] text-amber-100/80 mt-0.5">at {c.location}</div>
              </div>
            ))}
          </section>
          {/* Suspects */}
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: TEMPORAL_GOLD }}>SUSPECTS</div>
            {a.variation.suspects.map(s => (
              <div key={s.name} className="rounded p-2.5 mb-1.5" style={{ background: a.spokenWith.includes(s.name) ? "rgba(245,197,24,0.06)" : "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[12px] text-amber-50 font-display">{s.name}</div>
                <div className="text-[10px] text-amber-100/85 mt-0.5">{s.motive}</div>
                {a.spokenWith.includes(s.name) && <div className="text-[9px] mt-0.5" style={{ color: TEMPORAL_GOLD }}>SPOKEN WITH</div>}
              </div>
            ))}
          </section>
          {/* Notes */}
          {a.notes.length > 0 && (
            <section>
              <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: TEMPORAL_GOLD }}>NOTES</div>
              {a.notes.slice(-12).reverse().map(n => (
                <div key={n.id} className="text-[11px] text-amber-100/80 leading-snug mb-1">· {n.text}</div>
              ))}
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Resolution overlay ────────────────────────────────────

function ResolutionOverlay({ onClose, onPicked }: { onClose: () => void; onPicked: (resolutionId: number, suspectName: string) => void }) {
  const saves = useTemporal(s => s.saves);
  const activeId = useTemporal(s => s.activeId);
  const save = saves.find(s => s.id === activeId);
  const [suspectName, setSuspectName] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });
  if (!save?.activeMission) return null;
  const v = save.activeMission.variation;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.7)", fontFamily: "ui-monospace, monospace" }}
      onClick={onClose}>
      <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }}
        ref={dialogRef}
        {...dialogProps("resolution-title")}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-lg flex flex-col"
        style={{ background: "linear-gradient(180deg, #1a1308, #0a0604)", border: `2px solid ${TEMPORAL_GOLD}`, maxHeight: "90vh" }}>
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: `${TEMPORAL_GOLD}55` }}>
          <div className="flex items-center gap-2">
            <Crown size={14} style={{ color: TEMPORAL_GOLD }} aria-hidden="true" />
            <h2 id="resolution-title" className="font-display text-amber-50 text-base">Make Your Case</h2>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${TEMPORAL_GOLD}55`, color: "#fef3c7", minWidth: 44, minHeight: 44 }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <section>
            <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: TEMPORAL_GOLD }}>NAME THE CULPRIT</div>
            <div className="grid grid-cols-2 gap-1.5">
              {v.suspects.map(s => (
                <button key={s.name} onClick={() => setSuspectName(s.name)}
                  className="rounded p-2 text-left pressable touch-target"
                  style={{
                    background: suspectName === s.name ? `${TEMPORAL_GOLD}33` : "rgba(0,0,0,0.45)",
                    border: `1px solid ${suspectName === s.name ? TEMPORAL_GOLD : "rgba(255,255,255,0.08)"}`,
                    minHeight: 44,
                    color: "#fef3c7",
                  }}>
                  <div className="text-[12px] font-display">{s.name}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: TEMPORAL_GOLD }}>CHOOSE A RESOLUTION</div>
            {v.resolutions.map(r => (
              <button key={r.id}
                disabled={!suspectName}
                onClick={() => onPicked(r.id, suspectName!)}
                className="w-full rounded p-3 text-left mb-1.5 pressable touch-target disabled:opacity-40"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minHeight: 64,
                }}>
                <div className="text-[12px] text-amber-50 leading-snug">{r.description}</div>
                <div className="text-[10px] text-amber-100/80 mt-1">
                  Likely: {r.consequence} · Integrity {r.integrityDelta >= 0 ? "+" : ""}{r.integrityDelta}
                </div>
              </button>
            ))}
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
