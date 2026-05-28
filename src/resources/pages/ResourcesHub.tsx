// Resources hub — list of resource sections. Currently one tile:
// Beckett's Corner. Designed so we can drop in more rows later.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Baby, ChevronRight, Dumbbell, BookOpen, NotebookPen, Target } from "lucide-react";
import { ResourcesShell } from "../components/ResourcesShell";

interface Tile { to: string; icon: React.ReactNode; label: string; title: string; desc: string; accent: string }

const TILES: Tile[] = [
  {
    to: "/resources/becketts-corner",
    icon: <Baby size={28} className="text-emerald-300" aria-hidden="true" />,
    label: "BECKETT'S CORNER",
    title: "Care guides & to-do",
    desc: "Everything Beckett needs to look after Ash, plus his daily to-do list.",
    accent: "#86efac",
  },
  {
    to: "/resources/baseball-notes",
    icon: <NotebookPen size={26} aria-hidden="true" style={{ color: "#93c5fd" }} />,
    label: "BASEBALL NOTES",
    title: "Henry's hitting & pitching log",
    desc: "Log at-bats, pitches thrown, what worked, what didn't.",
    accent: "#93c5fd",
  },
  {
    to: "/resources/baseball-training",
    icon: <Target size={26} aria-hidden="true" style={{ color: "#fbbf24" }} />,
    label: "BASEBALL TRAINING",
    title: "Hitting & pitching drills",
    desc: "AI-coached drill prompts, swing/pitch feedback via camera.",
    accent: "#fbbf24",
  },
  {
    to: "/resources/fit-coach",
    icon: <Dumbbell size={26} aria-hidden="true" style={{ color: "#fca5a5" }} />,
    label: "FIT COACH",
    title: "Strength & conditioning",
    desc: "Bodyweight workouts, rest days, your AI coach watching form.",
    accent: "#fca5a5",
  },
  {
    to: "/resources/journal",
    icon: <BookOpen size={26} aria-hidden="true" style={{ color: "#c4b5fd" }} />,
    label: "JOURNAL",
    title: "Daily journal",
    desc: "Write it down. AI reads it back with kindness.",
    accent: "#c4b5fd",
  },
];

export default function ResourcesHub() {
  const navigate = useNavigate();
  return (
    <ResourcesShell title="Resources" subtitle="Family extras">
      <div className="space-y-3">
        {TILES.map((t, i) => (
          <motion.button
            key={t.to}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(t.to)}
            aria-label={`Open ${t.title}`}
            className="w-full rounded-2xl p-4 flex items-center gap-3 text-left pressable touch-target"
            style={{
              background: `linear-gradient(135deg, ${t.accent}22, rgba(5,46,22,0.85))`,
              border: `1px solid ${t.accent}66`,
              minHeight: 100,
            }}>
            {t.icon}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: t.accent }}>{t.label}</div>
              <div className="font-display text-lg text-emerald-50 mt-0.5">{t.title}</div>
              <div className="text-[12px] text-emerald-100/85">{t.desc}</div>
            </div>
            <ChevronRight size={16} className="text-emerald-200/70" aria-hidden="true" />
          </motion.button>
        ))}
      </div>
    </ResourcesShell>
  );
}
