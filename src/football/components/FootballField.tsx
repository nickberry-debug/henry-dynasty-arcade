// Football field SVG — overhead view, with yard lines, hash marks, end
// zones colored to the home team, line-of-scrimmage marker, first-down
// marker, animated ball trajectory, and a "play action" zone where
// player widgets cluster.
//
// Coordinate system: viewBox 0 0 1200 400. Each yard = ~10px on x.
// End zones are 100px wide; the playing surface runs from x=100 to x=1100.
import { motion } from "framer-motion";
import type { FootballPlay } from "../types";
import type { FootballTeam } from "../types";

interface Props {
  lastPlay: FootballPlay | null;
  home: FootballTeam;
  away: FootballTeam;
  /** Yard ball is on (0-100, 0 = away's end zone). */
  ballYard: number;
  /** Which team has possession (id). */
  possessionId: string;
  /** Yards to first down. */
  toGo: number;
  down: 1 | 2 | 3 | 4 | 0;
}

export function FootballField({ lastPlay, home, away, ballYard, possessionId, toGo, down }: Props) {
  // Convert "yard from offense's perspective" (0-100) to absolute field x.
  // Offense always drives left-to-right in our visualization.
  const offIsHome = possessionId === home.id;
  // ballYard 0 = own goal line; 100 = opp goal line. Visually map 0 → x=200 (own 0), 100 → x=1100 (opp 0).
  const xOf = (yard: number) => 100 + (yard / 100) * 1000;
  const ballX = xOf(ballYard);
  // First down marker
  const firstDownYard = Math.min(100, ballYard + toGo);
  const firstDownX = xOf(firstDownYard);

  const offTeam = offIsHome ? home : away;
  const defTeam = offIsHome ? away : home;

  // Compute ball trajectory for animation
  const traj = lastPlay ? trajectoryFor(lastPlay, xOf) : null;

  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet" className="w-full h-auto max-h-full">
      {/* Stands silhouette behind field */}
      <defs>
        <linearGradient id="fb-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b3d2e" />
          <stop offset="100%" stopColor="#062a1f" />
        </linearGradient>
        <pattern id="fb-mow" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="transparent" />
          <rect width="40" height="20" fill="rgba(255,255,255,0.03)" />
        </pattern>
      </defs>

      {/* Stands */}
      <rect width="1200" height="400" fill="#0a0d13" />
      <path d="M 0 0 L 1200 0 L 1200 60 Q 600 30 0 60 Z" fill="#161e28" />
      <path d="M 0 340 Q 600 370 1200 340 L 1200 400 L 0 400 Z" fill="#161e28" />

      {/* Field */}
      <rect x="0" y="60" width="1200" height="280" fill="url(#fb-grass)" />
      <rect x="0" y="60" width="1200" height="280" fill="url(#fb-mow)" />

      {/* End zones */}
      <rect x="0" y="60" width="100" height="280" fill={offIsHome ? away.primary : home.primary} opacity="0.85" />
      <rect x="1100" y="60" width="100" height="280" fill={offIsHome ? home.primary : away.primary} opacity="0.85" />
      {/* End zone team labels */}
      <text x="50" y="210" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="42" fill={offIsHome ? away.accent : home.accent} transform="rotate(-90 50 210)" letterSpacing="3" opacity="0.9">
        {(offIsHome ? away.abbr : home.abbr).slice(0, 8)}
      </text>
      <text x="1150" y="210" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="42" fill={offIsHome ? home.accent : away.accent} transform="rotate(90 1150 210)" letterSpacing="3" opacity="0.9">
        {(offIsHome ? home.abbr : away.abbr).slice(0, 8)}
      </text>

      {/* Yard lines + numbers */}
      {Array.from({ length: 11 }, (_, i) => {
        const yard = i * 10;
        const x = xOf(yard);
        const labelYard = yard <= 50 ? yard : 100 - yard;
        return (
          <g key={i}>
            <line x1={x} y1={60} x2={x} y2={340} stroke="rgba(255,255,255,0.5)" strokeWidth={yard === 50 ? 2.5 : 1.2} />
            {yard !== 0 && yard !== 100 && (
              <>
                <text x={x} y={110} textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="22" fill="#fff" opacity="0.7">{labelYard}</text>
                <text x={x} y={310} textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="22" fill="#fff" opacity="0.7">{labelYard}</text>
              </>
            )}
          </g>
        );
      })}
      {/* Hash marks */}
      {Array.from({ length: 50 }, (_, i) => {
        const x = xOf(i * 2);
        if (i * 2 === 0 || i * 2 === 100) return null;
        return (
          <g key={`h${i}`} stroke="rgba(255,255,255,0.3)" strokeWidth="1">
            <line x1={x} y1={150} x2={x} y2={156} />
            <line x1={x} y1={244} x2={x} y2={250} />
          </g>
        );
      })}

      {/* Line of scrimmage */}
      <line x1={ballX} y1={60} x2={ballX} y2={340} stroke="#fbbf24" strokeWidth="3" />
      {/* First down marker */}
      {down !== 0 && (
        <line x1={firstDownX} y1={60} x2={firstDownX} y2={340} stroke="#FFB81C" strokeWidth="2" strokeDasharray="6 4" opacity="0.85" />
      )}

      {/* Down and distance badge */}
      {down !== 0 && (
        <g>
          <rect x={ballX - 36} y={45} width="72" height="22" rx="4" fill="#FFB81C" />
          <text x={ballX} y={61} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill="#0a0d13" letterSpacing="1.5">
            {ordinal(down)} & {toGo >= 100 ? "GOAL" : toGo}
          </text>
        </g>
      )}

      {/* Offense widgets clustered at LOS */}
      <PlayerCluster x={ballX - 30} centerY={200} team={offTeam} side="offense" />
      <PlayerCluster x={ballX + 30} centerY={200} team={defTeam} side="defense" />

      {/* Ball trajectory */}
      {traj && (
        <motion.g
          key={`traj-${lastPlay?.seq}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.path
            d={traj.path}
            stroke={traj.color}
            strokeWidth={traj.thick ? 2.5 : 1.6}
            fill="none"
            strokeDasharray={traj.dashed ? "6 4" : undefined}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
          <motion.circle
            r={6}
            fill="#fff"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{ offsetPath: `path('${traj.path}')`, filter: "drop-shadow(0 0 4px #fff)" }}
          />
        </motion.g>
      )}

      {/* Ball position dot (after the play) */}
      <circle cx={ballX} cy={200} r="5" fill="#8B4513" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

function PlayerCluster({ x, centerY, team, side }: { x: number; centerY: number; team: FootballTeam; side: "offense" | "defense" }) {
  const offsets = side === "offense"
    ? [{ y: -50 }, { y: -25 }, { y: 0 }, { y: 25 }, { y: 50 }, { y: -10, x: -20 }, { y: 10, x: -20 }]
    : [{ y: -45 }, { y: -20 }, { y: 5 }, { y: 30 }, { y: 55 }, { y: -25, x: 30 }, { y: 25, x: 30 }];
  return (
    <g>
      {offsets.map((o, i) => (
        <g key={i}>
          <circle cx={x + (o.x ?? 0)} cy={centerY + o.y} r="6" fill={team.primary} stroke="#000" strokeWidth="0.6" opacity="0.85" />
          <circle cx={x + (o.x ?? 0)} cy={centerY + o.y} r="3" fill={team.accent} opacity="0.9" />
        </g>
      ))}
    </g>
  );
}

function trajectoryFor(play: FootballPlay, xOf: (y: number) => number) {
  const startX = xOf(play.startYard);
  const endX = xOf(play.endYard);
  const baseY = 200;
  if (play.kind === "run" || play.kind === "touchdown" && play.rusher) {
    // Straight or slight curve along the ground.
    const midX = (startX + endX) / 2;
    const midY = baseY + (((play.seq % 2) === 0) ? -25 : 25);
    return { path: `M ${startX} ${baseY} Q ${midX} ${midY} ${endX} ${baseY}`, color: "#fbbf24", thick: play.yards >= 10, dashed: false };
  }
  if (play.kind === "shortPass" || play.kind === "mediumPass") {
    const midX = (startX + endX) / 2;
    const arcHeight = play.kind === "mediumPass" ? 80 : 50;
    return { path: `M ${startX} ${baseY} Q ${midX} ${baseY - arcHeight} ${endX} ${baseY}`, color: "#22c55e", thick: false, dashed: true };
  }
  if (play.kind === "longPass" || (play.kind === "touchdown" && play.receiver)) {
    const midX = (startX + endX) / 2;
    return { path: `M ${startX} ${baseY} Q ${midX} ${baseY - 130} ${endX} ${baseY}`, color: "#FFB81C", thick: true, dashed: true };
  }
  if (play.kind === "incomplete") {
    return { path: `M ${startX} ${baseY} Q ${(startX + endX) / 2} ${baseY - 60} ${endX} ${baseY + 20}`, color: "rgba(255,255,255,0.55)", thick: false, dashed: true };
  }
  if (play.kind === "sack") {
    return { path: `M ${startX} ${baseY} L ${endX} ${baseY}`, color: "#ef4444", thick: true, dashed: false };
  }
  if (play.kind === "interception") {
    return { path: `M ${startX} ${baseY} Q ${(startX + endX) / 2} ${baseY - 80} ${endX} ${baseY}`, color: "#ef4444", thick: true, dashed: true };
  }
  if (play.kind === "fieldGoal") {
    return { path: `M ${startX} ${baseY} Q ${(startX + 1150) / 2} ${baseY - 120} ${1150} ${baseY}`, color: "#FFB81C", thick: true, dashed: true };
  }
  if (play.kind === "punt") {
    return { path: `M ${startX} ${baseY} Q ${(startX + endX) / 2} ${baseY - 150} ${endX} ${baseY}`, color: "rgba(255,255,255,0.85)", thick: false, dashed: true };
  }
  return null;
}

function ordinal(n: number): string {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}
