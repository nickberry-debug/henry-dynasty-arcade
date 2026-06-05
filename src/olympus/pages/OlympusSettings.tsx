// Olympus settings — Anthropic API key (separate from baseball training key
// so users can opt out per-game), TTS preferences, voice input toggle,
// adventure-length default. Stored in localStorage.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Volume2, Key, Cloud, Copy, Check, X as XIcon, Sparkles, Play } from "lucide-react";
import { olympusHasApiKey, setOlympusFallbackKey, clearOlympusApiKey } from "../ai";
import { listNarratorChoices, setNarratorVoice, getNarratorRate, setNarratorRate } from "../tts";
import { hasOpenAITtsKey, setOpenAITtsKey, clearOpenAITtsKey, getOpenAIVoice, setOpenAIVoice, getOpenAITtsSpeed, setOpenAITtsSpeed, synthesizeOpenAI, clearOpenAITtsCache, OPENAI_VOICES, type OpenAIVoice } from "../openaiTts";
import { getRoomCode, setRoomCode, startNewRoom, normalizeRoomCode, isFirebaseConfigured } from "../../sync/firebase";
import { useOlympus } from "../store";

export default function OlympusSettings() {
  const navigate = useNavigate();
  const [hasKey, setHasKey] = useState(olympusHasApiKey());
  const [replacing, setReplacing] = useState(false);
  const [inlineKey, setInlineKey] = useState("");
  const [voiceIn, setVoiceIn] = useState(localStorage.getItem("dd_olympus_voice_in") === "1");
  const [tts, setTts] = useState(localStorage.getItem("dd_olympus_tts") === "1");
  const [length, setLength] = useState(localStorage.getItem("dd_olympus_length") ?? "auto");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>(localStorage.getItem("dd_olympus_tts_voice") ?? "");
  const [rate, setRate] = useState<number>(getNarratorRate());

  useEffect(() => {
    listNarratorChoices().then(setVoices);
  }, []);

  // Re-check key state on focus so the indicator stays accurate if the
  // user opens a second tab, sets a key, and returns.
  useEffect(() => {
    const recheck = () => setHasKey(olympusHasApiKey());
    recheck();
    window.addEventListener("focus", recheck);
    return () => window.removeEventListener("focus", recheck);
  }, []);

  const saveInlineKey = () => {
    setOlympusFallbackKey(inlineKey.trim());
    setHasKey(olympusHasApiKey());
    setInlineKey("");
    setReplacing(false);
  };

  const removeKey = () => {
    if (!confirm("Remove the Olympus API key? Adventures will fall back to offline mode.")) return;
    clearOlympusApiKey();
    setHasKey(false);
    setReplacing(false);
    setInlineKey("");
  };

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-5">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target" style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Configuration</div>
          <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>OLYMPUS SETTINGS</h1>
        </div>
      </header>

      <SyncSection />

      <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: "rgba(218,165,32,0.10)", border: "1px solid rgba(218,165,32,0.30)" }}>
        <div className="text-2xl shrink-0">🔑</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] tracking-[0.3em] font-display mb-0.5" style={{ color: "#DAA520" }}>NEW · ARCADE SETTINGS</div>
          <div className="text-[12px]" style={{ color: "rgba(233,227,210,0.85)" }}>
            API keys are now managed arcade-wide — paste once on the Landing
            page and every game uses them. This page still works as a
            per-game override.
          </div>
          <button
            onClick={() => navigate("/play")}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target"
            style={{ background: "#DAA520", color: "#0a0a14", minHeight: 36, touchAction: "manipulation" }}
          >
            OPEN ARCADE SETTINGS →
          </button>
        </div>
      </div>

      <Section title="Anthropic API Key (Olympus override)">
        <div className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(233,227,210,0.7)" }}>
          Optional. Setting a key here only affects Olympus. Most users should use the arcade-wide key set from the Landing page (see banner above).
        </div>
        {hasKey && !replacing ? (
          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(63,204,106,0.1)", border: "1px solid rgba(63,204,106,0.3)" }}>
            <div className="text-sm flex items-center gap-2 mb-2" style={{ color: "#3fcc6a" }}>
              <Key size={14} /> API key saved — AI adventures are live
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReplacing(true)}
                className="text-xs px-3 py-1.5 rounded-lg pressable touch-target"
                style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.4)", color: "#DAA520" }}
              >
                Replace key
              </button>
              <button
                onClick={removeKey}
                className="text-xs px-3 py-1.5 rounded-lg pressable touch-target"
                style={{ background: "rgba(220,80,80,0.12)", border: "1px solid rgba(220,80,80,0.35)", color: "#e08a8a" }}
              >
                Remove key
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,191,36,0.1)", border: "1px solid rgba(255,191,36,0.3)" }}>
            <div className="text-sm flex items-center gap-2 mb-2" style={{ color: "#FFBF24" }}>
              <Key size={14} /> {replacing ? "Paste your new key" : "No API key configured"}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={inlineKey}
                onChange={e => setInlineKey(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
              />
              <button
                onClick={saveInlineKey}
                disabled={!inlineKey.trim().startsWith("sk-")}
                className="px-4 py-2 rounded-xl text-sm font-display tracking-wider pressable touch-target disabled:opacity-40"
                style={{ background: "#DAA520", color: "#0F1B2D" }}
              >
                Save
              </button>
            </div>
            {replacing && (
              <button
                onClick={() => { setReplacing(false); setInlineKey(""); }}
                className="text-[11px] mt-2 underline"
                style={{ color: "rgba(233,227,210,0.55)" }}
              >
                Cancel — keep the existing key
              </button>
            )}
            <div className="text-[10px] mt-2" style={{ color: "rgba(233,227,210,0.5)" }}>
              Get a key at console.anthropic.com → API Keys. Stored in this browser only.
            </div>
          </div>
        )}
      </Section>

      <OpenAITtsSection />

      <Section title="Voice Output (Narrator — iOS fallback)">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={tts} onChange={e => { setTts(e.target.checked); try { localStorage.setItem("dd_olympus_tts", e.target.checked ? "1" : "0"); } catch {} }} className="accent-amber-400" />
          <Volume2 size={14} style={{ color: "#DAA520" }} />
          <span className="text-sm" style={{ color: "rgba(233,227,210,0.85)" }}>Read scenes aloud during play</span>
        </label>
        <div className="text-[10px] mt-1 mb-3" style={{ color: "rgba(233,227,210,0.5)" }}>
          For the best voices on iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → English → tap a name marked "Premium" or "Enhanced" to download it. Then it'll appear in the picker below.
        </div>
        <label className="block text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>Voice</label>
        <select
          value={voiceURI}
          onChange={e => {
            setVoiceURI(e.target.value);
            setNarratorVoice(e.target.value || null);
            // Play a quick demo using the new voice.
            try {
              speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance("The gates of Olympus open before you.");
              const v = voices.find(x => x.voiceURI === e.target.value);
              if (v) { u.voice = v; u.lang = v.lang; }
              u.rate = rate;
              u.volume = 0.9;
              speechSynthesis.speak(u);
            } catch {}
          }}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
        >
          <option value="">Auto — pick the best voice this device has</option>
          {voices.map(v => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} · {v.lang}{v.default ? " (default)" : ""}
            </option>
          ))}
        </select>
        <label className="block text-[10px] uppercase tracking-[0.25em] mt-3 mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>Speed · {rate.toFixed(2)}×</label>
        <input
          type="range" min={0.7} max={1.4} step={0.05}
          value={rate}
          onChange={e => { const r = parseFloat(e.target.value); setRate(r); setNarratorRate(r); }}
          className="w-full accent-amber-400"
        />
      </Section>

      <Section title="Voice Input (Speak Your Choice)">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={voiceIn} onChange={e => { setVoiceIn(e.target.checked); try { localStorage.setItem("dd_olympus_voice_in", e.target.checked ? "1" : "0"); } catch {} }} className="accent-amber-400" />
          <Mic size={14} style={{ color: "#DAA520" }} />
          <span className="text-sm" style={{ color: "rgba(233,227,210,0.85)" }}>Show microphone button on choice screens</span>
        </label>
        <div className="text-[10px] mt-1" style={{ color: "rgba(233,227,210,0.5)" }}>Uses your browser's Web Speech Recognition. Best in quiet rooms. iPad Safari + Chrome supported.</div>
      </Section>

      <Section title="Default Adventure Length">
        <div className="grid grid-cols-5 gap-1.5">
          {["auto", "short", "medium", "long", "epic"].map(l => (
            <button
              key={l}
              onClick={() => { setLength(l); try { localStorage.setItem("dd_olympus_length", l); } catch {} }}
              className="px-2 py-1.5 rounded-lg text-xs font-display tracking-wider pressable touch-target"
              style={{
                background: length === l ? "rgba(218,165,32,0.18)" : "rgba(15,27,45,0.5)",
                border: length === l ? "1px solid rgba(218,165,32,0.45)" : "1px solid rgba(255,255,255,0.06)",
                color: length === l ? "#DAA520" : "rgba(233,227,210,0.85)",
              }}
            >{l.toUpperCase()}</button>
          ))}
        </div>
      </Section>

      <Section title="Scope Note">
        <div className="text-[11px] leading-relaxed" style={{ color: "rgba(233,227,210,0.65)" }}>
          This build ships the soul of Olympus: structured AI adventures with three-act pacing, voice in + out, hero roster, character creation, journal, personality system, and live IndexedDB saves on every action. Cloud sync (Firebase), full multiplayer, hand-crafted pixel-art sprites, mount/pet/marriage/faction systems, and all 50 easter eggs are not in this pass — they're flagged for future iterations.
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  return (
    <section className="relative rounded-2xl p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(218,165,32,0.06), rgba(15,27,45,0.7))",
        border: "1px solid rgba(218,165,32,0.40)",
        boxShadow: "0 4px 14px -8px rgba(218,165,32,0.30), inset 0 0 0 1px rgba(218,165,32,0.08)",
      }}>
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-15"
        style={{ background: "radial-gradient(circle, rgba(218,165,32,0.6), transparent 70%)" }} aria-hidden="true" />
      <div className="relative flex items-center gap-2 mb-2.5">
        {icon && <span aria-hidden="true" className="text-base">{icon}</span>}
        <div className="text-[10px] uppercase tracking-[0.3em] font-display"
          style={{ color: "#DAA520", fontFamily: "'Cinzel', serif" }}>{title}</div>
        <div className="flex-1 h-px ml-1"
          style={{ background: "linear-gradient(90deg, rgba(218,165,32,0.4), transparent)" }} aria-hidden="true" />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

/** OpenAI TTS — premium narrator voices that sound human (Fable is the
 *  warm British storyteller). When set, this takes priority over the
 *  iOS Web Speech API path. */
function OpenAITtsSection() {
  const [hasKey, setHasKey] = useState(hasOpenAITtsKey());
  const [replacing, setReplacing] = useState(false);
  const [inlineKey, setInlineKey] = useState("");
  const [voice, setVoiceState] = useState<OpenAIVoice>(getOpenAIVoice());
  const [speed, setSpeedState] = useState<number>(getOpenAITtsSpeed());
  const [testing, setTesting] = useState(false);

  const saveKey = () => {
    setOpenAITtsKey(inlineKey.trim());
    setHasKey(hasOpenAITtsKey());
    setInlineKey("");
    setReplacing(false);
  };
  const removeKey = () => {
    if (!confirm("Remove the OpenAI narrator key? Olympus will fall back to your iPad's built-in voices.")) return;
    clearOpenAITtsKey();
    setHasKey(false);
    setReplacing(false);
    setInlineKey("");
  };
  const changeVoice = (v: OpenAIVoice) => {
    setVoiceState(v);
    setOpenAIVoice(v);
    clearOpenAITtsCache(); // old voice cache no longer valid
  };
  const changeSpeed = (s: number) => {
    setSpeedState(s);
    setOpenAITtsSpeed(s);
    clearOpenAITtsCache();
  };
  const testVoice = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const url = await synthesizeOpenAI("The gates of Olympus open before you, and a wind from the high mountains carries the voices of the gods.");
      if (url) {
        const audio = new Audio(url);
        audio.volume = 0.95;
        await audio.play();
      } else {
        alert("Could not reach OpenAI. Check your key and connection.");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Section title="Premium Narrator (OpenAI TTS)">
      <div className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(233,227,210,0.7)" }}>
        Modern AI voice — sounds like a real storyteller, not a robot. "Fable" is a warm British narrator (Ian-McKellen-ish). Roughly $0.03 per scene, ~1-2 second pre-fetch latency. Falls back to iPad voices if no key is set.
      </div>
      {hasKey && !replacing ? (
        <>
          <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: "rgba(63,204,106,0.1)", border: "1px solid rgba(63,204,106,0.3)" }}>
            <div className="text-sm flex items-center gap-2 mb-2" style={{ color: "#3fcc6a" }}>
              <Sparkles size={14} /> OpenAI key saved — premium narrator is live
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={testVoice}
                disabled={testing}
                className="text-xs px-3 py-1.5 rounded-lg pressable touch-target flex items-center gap-1 disabled:opacity-50"
                style={{ background: "rgba(218,165,32,0.18)", border: "1px solid rgba(218,165,32,0.45)", color: "#DAA520" }}
              >
                <Play size={11} /> {testing ? "Playing…" : "Test current voice"}
              </button>
              <button onClick={() => setReplacing(true)} className="text-xs px-3 py-1.5 rounded-lg pressable touch-target" style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.4)", color: "#DAA520" }}>
                Replace key
              </button>
              <button onClick={removeKey} className="text-xs px-3 py-1.5 rounded-lg pressable touch-target" style={{ background: "rgba(220,80,80,0.12)", border: "1px solid rgba(220,80,80,0.35)", color: "#e08a8a" }}>
                Remove key
              </button>
            </div>
          </div>

          <label className="block text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>Voice</label>
          <div className="grid sm:grid-cols-2 gap-1.5 mb-3">
            {OPENAI_VOICES.map(v => (
              <button
                key={v.id}
                onClick={() => changeVoice(v.id)}
                className="text-left p-2.5 rounded-lg pressable touch-target"
                style={{
                  background: voice === v.id ? "rgba(218,165,32,0.18)" : "rgba(15,27,45,0.5)",
                  border: voice === v.id ? "1px solid rgba(218,165,32,0.45)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="font-display tracking-wider text-sm" style={{ color: voice === v.id ? "#DAA520" : "#e9e3d2" }}>
                  {v.label}
                </div>
                <div className="text-[10px] leading-tight mt-0.5" style={{ color: "rgba(233,227,210,0.55)" }}>{v.desc}</div>
              </button>
            ))}
          </div>

          <label className="block text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "rgba(218,165,32,0.85)" }}>Speed · {speed.toFixed(2)}× (1.35× recommended)</label>
          <input
            type="range" min={0.7} max={2.0} step={0.05} value={speed}
            onChange={e => changeSpeed(parseFloat(e.target.value))}
            className="w-full accent-amber-400"
          />
        </>
      ) : (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,191,36,0.1)", border: "1px solid rgba(255,191,36,0.3)" }}>
          <div className="text-sm flex items-center gap-2 mb-2" style={{ color: "#FFBF24" }}>
            <Key size={14} /> {replacing ? "Paste your new OpenAI key" : "No OpenAI key — using iPad voices"}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={inlineKey}
              onChange={e => setInlineKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off" spellCheck={false} autoCapitalize="none"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
              style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
            />
            <button
              onClick={saveKey}
              disabled={!inlineKey.trim().startsWith("sk-")}
              className="px-4 py-2 rounded-xl text-sm font-display tracking-wider pressable touch-target disabled:opacity-40"
              style={{ background: "#DAA520", color: "#0F1B2D" }}
            >
              Save
            </button>
          </div>
          {replacing && (
            <button onClick={() => { setReplacing(false); setInlineKey(""); }} className="text-[11px] mt-2 underline" style={{ color: "rgba(233,227,210,0.55)" }}>
              Cancel — keep existing key
            </button>
          )}
          <div className="text-[10px] mt-2" style={{ color: "rgba(233,227,210,0.5)" }}>
            Get a key at platform.openai.com → API keys. Stored only in this browser. Costs ~$0.03 per scene of TTS.
          </div>
        </div>
      )}
    </Section>
  );
}

/** Cross-device sync via a shared 6-character room code. Both devices
 *  enter the same code and start seeing the same heroes + active
 *  adventures in real time. */
function SyncSection() {
  const loadAll = useOlympus(s => s.loadAll);
  const [code, setCode] = useState<string | null>(getRoomCode());
  const [entry, setEntry] = useState("");
  const [copied, setCopied] = useState(false);
  const configured = isFirebaseConfigured();

  if (!configured) {
    return (
      <Section title="Cross-Device Sync">
        <div className="rounded-xl px-3 py-2.5 text-[12px]" style={{ background: "rgba(255,191,36,0.1)", border: "1px solid rgba(255,191,36,0.3)", color: "#FFBF24" }}>
          Cloud sync isn't enabled on this build. Once Firebase env vars are wired into Vercel, this section lights up automatically.
        </div>
      </Section>
    );
  }

  const startNew = async () => {
    const c = startNewRoom();
    setCode(c);
    await loadAll(); // re-run to wire up subscriptions
  };

  const join = async () => {
    const normalized = normalizeRoomCode(entry);
    if (!normalized) return;
    setRoomCode(normalized);
    setCode(normalized);
    setEntry("");
    await loadAll();
  };

  const leave = async () => {
    if (!confirm("Leave this sync room? Your heroes on this device stay, but new changes won't sync until you rejoin.")) return;
    setRoomCode(null);
    setCode(null);
    await loadAll();
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <Section title="Cross-Device Sync">
      <div className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(233,227,210,0.7)" }}>
        Share heroes (and active adventures) between iPad, phone, and laptop. Start a new sync room here, then enter the same code on the other device.
      </div>
      {code ? (
        <div className="rounded-xl px-3 py-3" style={{ background: "rgba(63,204,106,0.1)", border: "1px solid rgba(63,204,106,0.3)" }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#3fcc6a" }}>
            <Cloud size={16} />
            <span className="text-sm">Syncing — share this code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-display tracking-[0.4em] text-3xl text-center py-2 rounded-lg" style={{ background: "rgba(15,27,45,0.6)", color: "#DAA520", letterSpacing: "0.4em" }}>
              {code}
            </div>
            <button
              onClick={copy}
              className="px-3 py-3 rounded-lg pressable touch-target"
              style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.4)", color: "#DAA520" }}
              aria-label="Copy code"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="text-[10px] mt-2" style={{ color: "rgba(233,227,210,0.55)" }}>
            On the other device, open Olympus → Settings → Cross-Device Sync and tap "Join existing room". Paste this code. Both devices will see all heroes within a second or two.
          </div>
          <button
            onClick={leave}
            className="text-[11px] mt-3 underline flex items-center gap-1"
            style={{ color: "rgba(233,227,210,0.55)" }}
          >
            <XIcon size={11} /> Leave this sync room
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={startNew}
            className="w-full px-4 py-3 rounded-xl font-display tracking-wider text-sm pressable touch-target flex items-center justify-center gap-2"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            <Cloud size={16} /> Start a new sync room
          </button>
          <div className="text-[10px] text-center" style={{ color: "rgba(233,227,210,0.4)" }}>OR</div>
          <div className="flex gap-2">
            <input
              value={entry}
              onChange={e => setEntry(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") join(); }}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              className="flex-1 px-3 py-2.5 rounded-xl text-center font-display tracking-[0.3em] text-lg outline-none"
              style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
            />
            <button
              onClick={join}
              disabled={!normalizeRoomCode(entry)}
              className="px-4 py-2.5 rounded-xl text-sm font-display tracking-wider pressable touch-target disabled:opacity-40"
              style={{ background: "rgba(218,165,32,0.18)", border: "1px solid rgba(218,165,32,0.45)", color: "#DAA520" }}
            >
              Join
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
