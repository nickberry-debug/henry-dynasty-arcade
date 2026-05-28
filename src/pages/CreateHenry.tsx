// One-time wizard to add Henry as a real player in the league.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStore } from "../store";
import { createHenryPlayer } from "../engine/trainingCamp";
import { ArrowLeft } from "lucide-react";

export default function CreateHenry() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();
  const [name, setName] = useState(league.gmProfile?.name ?? "Henry");
  const [bats, setBats] = useState<"R" | "L" | "S">("R");
  const [throws, setThrows] = useState<"R" | "L">("R");
  const [age, setAge] = useState(10);
  const [jersey, setJersey] = useState(league.gmProfile?.luckyNumber ?? 7);
  const [teamId, setTeamId] = useState(league.userTeamId ?? league.teams[0].id);

  const existing = league.training?.henryPlayerId
    ? league.players.find(p => p.id === league.training!.henryPlayerId) ?? league.freeAgents.find(p => p.id === league.training!.henryPlayerId)
    : null;

  const create = async () => {
    await mutate(lg => {
      createHenryPlayer(lg, { name, bats, throws, age, jersey, teamId });
    });
    navigate("/training");
  };

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Training</div>
          <h1 className="font-display text-3xl">🆔 ADD HENRY TO THE LEAGUE</h1>
        </div>
      </header>

      {existing ? (
        <div className="glass rounded-2xl p-5 text-center card-elevated">
          <div className="text-5xl mb-2">⚾</div>
          <div className="font-display text-2xl">{existing.name}</div>
          <div className="text-sm text-ink-200">Already in the league · OVR {existing.overall}</div>
          <Link to={`/player/${existing.id}`} className="inline-block mt-3 px-5 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target">Open Henry's Card</Link>
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 card-elevated space-y-4">
          <div className="text-sm text-ink-100">Create your player. Starts low (rookie-level), grows with every real practice rep. Goal: 70 OVR to make a real roster.</div>
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
          </Field>
          <Field label="Bats">
            <div className="flex gap-2">
              {(["R","L","S"] as const).map(b => (
                <button key={b} onClick={() => setBats(b)} className={`flex-1 px-3 py-3 rounded-xl pressable touch-target ${bats === b ? "bg-accent text-ink-950 font-display tracking-wider" : "bg-white/5"}`}>{b === "R" ? "Right" : b === "L" ? "Left" : "Switch"}</button>
              ))}
            </div>
          </Field>
          <Field label="Throws">
            <div className="flex gap-2">
              {(["R","L"] as const).map(t => (
                <button key={t} onClick={() => setThrows(t)} className={`flex-1 px-3 py-3 rounded-xl pressable touch-target ${throws === t ? "bg-accent text-ink-950 font-display tracking-wider" : "bg-white/5"}`}>{t === "R" ? "Right" : "Left"}</button>
              ))}
            </div>
          </Field>
          <Field label="Age">
            <input inputMode="numeric" type="text" value={String(age)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (n >= 6 && n <= 18) setAge(n); }} className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
          </Field>
          <Field label="Jersey number">
            <input inputMode="numeric" type="text" value={String(jersey)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (n >= 0 && n <= 99) setJersey(n); }} className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
          </Field>
          <Field label="Team">
            <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3">
              {league.teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
            </select>
          </Field>
          <button onClick={create} className="w-full px-5 py-4 rounded-xl bg-accent text-ink-950 font-display tracking-widest text-lg pressable touch-target">Create Henry</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1.5">{label}</div>{children}</label>;
}
