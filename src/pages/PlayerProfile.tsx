import { useParams, Link } from "react-router-dom";
import { useStore } from "../store";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { TeamLogo } from "../components/TeamLogo";
import { NumberStepper } from "../components/NumberStepper";
import { fmt } from "../utils/format";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerProfile() {
  const { id } = useParams();
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const [flipped, setFlipped] = useState(false);
  const [edit, setEdit] = useState(false);
  if (!league || !id) return null;
  const player = league.players.find(p => p.id === id) || league.freeAgents.find(p => p.id === id) || league.retiredPlayers.find(p => p.id === id);
  if (!player) return <div>Player not found</div>;
  const team = (player.teamId ? league.teams.find(t => t.id === player.teamId) : null) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6 flex-wrap">
        <div className="relative" style={{ perspective: 1200 }}>
          <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.7 }} style={{ transformStyle: "preserve-3d" }}>
            <div
              role="button" tabIndex={0}
              aria-label={`${player.name} portrait — flip for stats`}
              style={{ backfaceVisibility: "hidden" }}
              onClick={() => setFlipped(true)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(true); } }}
              className="cursor-pointer pressable"
            >
              <PlayerPortrait player={player} team={team} size={220} pose={player.isPitcher ? "pitching" : "batting"} />
            </div>
            <div
              role="button" tabIndex={0}
              aria-label={`Flip back to ${player.name} portrait`}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
              onClick={() => setFlipped(false)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(false); } }}
              className="cursor-pointer"
            >
              <div className="w-[220px] h-[275px] rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 border border-white/10 p-4 text-xs">
                <div className="font-display text-lg mb-1">{player.name}</div>
                <div className="text-ink-200 mb-2">{player.position} • #{player.jerseyNumber}</div>
                <div className="space-y-1 font-mono">
                  <div>HT: {fmt.height(player.height)}</div>
                  <div>WT: {player.weight} lb</div>
                  <div>B/T: {player.bats}/{player.throws}</div>
                  <div>Born: {player.birthYear} • {player.birthplace}</div>
                  <div>Origin: {player.origin}</div>
                </div>
                <div className="mt-2 text-ink-200">Tap to flip back</div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">
            {team ? <Link to={`/team/${team.id}`}><span style={{color: team.accent}}>{team.city} {team.name}</span></Link> : "Free Agent"}
            {player.retired && " • RETIRED"}
            {player.hof && " • Hall of Fame"}
          </div>
          <h1 className="font-display text-5xl leading-none">{player.name.toUpperCase()}</h1>
          {player.nickname && <div className="text-accent italic mt-1">"{player.nickname}"</div>}
          <div className="text-ink-200 text-sm mt-2">
            {player.position} • #{player.jerseyNumber} • Age {player.age} • {player.bats}/{player.throws}
          </div>
          <div className="flex gap-3 mt-3 items-center">
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-ink-200 uppercase tracking-widest">Overall</div>
              <div className="font-display text-2xl" style={{ color: fmt.ratingColor(player.overall) }}>{player.overall}</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-ink-200 uppercase tracking-widest">Potential</div>
              <div className="font-display text-2xl" style={{ color: fmt.ratingColor(player.potential) }}>{player.potential}</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-ink-200 uppercase tracking-widest">Salary</div>
              <div className="font-display text-xl">{fmt.money(player.contract.aav)} <span className="text-xs text-ink-200">/{player.contract.years}y</span></div>
            </div>
          </div>
          {player.injury && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-crimson/10 border border-crimson/30 text-sm">
              <span className="text-crimson font-semibold">{player.injury.dlType} IL</span> — {player.injury.name} ({player.injury.daysOut} days)
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {player.traits.map(t => (
              <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-ink-200 uppercase tracking-widest">{t}</span>
            ))}
          </div>
          {player.awards.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] text-ink-200 uppercase tracking-widest mb-1">Awards</div>
              <div className="flex flex-wrap gap-1.5">
                {player.awards.slice().reverse().map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold">★ {a.year} {a.type}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4">
            <button className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold text-sm pressable" onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit Ratings"}</button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-head text-lg uppercase tracking-widest mb-3">Ratings</h3>
        <Ratings player={player} edit={edit} onChange={(k: string, v: number) => mutate(lg => {
          const p = lg.players.find(x => x.id === player.id) || lg.freeAgents.find(x => x.id === player.id);
          if (!p) return;
          (p.ratings as any)[k] = v;
        })} />
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-head text-lg uppercase tracking-widest mb-3">Career Stats</h3>
        <CareerTable player={player} />
      </div>
    </div>
  );
}

function Ratings({ player, edit, onChange }: any) {
  const fields = player.isPitcher
    ? ["stamina","composure","gbFb","holdRunners","clutch","durability"]
    : ["contactL","contactR","powerL","powerR","vision","discipline","speed","baserun","stealing","fielding","arm","armAccuracy","reaction","clutch","durability"];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {fields.map(f => {
        const v = (player.ratings as any)[f];
        return (
          <div key={f} className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest text-ink-200 w-32">{f}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div style={{ width: `${Math.abs(v)}%`, background: `linear-gradient(90deg, #ff5b3a, #ffb302, #2ecc71)` }} className="h-full"/>
            </div>
            {edit ? (
              <NumberStepper value={Math.round(v)} min={20} max={99} onChange={(n) => onChange(f, n)} />
            ) : (
              <span className="font-mono font-bold w-10 text-right" style={{ color: fmt.ratingColor(v) }}>{Math.round(v)}</span>
            )}
          </div>
        );
      })}
      {player.isPitcher && player.ratings.pitches?.length > 0 && (
        <div className="sm:col-span-2 mt-3">
          <div className="text-[11px] uppercase tracking-widest text-ink-200 mb-2">Pitch Arsenal</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {player.ratings.pitches.map((p: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-xl px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-semibold">{p.type}</span>
                <div className="flex gap-3 text-xs font-mono">
                  <span>{p.velo} mph</span>
                  <span>B {p.brk}</span>
                  <span>C {p.ctrl}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CareerTable({ player }: any) {
  const stats = player.careerStats;
  if (!stats.length) return <div className="text-ink-200">No career data yet.</div>;
  if (player.isPitcher) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
            <tr>{["Year","Age","W","L","ERA","IP","K","BB","SV"].map(h => <th key={h} className="p-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {stats.slice().reverse().map((s: any, i: number) => (
              <tr key={i} className="border-t border-white/5">
                <td className="p-2 font-mono">{s.year}</td>
                <td className="p-2 font-mono text-center">{s.age}</td>
                <td className="p-2 font-mono text-center">{s.w ?? 0}</td>
                <td className="p-2 font-mono text-center">{s.l ?? 0}</td>
                <td className="p-2 font-mono text-center">{fmt.era(s.era ?? 0)}</td>
                <td className="p-2 font-mono text-center">{s.ip ?? 0}</td>
                <td className="p-2 font-mono text-center">{s.pk ?? 0}</td>
                <td className="p-2 font-mono text-center">{s.pbb ?? 0}</td>
                <td className="p-2 font-mono text-center">{s.sv ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
          <tr>{["Year","Age","AB","H","HR","RBI","R","SB","AVG","OBP","SLG","OPS"].map(h => <th key={h} className="p-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {stats.slice().reverse().map((s: any, i: number) => (
            <tr key={i} className="border-t border-white/5">
              <td className="p-2 font-mono">{s.year}</td>
              <td className="p-2 font-mono text-center">{s.age}</td>
              <td className="p-2 font-mono text-center">{s.ab ?? 0}</td>
              <td className="p-2 font-mono text-center">{s.h ?? 0}</td>
              <td className="p-2 font-mono text-center">{s.hr ?? 0}</td>
              <td className="p-2 font-mono text-center">{s.rbi ?? 0}</td>
              <td className="p-2 font-mono text-center">{s.r ?? 0}</td>
              <td className="p-2 font-mono text-center">{s.sb ?? 0}</td>
              <td className="p-2 font-mono text-center">{fmt.avg(s.avg ?? 0)}</td>
              <td className="p-2 font-mono text-center">{fmt.avg(s.obp ?? 0)}</td>
              <td className="p-2 font-mono text-center">{fmt.avg(s.slg ?? 0)}</td>
              <td className="p-2 font-mono text-center">{fmt.avg(s.ops ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
