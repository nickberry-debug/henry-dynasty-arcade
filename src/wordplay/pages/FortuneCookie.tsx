// Fortune Cookie — tap, crack open, read.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Heart } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { speak } from "../voice";
import { callAI, parseJSON, useHistory } from "../ai";
import { FORTUNES } from "../templates";

const ACCENT = "#FCA5A5";
const GRADIENT = "linear-gradient(135deg, rgba(220,80,80,0.30), rgba(40,10,10,0.95))";
const CATS = ["General", "Action", "Confidence", "Cryptic", "Silly", "Inspirational", "Gamer", "Sports"];

interface Entry { id: string; fortune: string; numbers: number[]; ts: number; category: string }

export default function FortuneCookie() {
  const [category, setCategory] = useState("General");
  const [cracking, setCracking] = useState(false);
  const [current, setCurrent] = useState<Entry | null>(null);
  const [saved, addSaved] = useHistory<Entry>("fortunes_saved", 100);

  const crack = async () => {
    setCracking(true);
    setCurrent(null);
    await new Promise(r => setTimeout(r, 800));
    const ai = await callAI({
      system: "You write fortune cookie messages — 10-30 words max, pithy, memorable, age-appropriate. Output ONLY JSON.",
      user: `Style: ${category}. Return JSON: { "fortune": "...", "lucky_numbers": [5 numbers 1-99] }`,
      maxTokens: 200,
    });
    const parsed = parseJSON<{ fortune: string; lucky_numbers: number[] }>(ai);
    let text: string;
    let nums: number[];
    if (parsed?.fortune) {
      text = parsed.fortune;
      nums = Array.isArray(parsed.lucky_numbers) ? parsed.lucky_numbers.slice(0, 5).map(n => Number(n) || 0) : Array.from({ length: 5 }, () => Math.floor(Math.random() * 99) + 1);
    } else {
      const pool = FORTUNES.filter(f => f.category === category);
      const f = pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      text = f.fortune;
      nums = Array.from({ length: 5 }, () => Math.floor(Math.random() * 99) + 1);
    }
    setCurrent({ id: `f-${Date.now()}`, fortune: text, numbers: nums, ts: Date.now(), category });
    setCracking(false);
    speak(text);
  };

  return (
    <WordplayShell title="Fortune Cookie" emoji="🥠" accent={ACCENT} gradient={GRADIENT}>
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

        <motion.button
          onClick={crack}
          disabled={cracking}
          animate={cracking ? { rotate: [0, -8, 8, -6, 6, -3, 3, 0], scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.8 }}
          className="w-full rounded-3xl py-12 text-center pressable touch-target disabled:opacity-60"
          style={{ background: `radial-gradient(circle at 35% 30%, #f4a76a 0%, #c97843 60%, #6a3a1a 100%)`, border: `2px solid ${ACCENT}55`, minHeight: 200, touchAction: "manipulation" }}
        >
          <div className="text-7xl">🥠</div>
          <div className="font-display tracking-widest mt-2" style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>{cracking ? "CRACKING…" : "TAP TO CRACK"}</div>
        </motion.button>

        <AnimatePresence>
          {current && !cracking && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(255,250,235,0.96)", color: "#3a2a14", boxShadow: `0 0 30px ${ACCENT}55` }}
            >
              <div className="text-lg leading-snug italic mb-3">"{current.fortune}"</div>
              <div className="text-[10px] tracking-[0.3em] font-display mb-1">LUCKY NUMBERS</div>
              <div className="flex justify-center gap-1.5 font-mono text-sm">
                {current.numbers.map((n, i) => <span key={i} className="px-2 py-1 rounded" style={{ background: "rgba(220,80,80,0.18)" }}>{n}</span>)}
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                <button onClick={() => speak(current.fortune)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md pressable touch-target" style={{ background: "rgba(220,80,80,0.20)", color: "#7a1a1a", minHeight: 36 }}>
                  <Volume2 size={12} /> Read aloud
                </button>
                <button onClick={() => addSaved(current)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md pressable touch-target" style={{ background: "rgba(220,80,80,0.20)", color: "#7a1a1a", minHeight: 36 }}>
                  <Heart size={12} /> Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {saved.length > 0 && (
          <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">SAVED · {saved.length}</div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {saved.slice(0, 20).map(e => (
                <div key={e.id} className="rounded-lg px-2 py-1.5 text-[12px] italic" style={{ background: "rgba(255,255,255,0.03)" }}>"{e.fortune}"</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
