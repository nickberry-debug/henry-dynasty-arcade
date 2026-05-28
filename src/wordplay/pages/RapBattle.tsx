// New sub-app: Rap Battle. AI drops a verse on a topic; user
// drops their own. After 2-3 rounds AI judges with encouraging
// feedback. Battle history saves.

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Volume2, Trophy, RotateCw, Send, Loader2 } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak, useVoiceInput, sttSupported } from "../voice";

const ACCENT = "#22D3EE";
const GRADIENT = "linear-gradient(135deg, rgba(34,211,238,0.30), rgba(8,25,35,0.95))";

const TOPICS = ["School", "Parents", "Siblings", "Food", "Pets", "Video Games", "Sports", "Weather", "Technology", "Cars", "Movies", "Homework", "Pizza", "Mondays"];

interface Verse { who: "ai" | "user"; text: string }
interface Judgment {
  ai_score: number;
  kid_score: number;
  winner: "kid" | "ai" | "tie";
  judge_notes: string;
  best_moment: string;
}

const FALLBACK_VERSES: Record<string, string> = {
  Homework: "Yo homework, you think you're so tough?\nShowing up Friday like you're not enough,\nGot a TV calling and snacks on the shelf,\nBut you make me grind, well — by myself!",
  Pizza: "Pizza, my friend, you're a circle of joy,\nCheese pulls long like you're showing off your toy,\nPepperoni hot like the sun in the sky,\nWith every slice gone I just wanna cry.",
  Mondays: "Monday Monday, you sneak up on the week,\nAlarm goes off with that horrible squeak,\nBut hey at least you bring me back to the squad,\nEven if everybody hates how you trod.",
};

const FALLBACK_GENERIC = (topic: string) =>
  `Yo ${topic}, let me drop this line,\nYou be showing up all of the time,\nFunny and tough and pretty hard to ignore,\nThat's why I keep coming back for more.`;

export default function RapBattle() {
  const [topic, setTopic] = useState("Homework");
  const [customTopic, setCustomTopic] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [history, addHist] = useHistory<{ id: string; topic: string; verses: Verse[]; judgment: Judgment; ts: number }>("rap_battle_history", 30);
  const vi = useVoiceInput();

  if (vi.transcript) {
    setTimeout(() => { setUserInput(u => `${u}\n${vi.transcript}`.trim()); vi.reset(); }, 0);
  }

  const activeTopic = customTopic.trim() || topic;

  const aiDropsVerse = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "You generate ONE 4-line rap verse for a kid age 8-13. PG, playful, clever wordplay, AABB or ABAB rhyme scheme. No insults about people. Output ONLY JSON.",
      user: `Topic: ${activeTopic}.
Previous verses: ${verses.map((v, i) => `${i + 1}. ${v.who.toUpperCase()}: ${v.text}`).join("\n") || "(none yet — you go first)"}

Return JSON: { "verse": "4-line verse with line breaks (\\n between lines)" }`,
      maxTokens: 300,
    });
    const parsed = parseJSON<{ verse: string }>(ai);
    const verse = parsed?.verse ?? FALLBACK_VERSES[activeTopic] ?? FALLBACK_GENERIC(activeTopic);
    setVerses(v => [...v, { who: "ai", text: verse }]);
    speak(verse.replace(/\n/g, ". "));
    setLoading(false);
  };

  const sendUserVerse = () => {
    if (!userInput.trim()) return;
    setVerses(v => [...v, { who: "user", text: userInput.trim() }]);
    setUserInput("");
  };

  const judge = async () => {
    setLoading(true);
    const aiVerses = verses.filter(v => v.who === "ai").map(v => v.text).join("\n\n");
    const kidVerses = verses.filter(v => v.who === "user").map(v => v.text).join("\n\n");
    const ai = await callAI({
      system: "You judge rap battles between AI and a kid age 8-13. Be encouraging — lean toward the kid winning unless effort was clearly low. Output ONLY JSON.",
      user: `Topic: ${activeTopic}

AI VERSES:
${aiVerses || "(none)"}

KID VERSES:
${kidVerses || "(none)"}

Score each 1-10 on rhyme, wordplay, flow, personality, topic relevance.

Return JSON:
{
  "ai_score": 7.5,
  "kid_score": 8.2,
  "winner": "kid" | "ai" | "tie",
  "judge_notes": "Brief encouraging commentary (2-3 sentences)",
  "best_moment": "What was the standout line"
}`,
      maxTokens: 350,
      model: "rich",
    });
    const parsed = parseJSON<Judgment>(ai);
    const j: Judgment = parsed ?? {
      ai_score: 7,
      kid_score: 7.5,
      winner: "kid",
      judge_notes: "Both sides brought heat! The kid's verses had real personality and the AI kept it tight.",
      best_moment: "The closing line landed perfectly.",
    };
    setJudgment(j);
    addHist({ id: `rb-${Date.now()}`, topic: activeTopic, verses, judgment: j, ts: Date.now() });
    speak(`${j.judge_notes} Winner: ${j.winner === "kid" ? "you!" : j.winner === "ai" ? "AI." : "It's a tie."}`);
    setLoading(false);
  };

  const reset = () => {
    setVerses([]);
    setUserInput("");
    setJudgment(null);
  };

  return (
    <WordplayShell title="Rap Battle" emoji="🎤" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        {/* Topic */}
        <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] tracking-widest font-display text-ink-200 mb-2">TOPIC</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TOPICS.map(t => (
              <button key={t} onClick={() => { setTopic(t); setCustomTopic(""); }}
                className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                style={{
                  background: topic === t && !customTopic ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${topic === t && !customTopic ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                  color: topic === t && !customTopic ? ACCENT : "#fff",
                  minHeight: 36,
                }}>{t}</button>
            ))}
          </div>
          <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
            placeholder="Or type custom topic…"
            aria-label="Custom battle topic"
            className="w-full rounded-lg bg-black/40 px-3 py-2 text-[13px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
        </section>

        {/* Versus board */}
        {verses.length === 0 && !judgment && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎤</div>
            <div className="font-display tracking-widest text-sm text-white">VS. THE AI</div>
            <div className="text-[12px] text-ink-200 mt-1">{activeTopic}</div>
            <button onClick={aiDropsVerse} disabled={loading}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-display tracking-widest text-sm pressable touch-target disabled:opacity-50"
              style={{ background: ACCENT, color: "#08151a", minHeight: 52 }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> DROPPING…</> : "🎤 AI GOES FIRST"}
            </button>
          </div>
        )}

        {/* Verse log */}
        {verses.length > 0 && (
          <div className="space-y-2">
            {verses.map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: v.who === "ai" ? -8 : 8 }} animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl p-3.5 ${v.who === "user" ? "ml-6" : "mr-6"}`}
                style={{
                  background: v.who === "ai" ? `${ACCENT}11` : "rgba(252,211,77,0.10)",
                  border: `1px solid ${v.who === "ai" ? `${ACCENT}55` : "rgba(252,211,77,0.30)"}`,
                }}>
                <div className="text-[10px] tracking-widest mb-1 flex items-center justify-between">
                  <span style={{ color: v.who === "ai" ? ACCENT : "#fbbf24" }}>{v.who === "ai" ? "AI" : "YOU"}</span>
                  <button onClick={() => speak(v.text.replace(/\n/g, ". "))}
                    className="p-1 pressable touch-target"
                    style={{ color: "#fff", opacity: 0.7, minWidth: 32, minHeight: 32 }}>
                    <Volume2 size={11} />
                  </button>
                </div>
                <div className="text-[13px] text-white whitespace-pre-wrap leading-relaxed font-mono">{v.text}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Input */}
        {!judgment && verses.length > 0 && (
          <section className="rounded-xl p-3 space-y-2" style={{ background: "rgba(252,211,77,0.05)", border: "1px solid rgba(252,211,77,0.20)" }}>
            <div className="text-[10px] tracking-widest font-display" style={{ color: "#fbbf24" }}>YOUR VERSE — DROP IT</div>
            <textarea value={userInput} onChange={e => setUserInput(e.target.value)}
              placeholder="4 lines of your own…"
              aria-label="Your rap verse"
              rows={4}
              className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[13px] text-white outline-none font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex flex-wrap gap-2">
              {sttSupported() && (
                <button onClick={() => vi.listening ? vi.stop() : vi.start()}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                  style={{
                    background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: vi.listening ? "#fca5a5" : "#fff",
                    minHeight: 44,
                  }}>
                  <Mic size={11} /> {vi.listening ? "STOP" : "SPEAK"}
                </button>
              )}
              <button onClick={sendUserVerse} disabled={!userInput.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-40"
                style={{ background: "#fbbf24", color: "#1a1308", minHeight: 44 }}>
                <Send size={11} /> SUBMIT
              </button>
              <button onClick={aiDropsVerse} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target disabled:opacity-50"
                style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}88`, color: ACCENT, minHeight: 44 }}>
                {loading ? <Loader2 size={11} className="animate-spin" /> : "AI COUNTER"}
              </button>
              {verses.filter(v => v.who === "user").length >= 1 && verses.filter(v => v.who === "ai").length >= 1 && (
                <button onClick={judge} disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                  style={{ background: ACCENT, color: "#08151a", minHeight: 44 }}>
                  <Trophy size={11} /> END BATTLE
                </button>
              )}
            </div>
          </section>
        )}

        {/* Judgment */}
        {judgment && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(8,25,35,0.95))`, border: `2px solid ${ACCENT}` }}>
            <div className="text-center">
              <Trophy size={24} className="mx-auto" style={{ color: ACCENT }} />
              <div className="font-display tracking-widest text-sm mt-2" style={{ color: ACCENT }}>
                {judgment.winner === "kid" ? "🏆 YOU WIN!" : judgment.winner === "ai" ? "AI WINS — REMATCH?" : "🤝 TIE!"}
              </div>
              <div className="text-[12px] text-ink-100 mt-2">AI: {judgment.ai_score} · YOU: {judgment.kid_score}</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest mb-1" style={{ color: ACCENT }}>JUDGE'S NOTES</div>
              <div className="text-[12px] text-white leading-relaxed">{judgment.judge_notes}</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest mb-1" style={{ color: ACCENT }}>BEST MOMENT</div>
              <div className="text-[12px] text-ink-100 italic">"{judgment.best_moment}"</div>
            </div>
            <button onClick={reset}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{ background: ACCENT, color: "#08151a", minHeight: 48 }}>
              <RotateCw size={11} /> REMATCH
            </button>
          </motion.div>
        )}

        {history.length > 0 && !judgment && (
          <section>
            <div className="text-[10px] tracking-widest font-display text-ink-200 mb-2">BATTLE HISTORY</div>
            <div className="text-[11px] text-ink-200">
              W: {history.filter(h => h.judgment.winner === "kid").length} ·
              L: {history.filter(h => h.judgment.winner === "ai").length} ·
              T: {history.filter(h => h.judgment.winner === "tie").length}
            </div>
          </section>
        )}
      </div>
    </WordplayShell>
  );
}
