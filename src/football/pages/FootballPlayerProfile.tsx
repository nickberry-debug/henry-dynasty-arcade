// Football — Player Profile.
// Mirrors Baseball Dynasty's PlayerProfile pattern: portrait + flip-card,
// ratings grid with bars, career stats table (rolled up by season),
// awards strip. Reads/writes via the football store.
import { useParams, Link } from "react-router-dom";
import { useFootball } from "../store";
import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft } from "lucide-react";
import type { FootballPlayer, FootballPosition } from "../types";

export default function FootballPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const lg = useFootball(s => s.league);
  const [flipped, setFlipped] = useState(false);

  if (!lg) return <div className="p-8 text-ink-200">No league.</div>;
  if (!id) return <div className="p-8 text-ink-200">No player id.</div>;

  const player =
    lg.players.find(p => p.id === id) ??
    lg.freeAgents.find(p => p.id === id) ??
    (lg.retiredPlayers ?? []).find(p => p.id === id);
  if (!player) {
    return (
      <div className="p-8 text-center text-ink-200">
        <div className="text-4xl mb-3">🤷</div>
        <div>Player not found.</div>
        <Link to="/football" className="mt-4 inline-block px-3 py-2 rounded bg-white/8 text-sm">Back to Football</Link>
      </div>
    );
  }
  const team = player.teamId ? lg.teams.find(t => t.id === player.teamId) ?? null : null;

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>
            {team ? <Link to={`/football/team/${team.id}`} style={{ color: team.accent }}>{team.city} {team.name}</Link> : "Free Agent"}
            {player.retired && " · Retired"}
            {player.hof && " · 🏛️ Hall of Fame"}
          </div>
          <h1 className="font-display text-3xl">{player.name.toUpperCase()}</h1>
          <div className="text-xs text-ink-200 mt-1">
            {player.position} · #{player.jersey} · Age {player.age} · {player.yearsExp}y experience
          </div>
        </div>
      </header>

      {/* Hero — portrait flip card + headline ratings */}
      <section className="flex items-start gap-5 flex-wrap">
        <div className="relative" style={{ perspective: 1200 }}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: "preserve-3d", width: 200, height: 240 }}
          >
            <div
              onClick={() => setFlipped(true)}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(true); } }}
              style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
              className="rounded-2xl cursor-pointer pressable overflow-hidden"
            >
              <FootballPortrait player={player} team={team} />
            </div>
            <div
              onClick={() => setFlipped(false)}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(false); } }}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
              className="rounded-2xl cursor-pointer p-3 text-xs"
            >
              <div
                className="w-full h-full rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: `linear-gradient(160deg, ${team?.primary ?? "#1f2937"}, #050308)`, border: `1px solid ${team?.accent ?? "#FFB81C"}66` }}
              >
                <div className="font-display text-base">{player.name}</div>
                <div className="text-ink-200">{player.position} · #{player.jersey}</div>
                <div className="font-mono mt-1">Age {player.age} · {player.yearsExp}y exp</div>
                <div className="font-mono">OVR {player.overall} · POT {player.potential}</div>
                {player.injury && (
                  <div className="text-red-300 mt-1">IL — {player.injury.name} · {player.injury.weeksOut}w</div>
                )}
                <div className="text-ink-300 mt-auto">tap to flip back</div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <RatingBadge label="OVR" value={player.overall} prev={player.prevOvr} />
            <RatingBadge label="POT" value={player.potential} />
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-ink-200 uppercase tracking-widest">Status</div>
              <div className="font-display text-sm" style={{ color: player.retired ? "#94a3b8" : "#86efac" }}>
                {player.retired ? "RETIRED" : player.injury ? "INJURED" : "ACTIVE"}
              </div>
            </div>
          </div>
          {player.injury && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
              <span className="text-red-300 font-semibold">IL</span> — {player.injury.name} · out {player.injury.weeksOut}w
            </div>
          )}
          {Array.isArray(player.awards) && player.awards.length > 0 && (
            <div>
              <div className="text-[10px] text-ink-200 uppercase tracking-widest mb-1">Awards</div>
              <div className="flex flex-wrap gap-1.5">
                {player.awards.slice().reverse().slice(0, 16).map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-full text-amber-200"
                    style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)" }}>
                    ★ {a.season} {a.type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ratings grid */}
      <section className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-3" style={{ color: "#FFB81C" }}>RATINGS</div>
        <RatingsGrid player={player} />
      </section>

      {/* Career stats table */}
      <section className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-3" style={{ color: "#FFB81C" }}>CAREER STATS</div>
        <CareerTable player={player} teams={lg.teams} />
      </section>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────

function RatingBadge({ label, value, prev }: { label: string; value: number; prev?: number }) {
  const delta = prev !== undefined ? value - prev : 0;
  return (
    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
      <div className="text-[10px] text-ink-200 uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl" style={{ color: ratingColor(value) }}>
        {value}
        {delta !== 0 && prev !== undefined && (
          <span className={`ml-1 text-[10px] ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function ratingColor(n: number): string {
  if (n >= 90) return "#fde047";
  if (n >= 80) return "#86efac";
  if (n >= 70) return "#67e8f9";
  if (n >= 60) return "#fef3c7";
  return "#94a3b8";
}

function RATING_FIELDS(pos: FootballPosition): Array<{ key: keyof FootballPlayer["ratings"]; label: string }> {
  if (pos === "QB") return [
    { key: "armStrength", label: "Arm Strength" },
    { key: "accuracy", label: "Accuracy" },
    { key: "decision", label: "Decision Making" },
    { key: "composure", label: "Composure" },
    { key: "awareness", label: "Awareness" },
    { key: "stamina", label: "Stamina" },
  ];
  if (pos === "RB" || pos === "FB") return [
    { key: "speed", label: "Speed" },
    { key: "agility", label: "Agility" },
    { key: "breakTackle", label: "Break Tackle" },
    { key: "hands", label: "Hands" },
    { key: "stamina", label: "Stamina" },
    { key: "composure", label: "Composure" },
  ];
  if (pos === "WR" || pos === "TE") return [
    { key: "speed", label: "Speed" },
    { key: "hands", label: "Hands" },
    { key: "routeRunning", label: "Route Running" },
    { key: "agility", label: "Agility" },
    { key: "blocking", label: "Blocking" },
    { key: "stamina", label: "Stamina" },
  ];
  if (pos === "OL") return [
    { key: "blocking", label: "Blocking" },
    { key: "awareness", label: "Awareness" },
    { key: "stamina", label: "Stamina" },
    { key: "composure", label: "Composure" },
  ];
  if (pos === "DL") return [
    { key: "passRush", label: "Pass Rush" },
    { key: "runDefense", label: "Run Defense" },
    { key: "tackling", label: "Tackling" },
    { key: "awareness", label: "Awareness" },
    { key: "stamina", label: "Stamina" },
  ];
  if (pos === "LB") return [
    { key: "tackling", label: "Tackling" },
    { key: "runDefense", label: "Run Defense" },
    { key: "coverage", label: "Coverage" },
    { key: "awareness", label: "Awareness" },
    { key: "stamina", label: "Stamina" },
  ];
  if (pos === "CB" || pos === "S") return [
    { key: "coverage", label: "Coverage" },
    { key: "speed", label: "Speed" },
    { key: "tackling", label: "Tackling" },
    { key: "awareness", label: "Awareness" },
    { key: "stamina", label: "Stamina" },
  ];
  if (pos === "K" || pos === "P") return [
    { key: "kickPower", label: "Kick Power" },
    { key: "kickAccuracy", label: "Kick Accuracy" },
    { key: "composure", label: "Composure" },
  ];
  return [];
}

function RatingsGrid({ player }: { player: FootballPlayer }) {
  const fields = RATING_FIELDS(player.position);
  if (fields.length === 0) return <div className="text-ink-300 text-sm">No position-specific ratings.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map(f => {
        const v = player.ratings[f.key] ?? 0;
        return (
          <div key={f.key} className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest text-ink-200 w-32 shrink-0">{f.label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div style={{ width: `${Math.abs(v)}%`, background: "linear-gradient(90deg, #f97316, #fde047, #86efac)" }} className="h-full" />
            </div>
            <span className="font-mono font-bold w-10 text-right" style={{ color: ratingColor(v) }}>
              {Math.round(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CareerTable({ player, teams }: { player: FootballPlayer; teams: FootballPlayer extends infer T ? any : any }) {
  const stats = Array.isArray(player.careerStats) ? player.careerStats : [];
  // Also include this season's in-progress numbers at the top if there's data.
  const allRows = [...stats].reverse();
  if (player.seasonStats?.games > 0) {
    allRows.unshift({ ...player.seasonStats, season: 0 as any, age: player.age, teamId: player.teamId });
  }
  if (allRows.length === 0) {
    return <div className="text-ink-200 text-sm">No career stats yet — play some games.</div>;
  }
  const pos = player.position;
  const isQB = pos === "QB";
  const isRB = pos === "RB" || pos === "FB";
  const isRec = pos === "WR" || pos === "TE";
  const isDef = pos === "DL" || pos === "LB" || pos === "CB" || pos === "S";
  const isK = pos === "K" || pos === "P";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
          <tr>
            <th className="p-2 text-left">Season</th>
            <th>Age</th>
            <th>Team</th>
            <th>G</th>
            {isQB && <>
              <th>Cmp/Att</th><th>Yds</th><th>TD</th><th>INT</th>
            </>}
            {isRB && <>
              <th>Att</th><th>Rush Yds</th><th>TD</th><th>Rec</th>
            </>}
            {isRec && <>
              <th>Rec</th><th>Yds</th><th>TD</th><th>Tgt</th>
            </>}
            {isDef && <>
              <th>Tkl</th><th>Sacks</th><th>INT</th><th>TD</th>
            </>}
            {isK && <>
              <th>FG</th><th>XP</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {allRows.map((s: any, i: number) => {
            const team = teams.find((t: any) => t.id === s.teamId) ?? null;
            const isCurrent = s.season === 0 || i === 0 && !stats.length;
            return (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2 font-mono">{isCurrent ? "(current)" : s.season}</td>
                <td className="p-2 text-center font-mono">{s.age}</td>
                <td className="p-2 text-center">{team ? <span style={{ color: team.accent }}>{team.abbr}</span> : "FA"}</td>
                <td className="p-2 text-center font-mono">{s.games ?? 0}</td>
                {isQB && <>
                  <td className="p-2 text-center font-mono">{s.passComp ?? 0}/{s.passAtt ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.passYds ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.passTD ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.passInt ?? 0}</td>
                </>}
                {isRB && <>
                  <td className="p-2 text-center font-mono">{s.rushAtt ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.rushYds ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.rushTD ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.receptions ?? 0}</td>
                </>}
                {isRec && <>
                  <td className="p-2 text-center font-mono">{s.receptions ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.recYds ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.recTD ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.targets ?? 0}</td>
                </>}
                {isDef && <>
                  <td className="p-2 text-center font-mono">{s.tackles ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.sacks ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.interceptions ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.defTD ?? 0}</td>
                </>}
                {isK && <>
                  <td className="p-2 text-center font-mono">{s.fgMade ?? 0}/{s.fgAtt ?? 0}</td>
                  <td className="p-2 text-center font-mono">{s.xpMade ?? 0}/{s.xpAtt ?? 0}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Reuse Football's existing portrait if one exists, otherwise generate a
// simple themed block so the page always has visual content.
function FootballPortrait({ player, team }: { player: FootballPlayer; team: any }) {
  const primary = team?.primary ?? "#1f2937";
  const accent = team?.accent ?? "#FFB81C";
  const skinHues = ["#fde68a", "#fcd5b5", "#e9b384", "#c08763", "#8b5a3c", "#5d3a23", "#3d2415", "#2c1810"];
  const skin = skinHues[player.appearance.skinTone % skinHues.length];
  // Number jersey at center-bottom; helmet circle at top; abstract face.
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{ background: `linear-gradient(160deg, ${primary}, #050308)` }}
    >
      <svg viewBox="0 0 200 240" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        {/* Helmet */}
        <circle cx="100" cy="60" r="38" fill={primary} stroke={accent} strokeWidth="3" />
        <circle cx="100" cy="63" r="28" fill={skin} />
        {/* Face mask */}
        <rect x="78" y="60" width="44" height="2" fill={accent} />
        <rect x="78" y="68" width="44" height="2" fill={accent} />
        <rect x="78" y="76" width="44" height="2" fill={accent} />
        {/* Eyes */}
        <circle cx="92" cy="66" r="1.5" fill="#111" />
        <circle cx="108" cy="66" r="1.5" fill="#111" />
        {/* Jersey */}
        <path d="M50 110 L100 100 L150 110 L160 200 L40 200 Z" fill={primary} stroke={accent} strokeWidth="2" />
        <text x="100" y="170" textAnchor="middle" fontSize="48" fontWeight="bold" fill={accent} fontFamily="Impact, Oswald, sans-serif">
          {player.jersey}
        </text>
        {/* Position badge */}
        <rect x="6" y="6" rx="3" width="38" height="16" fill={accent} />
        <text x="25" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0a0d13">{player.position}</text>
      </svg>
    </div>
  );
}
