// Curiosity Camera — take a photo with the device camera (or upload one),
// AI identifies it simply ("This is a Blue Jay"), then the kid can ask
// follow-up questions by voice.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, MicOff, RefreshCw, Upload } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { MicErrorBanner } from "../components/MicErrorBanner";
import { useVoiceInput, speak } from "../voice";
import { getAnthropicKey } from "../../arcade/keys";

const ACCENT = "#F59E0B";
const GRADIENT = "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(18,10,5,0.95))";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

interface QAMessage { role: "user" | "ai"; text: string }

async function identifyPhoto(b64: string, mimeType: string): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        system: "You are identifying things in photos for a curious young child. Answer in 1-2 simple, direct sentences. Start with what the thing IS — its specific name if possible (e.g., 'This is a Monarch Butterfly', 'This is a Black-capped Chickadee', 'This is a dandelion'). Be specific, not vague.",
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: b64 } },
            { type: "text", text: "What is this? Give it a specific name." },
          ],
        }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.content?.[0]?.text?.trim() ?? null;
  } catch { return null; }
}

async function askQuestion(
  b64: string,
  mimeType: string,
  qaHistory: QAMessage[],
  question: string,
): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  try {
    // First message always includes the image
    const messages: unknown[] = [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: b64 } },
          { type: "text", text: qaHistory[0]?.text ?? "What is this?" },
        ],
      },
      { role: "assistant", content: qaHistory[1]?.text ?? "" },
    ];
    // Add subsequent Q&A pairs
    for (let i = 2; i < qaHistory.length; i++) {
      messages.push({ role: qaHistory[i].role === "user" ? "user" : "assistant", content: qaHistory[i].text });
    }
    messages.push({ role: "user", content: question });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        system: "You are answering questions about a photo for a curious young child. Keep answers simple, fun, and direct — 1-3 sentences max. Use the specific name of the thing you identified.",
        messages,
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.content?.[0]?.text?.trim() ?? null;
  } catch { return null; }
}

function compressImage(file: File, maxPx = 800): Promise<{ b64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ev => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
        resolve({ b64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CuriosityCamera() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [identification, setIdentification] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const vi = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasKey = !!getAnthropicKey();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [qaHistory]);

  // Voice → ask question
  useEffect(() => {
    if (!vi.transcript || !identification) return;
    const q = vi.transcript.trim();
    vi.reset();
    if (q) handleQuestion(q);
  }, [vi.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setIdentification(null);
    setQaHistory([]);
    setIdentifying(true);
    try {
      const { b64, mimeType } = await compressImage(file);
      setImageB64(b64); setImageMime(mimeType);
      const id = await identifyPhoto(b64, mimeType);
      const answer = id ?? "I can see something interesting in this photo! Ask me what it is.";
      setIdentification(answer);
      speak(answer);
      setQaHistory([
        { role: "user", text: "What is this?" },
        { role: "ai", text: answer },
      ]);
    } catch {
      setIdentification("Something went wrong reading the photo. Try again!");
    }
    setIdentifying(false);
  };

  const handleQuestion = async (q: string) => {
    if (!imageB64 || qaLoading) return;
    const updated = [...qaHistory, { role: "user" as const, text: q }];
    setQaHistory(updated);
    setQaLoading(true);
    const ans = await askQuestion(imageB64, imageMime, qaHistory, q);
    const reply = ans ?? "Hmm, I'm not sure about that one — try asking a different way!";
    const final = [...updated, { role: "ai" as const, text: reply }];
    setQaHistory(final);
    speak(reply);
    setQaLoading(false);
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null); setImageB64(null); setIdentification(null);
    setQaHistory([]); vi.reset();
  };

  return (
    <WordplayShell title="Curiosity Camera" emoji="📷" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">

        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
        />

        {!imageUrl && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-[13px] text-ink-200 leading-relaxed">
              Point the camera at <strong>anything</strong> — a bird, a plant, a bug, your food, whatever! AI will tell you what it is, then you can ask questions by voice.
            </p>

            {!hasKey && (
              <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", color: "#fcd34d" }}>
                Add an Anthropic API key in Settings to use AI identification.
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl pressable touch-target"
                style={{ background: `${ACCENT}18`, border: `2px solid ${ACCENT}55`, minHeight: 120, touchAction: "manipulation" }}
              >
                <Camera size={36} style={{ color: ACCENT }} />
                <span className="font-display tracking-widest text-sm" style={{ color: ACCENT }}>TAKE PHOTO</span>
              </button>
              <button
                onClick={() => uploadRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl pressable touch-target"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 120, touchAction: "manipulation" }}
              >
                <Upload size={28} style={{ color: "rgba(255,255,255,0.5)" }} />
                <span className="font-display tracking-widest text-xs text-ink-200">UPLOAD</span>
              </button>
            </div>

            <div className="text-center text-[11px] text-ink-300 italic">
              Try: a bird outside, a flower, your pet, a cool bug, your lunch 🍕
            </div>
          </motion.div>
        )}

        {/* Photo + identification */}
        <AnimatePresence>
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Photo thumbnail */}
              <div className="relative rounded-2xl overflow-hidden" style={{ border: `2px solid ${ACCENT}44` }}>
                <img src={imageUrl} alt="Captured" className="w-full object-cover" style={{ maxHeight: 240 }} />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <RefreshCw size={14} style={{ color: "white" }} />
                </button>
              </div>

              {/* Identification */}
              {identifying && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm animate-pulse"
                  style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30` }}>
                  <Camera size={16} style={{ color: ACCENT }} />
                  <span style={{ color: ACCENT }}>Identifying…</span>
                </div>
              )}

              {identification && !identifying && (
                <div className="rounded-2xl px-4 py-4"
                  style={{ background: `${ACCENT}14`, border: `2px solid ${ACCENT}44` }}>
                  <div className="text-[9px] tracking-[0.3em] font-display mb-2" style={{ color: ACCENT }}>AI SAYS</div>
                  <p className="text-sm leading-relaxed font-medium" style={{ color: "white" }}>{identification}</p>
                </div>
              )}

              {/* Q&A chat */}
              {identification && !identifying && qaHistory.length > 2 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {qaHistory.slice(2).map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl px-4 py-2.5 text-sm max-w-[90%] ${m.role === "ai" ? "self-start" : "self-end ml-auto"}`}
                      style={{
                        background: m.role === "ai" ? `${ACCENT}12` : "rgba(255,255,255,0.07)",
                        border: m.role === "ai" ? `1px solid ${ACCENT}33` : "1px solid rgba(255,255,255,0.12)",
                        display: "block",
                      }}
                    >
                      {m.role === "ai" && <div className="text-[9px] tracking-widest font-display mb-1" style={{ color: ACCENT }}>AI</div>}
                      {m.text}
                    </motion.div>
                  ))}
                  {qaLoading && (
                    <div className="rounded-xl px-4 py-2 text-sm animate-pulse" style={{ background: `${ACCENT}10`, color: ACCENT }}>
                      Thinking…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}

              {/* Voice Q&A */}
              {identification && !identifying && (
                <div className="space-y-2">
                  <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">ASK A QUESTION BY VOICE</div>
                  {vi.error && <MicErrorBanner error={vi.error} />}
                  <button
                    onClick={vi.listening ? vi.stop : vi.start}
                    disabled={qaLoading}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-display tracking-widest text-sm pressable touch-target"
                    style={{
                      background: vi.listening ? "#ef444422" : `${ACCENT}18`,
                      border: `2px solid ${vi.listening ? "#ef4444" : ACCENT}55`,
                      color: vi.listening ? "#fca5a5" : ACCENT,
                      minHeight: 56, touchAction: "manipulation",
                      opacity: qaLoading ? 0.6 : 1,
                    }}
                  >
                    {vi.listening ? <><MicOff size={18} /> LISTENING… TAP TO STOP</> : <><Mic size={18} /> TAP & ASK A QUESTION</>}
                  </button>
                  {vi.listening && (
                    <div className="text-center text-[11px] animate-pulse" style={{ color: ACCENT }}>
                      🎙️ Say anything — "How big is it?", "Where does it live?", "Can I touch it?"
                    </div>
                  )}
                </div>
              )}

              {/* New photo */}
              <div className="flex gap-2">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl pressable touch-target text-sm font-display tracking-widest"
                  style={{ background: ACCENT, color: "#180a00", minHeight: 48, touchAction: "manipulation" }}
                >
                  <Camera size={15} /> NEW PHOTO
                </button>
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="px-4 rounded-xl pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 48, touchAction: "manipulation" }}
                >
                  <Upload size={15} style={{ color: "rgba(255,255,255,0.6)" }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WordplayShell>
  );
}
