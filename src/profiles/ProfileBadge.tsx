// Small floating profile badge shown in the arcade Landing header. Shows
// the active player's avatar + handle; tapping it returns to the
// "Who's Playing?" picker to switch instantly.

import { useActiveProfile, setActiveProfileId } from "./store";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

interface Props {
  /** Called after the user opts to switch — App routes back to picker. */
  onSwitch?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** "compact" hides the tagline. */
  variant?: "full" | "compact";
}

export function ProfileBadge({ onSwitch, className, style, variant = "compact" }: Props) {
  const profile = useActiveProfile();
  const navigate = useNavigate();
  if (!profile) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1 rounded-full ${className ?? ""}`}
      style={{
        padding: "3px 6px 3px 3px",
        background: `linear-gradient(135deg, ${profile.color}33, rgba(10,10,20,0.7))`,
        border: `1px solid ${profile.color}66`,
        color: profile.color,
        minHeight: 36,
        ...style,
      }}>
    <button
      type="button"
      onClick={() => {
        setActiveProfileId(null);
        onSwitch?.();
      }}
      aria-label={`Playing as ${profile.name}. Tap to switch player.`}
      className="inline-flex items-center gap-2 pressable touch-target"
      style={{ color: profile.color, minHeight: 32 }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: "50%",
        background: `${profile.color}22`,
        border: `1.5px solid ${profile.color}aa`,
        overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <img src={profile.avatar} alt="" aria-hidden="true" draggable={false}
          style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain" }} />
      </span>
      <span className="font-display text-[11px] tracking-widest whitespace-nowrap">
        {profile.name.toUpperCase()}
      </span>
      {variant === "full" && (
        <span className="text-[9px] opacity-75 ml-1 hidden sm:inline">{profile.tagline}</span>
      )}
    </button>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigate(`/profile/edit/${profile.id}`); }}
      aria-label={`Edit ${profile.name}'s profile`}
      className="pressable touch-target rounded-full"
      style={{
        width: 26, height: 26, minWidth: 26, minHeight: 26,
        background: `${profile.color}1f`,
        border: `1px solid ${profile.color}66`,
        color: profile.color,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Pencil size={11} aria-hidden="true" />
    </button>
    </motion.div>
  );
}
