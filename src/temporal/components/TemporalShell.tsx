// Temporal Order — chrome shared by all pages. Pixelated header with
// back button, era flag, integrity meter, settings.

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";
import { hasAnthropicKey } from "../../arcade/keys";

export const TEMPORAL_GOLD = "#f5c518";
export const TEMPORAL_BRONZE = "#92400e";

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
  flag?: string;
  children: React.ReactNode;
}

export function TemporalShell({ title, subtitle, backTo = "/", right, flag, children }: Props) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const keyOk = hasAnthropicKey();

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(180deg, #1a1308 0%, #050304 100%)",
      fontFamily: "ui-monospace, monospace",
      imageRendering: "pixelated" as any,
    }}>
      <header className="sticky top-0 z-30 px-3 py-2 backdrop-blur border-b safe-top" style={{
        background: "rgba(26,19,8,0.92)",
        borderBottomColor: `${TEMPORAL_GOLD}55`,
      }}>
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button onClick={() => navigate(backTo)}
            aria-label="Back"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${TEMPORAL_GOLD}55`, color: "#fef3c7", minWidth: 44, minHeight: 44 }}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.4em]" style={{ color: TEMPORAL_GOLD }}>
              {flag ? `${flag} ` : ""}TEMPORAL ORDER
            </div>
            <h1 className="font-display text-lg truncate text-amber-50">{title}</h1>
            {subtitle && <div className="text-[11px] text-amber-100/70 truncate">{subtitle}</div>}
          </div>
          {right}
          <button onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="relative w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${TEMPORAL_GOLD}55`, color: "#fef3c7", minWidth: 44, minHeight: 44 }}>
            <SettingsIcon size={16} />
            {!keyOk && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />}
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
