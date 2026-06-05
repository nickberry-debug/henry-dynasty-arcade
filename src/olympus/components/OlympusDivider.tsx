// OlympusDivider — ornamental section divider using Kenney's CC0 Fantasy UI
// Borders (white-on-transparent line-art with a Greek-key-ish end motif).
// The PNG is used as a CSS mask so we can colorize it to Olympus gold
// (#DAA520) cleanly — masking turns the white shape into a solid-gold shape
// while preserving its alpha. Decorative only (aria-hidden).

const GOLD = "#DAA520";

interface Props {
  /** Which divider art (000..005). Different end-motifs / weights. */
  variant?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Tint colour; defaults to Olympus gold. */
  color?: string;
  /** Mirror horizontally (so a left and right divider can frame a title). */
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function OlympusDivider({ variant = 3, color = GOLD, flip = false, className, style }: Props) {
  const url = `/assets/kenney/fui/divider-${String(variant).padStart(3, "0")}.png`;
  const mask = `url("${url}") no-repeat center / contain`;
  return (
    <div aria-hidden="true" className={className}
      style={{
        height: 22,
        width: "100%",
        background: color,
        WebkitMask: mask,
        mask,
        transform: flip ? "scaleX(-1)" : undefined,
        opacity: 0.9,
        ...style,
      }} />
  );
}

/** A centered title flanked by two mirrored gold dividers — for section
 *  headers in Olympus screens. */
export function OlympusSectionTitle({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <OlympusDivider variant={3} color={color} flip style={{ flex: 1 }} />
      <span className="font-display text-sm tracking-[0.25em] whitespace-nowrap" style={{ color }}>
        {children}
      </span>
      <OlympusDivider variant={3} color={color} style={{ flex: 1 }} />
    </div>
  );
}
