// SportsEquipStrip — a decorative row of Kenney CC0 Sports Pack equipment
// sprites used to add tactile "depth" to the baseball / football hubs.
// Pure decoration (aria-hidden); sprites are real PNGs so they read as
// physical objects rather than flat emoji.

const ASSET = (f: string) => `/assets/kenney/sports/${f}.png`;

const SETS: Record<string, string[]> = {
  baseball: ["bat_wood", "ball_baseball", "helmet_white1", "glove"],
  football: ["ball_football", "helmet_white1", "ball_soccer1", "ball_basket1"],
};

interface Props {
  sport: "baseball" | "football";
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SportsEquipStrip({ sport, size = 26, className, style }: Props) {
  const items = SETS[sport] ?? SETS.baseball;
  return (
    <div aria-hidden="true" className={className}
      style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      {items.map((f, i) => (
        <img key={f} src={ASSET(f)} alt="" draggable={false}
          style={{
            width: size, height: size, objectFit: "contain",
            opacity: 0.85,
            transform: `rotate(${(i % 2 ? 1 : -1) * (6 + i * 2)}deg)`,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
          }} />
      ))}
    </div>
  );
}
