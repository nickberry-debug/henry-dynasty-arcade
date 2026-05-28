// New sub-app: Argument Settler. Two parties enter a dispute and
// their arguments; AI renders a fair verdict. Verdict history saves.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Volume2, RotateCw, Mic, ArrowRight, Check } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak, useVoiceInput, sttSupported } from "../voice";

const ACCENT = "#FBBF24";
const GRADIENT = "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(40,28,8,0.95))";

interface Verdict {
  winner: "side_a" | "side_b" | "compromise" | "tie";
  verdict: string;
  side_a_acknowledgment: string;
  side_b_acknowledgment: string;
  compromise_suggestion: string;
  wisdom_principle: string;
}

interface Case {
  id: string;
  dispute: string;
  sideAName: string;
  sideBName: string;
  sideAArg: string;
  sideBArg: string;
  verdict: Verdict;
  ts: number;
}

type Step = "dispute" | "side_a" | "side_b" | "judging" | "verdict";

const FALLBACK_VERDICT = (a: string, b: string): Verdict => ({
  winner: "compromise",
  verdict: "Both sides make fair points. The best move is a quick compromise so nobody feels overlooked.",
  side_a_acknowledgment: `${a} raised a real concern worth respecting.`,
  side_b_acknowledgment: `${b} also has a point that deserves to be heard.`,
  compromise_suggestion: "Take turns — whoever didn't get it last time gets it this time. Write it down so there's no confusion later.",
  wisdom_principle: "When both sides have a case, fairness over time matters more than winning the moment.",
});

export default function ArgumentSettler() {
  const [step, setStep] = useState<Step>("dispute");
  const [dispute, setDispute] = useState("");
  const [sideAName, setSideAName] = useState("Side A");
  const [sideBName, setSideBName] = useState("Side B");
  const [sideAArg, setSideAArg] = useState("");
  const [sideBArg, setSideBArg] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [history, addHistory] = useHistory<Case>("settler_history", 30);
  const [showHistory, setShowHistory] = useState(false);

  const vi = useVoiceInput();
  const [voiceTarget, setVoiceTarget] = useState<"dispute" | "a_arg" | "b_arg" | null>(null);

  // Apply finalized transcripts to the active textarea.
  if (vi.transcript && voiceTarget) {
    setTimeout(() => {
      if (voiceTarget === "dispute") setDispute(d => `${d} ${vi.transcript}`.trim());
      if (voiceTarget === "a_arg") setSideAArg(a => `${a} ${vi.transcript}`.trim());
      if (voiceTarget === "b_arg") setSideBArg(b => `${b} ${vi.transcript}`.trim());
      vi.reset();
      setVoiceTarget(null);
    }, 0);
  }

  const startVoice = (target: "dispute" | "a_arg" | "b_arg") => {
    if (vi.listening) { vi.stop(); return; }
    setVoiceTarget(target);
    vi.start();
  };

  const judge = async () => {
    setStep("judging");
    const ai = await callAI({
      system: "You are a fair, wise judge settling a dispute for kids age 8-13. Output ONLY JSON.",
      user: `DISPUTE: ${dispute}

SIDE A — ${sideAName}'s argument:
${sideAArg}

SIDE B — ${sideBName}'s argument:
${sideBArg}

Render a verdict:
- Consider both sides fairly
- Acknowledge each person's valid points
- Make a CLEAR decision (not wishy-washy)
- Suggest a compromise or future fairness rule if appropriate
- Be brief but thorough (3-5 sentences for verdict)
- Don't be afraid to side with one — clear decisions are valuable
- Kid-friendly tone (light, respectful, fair)

Return JSON:
{
  "winner": "side_a | side_b | compromise | tie",
  "verdict": "3-5 sentences explaining the decision",
  "side_a_acknowledgment": "What ${sideAName} got right",
  "side_b_acknowledgment": "What ${sideBName} got right",
  "compromise_suggestion": "A practical fairness mechanism for next time",
  "wisdom_principle": "Underlying principle (one sentence)"
}`,
      maxTokens: 700,
      model: "rich",
    });
    const parsed = parseJSON<Verdict>(ai);
    const v = parsed && parsed.verdict ? parsed : FALLBACK_VERDICT(sideAName, sideBName);
    setVerdict(v);
    addHistory({
      id: `c-${Date.now()}`,
      dispute, sideAName, sideBName, sideAArg, sideBArg,
      verdict: v, ts: Date.now(),
    });
    setStep("verdict");
    speak(v.verdict);
  };

  const reset = () => {
    setStep("dispute");
    setDispute(""); setSideAArg(""); setSideBArg("");
    setSideAName("Side A"); setSideBName("Side B");
    setVerdict(null);
  };

  const winnerLabel = !verdict ? "" :
    verdict.winner === "side_a" ? `${sideAName} wins` :
    verdict.winner === "side_b" ? `${sideBName} wins` :
    verdict.winner === "compromise" ? "Compromise reached" : "Tied — call it even";

  return (
    <WordplayShell title="Argument Settler" emoji="⚖️" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          <button onClick={() => setShowHistory(false)}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: !showHistory ? ACCENT : "rgba(255,255,255,0.05)", color: !showHistory ? "#1a1308" : "#fff", minHeight: 44 }}>NEW CASE</button>
          <button onClick={() => setShowHistory(true)}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: showHistory ? ACCENT : "rgba(255,255,255,0.05)", color: showHistory ? "#1a1308" : "#fff", minHeight: 44 }}>PAST VERDICTS · {history.length}</button>
        </div>

        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No verdicts yet.</div>}
            {history.map(c => (
              <div key={c.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] text-ink-300 mb-1">{new Date(c.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                <div className="font-display text-sm text-white mb-1">{c.dispute}</div>
                <div className="text-[11px] text-ink-100">
                  <strong style={{ color: ACCENT }}>Verdict:</strong> {c.verdict.verdict}
                </div>
                <div className="text-[10px] mt-1" style={{ color: ACCENT }}>
                  {c.verdict.winner === "side_a" ? `${c.sideAName} won` :
                   c.verdict.winner === "side_b" ? `${c.sideBName} won` :
                   c.verdict.winner === "compromise" ? "Compromise" : "Tied"}
                </div>
              </div>
            ))}
          </div>
        )}

        {!showHistory && (
          <AnimatePresence mode="wait">
            {step === "dispute" && (
              <motion.section key="dispute" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>WHAT'S THE ARGUMENT?</div>
                <textarea value={dispute} onChange={e => setDispute(e.target.value)}
                  placeholder="e.g. 'Who gets the front seat?'"
                  aria-label="What's the argument about?"
                  rows={3}
                  className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
                <div className="text-[10px] text-ink-300">Examples: Who gets the last cookie? Movie or board game? Is cereal soup?</div>
                <div className="flex gap-2">
                  {sttSupported() && (
                    <button onClick={() => startVoice("dispute")}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                      style={{
                        background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                        color: vi.listening ? "#fca5a5" : "#fff",
                        minHeight: 44,
                      }}>
                      <Mic size={12} /> {vi.listening ? "STOP" : "SPEAK"}
                    </button>
                  )}
                  <button onClick={() => setStep("side_a")}
                    disabled={!dispute.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                    style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                    <ArrowRight size={12} /> CONTINUE
                  </button>
                </div>
              </motion.section>
            )}

            {step === "side_a" && (
              <motion.section key="side_a" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}55` }}>
                <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>SIDE A — STATE YOUR CASE</div>
                <input value={sideAName} onChange={e => setSideAName(e.target.value)}
                  placeholder="Name"
                  aria-label="Side A name"
                  className="w-full rounded-lg bg-black/40 px-3 py-2 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                <textarea value={sideAArg} onChange={e => setSideAArg(e.target.value)}
                  placeholder="Make your argument — why should you win?"
                  aria-label="Side A argument"
                  rows={4}
                  className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
                <div className="flex gap-2">
                  {sttSupported() && (
                    <button onClick={() => startVoice("a_arg")}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                      style={{
                        background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                        color: vi.listening ? "#fca5a5" : "#fff",
                        minHeight: 44,
                      }}>
                      <Mic size={12} /> {vi.listening ? "STOP" : "SPEAK"}
                    </button>
                  )}
                  <button onClick={() => setStep("side_b")}
                    disabled={!sideAArg.trim() || !sideAName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                    style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                    <ArrowRight size={12} /> NEXT: SIDE B
                  </button>
                </div>
              </motion.section>
            )}

            {step === "side_b" && (
              <motion.section key="side_b" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.4)" }}>
                <div className="text-[10px] tracking-widest font-display" style={{ color: "#93c5fd" }}>SIDE B — STATE YOUR CASE</div>
                <input value={sideBName} onChange={e => setSideBName(e.target.value)}
                  placeholder="Name"
                  aria-label="Side B name"
                  className="w-full rounded-lg bg-black/40 px-3 py-2 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                <textarea value={sideBArg} onChange={e => setSideBArg(e.target.value)}
                  placeholder="Make your argument — why should you win?"
                  aria-label="Side B argument"
                  rows={4}
                  className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
                <div className="flex gap-2">
                  {sttSupported() && (
                    <button onClick={() => startVoice("b_arg")}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                      style={{
                        background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                        color: vi.listening ? "#fca5a5" : "#fff",
                        minHeight: 44,
                      }}>
                      <Mic size={12} /> {vi.listening ? "STOP" : "SPEAK"}
                    </button>
                  )}
                  <button onClick={judge}
                    disabled={!sideBArg.trim() || !sideBName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                    style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                    <Gavel size={12} /> JUDGE
                  </button>
                </div>
              </motion.section>
            )}

            {step === "judging" && (
              <motion.div key="judging" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                role="status" aria-live="polite" aria-busy="true"
                className="rounded-2xl p-6 text-center"
                style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,28,8,0.92))`, border: `1px solid ${ACCENT}55` }}>
                <Gavel size={28} className="mx-auto mb-3 animate-pulse" style={{ color: ACCENT }} aria-hidden="true" />
                <div className="font-display tracking-widest text-sm text-white">THE JUDGE IS DELIBERATING…</div>
              </motion.div>
            )}

            {step === "verdict" && verdict && (
              <motion.div key="verdict" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3">
                <div className="rounded-2xl p-4"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,28,8,0.92))`, border: `2px solid ${ACCENT}` }}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gavel size={14} style={{ color: ACCENT }} />
                    <div className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>VERDICT</div>
                  </div>
                  <div className="text-center text-base font-display text-white mb-3">{winnerLabel}</div>
                  <div className="text-[13px] text-white leading-relaxed">{verdict.verdict}</div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}44` }}>
                    <div className="text-[10px] tracking-widest font-display mb-1" style={{ color: ACCENT }}>{sideAName.toUpperCase()} GOT RIGHT</div>
                    <div className="text-[11px] text-ink-100">{verdict.side_a_acknowledgment}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.30)" }}>
                    <div className="text-[10px] tracking-widest font-display mb-1" style={{ color: "#93c5fd" }}>{sideBName.toUpperCase()} GOT RIGHT</div>
                    <div className="text-[11px] text-ink-100">{verdict.side_b_acknowledgment}</div>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-[10px] tracking-widest font-display text-ink-200 mb-1 flex items-center gap-1"><Check size={10} /> FOR NEXT TIME</div>
                  <div className="text-[12px] text-white">{verdict.compromise_suggestion}</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                  <div className="text-[10px] tracking-widest text-ink-300 mb-0.5">PRINCIPLE</div>
                  <div className="text-[11px] italic text-ink-100">"{verdict.wisdom_principle}"</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => speak(verdict.verdict)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                    <Volume2 size={11} /> READ
                  </button>
                  <button onClick={reset}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                    style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                    <RotateCw size={12} /> NEW CASE
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </WordplayShell>
  );
}
