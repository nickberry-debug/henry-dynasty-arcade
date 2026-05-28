// Shared shell for the Resources section. Back-to-landing nav, accent
// gradient header, settings gear (re-uses arcade settings modal).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";

interface Props {
  title: string;
  subtitle?: string;
  emoji?: string;
  backTo?: string;
  accent?: string;
  children: React.ReactNode;
}

export function ResourcesShell({ title, subtitle, emoji, backTo = "/", accent = "#86efac", children }: Props) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #052e16 0%, #050306 100%)" }}>
      <header className="sticky top-0 z-30 px-3 py-2.5 backdrop-blur border-b safe-top" style={{
        background: "rgba(5,46,22,0.92)",
        borderBottomColor: `${accent}44`,
      }}>
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <button onClick={() => navigate(backTo)} aria-label="Back"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${accent}55`, color: "#f0fdf4", minWidth: 44, minHeight: 44 }}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.4em]" style={{ color: accent }}>RESOURCES</div>
            <h1 className="font-display text-lg truncate text-emerald-50">
              {emoji && <span aria-hidden="true">{emoji} </span>}{title}
            </h1>
            {subtitle && <div className="text-[11px] text-emerald-100/80 truncate">{subtitle}</div>}
          </div>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings"
            className="w-10 h-10 rounded flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${accent}55`, color: "#f0fdf4", minWidth: 44, minHeight: 44 }}>
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>
      <main className="flex-1 p-3 lg:p-4 overflow-y-auto safe-bottom max-w-3xl mx-auto w-full">
        {children}
      </main>
      {settingsOpen && <ArcadeSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
