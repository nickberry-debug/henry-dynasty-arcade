// Story Chain — collaborative AI storytelling. Player and AI alternate
// adding sentences to a growing story. Player sections in purple, AI in gold.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, RefreshCw } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { callAI } from "../ai";
import { useVoiceInput, speak } from "../voice";

const ACCENT = "#C084FC";
const GRADIENT = "linear-gradient(135deg, rgba(170,100,250,0.30), rgba(20,8,40,0.95))";
const AI_COLOR = "#FBBF24";
const PLAYER_COLOR = "#C084FC";

type Author = "ai" | "player";

interface Segment {
  id: string;
  author: Author;
  text: string;
}

export default function StoryChain() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "player" | "ai">("idle");
  const vi = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as story grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments]);

  // Process voice transcript when it arrives
  useEffect(() => {
    if (!vi.transcript) return;
    const text = vi.transcript.trim();
    vi.reset();
    if (!text) return;
    addPlayerSegment(text);
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewStory = async () => {
    setSegments([]);
    setPhase("ai");
    setLoading(true);
    const ai = await callAI({
      system: "You write fun, engaging opening sentences for collaborative stories for kids ages 7-13. Write 1-2 vivid sentences that beg to be continued. Be imaginative and leave room for the player to add something.",
      user: "Write an opening 1-2 sentences for a collaborative story. Just the story text, no intro.",
      maxTokens: 120,
      model: "fast",
    });
    const text = ai || "Deep in the forest, a strange purple light flickered between the ancient trees — and it was getting closer.";
    const seg: Segment = { id: `ai-${Date.now()}`, author: "ai", text };
    setSegments([seg]);
    speak(text);
    setPhase("player");
    setLoading(false);
  };

  const addPlayerSegment = async (text: string) => {
    const playerSeg: Segment = { id: `player-${Date.now()}`, author: "player", text };
    setSegments(prev => [...prev, playerSeg]);
    setPhase("ai");
    setLoading(true);

    const storyText = [...segments, playerSeg].map(s => s.text).join(" ");

    const ai = await callAI({
      system: "You are helping a kid build a collaborative story. Continue the story with 1-2 sentences that naturally follow what was just said. Match the tone and energy. Leave it open so the player can add more. Just the story text, no commentary.",
      user: `Story so far: "${storyText}"\n\nContinue with 1-2 sentences.`,
      maxTokens: 120,
      model: "fast",
    });
    const aiText = ai || "Suddenly, something unexpected happened that changed everything.";
    const aiSeg: Segment = { id: `ai-${Date.now()}`, author: "ai", text: aiText };
    setSegments(prev => [...prev, aiSeg]);
    speak(aiText);
    setPhase("player");
    setLoading(false);
  };

  const handleMicButton = () => {
    if (vi.listening) {
      vi.stop();
    } else {
      vi.start();
    }
  };

  const isPlayerTurn = phase === "player" && !loading;

  return (
    <WordplayShell title="Story Chain" emoji="🔗" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* Legend */}
        <div className="flex gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: AI_COLOR }} />
            <span style={{ color: AI_COLOR }}>AI</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAYER_COLOR }} />
            <span style={{ color: PLAYER_COLOR }}>You</span>
          </span>
        </div>

        {/* Story display */}
        <div
          className="rounded-2xl p-4 min-h-[160px] space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {segments.length === 0 && !loading && (
            <div className="text-center text-sm text-white/40 italic py-6">
              Tap "Start Story" to begin a new adventure!
            </div>
          )}
          <AnimatePresence initial={false}>
            {segments.map(seg => (
              <motion.div
                key={seg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl px-3 py-2.5 text-sm leading-relaxed"
                style={{
                  background: seg.author === "ai" ? `${AI_COLOR}18` : `${PLAYER_COLOR}18`,
                  border: `1px solid ${seg.author === "ai" ? AI_COLOR + "44" : PLAYER_COLOR + "44"}`,
                  color: seg.author === "ai" ? AI_COLOR : PLAYER_COLOR,
                }}
              >
                <div className="text-[9px] tracking-[0.3em] font-display mb-1 opacity-70">
                  {seg.author === "ai" ? "AI" : "YOU"}
                </div>
                {seg.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <span className="text-[11px]" style={{ color: AI_COLOR }}>AI is writing</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: AI_COLOR }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </span>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Mic error */}
        {vi.error && <MicErrorBanner error={vi.error} onRetry={vi.start} />}

        {/* Controls */}
        {phase === "idle" ? (
          <button
            onClick={startNewStory}
            disabled={loading}
            className="w-full rounded-2xl font-display tracking-widest text-sm disabled:opacity-50"
            style={{ background: ACCENT, color: "#0a0a0a", minHeight: 60, touchAction: "manipulation" }}
          >
            START STORY
          </button>
        ) : (
          <div className="space-y-3">
            {/* Mic button */}
            {vi.supported && (
              <motion.button
                onClick={handleMicButton}
                disabled={!isPlayerTurn}
                animate={vi.listening ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: vi.listening ? Infinity : 0 }}
                className="w-full rounded-2xl font-display tracking-widest text-sm inline-flex items-center justify-center gap-2.5 disabled:opacity-40"
                style={{
                  background: vi.listening ? `${PLAYER_COLOR}` : isPlayerTurn ? `${PLAYER_COLOR}33` : "rgba(255,255,255,0.05)",
                  border: `2px solid ${vi.listening ? PLAYER_COLOR : isPlayerTurn ? PLAYER_COLOR + "88" : "rgba(255,255,255,0.1)"}`,
                  color: vi.listening ? "#0a0a14" : PLAYER_COLOR,
                  minHeight: 60,
                  touchAction: "manipulation",
                }}
              >
                {vi.listening ? <MicOff size={18} /> : <Mic size={18} />}
                {vi.listening ? "TAP TO STOP" : isPlayerTurn ? "SPEAK YOUR PART" : "AI IS WRITING…"}
              </motion.button>
            )}

            {/* Status hint */}
            <div className="text-center text-[11px] text-white/40">
              {vi.listening && "Listening — tap again when done speaking"}
              {!vi.listening && isPlayerTurn && "Your turn — add to the story!"}
              {!vi.listening && phase === "ai" && !loading && "Waiting…"}
            </div>

            {/* New story */}
            <button
              onClick={startNewStory}
              disabled={loading}
              className="w-full rounded-xl text-xs font-display tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 44, touchAction: "manipulation" }}
            >
              <RefreshCw size={13} /> NEW STORY
            </button>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
