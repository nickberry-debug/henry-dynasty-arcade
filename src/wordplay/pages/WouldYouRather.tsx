// Would You Rather — two side-by-side options. Tap, see AI reaction.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Volume2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON } from "../ai";
import { WYR_PAIRS, type WYRPair } from "../templates";

const ACCENT = "#FB923C";
const GRADIENT = "linear-gradient(135deg, rgba(250,150,60,0.30), rgba(40,20,8,0.95))";
const CATS = ["Funny", "Hard Choices", "Superhero", "Food", "Video Game", "Sports", "Travel", "Mythology", "Magical", "Space"];

interface Pair extends WYRPair { popA?: number; popB?: number }

export default function WouldYouRather() {
  const [category, setCategory] = useState("Funny");
  const [pair, setPair] = useState<Pair | null>(null);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-read each new pair as soon as it appears. Once the user picks,
  // auto-read the reaction.
  useEffect(() => {
    if (pair && picked == null) speak(`Would you rather... ${pair.a}. Or... ${pair.b}.`);
  }, [pair?.a, pair?.b]);
  useEffect(() => {
    if (reaction) speak(reaction);
  }, [reaction]);

  const next = async () => {
    setLoading(true);
    setPicked(null);
    setReaction(null);
    const ai = await callAI({
      system: "Generate a Would You Rather pair. Roughly balanced. Kid-friendly (8-13). Sometimes funny, sometimes thoughtful. Output ONLY JSON.",
      user: `Category: ${category}. Return JSON: { "option_a": "...", "option_b": "...", "popularity_a": 60, "popularity_b": 40 }`,
      maxTokens: 220,
    });
    const parsed = parseJSON<{ option_a: string; option_b: string; popularity_a: number; popularity_b: number }>(ai);
    if (parsed?.option_a && parsed.option_b) {
      setPair({ a: parsed.option_a, b: parsed.option_b, category, popA: Number(parsed.popularity_a) || 50, popB: Number(parsed.popularity_b) || 50 });
    } else {
      const pool = WYR_PAIRS.filter(p => p.category === category);
      const tpl = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? WYR_PAIRS[Math.floor(Math.random() * WYR_PAIRS.length)];
      setPair({ ...tpl, popA: 50 + Math.floor(Math.random() * 30) - 15, popB: 0 });
    }
    setLoading(false);
  };

  const choose = async (side: "a" | "b") => {
    if (!pair) return;
    setPicked(side);
    const choice = side === "a" ? pair.a : pair.b;
    const ai = await callAI({
      system: "React to a Would You Rather choice in 1-2 punchy, friendly sentences (under 25 words). Affirm the pick, find the bright side. Output plain text only.",
      user: `User chose: "${choice}". Other option was: "${side === "a" ? pair.b : pair.a}".`,
      maxTokens: 100,
    });
    setReaction(ai || (side === "a" ? "Bold choice. Most kids would go the same way." : "A classic call. Smart move."));
  };

  return (
    <WordplayShell title="Would You Rather" emoji="🤔" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5">
            {CATS.map(c => (
              <button key={c} onClick={() => setCategory(c)} className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target" style={{
                background: category === c ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                border: `1px solid ${category === c ? ACCENT + "88" : "rgba(255,255,255,0.07)"}`,
                color: category === c ? ACCENT : "#fff",
                minHeight: 36, touchAction: "manipulation",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {!pair ? (
          <button onClick={next} disabled={loading} className="w-full px-4 py-6 rounded-2xl font-display tracking-widest text-base pressable touch-target disabled:opacity-50" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 80, touchAction: "manipulation" }}>
            {loading ? "THINKING…" : "GIVE ME A CHOICE"}
          </button>
        ) : (
          <>
            <div className="text-center text-[10px] tracking-[0.3em] font-display text-ink-200">WOULD YOU RATHER…</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { side: "a" as const, text: pair.a, pop: pair.popA ?? 50 },
                { side: "b" as const, text: pair.b, pop: pair.popB ?? 50 },
              ]).map((opt, i) => (
                <button
                  key={opt.side}
                  onClick={() => choose(opt.side)}
                  disabled={picked != null}
                  className="rounded-2xl p-5 text-left pressable touch-target disabled:opacity-60"
                  style={{
                    background: picked === opt.side ? `${ACCENT}33` : picked != null ? "rgba(255,255,255,0.03)" : `${ACCENT}1a`,
                    border: `1px solid ${picked === opt.side ? ACCENT + "88" : ACCENT + "44"}`,
                    minHeight: 120, touchAction: "manipulation",
                  }}
                >
                  <div className="text-[10px] tracking-widest font-display mb-2" style={{ color: ACCENT }}>OPTION {i === 0 ? "A" : "B"}</div>
                  <div className="text-base leading-snug text-white">{opt.text}</div>
                  {picked != null && opt.pop > 0 && <div className="text-[10px] text-ink-300 mt-2">~{opt.pop}% of players</div>}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {reaction && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl p-4 italic text-sm" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}55` }}>
                  💬 {reaction}
                </motion.div>
              )}
            </AnimatePresence>

            {picked != null && (
              <button onClick={next} className="w-full px-4 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target inline-flex items-center justify-center gap-2" style={{ background: ACCENT, color: "#0a0a0a", minHeight: 48, touchAction: "manipulation" }}>
                <Repeat size={14} /> ANOTHER CHOICE
              </button>
            )}
          </>
        )}
      </div>
    </WordplayShell>
  );
}
