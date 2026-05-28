// New sub-app: Mystery Box. Tap to receive a random surprise.
// 70% of the time it redirects you to another existing wordplay
// sub-app with a starter prompt; 30% it's an AI-generated unique
// challenge. Tracks history. Occasional lucky-streak triple.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCw, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, useHistory } from "../ai";
import { speak } from "../voice";

const ACCENT = "#FCD34D";
const GRADIENT = "linear-gradient(135deg, rgba(252,211,77,0.30), rgba(40,28,8,0.95))";

interface BoxResult {
  id: string;
  text: string;
  /** Optional route to redirect to. */
  redirect?: { path: string; label: string };
  ts: number;
}

const REDIRECT_PROMPTS: Array<{ path: string; label: string; text: string }> = [
  { path: "/wordplay/jokes",          label: "Tell a joke",       text: "Crack a fresh joke from the joke generator!" },
  { path: "/wordplay/madlibs",        label: "Open Mad Libs",     text: "Fill in a wacky Mad Libs story." },
  { path: "/wordplay/quiz",           label: "Take a quiz",       text: "Test your trivia with a 5-question quiz." },
  { path: "/wordplay/stories",        label: "Open a story",      text: "Get a wild story starter — then finish it." },
  { path: "/wordplay/fortune",        label: "Crack a cookie",    text: "Crack open a fortune cookie." },
  { path: "/wordplay/magic8",         label: "Ask the 8 Ball",    text: "Ask the Magic 8 Ball a yes/no question." },
  { path: "/wordplay/twenty-questions", label: "Play 20 Q",       text: "Think of something. Let the AI guess." },
  { path: "/wordplay/would-you-rather", label: "Would You Rather", text: "Get a fresh impossible choice." },
  { path: "/wordplay/what-am-i",      label: "Play What Am I?",   text: "Guess what it is from clues." },
  { path: "/wordplay/improv",         label: "Start improv",      text: "Act out an improv scene with AI." },
  { path: "/wordplay/conversation",   label: "Spark a chat",      text: "Get a question that starts a real conversation." },
  { path: "/wordplay/word-chain",     label: "Play Word Chain",   text: "Build the longest associative word chain you can." },
  { path: "/wordplay/personality",    label: "Take a quiz",       text: "Find out which Greek god or dinosaur you are." },
  { path: "/wordplay/rap-battle",     label: "Rap battle",        text: "Battle an AI rapper — bring your bars." },
  { path: "/wordplay/hero-maker",     label: "Forge a hero",      text: "Invent a brand-new superhero." },
  { path: "/wordplay/liar-liar",      label: "Spot the lie",      text: "Two truths and a lie — can you tell them apart?" },
  { path: "/wordplay/lyric-lab",      label: "Write a song",      text: "Write an original song with the AI." },
  { path: "/wordplay/settler",        label: "Settle an argument", text: "Bring a dispute to the AI judge." },
  { path: "/wordplay/charades",       label: "Play charades",     text: "Get a charades word to act out." },
  { path: "/wordplay/storyteller",    label: "Tell a story",      text: "Get a full 3-act story with a twist ending." },
];

const OFFLINE_CHALLENGES = [
  "Make up a country only inhabited by penguins.",
  "Tell a 30-second story without using the letter E.",
  "Describe what Tuesday tastes like.",
  "Invent a sport that requires a banana.",
  "Name three things that are smaller than a grape but braver than a lion.",
  "Make up a holiday celebrated only by dogs.",
  "What sound would a piece of broccoli make if it could shout?",
  "Describe your bedroom as if you were a tiny ant exploring it.",
  "Invent a new ice cream flavor named after your favorite teacher.",
  "Tell a one-sentence story that ends with 'and that's why it rains.'",
  "What's the worst possible job for a cat? Pitch a movie about it.",
  "Invent a robot whose only job is making sandwiches — what goes wrong?",
  "Describe how a goldfish would explain Mondays to a hamster.",
  "Name your sock collection like they're a band.",
  "Pitch a new amusement park ride for the world's tiniest creatures.",
  "If shoes could talk, what's the FIRST thing yours would say?",
];

export default function MysteryBox() {
  const navigate = useNavigate();
  const [result, setResult] = useState<BoxResult | null>(null);
  const [streak, setStreak] = useState<BoxResult[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [history, addHistory] = useHistory<BoxResult>("mystery_box", 30);

  const openBox = async () => {
    setOpening(true);
    // 10% chance: lucky-streak triple
    if (Math.random() < 0.1) {
      const triple: BoxResult[] = [];
      for (let i = 0; i < 3; i++) triple.push(await rollOne());
      setStreak(triple);
      triple.forEach(t => addHistory(t));
      speak(`Lucky streak! Three in a row! ${triple.map(t => t.text).join(". Next: ")}`);
      setResult(null);
    } else {
      const r = await rollOne();
      setResult(r);
      addHistory(r);
      speak(r.text);
      setStreak(null);
    }
    setOpening(false);
  };

  async function rollOne(): Promise<BoxResult> {
    if (Math.random() < 0.7) {
      const r = REDIRECT_PROMPTS[Math.floor(Math.random() * REDIRECT_PROMPTS.length)];
      return { id: `box-${Date.now()}-${Math.random()}`, text: r.text, redirect: { path: r.path, label: r.label }, ts: Date.now() };
    } else {
      const ai = await callAI({
        system: "You generate ONE creative, weird challenge for a kid age 8-13. 10-30 words. Kid-friendly (PG). Specific not generic. Output ONLY the challenge text, no preamble.",
        user: "Generate a fun, imaginative challenge — could be a storytelling prompt, silly task, or creative observation game.",
        maxTokens: 100,
      });
      const text = (ai && ai.length > 5 && ai.length < 200)
        ? ai.replace(/^["']|["']$/g, "").trim()
        : OFFLINE_CHALLENGES[Math.floor(Math.random() * OFFLINE_CHALLENGES.length)];
      return { id: `box-${Date.now()}-${Math.random()}`, text, ts: Date.now() };
    }
  }

  return (
    <WordplayShell title="Mystery Box" emoji="🎲" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        {!result && !streak && (
          <div className="text-center pt-4 pb-2">
            <div className="text-[12px] text-ink-200 mb-6">Tap the box to see what's inside.</div>
            <motion.button
              onClick={openBox}
              disabled={opening}
              whileTap={{ scale: 0.92, rotate: 8 }}
              whileHover={{ scale: 1.05 }}
              className="w-40 h-40 mx-auto rounded-2xl flex items-center justify-center text-7xl pressable touch-target"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, #d97706)`,
                boxShadow: `0 12px 40px ${ACCENT}55`,
                touchAction: "manipulation",
              }}
              aria-label="Open mystery box"
            >
              🎁
            </motion.button>
            <button
              onClick={openBox}
              disabled={opening}
              className="block mx-auto mt-6 px-6 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50"
              style={{ background: ACCENT, color: "#1a1308", minHeight: 50, touchAction: "manipulation" }}
            >
              {opening ? "OPENING…" : "OPEN THE BOX"}
            </button>
          </div>
        )}

        <AnimatePresence>
          {result && !streak && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,28,8,0.92))`, border: `1px solid ${ACCENT}66` }}>
              <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: ACCENT }}>YOU GOT</div>
              <div className="text-base text-white leading-relaxed mb-4">{result.text}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {result.redirect && (
                  <button onClick={() => navigate(result.redirect!.path)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                    style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                    <ArrowRight size={12} /> {result.redirect.label.toUpperCase()}
                  </button>
                )}
                <button onClick={openBox} disabled={opening}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                  <RotateCw size={12} /> ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {streak && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, ${ACCENT}33, rgba(40,28,8,0.95))`, border: `2px solid ${ACCENT}` }}>
            <div className="flex items-center gap-2 justify-center mb-3">
              <Sparkles size={14} style={{ color: ACCENT }} />
              <div className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>LUCKY STREAK · 3 BOXES!</div>
              <Sparkles size={14} style={{ color: ACCENT }} />
            </div>
            <div className="space-y-2">
              {streak.map((s, i) => (
                <div key={s.id} className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-[10px] mb-1" style={{ color: ACCENT }}>#{i + 1}</div>
                  <div className="text-[13px] text-white">{s.text}</div>
                  {s.redirect && (
                    <button onClick={() => navigate(s.redirect!.path)}
                      className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-display tracking-widest pressable touch-target"
                      style={{ background: ACCENT, color: "#1a1308", minHeight: 36 }}>
                      <ArrowRight size={10} /> {s.redirect.label.toUpperCase()}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={openBox} className="w-full mt-3 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
              <RotateCw size={12} className="inline mr-1" /> ANOTHER BOX
            </button>
          </motion.div>
        )}

        {/* Recent history */}
        {history.length > 0 && (
          <section>
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">RECENT BOXES</div>
            <div className="space-y-1.5">
              {history.slice(0, 6).map(h => (
                <div key={h.id} className="text-[11px] text-ink-100 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {h.text}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
