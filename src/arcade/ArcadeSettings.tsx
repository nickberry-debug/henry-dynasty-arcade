// Arcade-wide settings modal — one place to paste API keys that
// every game in the arcade uses. Opens from a gear icon on the
// Landing page. No more pasting the same key into Olympus, Mogul,
// AND Wordplay separately.
import { useEffect, useRef, useState } from "react";
import { Key, X, Check, AlertTriangle, Sparkles, Mic } from "lucide-react";
import {
  setAnthropicKey, clearAnthropicKey, hasAnthropicKey,
  setOpenAIKey, clearOpenAIKey, hasOpenAIKey,
} from "./keys";
import { useModal, dialogProps } from "../a11y";
import {
  OPENAI_VOICES, OPENAI_TTS_MODELS, TONE_DEFAULTS,
  getOpenAIVoice, setOpenAIVoice,
  getOpenAITtsSpeed, setOpenAITtsSpeed,
  getOpenAITtsModel, setOpenAITtsModel,
  getToneInstruction, setToneInstruction,
  type OpenAIVoice, type OpenAIModel, type ToneContext,
} from "../olympus/openaiTts";

interface Props { onClose: () => void }

export function ArcadeSettings({ onClose }: Props) {
  const [anthState, setAnthState] = useState(hasAnthropicKey());
  const [oaiState, setOaiState] = useState(hasOpenAIKey());
  const [anthInput, setAnthInput] = useState("");
  const [oaiInput, setOaiInput] = useState("");
  const [savedFlash, setSavedFlash] = useState<"anth" | "oai" | "voice" | null>(null);

  // (polish-pass) Voice settings — model, voice, speed, tone instructions.
  const [model, setModelState] = useState<OpenAIModel>(getOpenAITtsModel());
  const [voice, setVoiceState] = useState<OpenAIVoice>(getOpenAIVoice());
  const [speed, setSpeedState] = useState<number>(getOpenAITtsSpeed());
  const [toneOlympus,  setToneOlympus]  = useState(getToneInstruction("olympus"));
  const [toneWordplay, setToneWordplay] = useState(getToneInstruction("wordplay"));
  const [toneTwentyq,  setToneTwentyq]  = useState(getToneInstruction("twentyq"));

  function saveVoice() {
    setOpenAITtsModel(model);
    setOpenAIVoice(voice);
    setOpenAITtsSpeed(speed);
    setToneInstruction("olympus",  toneOlympus);
    setToneInstruction("wordplay", toneWordplay);
    setToneInstruction("twentyq",  toneTwentyq);
    setSavedFlash("voice");
    setTimeout(() => setSavedFlash(null), 1500);
  }

  function resetToneDefaults() {
    setToneOlympus(TONE_DEFAULTS.olympus);
    setToneWordplay(TONE_DEFAULTS.wordplay);
    setToneTwentyq(TONE_DEFAULTS.twentyq);
  }

  useEffect(() => {
    // Re-read state when modal opens (in case the user pasted earlier and reopened).
    setAnthState(hasAnthropicKey());
    setOaiState(hasOpenAIKey());
  }, []);

  const saveAnth = () => {
    setAnthropicKey(anthInput.trim());
    setAnthState(hasAnthropicKey());
    setAnthInput("");
    setSavedFlash("anth");
    setTimeout(() => setSavedFlash(null), 1500);
  };
  const saveOai = () => {
    setOpenAIKey(oaiInput.trim());
    setOaiState(hasOpenAIKey());
    setOaiInput("");
    setSavedFlash("oai");
    setTimeout(() => setSavedFlash(null), 1500);
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.88)" }} onClick={onClose}>
      <div
        ref={dialogRef}
        {...dialogProps("arcade-settings-title")}
        className="w-full max-w-md rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{
          background: "linear-gradient(180deg, rgba(15,12,28,0.99), rgba(6,5,12,0.99))",
          border: "1px solid rgba(180,140,220,0.45)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{
          background: "linear-gradient(180deg, rgba(40,28,60,0.95), rgba(20,14,30,0.95))",
          borderBottom: "1px solid rgba(180,140,220,0.25)",
        }}>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c9b6f0" }}>BERRY KID'S ARCADE</div>
            <h2 id="arcade-settings-title" className="font-display text-xl">⚙️ Settings</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target" aria-label="Close" style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}>
            <X size={18} />
          </button>
        </header>

        <div className="px-4 py-4 space-y-5">
          <div className="text-[12px] text-ink-200 leading-relaxed">
            Paste your API keys here ONCE. Every game in the arcade uses them:
            Olympus storyteller, Beckett Movie Studios news + reviews, Wordplay Hub
            content generation, and the premium narrator voice.
          </div>

          {/* ANTHROPIC */}
          <section className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(180,140,220,0.10), rgba(15,12,28,0.65))", border: "1px solid rgba(180,140,220,0.30)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Key size={14} style={{ color: "#c9b6f0" }} />
              <div className="font-display tracking-widest text-sm" style={{ color: "#c9b6f0" }}>ANTHROPIC (CLAUDE)</div>
            </div>
            <div className="text-[11px] text-ink-200 mb-3">
              Powers AI storytelling in Olympus, news + critic reviews in Beckett Movie
              Studios, and content generation in all 13 Wordplay sub-apps.
            </div>

            <StatusPill ok={anthState} okLabel="Key configured — all games" missingLabel="No key — using built-in templates" />

            <label className="block text-[10px] tracking-widest text-ink-200 mt-3 mb-1">
              {anthState ? "REPLACE ANTHROPIC KEY" : "PASTE ANTHROPIC KEY"}
            </label>
            <input
              value={anthInput}
              onChange={e => setAnthInput(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm font-mono"
              style={{ minHeight: 44 }}
            />
            <div className="flex gap-2 mt-2 items-center">
              <button
                onClick={saveAnth}
                disabled={!anthInput.trim().startsWith("sk-")}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40"
                style={{ background: "#c9b6f0", color: "#0a0a14", minHeight: 40, touchAction: "manipulation" }}
              >
                Save
              </button>
              {anthState && (
                <button
                  onClick={() => { clearAnthropicKey(); setAnthState(false); }}
                  className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target"
                  style={{ minHeight: 40, touchAction: "manipulation" }}
                >
                  Remove
                </button>
              )}
              {savedFlash === "anth" && (
                <span className="text-[11px] text-emerald-300 inline-flex items-center gap-1"><Check size={11} /> Saved across all apps.</span>
              )}
            </div>
          </section>

          {/* OPENAI — PREMIUM NARRATOR */}
          <section className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,179,2,0.10), rgba(15,12,28,0.65))", border: "1px solid rgba(255,179,2,0.35)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: "#ffd54a" }} />
              <div className="font-display tracking-widest text-sm" style={{ color: "#ffd54a" }}>PREMIUM NARRATOR · OPENAI</div>
            </div>
            <div className="text-[11px] text-ink-200 mb-3">
              Optional. Replaces the device voice with a much warmer studio-quality
              narrator (Fable). Used by Olympus adventures and read-aloud features
              across the arcade.
            </div>

            <StatusPill ok={oaiState} okLabel="Premium narrator active" missingLabel="Using device voice (still works)" />

            <label className="block text-[10px] tracking-widest text-ink-200 mt-3 mb-1">
              {oaiState ? "REPLACE OPENAI KEY" : "PASTE OPENAI KEY"}
            </label>
            <input
              value={oaiInput}
              onChange={e => setOaiInput(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm font-mono"
              style={{ minHeight: 44 }}
            />
            <div className="flex gap-2 mt-2 items-center">
              <button
                onClick={saveOai}
                disabled={!oaiInput.trim().startsWith("sk-")}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40"
                style={{ background: "#ffd54a", color: "#0a0a14", minHeight: 40, touchAction: "manipulation" }}
              >
                Save
              </button>
              {oaiState && (
                <button
                  onClick={() => { clearOpenAIKey(); setOaiState(false); }}
                  className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target"
                  style={{ minHeight: 40, touchAction: "manipulation" }}
                >
                  Remove
                </button>
              )}
              {savedFlash === "oai" && (
                <span className="text-[11px] text-emerald-300 inline-flex items-center gap-1"><Check size={11} /> Saved.</span>
              )}
            </div>
          </section>

          {/* VOICE — polish-pass: model + voice + speed + tone */}
          <section className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(192,132,252,0.10), rgba(15,12,28,0.65))", border: "1px solid rgba(192,132,252,0.30)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Mic size={14} style={{ color: "#c084fc" }} />
              <div className="font-display tracking-widest text-sm" style={{ color: "#c084fc" }}>VOICE SETTINGS</div>
            </div>
            <div className="text-[11px] text-ink-200 mb-3">
              Picks the OpenAI TTS model, narrator voice, and per-game tone.
              Requires the OpenAI key above. Defaults to the newer
              <code className="px-1">gpt-4o-mini-tts</code> for a more human read.
            </div>

            {/* MODEL */}
            <label className="block text-[10px] tracking-widest text-ink-200 mb-1">TTS MODEL</label>
            <select
              value={model}
              onChange={e => setModelState(e.target.value as OpenAIModel)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
              style={{ minHeight: 40 }}
            >
              {OPENAI_TTS_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
              ))}
            </select>

            {/* VOICE */}
            <label className="block text-[10px] tracking-widest text-ink-200 mt-3 mb-1">NARRATOR VOICE</label>
            <select
              value={voice}
              onChange={e => setVoiceState(e.target.value as OpenAIVoice)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
              style={{ minHeight: 40 }}
            >
              {OPENAI_VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.label} — {v.desc}</option>
              ))}
            </select>

            {/* SPEED */}
            <label className="block text-[10px] tracking-widest text-ink-200 mt-3 mb-1">
              SPEED · {speed.toFixed(2)}×
            </label>
            <input
              type="range"
              min={0.5} max={1.5} step={0.05}
              value={speed}
              onChange={e => setSpeedState(parseFloat(e.target.value))}
              className="w-full accent-violet-400"
            />

            {/* TONE INSTRUCTIONS — only matter on gpt-4o-mini-tts */}
            {model === "gpt-4o-mini-tts" && (
              <div className="mt-3 space-y-2">
                <div className="text-[10px] tracking-widest text-ink-200">TONE INSTRUCTIONS (gpt-4o-mini-tts only)</div>
                <input
                  value={toneOlympus}
                  onChange={e => setToneOlympus(e.target.value)}
                  placeholder={TONE_DEFAULTS.olympus}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                  style={{ minHeight: 40 }}
                  aria-label="Olympus storyteller tone"
                />
                <div className="text-[9px] text-ink-300">↑ Olympus narrator</div>
                <input
                  value={toneWordplay}
                  onChange={e => setToneWordplay(e.target.value)}
                  placeholder={TONE_DEFAULTS.wordplay}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                  style={{ minHeight: 40 }}
                  aria-label="Wordplay quiz host tone"
                />
                <div className="text-[9px] text-ink-300">↑ Wordplay quiz host</div>
                <input
                  value={toneTwentyq}
                  onChange={e => setToneTwentyq(e.target.value)}
                  placeholder={TONE_DEFAULTS.twentyq}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                  style={{ minHeight: 40 }}
                  aria-label="20 Questions detective tone"
                />
                <div className="text-[9px] text-ink-300">↑ 20 Questions detective</div>
              </div>
            )}

            <div className="flex gap-2 mt-3 items-center flex-wrap">
              <button
                onClick={saveVoice}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
                style={{ background: "#c084fc", color: "#0a0a14", minHeight: 40, touchAction: "manipulation" }}
              >
                Save voice
              </button>
              <button
                onClick={resetToneDefaults}
                className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target"
                style={{ minHeight: 40, touchAction: "manipulation" }}
              >
                Reset tones
              </button>
              {savedFlash === "voice" && (
                <span className="text-[11px] text-emerald-300 inline-flex items-center gap-1"><Check size={11} /> Voice saved.</span>
              )}
            </div>
          </section>

          <div className="text-[11px] text-ink-300 leading-relaxed px-1 pb-2">
            <strong>Where do keys come from?</strong> Anthropic: <span className="underline">console.anthropic.com</span> → API
            Keys. OpenAI: <span className="underline">platform.openai.com</span> → API keys.
            Keys are stored on this device only and never leave the browser
            except to call Anthropic / OpenAI directly.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ ok, okLabel, missingLabel }: { ok: boolean; okLabel: string; missingLabel: string }) {
  return (
    <div
      className="rounded-md px-2 py-1.5 text-[11px] inline-flex items-center gap-1.5"
      style={{
        background: ok ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.10)",
        border: `1px solid ${ok ? "rgba(52,211,153,0.35)" : "rgba(239,68,68,0.30)"}`,
        color: ok ? "#86efac" : "#fca5a5",
      }}
    >
      {ok ? <><Check size={11} /> {okLabel}</> : <><AlertTriangle size={11} /> {missingLabel}</>}
    </div>
  );
}
