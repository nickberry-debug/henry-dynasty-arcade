// Shell for Potion Lab pages — dim purple/amber lab aesthetic.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Volume2, VolumeX } from "lucide-react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";
import { usePrefs } from "../../wordplay/ai";
import { stopSpeaking } from "../../wordplay/voice";

export const LAB_PURPLE = "#a78bfa";
export const LAB_AMBER = "#fbbf24";

interface Props {
  title: string;
  subtitle?: string;
  emoji?: string;
  backTo?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function PotionLabShell({ title, subtitle, emoji, backTo = "/", right, children }: Props) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = usePrefs();
  const toggleVoice = () => {
    const next = !prefs.voiceOutput;
    setPrefs({ voiceOutput: next });
    if (!next) stopSpeaking();
  };
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(1200px 600px at 20% -10%, rgba(167,139,250,0.18), transparent), linear-gradient(180deg, #0a0612 0%, #050306 100%)" }}>
      <header className="sticky top-0 z-30 px-3 py-2.5 backdrop-blur border-b safe-top" style={{
        background: "rgba(10,6,18,0.92)",
        borderBottomColor: `${LAB_PURPLE}44`,
      }}>
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button onClick={() => navigate(backTo)} aria-label="Back"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${LAB_PURPLE}55`, color: "#ede9fe", minWidth: 44, minHeight: 44 }}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.4em]" style={{ color: LAB_PURPLE }}>POTION LAB</div>
            <h1 className="font-display text-lg truncate text-violet-50">
              {emoji && <span aria-hidden="true">{emoji} </span>}{title}
            </h1>
            {subtitle && <div className="text-[11px] text-violet-200/85 truncate">{subtitle}</div>}
          </div>
          {right}
          <button onClick={toggleVoice}
            role="switch"
            aria-checked={prefs.voiceOutput}
            aria-label={prefs.voiceOutput ? "Voice on — tap to mute brewmaster" : "Voice off — tap to enable brewmaster"}
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${LAB_PURPLE}55`, color: prefs.voiceOutput ? LAB_PURPLE : "rgba(237,233,254,0.5)", minWidth: 44, minHeight: 44 }}>
            {prefs.voiceOutput ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${LAB_PURPLE}55`, color: "#ede9fe", minWidth: 44, minHeight: 44 }}>
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>
      <main className="flex-1 p-3 lg:p-4 overflow-y-auto safe-bottom max-w-4xl mx-auto w-full">
        {children}
      </main>
      {settingsOpen && <ArcadeSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
