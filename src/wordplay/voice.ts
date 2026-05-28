// Wordplay — voice I/O. TTS prefers OpenAI's premium Onyx voice when
// an OpenAI API key is configured (paste it from Landing settings);
// falls back gracefully to the browser's SpeechSynthesis API.
//
// Speech recognition uses the browser's SpeechRecognition API
// (Webkit on iOS Safari; should be feature-detected via sttSupported).

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPrefs } from "./ai";
import { synthesizeOpenAI, splitForTTS } from "../olympus/openaiTts";
import { hasOpenAIKey, getOpenAIKey } from "../arcade/keys";

// ─── TTS (output) ────────────────────────────────────────────

let ttsVoices: SpeechSynthesisVoice[] = [];

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (ttsVoices.length > 0) return ttsVoices;
  ttsVoices = window.speechSynthesis.getVoices();
  if (ttsVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      ttsVoices = window.speechSynthesis.getVoices();
    };
  }
  return ttsVoices;
}

export function ttsSupported(): boolean {
  return (typeof window !== "undefined" && !!window.speechSynthesis) || hasOpenAIKey();
}

// Active audio player + speech utterance so each new speak() call
// cancels whatever's playing first (avoids overlapping voices when
// the kid taps fast).
let activeAudio: HTMLAudioElement | null = null;
let activeAudioToken = 0;

function cancelActiveSpeech(): void {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {}
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch {}
    activeAudio = null;
  }
  activeAudioToken++;
}

/** Speak `text` aloud. Honors the voice-output toggle in prefs.
 *  Cancels any in-flight speech before starting. Prefers OpenAI TTS
 *  (Onyx, 1.1× by default) when an OpenAI key is configured; falls
 *  back to the browser's SpeechSynthesis. */
export function speak(text: string, opts?: { speed?: number; voiceName?: string }): () => void {
  const prefs = loadPrefs();
  if (!prefs.voiceOutput) return () => {};
  if (!text || !text.trim()) return () => {};

  cancelActiveSpeech();

  // Premium path — OpenAI TTS. Fire off the synthesis; the moment the
  // blob URL resolves, play it on a fresh <audio>. If something else
  // has called speak() in the meantime (token bumped), drop this audio.
  if (hasOpenAIKey()) {
    const myToken = ++activeAudioToken;
    synthesizeOpenAI(text).then(url => {
      if (!url) {
        // OpenAI call failed — fall back to browser TTS for this call.
        if (myToken === activeAudioToken) browserSpeak(text, opts);
        return;
      }
      if (myToken !== activeAudioToken) return;  // superseded
      const a = new Audio(url);
      activeAudio = a;
      a.play().catch(() => {
        // Autoplay blocked or other issue → fall through to browser TTS.
        if (myToken === activeAudioToken) browserSpeak(text, opts);
      });
      a.onended = () => { if (activeAudio === a) activeAudio = null; };
    }).catch(() => {
      if (myToken === activeAudioToken) browserSpeak(text, opts);
    });
    return cancelActiveSpeech;
  }

  // No OpenAI key — use the browser SpeechSynthesis directly.
  browserSpeak(text, opts);
  return cancelActiveSpeech;
}

function browserSpeak(text: string, opts?: { speed?: number; voiceName?: string }): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const prefs = loadPrefs();
  const u = new SpeechSynthesisUtterance(text);
  // Default speed 1.1 across the arcade (matches the OpenAI default).
  u.rate = opts?.speed ?? prefs.voiceSpeed ?? 1.1;
  u.pitch = 1;
  const voices = getVoices();
  // Prefer a deeper-sounding voice ("onyx" is OpenAI-only; for browser
  // fallback pick the lowest-pitched local English voice we can find).
  const pick = opts?.voiceName
    ? voices.find(v => v.name === opts.voiceName)
    : voices.find(v => v.lang.startsWith("en") && /\b(daniel|fred|alex|aaron|onyx|deep)\b/i.test(v.name))
      ?? voices.find(v => v.lang.startsWith("en") && v.localService)
      ?? voices.find(v => v.lang.startsWith("en"));
  if (pick) u.voice = pick;
  try { window.speechSynthesis.speak(u); } catch {}
}

export function stopSpeaking(): void {
  cancelActiveSpeech();
}

/** Unlock iOS Web Speech Synthesis. iOS blocks autoplay audio until a
 *  gesture "unlocks" the audio subsystem. Call this once, synchronously,
 *  inside any button onClick handler that will later need TTS.
 *  A silent zero-volume utterance is sufficient. */
export function unlockTTS(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.rate = 2;
    window.speechSynthesis.speak(u);
  } catch {}
}

/** Prime iOS microphone permission. iOS won't show the mic permission
 *  prompt if r.start() is called from async context (after an await).
 *  Call this synchronously inside the onClick before any async work —
 *  it immediately aborts but triggers the permission prompt if needed. */
export function primeVoicePermission(): void {
  const SR = getSR();
  if (!SR) return;
  try {
    const r = new (SR as any)();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = () => {};
    r.onerror = () => {};
    r.onend = () => {};
    r.start();
    setTimeout(() => { try { r.abort(); } catch {} }, 80);
  } catch {}
}

// ─── speakAsync ──────────────────────────────────────────────

/** Like speak(), but returns a Promise that resolves when audio finishes.
 *  Uses chunked OpenAI playback (first chunk starts while rest download)
 *  for low-latency on long texts. Resolves immediately if voice is off. */
export function speakAsync(text: string, opts?: { speed?: number; voiceName?: string }): Promise<void> {
  return new Promise<void>(resolve => {
    const prefs = loadPrefs();
    if (!prefs.voiceOutput || !text || !text.trim()) { resolve(); return; }

    cancelActiveSpeech();

    if (hasOpenAIKey()) {
      const chunks = splitForTTS(text);
      for (const c of chunks) synthesizeOpenAI(c).catch(() => {});
      const myToken = ++activeAudioToken;

      (async () => {
        for (const chunk of chunks) {
          if (myToken !== activeAudioToken) break;
          const url = await synthesizeOpenAI(chunk);
          if (!url || myToken !== activeAudioToken) break;
          await new Promise<void>(res => {
            const a = new Audio(url);
            activeAudio = a;
            a.onended = () => { if (activeAudio === a) activeAudio = null; res(); };
            a.onerror = () => res();
            a.play().catch(() => res());
          });
        }
        resolve();
      })();
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
    const prefs2 = loadPrefs();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts?.speed ?? prefs2.voiceSpeed ?? 1.1;
    u.pitch = 1;
    const voices = getVoices();
    const pick = opts?.voiceName
      ? voices.find(v => v.name === opts.voiceName)
      : voices.find(v => v.lang.startsWith("en") && /\b(daniel|fred|alex|aaron|samantha|onyx|deep)\b/i.test(v.name))
        ?? voices.find(v => v.lang.startsWith("en") && v.localService)
        ?? voices.find(v => v.lang.startsWith("en"));
    if (pick) u.voice = pick;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    try { window.speechSynthesis.speak(u); } catch { resolve(); }
  });
}

// ─── useConvTurn ─────────────────────────────────────────────

/** Hook for a speak-then-listen turn. `ask(prompt, limitSecs?)` speaks the
 *  prompt via speakAsync, then opens the mic and returns whatever the user
 *  says. Resolves with "" if voice is unsupported or no speech detected.
 *  `cancel()` aborts any in-progress turn. */
export function useConvTurn(): {
  ask: (prompt: string, limitSecs?: number) => Promise<string>;
  cancel: () => void;
  speaking: boolean;
  listening: boolean;
} {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    cancelRef.current?.();
  }, []);

  const cancel = useCallback(() => { cancelRef.current?.(); }, []);

  const ask = useCallback(async (prompt: string, limitSecs = 30): Promise<string> => {
    if (mountedRef.current) setSpeaking(true);
    await speakAsync(prompt);
    if (!mountedRef.current) return "";
    setSpeaking(false);
    // iOS shares one audio session between TTS and SpeechRecognition.
    // Give the OS ~150 ms to close the playback session before we open
    // the capture session — without this gap the mic silently fails.
    await new Promise(res => setTimeout(res, 150));
    if (!mountedRef.current) return "";

    return new Promise<string>(resolve => {
      const SR = getSR();
      if (!SR) { resolve(""); return; }

      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const done = (text: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cancelRef.current = null;
        if (mountedRef.current) setListening(false);
        resolve(text);
      };

      try {
        const r = new (SR as any)();
        r.continuous = false;
        r.interimResults = false;
        r.lang = "en-US";
        r.onresult = (e: any) => done(e.results?.[0]?.[0]?.transcript ?? "");
        r.onerror = (e: any) => {
          const code = (e as any)?.error ?? "";
          // "aborted" is a normal stop — don't swallow, still resolve
          done("");
        };
        r.onend = () => done("");
        r.start();
        if (mountedRef.current) setListening(true);
        timer = setTimeout(() => { try { r.stop(); } catch {} done(""); }, limitSecs * 1000);
        cancelRef.current = () => { try { r.abort(); } catch {} done(""); };
      } catch {
        done("");
      }
    });
  }, []);

  return { ask, cancel, speaking, listening };
}

// ─── STT (voice input) ───────────────────────────────────────

interface SRAlias {
  new (): {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (e: any) => void;
    onerror: (e: any) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  };
}

function getSR(): SRAlias | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function sttSupported(): boolean {
  return getSR() !== null;
}

/** React hook for one-shot voice input. Returns {listening, transcript,
 *  error, start, stop}. Start begins recording; final transcript lands
 *  on `transcript`. When an OpenAI key is configured, uses getUserMedia +
 *  MediaRecorder → Whisper API (works on all browsers, no Siri/Dictation
 *  dependency). Falls back to webkitSpeechRecognition otherwise. */
export function useVoiceInput(): {
  listening: boolean;
  transcript: string;
  error: "denied" | "unavailable" | null;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const recRef = useRef<any>(null);          // webkitSpeechRecognition
  const recorderRef = useRef<MediaRecorder | null>(null); // Whisper path
  const streamRef = useRef<MediaStream | null>(null);

  const start = (): void => {
    setError(null);
    const oaiKey = getOpenAIKey();

    if (oaiKey && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      // ── Whisper push-to-talk path ──────────────────────────────────
      // Uses getUserMedia (shows iOS permission prompt correctly) + MediaRecorder
      // → OpenAI Whisper API. Works on all browsers regardless of Safari
      // Dictation settings or webkitSpeechRecognition permission quirks.
      if (activeAudio) { try { activeAudio.pause(); activeAudio.src = ""; } catch {}; activeAudio = null; }
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      try { recRef.current?.stop(); } catch {}; recRef.current = null;

      const myToken = ++activeAudioToken;
      setListening(true);

      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          if (activeAudioToken !== myToken) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;

          // iOS Safari supports audio/mp4; desktop browsers support audio/webm.
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";

          const chunks: Blob[] = [];
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
          recorderRef.current = recorder;

          recorder.ondataavailable = (e: any) => { if (e.data?.size > 0) chunks.push(e.data); };
          recorder.onstop = async () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            recorderRef.current = null;
            if (activeAudioToken !== myToken) return; // superseded
            if (!chunks.length) return;
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/mp4" });
            if (blob.size < 500) return; // too short — nothing recorded
            try {
              const ext = (recorder.mimeType || "").includes("mp4") ? "m4a" : "webm";
              const fd = new FormData();
              fd.append("file", blob, `audio.${ext}`);
              fd.append("model", "whisper-1");
              fd.append("language", "en");
              const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${oaiKey}` },
                body: fd,
              });
              if (activeAudioToken !== myToken) return;
              if (!resp.ok) throw new Error(`${resp.status}`);
              const { text } = await resp.json();
              if (activeAudioToken !== myToken) return;
              if (text?.trim()) setTranscript(text.trim());
            } catch {
              if (activeAudioToken === myToken) setError("unavailable");
            }
          };

          recorder.start(100); // collect chunks every 100 ms

          // Auto-stop after 10 s if user doesn't tap stop
          setTimeout(() => {
            if (activeAudioToken === myToken && recorderRef.current?.state === "recording") {
              try { recorderRef.current.stop(); } catch {}
              setListening(false);
            }
          }, 10000);
        })
        .catch((err: any) => {
          if (activeAudioToken !== myToken) return;
          setListening(false);
          const name = (err as any)?.name ?? "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
            setError("denied");
          } else {
            setError("unavailable");
          }
        });

    } else {
      // ── webkitSpeechRecognition fallback (no OpenAI key) ───────────
      const SR = getSR();
      if (!SR) { setError("unavailable"); return; }
      if (activeAudio) { try { activeAudio.pause(); activeAudio.src = ""; } catch {}; activeAudio = null; }
      const myToken = ++activeAudioToken;
      const ttsSpeaking = typeof window !== "undefined" && !!window.speechSynthesis?.speaking;
      if (ttsSpeaking) { try { window.speechSynthesis.cancel(); } catch {} }
      const old = recRef.current;
      recRef.current = null;
      if (old) { try { old.stop(); } catch {} }

      const launch = () => {
        if (activeAudioToken !== myToken) return;
        try {
          const r = new (SR as any)();
          r.continuous = false;
          r.interimResults = false;
          r.lang = "en-US";
          r.onresult = (e: any) => {
            if (recRef.current !== r) return;
            setTranscript(e.results?.[0]?.[0]?.transcript ?? "");
          };
          r.onerror = (e: any) => {
            if (recRef.current !== r) return;
            recRef.current = null;
            setListening(false);
            const code = (e as any)?.error ?? "";
            if (code === "not-allowed" || code === "service-not-allowed") setError("denied");
            else if (code !== "aborted") setError("unavailable");
          };
          r.onend = () => {
            if (recRef.current !== r) return;
            recRef.current = null;
            setListening(false);
          };
          recRef.current = r;
          r.start();
          setListening(true);
        } catch {
          if (activeAudioToken !== myToken) return;
          setListening(false);
          setError("unavailable");
        }
      };

      if (ttsSpeaking || old) { setListening(true); setTimeout(launch, 250); }
      else { launch(); }
    }
  };

  const stop = (): void => {
    // Whisper path: stop the recorder — onstop fires and handles transcription.
    // Don't bump the token here so onstop can complete the Whisper API call.
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      recorderRef.current = null;
      try { rec.stop(); } catch {}
      setListening(false);
      return;
    }
    // SR path / cancel pending getUserMedia: bump token to abort async chain.
    activeAudioToken++;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    const r = recRef.current;
    recRef.current = null;
    try { r?.stop(); } catch {}
    setListening(false);
  };

  const reset = (): void => { setTranscript(""); setError(null); };

  useEffect(() => () => {
    activeAudioToken++;
    try { recRef.current?.stop(); } catch {}
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") { try { rec.stop(); } catch {} }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { listening, transcript, error, supported: sttSupported() || hasOpenAIKey(), start, stop, reset };
}
