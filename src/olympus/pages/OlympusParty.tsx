// Olympus Party Mode — local multiplayer Greek mythology story game.
// 2-6 players, AI-assigned characters, conversation-only choices, ~10 minutes.
// Fully ephemeral (no Dexie saves) — starts and ends in one session.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, ChevronRight, RefreshCw, Trophy } from "lucide-react";
import {
  startPartyAdventure,
  advancePartyAdventure,
  finalePartyAdventure,
  partyHasApiKey,
  type PartyCast,
  type PartyScene,
  type PartySummary,
} from "../partyAI";

const TOTAL_SCENES = 7; // 6 story scenes + finale
const ACCENT = "#DAA520";
const PLAYER_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#A855F7", "#F97316", "#EC4899"];

// ── Types ───────────────────────────────────────────────────────────────────

type Phase =
  | "setup"
  | "loading"
  | "reveal"
  | "pass"
  | "scene"
  | "generating"
  | "finale";

interface HistoryEntry {
  character: PartyCast;
  choice: string;
  sceneBody: string;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OlympusParty() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerCount, setPlayerCount] = useState(3);
  const [characters, setCharacters] = useState<PartyCast[]>([]);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [currentScene, setCurrentScene] = useState<PartyScene | null>(null);
  const [summary, setSummary] = useState<PartySummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [revealedIdx, setRevealedIdx] = useState(0);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [powerUsed, setPowerUsed] = useState<Set<number>>(new Set());

  const activeCharacter = currentScene
    ? characters[currentScene.activeCharacterIndex]
    : null;
  const activeColor = currentScene
    ? (PLAYER_COLORS[currentScene.activeCharacterIndex] ?? ACCENT)
    : ACCENT;

  // ── Start the game ────────────────────────────────────────────────────────

  const beginGame = useCallback(async () => {
    setPhase("loading");
    const result = await startPartyAdventure(playerCount);
    setCharacters(result.characters);
    setTitle(result.title);
    setHook(result.hook);
    setCurrentScene(result.scene);
    setRevealedIdx(0);
    setHistory([]);
    setPowerUsed(new Set());
    setPhase("reveal");
  }, [playerCount]);

  // Reveal characters one by one
  useEffect(() => {
    if (phase !== "reveal") return;
    if (revealedIdx < characters.length) {
      const t = setTimeout(() => setRevealedIdx(i => i + 1), 700);
      return () => clearTimeout(t);
    }
    // All revealed — short pause then go to first pass screen
    const t = setTimeout(() => setPhase("pass"), 1000);
    return () => clearTimeout(t);
  }, [phase, revealedIdx, characters.length]);

  // ── Player makes a choice ─────────────────────────────────────────────────

  const makeChoice = useCallback(async (choice: string) => {
    if (!currentScene) return;
    setPendingChoice(choice);
    setPhase("generating");

    const entry: HistoryEntry = {
      character: characters[currentScene.activeCharacterIndex],
      choice,
      sceneBody: currentScene.body,
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);

    const nextSceneNumber = currentScene.sceneNumber + 1;

    if (nextSceneNumber > TOTAL_SCENES) {
      // Time for the finale
      const fin = await finalePartyAdventure(characters, newHistory.map(h => ({ character: h.character, choice: h.choice })));
      setSummary(fin);
      setPhase("finale");
    } else {
      const next = await advancePartyAdventure(
        characters,
        newHistory.map(h => ({ character: h.character, choice: h.choice })),
        nextSceneNumber,
        TOTAL_SCENES,
      );
      setCurrentScene(next);
      setPendingChoice(null);
      setPhase("pass");
    }
  }, [currentScene, characters, history]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0b1220 0%, #05080f 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
        color: "#e9e3d2",
      }}
    >
      {/* Back button — always visible except during finale */}
      {phase !== "finale" && (
        <button
          onClick={() => navigate("/olympus")}
          className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
            minWidth: 44, minHeight: 44, touchAction: "manipulation",
          }}
          aria-label="Exit party mode"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      <AnimatePresence mode="wait">

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="text-6xl mb-4">⚔️</div>
            <div className="font-display text-[10px] tracking-[0.4em] mb-1" style={{ color: ACCENT }}>OLYMPUS</div>
            <h1
              className="font-display text-3xl sm:text-4xl tracking-[0.2em] mb-2"
              style={{ color: ACCENT, fontFamily: "'Cinzel', serif" }}
            >
              PARTY MODE
            </h1>
            <p className="text-sm mb-2 max-w-xs" style={{ color: "rgba(233,227,210,0.7)" }}>
              One device. AI-assigned characters. A Greek myth in 10 minutes.
            </p>
            <p className="text-xs mb-8" style={{ color: "rgba(233,227,210,0.45)" }}>
              Pass the phone. Say your line. Shape the legend.
            </p>

            {!partyHasApiKey() && (
              <div className="rounded-xl border px-4 py-3 mb-6 text-xs max-w-xs text-left"
                style={{ borderColor: "rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.08)", color: "rgba(234,179,8,0.85)" }}>
                No API key — using built-in story. Add a key in Settings for AI-generated adventures.
              </div>
            )}

            {/* Player count */}
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.3em] mb-4 flex items-center justify-center gap-2" style={{ color: "rgba(218,165,32,0.7)" }}>
                <Users size={12} /> How many players?
              </div>
              <div className="flex gap-3 justify-center">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className="w-12 h-12 rounded-full font-display text-xl pressable touch-target"
                    style={{
                      background: playerCount === n ? ACCENT : "rgba(255,255,255,0.06)",
                      color: playerCount === n ? "#0F1B2D" : "rgba(233,227,210,0.7)",
                      border: playerCount === n ? "none" : "1px solid rgba(255,255,255,0.10)",
                      minWidth: 44, minHeight: 44, touchAction: "manipulation",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={beginGame}
              className="px-8 py-4 rounded-2xl font-display tracking-[0.2em] text-base pressable touch-target flex items-center gap-2"
              style={{ background: ACCENT, color: "#0F1B2D", minHeight: 52, touchAction: "manipulation" }}
            >
              BEGIN THE LEGEND <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <div className="text-5xl animate-pulse">⚡</div>
            <div className="font-display tracking-[0.3em] text-sm animate-pulse" style={{ color: ACCENT }}>
              THE FATES ARE WEAVING…
            </div>
            <div className="text-xs" style={{ color: "rgba(233,227,210,0.4)" }}>
              Assigning roles and opening the story
            </div>
          </motion.div>
        )}

        {/* ── CHARACTER REVEAL ── */}
        {phase === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center px-4 pt-16 pb-8 max-w-xl mx-auto w-full"
          >
            <div className="font-display text-[10px] tracking-[0.4em] mb-1 text-center" style={{ color: ACCENT }}>
              YOUR QUEST
            </div>
            <div className="font-display text-2xl tracking-wide text-center mb-1" style={{ color: ACCENT, fontFamily: "'Cinzel', serif" }}>
              {title}
            </div>
            <div className="text-sm text-center mb-8" style={{ color: "rgba(233,227,210,0.6)" }}>{hook}</div>

            <div className="text-[10px] uppercase tracking-[0.3em] mb-4 text-center" style={{ color: "rgba(218,165,32,0.6)" }}>
              THE HEROES
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              {characters.map((c, i) => (
                <AnimatePresence key={c.name}>
                  {i < revealedIdx && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="rounded-2xl p-4 text-center"
                      style={{
                        background: `${PLAYER_COLORS[i]}18`,
                        border: `1px solid ${PLAYER_COLORS[i]}44`,
                      }}
                    >
                      <div className="text-4xl mb-1">{c.symbol}</div>
                      <div className="font-display text-base tracking-wide" style={{ color: PLAYER_COLORS[i], fontFamily: "'Cinzel', serif" }}>{c.name}</div>
                      <div className="text-[10px] tracking-widest mb-2" style={{ color: `${PLAYER_COLORS[i]}cc` }}>{c.title.toUpperCase()}</div>
                      <div className="text-[11px] leading-snug" style={{ color: "rgba(233,227,210,0.65)" }}>{c.personality}</div>
                      <div className="mt-2 text-[10px] px-2 py-1 rounded-lg" style={{ background: `${PLAYER_COLORS[i]}15`, color: `${PLAYER_COLORS[i]}cc`, border: `1px solid ${PLAYER_COLORS[i]}22` }}>
                        ✨ {c.power}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PASS THE DEVICE ── */}
        {phase === "pass" && currentScene && activeCharacter && (
          <motion.div
            key="pass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 text-center"
          >
            <div
              className="text-7xl mb-5"
              style={{ filter: `drop-shadow(0 0 20px ${activeColor}88)` }}
            >
              {activeCharacter.symbol}
            </div>

            <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(233,227,210,0.5)" }}>
              Pass the device to
            </div>
            <div
              className="font-display text-4xl tracking-wide mb-1"
              style={{ color: activeColor, fontFamily: "'Cinzel', serif" }}
            >
              {activeCharacter.name}
            </div>
            <div className="text-sm mb-2" style={{ color: `${activeColor}bb` }}>
              {activeCharacter.title}
            </div>

            <div className="text-xs mb-8" style={{ color: "rgba(233,227,210,0.45)" }}>
              Scene {currentScene.sceneNumber} of {TOTAL_SCENES}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPhase("scene")}
              className="px-8 py-4 rounded-2xl font-display tracking-[0.2em] text-sm pressable touch-target"
              style={{ background: activeColor, color: "#0F1B2D", minHeight: 52, touchAction: "manipulation" }}
            >
              I'M READY →
            </motion.button>

            {/* Progress dots */}
            <div className="flex gap-2 mt-8">
              {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i < currentScene.sceneNumber - 1 ? 8 : 6,
                    height: i < currentScene.sceneNumber - 1 ? 8 : 6,
                    background: i < currentScene.sceneNumber - 1
                      ? ACCENT
                      : i === currentScene.sceneNumber - 1
                        ? activeColor
                        : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── SCENE (current player's turn) ── */}
        {phase === "scene" && currentScene && activeCharacter && (
          <motion.div
            key="scene"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col px-4 pt-16 pb-8 max-w-xl mx-auto w-full"
          >
            {/* Character badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl">{activeCharacter.symbol}</div>
              <div>
                <div className="font-display text-sm tracking-wide" style={{ color: activeColor, fontFamily: "'Cinzel', serif" }}>
                  {activeCharacter.name} · {activeCharacter.title}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(233,227,210,0.5)" }}>
                  Scene {currentScene.sceneNumber} of {TOTAL_SCENES} · {currentScene.atmosphere}
                </div>
              </div>
              <div className="flex-1" />
              {/* Power button */}
              {!powerUsed.has(currentScene.activeCharacterIndex) && (
                <button
                  onClick={() => setPowerUsed(s => new Set([...s, currentScene.activeCharacterIndex]))}
                  className="text-[9px] px-2 py-1 rounded-lg pressable touch-target text-center"
                  style={{
                    background: `${activeColor}15`,
                    border: `1px solid ${activeColor}44`,
                    color: activeColor,
                    maxWidth: 120, touchAction: "manipulation",
                  }}
                >
                  ✨ USE POWER
                </button>
              )}
            </div>

            {/* Power activated */}
            <AnimatePresence>
              {powerUsed.has(currentScene.activeCharacterIndex) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl px-4 py-2.5 mb-4 text-xs"
                  style={{ background: `${activeColor}15`, border: `1px solid ${activeColor}33`, color: activeColor }}
                >
                  ✨ POWER ACTIVE — {activeCharacter.power}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scene body */}
            <div
              className="rounded-2xl px-5 py-5 mb-5 text-sm leading-relaxed flex-1 overflow-y-auto"
              style={{
                background: "rgba(218,165,32,0.05)",
                border: "1px solid rgba(218,165,32,0.15)",
                color: "#e9e3d2",
                lineHeight: "1.7",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(218,165,32,0.55)" }}>
                {title}
              </div>
              {currentScene.body}
              <div className="mt-4 pt-3 border-t text-sm font-medium italic" style={{ borderColor: "rgba(218,165,32,0.2)", color: "#DAA520" }}>
                {currentScene.situation}
              </div>
            </div>

            {/* Choices */}
            <div className="space-y-2.5">
              <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(218,165,32,0.55)" }}>
                {activeCharacter.name} says…
              </div>
              {currentScene.choices.map((choice, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => makeChoice(choice)}
                  className="w-full text-left rounded-xl px-4 py-3.5 text-sm pressable touch-target"
                  style={{
                    background: "rgba(218,165,32,0.06)",
                    border: `1px solid ${activeColor}44`,
                    color: "#e9e3d2",
                    minHeight: 52, touchAction: "manipulation",
                    lineHeight: "1.5",
                  }}
                >
                  <span className="font-display text-[10px] tracking-widest mr-2" style={{ color: activeColor }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {choice}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── GENERATING NEXT SCENE ── */}
        {phase === "generating" && activeCharacter && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center"
          >
            <div className="text-4xl animate-pulse" style={{ color: activeColor }}>
              {activeCharacter.symbol}
            </div>
            {pendingChoice && (
              <div className="max-w-xs text-sm italic" style={{ color: "rgba(233,227,210,0.8)" }}>
                {pendingChoice}
              </div>
            )}
            <div className="text-xs uppercase tracking-[0.3em] animate-pulse" style={{ color: "rgba(218,165,32,0.6)" }}>
              The Fates deliberate…
            </div>
          </motion.div>
        )}

        {/* ── FINALE ── */}
        {phase === "finale" && summary && (
          <motion.div
            key="finale"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center px-4 pt-14 pb-8 max-w-xl mx-auto w-full overflow-y-auto"
          >
            {/* Trophy */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-6xl mb-4"
            >
              {summary.outcome === "victory" ? "🏆" : summary.outcome === "twist" ? "🌀" : "⚔️"}
            </motion.div>

            <div className="font-display text-[10px] tracking-[0.4em] mb-1" style={{ color: ACCENT }}>END OF</div>
            <div
              className="font-display text-2xl tracking-wide text-center mb-5"
              style={{ color: ACCENT, fontFamily: "'Cinzel', serif" }}
            >
              {title}
            </div>

            {/* Epilogue */}
            <div
              className="rounded-2xl px-5 py-5 mb-5 text-sm leading-relaxed w-full"
              style={{
                background: "rgba(218,165,32,0.07)",
                border: "1px solid rgba(218,165,32,0.2)",
                color: "#e9e3d2",
                lineHeight: "1.75",
              }}
            >
              {summary.body}
            </div>

            {/* Character moments */}
            {summary.characterMoments?.length > 0 && (
              <div className="w-full mb-6">
                <div className="text-[10px] uppercase tracking-[0.3em] mb-3 text-center" style={{ color: "rgba(218,165,32,0.6)" }}>
                  LEGENDS MADE TODAY
                </div>
                <div className="space-y-2">
                  {summary.characterMoments.map((m, i) => {
                    const char = characters.find(c => c.name === m.name);
                    const color = char ? (PLAYER_COLORS[characters.indexOf(char)] ?? ACCENT) : ACCENT;
                    return (
                      <div
                        key={m.name}
                        className="flex items-start gap-3 rounded-xl px-4 py-3"
                        style={{ background: `${color}10`, border: `1px solid ${color}22` }}
                      >
                        <span className="text-xl">{char?.symbol ?? "⚔️"}</span>
                        <div>
                          <div className="font-display text-xs tracking-widest" style={{ color }}>{m.name}</div>
                          <div className="text-[12px] mt-0.5" style={{ color: "rgba(233,227,210,0.75)" }}>{m.moment}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={beginGame}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-display tracking-widest text-sm pressable touch-target"
                style={{ background: "rgba(218,165,32,0.12)", border: "1px solid rgba(218,165,32,0.35)", color: ACCENT, minHeight: 52, touchAction: "manipulation" }}
              >
                <RefreshCw size={14} /> PLAY AGAIN
              </button>
              <button
                onClick={() => navigate("/olympus")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-display tracking-widest text-sm pressable touch-target"
                style={{ background: ACCENT, color: "#0F1B2D", minHeight: 52, touchAction: "manipulation" }}
              >
                <Trophy size={14} /> OLYMPUS HUB
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
