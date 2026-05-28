// Cosmic Squad — shared shell. Top bar with back-to-arcade and
// settings gear. Subdued cosmic background.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";
import { hasAnthropicKey } from "../../arcade/keys";

const ACCENT = "#9be3ff";

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function CosmicShell({ title, subtitle, backTo = "/", rightSlot, children }: Props) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const keyConfigured = hasAnthropicKey();

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "radial-gradient(ellipse at top, #0c1830 0%, #050810 60%, #02040a 100%)",
    }}>
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur border-b safe-top" style={{
        background: "linear-gradient(180deg, rgba(8,12,24,0.92), rgba(8,12,24,0.75))",
        borderBottomColor: `${ACCENT}33`,
      }}>
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button
            onClick={() => navigate(backTo)}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            aria-label="Back"
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.4em] font-display" style={{ color: ACCENT }}>COSMIC SQUAD</div>
            <div className="font-display text-xl truncate text-white">{title}</div>
            {subtitle && <div className="text-[11px] text-ink-300 truncate">{subtitle}</div>}
          </div>
          {rightSlot}
          <button
            onClick={() => setSettingsOpen(true)}
            className="relative w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target"
            aria-label="Settings"
            style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
          >
            <SettingsIcon size={18} />
            {!keyConfigured && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto safe-bottom max-w-5xl mx-auto w-full">
        {children}
      </main>

      {settingsOpen && <ArcadeSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export const COSMIC_ACCENT = ACCENT;
