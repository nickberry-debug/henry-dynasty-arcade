// Shared shell for every Wordplay sub-app. Provides:
//  - back-arrow to the Wordplay hub
//  - sub-app title + tinted accent
//  - settings (gear) opens the prefs modal
//  - voice on/off toggle (mirrors prefs.voiceOutput)
// Each sub-app renders inside <main>.

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Volume2, VolumeX, X, Check, ExternalLink } from "lucide-react";
import { usePrefs } from "../ai";
import { hasAnthropicKey } from "../../arcade/keys";
import { useModal, dialogProps } from "../../a11y";

interface Props {
  title: string;
  emoji: string;
  accent: string;
  /** Gradient string for the top header band. */
  gradient: string;
  children: React.ReactNode;
}

export function WordplayShell({ title, emoji, accent, gradient, children }: Props) {
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePrefs();
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0c0a18 0%, #050306 100%)" }}>
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur border-b safe-top" style={{ background: gradient, borderBottomColor: `${accent}33` }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/wordplay")}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            aria-label="Back to Wordplay Hub"
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: accent }}>WORDPLAY</div>
            <h1 className="font-display text-xl truncate" style={{ color: "#fff" }}>
              <span aria-hidden="true">{emoji} </span>{title}
            </h1>
          </div>
          <button
            onClick={() => setPrefs({ voiceOutput: !prefs.voiceOutput })}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            role="switch"
            aria-checked={prefs.voiceOutput}
            aria-label={prefs.voiceOutput ? "Voice output on — tap to mute" : "Voice output off — tap to enable"}
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation", color: prefs.voiceOutput ? accent : "rgba(255,255,255,0.7)" }}
          >
            {prefs.voiceOutput ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setOpenSettings(true)}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            aria-label="Settings"
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto safe-bottom max-w-3xl mx-auto w-full">
        {children}
      </main>

      {openSettings && <SettingsModal onClose={() => setOpenSettings(false)} />}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = usePrefs();
  const navigate = useNavigate();
  const keyConfigured = hasAnthropicKey();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div
        ref={dialogRef}
        {...dialogProps("wp-settings-title")}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-4 shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ background: "linear-gradient(180deg, rgba(20,15,30,0.98), rgba(8,5,12,0.98))", border: "1px solid rgba(180,140,220,0.45)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="wp-settings-title" className="font-display tracking-widest" style={{ color: "#c9b6f0" }}>WORDPLAY SETTINGS</h2>
          <button onClick={onClose} className="pressable touch-target" style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <Section title="VOICE">
          <Toggle label="Voice output (TTS)" value={prefs.voiceOutput} onChange={v => setPrefs({ voiceOutput: v })} />
          <Toggle label="Voice input (mic)" value={prefs.voiceInput} onChange={v => setPrefs({ voiceInput: v })} />
          <Slider label="Voice speed" value={prefs.voiceSpeed} min={0.8} max={2.0} step={0.05} onChange={v => setPrefs({ voiceSpeed: v })} format={v => `${v.toFixed(2)}x`} />
        </Section>

        <Section title="GAMEPLAY">
          <SelectRow label="Default difficulty" value={prefs.difficulty} onChange={v => setPrefs({ difficulty: v as any })} options={[
            { v: "easy", l: "Easy" }, { v: "medium", l: "Medium" }, { v: "hard", l: "Hard" }, { v: "mixed", l: "Mixed" },
          ]} />
          <Toggle label="Show hints" value={prefs.showHints} onChange={v => setPrefs({ showHints: v })} />
        </Section>

        <Section title="API KEYS">
          <div className="text-[11px] text-ink-200 mb-2">
            API keys are managed in <strong>arcade settings</strong> — paste once, every game uses them.
          </div>
          <div className="rounded-md px-2 py-1.5 text-[11px] mb-3 inline-flex items-center gap-1.5" style={{
            background: keyConfigured ? "rgba(52,211,153,0.10)" : "rgba(239,68,68,0.10)",
            border: `1px solid ${keyConfigured ? "rgba(52,211,153,0.30)" : "rgba(239,68,68,0.30)"}`,
            color: keyConfigured ? "#86efac" : "#fca5a5",
          }}>
            {keyConfigured ? <><Check size={11} /> Anthropic key configured (all games)</> : "No Anthropic key — using built-in templates"}
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: "#c9b6f0", color: "#0a0a14", minHeight: 44, touchAction: "manipulation" }}
          >
            <ExternalLink size={12} /> OPEN ARCADE SETTINGS
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      aria-label={`${label} — currently ${value ? "on" : "off"}`}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg pressable touch-target"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 44, touchAction: "manipulation",
      }}
    >
      <span className="text-sm">{label}</span>
      <span aria-hidden="true" className="w-10 h-6 rounded-full relative" style={{ background: value ? "#c9b6f0" : "rgba(255,255,255,0.30)" }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: value ? 18 : 2 }} />
      </span>
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div className="px-1 py-2">
      <div className="flex justify-between text-xs text-ink-100 mb-1">
        <span>{label}</span>
        <span className="font-mono" aria-hidden="true">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${label}, ${format(value)}`}
        aria-valuetext={format(value)}
        className="w-full"
      />
    </div>
  );
}

function SelectRow<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div>
      <div className="text-xs text-ink-200 mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)} className="px-3 py-2 rounded-lg text-xs pressable touch-target" style={{
            background: value === o.v ? "#c9b6f0" : "rgba(255,255,255,0.04)",
            color: value === o.v ? "#0a0a0a" : "#fff",
            border: `1px solid ${value === o.v ? "#c9b6f0" : "rgba(255,255,255,0.08)"}`,
            minHeight: 40, touchAction: "manipulation",
          }}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}
