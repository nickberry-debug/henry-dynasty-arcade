// Beckett's Corner — landing page for Beckett's personal tools.
// Two tiles: Ash's Care Guide and Beckett's To-Do List.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ListChecks } from "lucide-react";
import { ResourcesShell } from "../components/ResourcesShell";

export default function BeckettsCorner() {
  const navigate = useNavigate();
  return (
    <ResourcesShell title="Beckett's Corner" subtitle="For Beckett" backTo="/resources" emoji="👶">
      <div className="space-y-3">
        <Tile
          onClick={() => navigate("/resources/becketts-corner/ash-care")}
          emoji="🦎"
          label="ASH'S CARE GUIDE"
          title="Everything about taking care of Ash"
          desc="6 chapters: feeding, habitat, water, daily schedule, health, emergency. For a 2-month-old bearded dragon."
          accent="#86efac"
        />
        <Tile
          onClick={() => navigate("/resources/becketts-corner/todo")}
          emoji="✅"
          label="BECKETT'S TO-DO LIST"
          title="Daily and weekly tasks"
          desc="Add tasks with voice or typing. Recurring tasks reset every morning. Confetti when you finish."
          accent="#fde68a"
        />
      </div>
    </ResourcesShell>
  );
}

function Tile({ onClick, emoji, label, title, desc, accent }: { onClick: () => void; emoji: string; label: string; title: string; desc: string; accent: string }) {
  return (
    <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }} onClick={onClick}
      aria-label={`${title}. ${desc}`}
      className="w-full rounded-2xl p-4 flex items-center gap-3 text-left pressable touch-target"
      style={{
        background: `linear-gradient(135deg, ${accent}28, rgba(5,46,22,0.85))`,
        border: `1px solid ${accent}66`,
        minHeight: 100,
      }}>
      <div className="text-3xl" aria-hidden="true">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: accent }}>{label}</div>
        <div className="font-display text-base text-emerald-50 mt-0.5">{title}</div>
        <div className="text-[12px] text-emerald-100/85 mt-1">{desc}</div>
      </div>
      <ChevronRight size={16} className="text-emerald-200/70" aria-hidden="true" />
    </motion.button>
  );
}
