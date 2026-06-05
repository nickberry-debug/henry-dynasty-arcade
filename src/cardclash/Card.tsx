// Card Clash — visual card renderer. Composites the game-icons SVG
// emblem onto an element-tinted frame with cost gem, power, name,
// ability text. Static art per the spec.

import type { CardDef } from "./cards";
import { ELEMENT_COLOR, RARITY_COLOR } from "./cards";

interface Props {
  card: CardDef;
  size?: "sm" | "md" | "lg";
  /** Optional power override (when card is in play and modified). */
  power?: number;
  facedown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  /** Tap-to-reveal handler. When provided, the card shows a small "i"
   *  button in the corner that bubbles separately from onClick. This
   *  lets players see full ability text from any context (hand,
   *  board, deck builder, collection) without playing the card. */
  onInfo?: () => void;
}

const SIZE_W: Record<"sm" | "md" | "lg", number> = { sm: 70, md: 100, lg: 140 };

export function Card({ card, size = "md", power, facedown, onClick, disabled, highlighted, onInfo }: Props) {
  const w = SIZE_W[size];
  const h = Math.round(w * 1.4);
  const elemColor = ELEMENT_COLOR[card.element];
  const rarityColor = RARITY_COLOR[card.rarity];

  if (facedown) {
    return (
      <div onClick={onClick}
        className={`relative pressable touch-target ${disabled ? "opacity-50" : ""}`}
        style={{
          width: w, height: h, borderRadius: 8,
          background: "linear-gradient(135deg, #1e1b4b, #0a0814)",
          border: "2px solid rgba(167,139,250,0.55)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-display text-2xl tracking-widest" style={{ color: "rgba(167,139,250,0.5)" }}>?</div>
        </div>
      </div>
    );
  }

  const displayPower = power ?? card.power;
  const powerColor = power !== undefined && power < card.power ? "#f87171"
    : power !== undefined && power > card.power ? "#86efac"
    : "#fde047";

  return (
    <div onClick={onClick}
      className={`relative pressable touch-target ${disabled ? "opacity-50" : ""}`}
      style={{
        width: w, height: h, borderRadius: 8,
        background: `linear-gradient(135deg, ${elemColor}44, rgba(8,4,18,0.95))`,
        border: `2px solid ${highlighted ? "#fde047" : rarityColor}`,
        boxShadow: highlighted ? `0 0 16px ${rarityColor}cc` : `0 4px 12px rgba(0,0,0,0.45)`,
        cursor: disabled ? "default" : onClick ? "pointer" : "default",
      }}>
      {/* Cost gem (top-left) */}
      <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display font-bold"
        style={{
          background: `radial-gradient(circle at 30% 30%, #fff, ${elemColor})`,
          color: "#0a0a14",
          border: "1px solid rgba(0,0,0,0.4)",
        }}>
        {card.cost}
      </div>
      {/* Power (top-right) */}
      <div className="absolute top-1 right-1 px-1.5 rounded font-display font-bold text-[11px]"
        style={{
          background: "rgba(0,0,0,0.7)",
          color: powerColor,
          border: `1px solid ${powerColor}66`,
        }}>
        {displayPower}
      </div>
      {/* Emblem */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: w * 0.18 }}>
        <img
          src={`/assets/game-icons/${card.icon}.svg`}
          alt="" aria-hidden="true"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{
            width: w * 0.55, height: w * 0.55,
            filter: `drop-shadow(0 2px 6px ${elemColor}88) brightness(0) saturate(100%) invert(1)`,
            opacity: 0.9,
          }} />
        {/* Fallback element ring if icon doesn't load */}
        <div className="absolute" style={{
          width: w * 0.5, height: w * 0.5, borderRadius: "50%",
          border: `1px solid ${elemColor}44`,
          pointerEvents: "none",
        }} />
      </div>
      {/* Name banner */}
      <div className="absolute left-0 right-0" style={{ top: h * 0.62 }}>
        <div className="mx-1 px-1 py-0.5 text-center font-display tracking-wide truncate"
          style={{
            background: `linear-gradient(90deg, ${elemColor}55, ${elemColor}aa, ${elemColor}55)`,
            color: "#fef3c7", fontSize: size === "lg" ? 11 : 9,
            borderTop: `1px solid ${elemColor}aa`,
            borderBottom: `1px solid ${elemColor}aa`,
          }}>
          {card.name}
        </div>
      </div>
      {/* Ability text (lg only) */}
      {size === "lg" && card.effect && (
        <div className="absolute left-1 right-1 px-1 py-0.5 text-[8px] leading-tight"
          style={{ top: h * 0.72, color: "rgba(229,231,235,0.85)" }}>
          {card.text}
        </div>
      )}
      {/* Keyword tag (md & lg) */}
      {size !== "sm" && card.keyword !== "vanilla" && (
        <div className="absolute bottom-1 left-1 px-1 rounded text-[7px] tracking-widest font-display"
          style={{ background: `${elemColor}55`, color: "#fef3c7" }}>
          {card.keyword.toUpperCase()}
        </div>
      )}
      {/* Info button — tap to see full ability text in a modal.
          Stops propagation so it doesn't trigger the card's onClick
          (which is "play card" in the hand). */}
      {onInfo && (
        <button
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onInfo(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          aria-label="Card details"
          style={{
            position: "absolute",
            bottom: 2, right: 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "rgba(0,0,0,0.75)",
            border: `1px solid ${elemColor}aa`,
            color: "#fef3c7",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", lineHeight: 1,
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
          }}>
          i
        </button>
      )}
    </div>
  );
}

// ── Card detail modal ────────────────────────────────────────────────
//
// Tap an `i` button on any card → this overlay opens with the card's
// full details: name, element, rarity, keyword, cost, power, full
// ability text. Dismiss by tapping the backdrop or close button.

interface DetailProps {
  card: CardDef | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: DetailProps) {
  if (!card) return null;
  const elemColor = ELEMENT_COLOR[card.element];
  const rarityColor = RARITY_COLOR[card.rarity];
  return (
    <div
      onPointerDown={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, touchAction: "none",
      }}
      aria-label="Card details">
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          maxWidth: 360, width: "100%",
          borderRadius: 16, padding: 18,
          background: `linear-gradient(135deg, ${elemColor}33, rgba(8,4,18,0.95))`,
          border: `2px solid ${rarityColor}`,
          boxShadow: `0 12px 32px -8px ${rarityColor}66`,
          color: "#fef3c7",
        }}>
        {/* Header: name + rarity */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="font-display tracking-wide" style={{ color: "#fef3c7", fontSize: 18 }}>{card.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: rarityColor }}>
              {card.rarity} · {card.element}
            </div>
          </div>
          <button onPointerDown={onClose} aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)", color: "#fef3c7",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 18, lineHeight: 1, cursor: "pointer",
            }}>×</button>
        </div>
        {/* Stat row */}
        <div className="flex gap-3 mt-3">
          <Stat label="COST" value={card.cost} color={elemColor} />
          <Stat label="POWER" value={card.power} color="#fde047" />
          <Stat label="KEYWORD" value={card.keyword === "vanilla" ? "—" : card.keyword.toUpperCase()} color={rarityColor} small />
        </div>
        {/* Ability text */}
        <div className="mt-3 px-3 py-2 rounded-md text-[12px] leading-relaxed"
          style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {card.text || <span className="opacity-60">No special ability — pure stats.</span>}
        </div>
        {/* Hint */}
        <div className="text-[10px] opacity-60 mt-3 text-center tracking-wider">
          TAP ANYWHERE TO DISMISS
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, small }: { label: string; value: number | string; color: string; small?: boolean }) {
  return (
    <div className="flex-1 rounded-md py-1.5 px-2 text-center"
      style={{ background: `${color}1f`, border: `1px solid ${color}55` }}>
      <div className="text-[8px] tracking-widest uppercase" style={{ color, opacity: 0.85 }}>{label}</div>
      <div className="font-display mt-0.5" style={{ color: "#fef3c7", fontSize: small ? 11 : 16 }}>{value}</div>
    </div>
  );
}
