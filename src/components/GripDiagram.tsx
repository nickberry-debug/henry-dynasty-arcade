// Detailed hand+ball SVG showing finger placement per pitch type.
// Side-profile view of a hand wrapping a baseball with the specific grip.
import type { PitchCard } from "../data/pitchArsenal";

interface Props {
  pitch: PitchCard;
  size?: number;
}

export function GripDiagram({ pitch, size = 220 }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-ink-700 to-ink-900 border border-white/5 p-4 flex items-center justify-center" style={{ minHeight: size }}>
      <svg viewBox="0 0 240 200" width="100%" style={{ maxHeight: size }}>
        {renderGrip(pitch.id)}
        <text x="120" y="190" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="9" fill="#9aa6bf" letterSpacing="1.5">
          {gripLabel(pitch.id)}
        </text>
      </svg>
    </div>
  );
}

function gripLabel(id: string): string {
  switch (id) {
    case "four-seam": return "INDEX + MIDDLE ACROSS SEAM · THUMB UNDER";
    case "two-seam": return "INDEX + MIDDLE ALONG TWO NARROW SEAMS";
    case "changeup": return "OK-CIRCLE GRIP · BALL DEEP IN PALM";
    case "curveball": return "MIDDLE ON SEAM · THUMB ON BACK SEAM (AGE 14+)";
    case "slider": return "OFFSET · MIDDLE FINGER PRESSURE (AGE 16+)";
    case "cutter": return "FOUR-SEAM OFF-CENTER (AGE 14+)";
    case "knuckleball": return "FINGERNAILS DIG INTO LEATHER · NO SPIN";
    case "splitter": return "INDEX + MIDDLE SPLIT WIDE (AGE 16+)";
  }
  return "";
}

/** Each grip = palm + 5 fingers + baseball with seams. Finger positions specific per pitch. */
function renderGrip(id: string): React.ReactNode {
  // Base layout: ball centered, hand coming from the right side wrapping around it.
  return (
    <>
      <defs>
        <radialGradient id="ball-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="80%" stopColor="#f1f5f9"/>
          <stop offset="100%" stopColor="#cbd5e1"/>
        </radialGradient>
        <linearGradient id="skin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ebbf9d"/>
          <stop offset="100%" stopColor="#c89870"/>
        </linearGradient>
        <radialGradient id="skin-grad-r" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#f5d0b0"/>
          <stop offset="100%" stopColor="#c89870"/>
        </radialGradient>
        <filter id="grip-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dy="2"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Wrist / palm coming from right side */}
      <g filter="url(#grip-shadow)">
        <path d="M 230 130 Q 175 145 145 130 Q 130 115 145 95 Q 175 80 230 95 Z" fill="url(#skin-grad)" stroke="#8f5a3a" strokeWidth="1.2"/>
        {/* Palm shading */}
        <path d="M 175 120 Q 150 122 145 115 Q 148 105 175 105" fill="rgba(0,0,0,0.12)"/>
      </g>

      {/* Baseball */}
      <g filter="url(#grip-shadow)">
        <circle cx="105" cy="100" r="48" fill="url(#ball-grad)" stroke="#94a3b8" strokeWidth="1"/>
        {/* Seams — based on pitch grip, seams angle differently */}
        {ballSeams(id)}
      </g>

      {/* Fingers — drawn per pitch */}
      {fingers(id)}

      {/* Thumb (always underneath, comes from the back) */}
      {thumb(id)}
    </>
  );
}

function ballSeams(id: string): React.ReactNode {
  // Default horseshoe orientation
  if (id === "two-seam") {
    // Two narrow seams running vertically (closer together)
    return (
      <>
        <path d="M 90 60 Q 100 100 90 140" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
        <path d="M 120 60 Q 110 100 120 140" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
      </>
    );
  }
  if (id === "curveball") {
    // Horseshoe vertical
    return (
      <>
        <path d="M 70 80 Q 105 70 140 80" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
        <path d="M 70 120 Q 105 130 140 120" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
      </>
    );
  }
  // Default horseshoe (four-seam etc.)
  return (
    <>
      <path d="M 65 90 Q 105 75 145 90" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
      <path d="M 65 110 Q 105 125 145 110" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeDasharray="3 2"/>
    </>
  );
}

function fingers(id: string): React.ReactNode {
  // Each finger: rounded rectangle from palm to ball with curve
  // Label each one
  const finger = (x: number, y: number, cx: number, cy: number, label: string, color = "url(#skin-grad-r)") => (
    <g>
      <path
        d={`M ${x} ${y} Q ${(x + cx) / 2 + 5} ${(y + cy) / 2 - 5} ${cx} ${cy}`}
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
        filter="url(#grip-shadow)"
      />
      {/* Fingernail dot */}
      <circle cx={cx} cy={cy} r="3" fill="#fcd5b5" stroke="#8f5a3a" strokeWidth="0.5"/>
      {/* Label */}
      <text x={cx - 6} y={cy + 24} fontSize="9" fill="#fbbf24" fontFamily="Oswald, sans-serif" fontWeight="700" textAnchor="middle">{label}</text>
    </g>
  );

  switch (id) {
    case "four-seam":
      return (
        <>
          {finger(180, 92, 100, 70, "INDEX")}
          {finger(195, 100, 115, 75, "MID")}
        </>
      );
    case "two-seam":
      return (
        <>
          {finger(180, 92, 92, 75, "INDEX")}
          {finger(195, 100, 118, 75, "MID")}
        </>
      );
    case "changeup":
      // OK-circle grip — index curls down to meet thumb, middle on top
      return (
        <>
          {finger(180, 95, 95, 85, "INDEX")}
          {finger(193, 100, 115, 78, "MID")}
          {finger(206, 108, 130, 90, "RING")}
        </>
      );
    case "curveball":
      // Middle finger along bottom seam, index relaxed
      return (
        <>
          {finger(180, 95, 105, 72, "INDEX")}
          {finger(195, 100, 120, 75, "MID")}
        </>
      );
    case "slider":
      // Offset — middle finger primary pressure
      return (
        <>
          {finger(178, 92, 105, 73, "INDEX")}
          {finger(195, 98, 125, 70, "MID")}
        </>
      );
    case "cutter":
      // Like four-seam but shifted right
      return (
        <>
          {finger(185, 93, 110, 75, "INDEX")}
          {finger(200, 100, 130, 80, "MID")}
        </>
      );
    case "knuckleball":
      // Fingernails dig in — short bent fingers
      return (
        <>
          {finger(185, 95, 110, 90, "NAIL")}
          {finger(200, 100, 125, 92, "NAIL")}
        </>
      );
    case "splitter":
      // Wide split
      return (
        <>
          {finger(178, 88, 85, 75, "INDEX")}
          {finger(200, 105, 130, 75, "MID")}
        </>
      );
  }
  return null;
}

function thumb(id: string): React.ReactNode {
  // Thumb always wraps from below the ball
  const t = (cx: number, cy: number) => (
    <g>
      <path
        d={`M 195 135 Q 165 145 ${cx} ${cy}`}
        stroke="url(#skin-grad-r)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
        filter="url(#grip-shadow)"
      />
      <circle cx={cx} cy={cy} r="3" fill="#fcd5b5" stroke="#8f5a3a" strokeWidth="0.5"/>
      <text x={cx - 18} y={cy + 6} fontSize="9" fill="#fbbf24" fontFamily="Oswald, sans-serif" fontWeight="700">THUMB</text>
    </g>
  );
  switch (id) {
    case "four-seam": return t(115, 130);
    case "two-seam": return t(110, 132);
    case "changeup": return t(115, 130);
    case "curveball": return t(100, 130);
    case "slider": return t(115, 130);
    case "cutter": return t(95, 132);
    case "knuckleball": return t(115, 132);
    case "splitter": return t(115, 132);
  }
  return null;
}
