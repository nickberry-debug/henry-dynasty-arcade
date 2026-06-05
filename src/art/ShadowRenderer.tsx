// ShadowRenderer — soft grounded shadow under any sprite. Pure CSS
// radial gradient; no assets. Drop it just behind a character/object
// at its feet.

interface Props {
  /** Width of the shadow in px (roughly the sprite's foot width). */
  width?: number;
  /** Opacity 0..1. Lower it as the sprite "jumps" higher. */
  opacity?: number;
  /** Squash the shadow when airborne (0 = flat on ground, 1 = small). */
  lift?: number;
  style?: React.CSSProperties;
}

export function ShadowRenderer({ width = 48, opacity = 0.4, lift = 0, style }: Props) {
  // As lift increases, shadow shrinks + fades (object farther from ground).
  const scale = 1 - lift * 0.5;
  const op = opacity * (1 - lift * 0.6);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width,
        height: width * 0.32,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at center, rgba(0,0,0,${op}) 0%, rgba(0,0,0,${op * 0.5}) 45%, transparent 72%)`,
        transform: `translateX(-50%) scaleX(${scale})`,
        left: "50%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
