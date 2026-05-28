import { useStore, exportLeagueJSON, listSavedLeagues, removeLeague, readLocalStorageBackup } from "../store";
import { useState, useEffect } from "react";
import { db, saveLeague } from "../db/dexie";
import { useNavigate } from "react-router-dom";
import { SaveSlotsManager } from "../components/SaveSlotsManager";
import { ensureDramaState, defaultDramaState } from "../engine/drama";
import { EASTER_EGGS, EASTER_EGG_TOTAL } from "../data/easterEggs";

const TABS = ["Gameplay","Drama","Features","Audio","Visuals","Data","Reset","Secrets","About"] as const;

export default function Settings() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const newLeague = useStore(s => s.newLeague);
  const setLeague = useStore(s => s.setLeague);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Gameplay");
  const navigate = useNavigate();

  if (!league) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl">SETTINGS</h1>
        <NewLeagueWizard onDone={() => navigate("/dashboard")} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] text-ink-200 uppercase tracking-widest">Configuration</div>
        <h1 className="font-display text-4xl">SETTINGS</h1>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium pressable touch-target ${tab === t ? "bg-accent text-ink-950" : "bg-white/5"}`}>{t}</button>
        ))}
      </div>
      <div className="glass rounded-2xl p-5">
        {tab === "Gameplay" && <GameplayTab />}
        {tab === "Drama" && <DramaTab />}
        {tab === "Features" && <FeaturesTab />}
        {tab === "Audio" && <AudioTab />}
        {tab === "Visuals" && <VisualTab />}
        {tab === "Data" && <DataTab />}
        {tab === "Reset" && <ResetTab />}
        {tab === "Secrets" && <SecretsTab />}
        {tab === "About" && <AboutTab />}
      </div>
    </div>
  );
}

function GameplayTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const g = league.settings.gameplay;
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Salary Cap"><input inputMode="numeric" type="text" value={String(g.salaryCap)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (!isNaN(n)) mutate(lg => { lg.settings.gameplay.salaryCap = n; }); }} className={inputCls} /></Field>
        <Toggle label="Enforce Cap" checked={g.salaryCapOn} onChange={(v: boolean) => mutate(lg => { lg.settings.gameplay.salaryCapOn = v; })} />
        <Field label="Injury Frequency">
          <select value={g.injuryFreq} onChange={e => mutate(lg => { lg.settings.gameplay.injuryFreq = e.target.value as any; })} className={inputCls}>
            {["off","low","normal","high"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Trade Frequency">
          <select value={g.tradeFreq} onChange={e => mutate(lg => { lg.settings.gameplay.tradeFreq = e.target.value as any; })} className={inputCls}>
            {["low","normal","high"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Toggle label="Universal DH" checked={g.universalDH} onChange={(v: boolean) => mutate(lg => { lg.settings.gameplay.universalDH = v; })} />
        <Field label="Sim Speed">
          <select value={g.simSpeed} onChange={e => mutate(lg => { lg.settings.gameplay.simSpeed = e.target.value as any; })} className={inputCls}>
            {["auto","fast","standard","immersive"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <hr className="border-white/5" />
      <h3 className="font-head text-base uppercase tracking-widest">Player Development</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <Toggle label="Development Engine On" checked={g.devEngineOn} onChange={(v: boolean) => mutate(lg => { lg.settings.gameplay.devEngineOn = v; })} />
        <Field label="Aging Intensity">
          <select value={g.agingIntensity} onChange={e => mutate(lg => { lg.settings.gameplay.agingIntensity = e.target.value as any; })} className={inputCls}>
            {["gentle","realistic","harsh"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Breakout/Bust Frequency">
          <select value={g.breakoutBustFreq} onChange={e => mutate(lg => { lg.settings.gameplay.breakoutBustFreq = e.target.value as any; })} className={inputCls}>
            {["low","normal","high"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Retirement Age Cap"><input inputMode="numeric" type="text" value={String(g.retirementAgeCap)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (!isNaN(n) && n >= 35 && n <= 50) mutate(lg => { lg.settings.gameplay.retirementAgeCap = n; }); }} className={inputCls} /></Field>
        <Toggle label="Show Dev Arrows on Rosters" checked={g.showDevArrows} onChange={(v: boolean) => mutate(lg => { lg.settings.gameplay.showDevArrows = v; })} />
        <Toggle label="Prospect Watch Widget" checked={g.prospectWatch} onChange={(v: boolean) => mutate(lg => { lg.settings.gameplay.prospectWatch = v; })} />
      </div>
    </div>
  );
}

function FeaturesTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const f = league.settings.features;
  const entries = Object.entries(f) as Array<[keyof typeof f, boolean]>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {entries.map(([k, v]) => (
        <Toggle key={k} label={camelToTitle(k)} checked={v} onChange={(x: boolean) => mutate(lg => { (lg.settings.features as any)[k] = x; })} />
      ))}
    </div>
  );
}

function AudioTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const a = league.settings.audio;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={`Master Volume (${Math.round(a.master * 100)}%)`}><input type="range" min={0} max={1} step={0.05} value={a.master} onChange={e => mutate(lg => { lg.settings.audio.master = +e.target.value; })} className="w-full" /></Field>
      <Field label={`Music Volume (${Math.round(a.music * 100)}%)`}><input type="range" min={0} max={1} step={0.05} value={a.music} onChange={e => mutate(lg => { lg.settings.audio.music = +e.target.value; })} className="w-full" /></Field>
      <Field label={`SFX Volume (${Math.round(a.sfx * 100)}%)`}><input type="range" min={0} max={1} step={0.05} value={a.sfx} onChange={e => mutate(lg => { lg.settings.audio.sfx = +e.target.value; })} className="w-full" /></Field>
      <Toggle label="Music On" checked={a.musicOn} onChange={(v: boolean) => mutate(lg => { lg.settings.audio.musicOn = v; })} />
      <Toggle label="SFX On" checked={a.sfxOn} onChange={(v: boolean) => mutate(lg => { lg.settings.audio.sfxOn = v; })} />
      <Toggle label="Crowd Noise" checked={a.crowd} onChange={(v: boolean) => mutate(lg => { lg.settings.audio.crowd = v; })} />
      <Toggle label="Announcer Text" checked={a.announcerText} onChange={(v: boolean) => mutate(lg => { lg.settings.audio.announcerText = v; })} />
    </div>
  );
}

function VisualTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const v = league.settings.visual;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Theme">
        <select value={v.theme} onChange={e => { mutate(lg => { lg.settings.visual.theme = e.target.value as any; }); applyTheme(e.target.value as any); }} className={inputCls}>
          {["dark","light","auto"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Font Scale">
        <select value={v.fontScale} onChange={e => mutate(lg => { lg.settings.visual.fontScale = e.target.value as any; })} className={inputCls}>
          {["S","M","L","XL"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Animations">
        <select value={v.animations} onChange={e => mutate(lg => { lg.settings.visual.animations = e.target.value as any; })} className={inputCls}>
          {["off","subtle","full"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Toggle label="Reduced Motion" checked={v.reducedMotion} onChange={(x: boolean) => mutate(lg => { lg.settings.visual.reducedMotion = x; })} />
      <Toggle label="Confetti Effects" checked={v.confetti} onChange={(x: boolean) => mutate(lg => { lg.settings.visual.confetti = x; })} />
    </div>
  );
}

function applyTheme(t: "dark" | "light" | "auto") {
  const html = document.documentElement;
  html.classList.remove("theme-light","theme-dark");
  if (t === "light") html.classList.add("theme-light");
  else if (t === "dark") html.classList.add("theme-dark");
}

function DataTab() {
  const league = useStore(s => s.league)!;
  const setLeague = useStore(s => s.setLeague);
  const [saves, setSaves] = useState<any[]>([]);
  useEffect(() => { listSavedLeagues().then(setSaves); }, []);

  async function exportFn() {
    const data = await exportLeagueJSON(league);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `diamond-dynasty-${league.year}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  async function importFn() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async e => {
        try {
          const obj = JSON.parse(e.target!.result as string);
          if (obj.league) { await saveLeague(obj.league); setLeague(obj.league); }
        } catch { alert("Import failed"); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        <button onClick={exportFn} className="px-4 py-2.5 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target">Export League JSON</button>
        <button onClick={importFn} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 pressable touch-target">Import League JSON</button>
      </div>
      <hr className="border-white/5" />
      <SaveSlotsManager />
      <hr className="border-white/5" />
      <NewLeagueWizard onDone={() => location.reload()} />
    </div>
  );
}

function SecretsTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const gm = league.gmProfile;
  const familyText = (gm?.familyNames ?? []).join("\n");
  const [draft, setDraft] = useState(familyText);
  const [capsule, setCapsule] = useState("");

  const saveFamily = async () => {
    const lines = draft.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 10);
    await mutate(lg => { if (lg.gmProfile) lg.gmProfile.familyNames = lines; });
  };
  const buryCapsule = async () => {
    if (!capsule.trim()) return;
    await mutate(lg => {
      if (lg.gmProfile) {
        if (!lg.gmProfile.timeCapsule) lg.gmProfile.timeCapsule = [];
        lg.gmProfile.timeCapsule.push({ year: lg.year, note: capsule.trim(), surfaced: false });
      }
    });
    setCapsule("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-head text-lg uppercase tracking-widest">Family Name Pool</h3>
        <div className="text-xs text-ink-200 mt-1 mb-2">Add up to 10 family or friend names (one per line, "First Last"). They'll show up in the league over time.</div>
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)}
          rows={5}
          placeholder={"Grandpa Joe\nUncle Mike\n…"}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-accent"
        />
        <button onClick={saveFamily} className="mt-2 px-4 py-2.5 rounded-xl bg-accent text-ink-950 text-sm font-medium pressable touch-target">Save Family Names</button>
      </div>

      <hr className="border-white/5" />

      <div>
        <h3 className="font-head text-lg uppercase tracking-widest">📜 Time Capsule</h3>
        <div className="text-xs text-ink-200 mt-1 mb-2">Write a short note to your future self. We'll surface it 10 in-game seasons from now.</div>
        <textarea
          value={capsule} onChange={e => setCapsule(e.target.value.slice(0, 240))}
          rows={3} placeholder="Today I just drafted my first player…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-ink-300">{capsule.length}/240</span>
          <button onClick={buryCapsule} disabled={!capsule.trim()} className="px-4 py-2.5 rounded-xl bg-accent text-ink-950 text-sm font-medium pressable touch-target disabled:opacity-40">Bury Capsule</button>
        </div>
        {gm?.timeCapsule && gm.timeCapsule.length > 0 && (
          <div className="mt-3 space-y-1">
            {gm.timeCapsule.map((tc, i) => (
              <div key={i} className="text-xs px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                <div className="text-ink-300">{tc.year} • {tc.surfaced ? "Opened" : `Opens in ${10 - (league.year - tc.year)} season(s)`}</div>
                {tc.surfaced && <div className="mt-1">{tc.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-white/5" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-head text-lg uppercase tracking-widest">🥚 Easter Eggs</h3>
          <button onClick={() => setShowSpoilers(s => !s)} className="px-3 py-2 rounded-lg bg-white/5 text-xs pressable touch-target">
            {showSpoilers ? "Hide spoilers" : "Show spoilers"}
          </button>
        </div>
        <div className="text-xs text-ink-200 mb-3">There are 46 hidden bits of magic in the game. Some are just for fun. Some take seasons to find. Toggle spoilers to peek.</div>
        {showSpoilers ? <EasterEggList /> : (
          <div className="text-sm text-ink-300 italic px-3 py-2 rounded-lg bg-white/3 border border-white/5">
            Hint: try tapping things repeatedly. Try the Konami code on the title screen. Try naming a player "Henry."
          </div>
        )}
      </div>
    </div>
  );
}

function EasterEggList() {
  // Single source of truth — pulls from data/easterEggs.ts so the catalog
  // is shared with implementing code.
  const gameTint: Record<string, string> = {
    baseball: "#fbbf24",
    football: "#FFB81C",
    olympus:  "#DAA520",
    arcade:   "#a78bfa",
  };
  const statusLabel: Record<string, string> = {
    implemented: "LIVE",
    flavor:      "PLANNED",
    rare:        "RARE",
  };
  const statusColor: Record<string, string> = {
    implemented: "#3fcc6a",
    flavor:      "#9aa6bf",
    rare:        "#c79c5c",
  };
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      <div className="text-xs text-ink-200 mb-1">{EASTER_EGG_TOTAL} eggs catalogued — green LIVE = fully implemented, gray PLANNED = flavor/UI-only, amber RARE = hard to trigger.</div>
      {EASTER_EGGS.map((e: any) => (
        <div key={e.id} className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: gameTint[e.game] + "20", color: gameTint[e.game] }}>{e.game.toUpperCase()}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: statusColor[e.status] + "20", color: statusColor[e.status] }}>{statusLabel[e.status]}</span>
            <span className="font-medium text-sm">{e.title}</span>
          </div>
          <div className="text-xs text-ink-200 mt-0.5">{e.desc}</div>
          {e.where && <div className="text-[10px] text-ink-300 mt-0.5 italic">→ {e.where}</div>}
        </div>
      ))}
    </div>
  );
}

function AboutTab() {
  const navigate = useNavigate();
  const mutate = useStore(s => s.mutate);
  const league = useStore(s => s.league)!;
  const [versionTaps, setVersionTaps] = useState(0);
  const [showDedication, setShowDedication] = useState(false);
  const tapVersion = () => {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next >= 3) {
      setShowDedication(true);
      setVersionTaps(0);
    }
  };
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div className="font-display text-2xl mb-1">BERRY KID'S ARCADE</div>
      <div className="text-ink-200">Made for Henry. Three games under one roof: ⚾ baseball, 🏈 football, ⚔️ Greek-mythology RPG.</div>
      <div className="text-ink-200">All data is stored locally on this device via IndexedDB. No accounts. No tracking. Installable as a PWA on iPad.</div>
      <div className="text-ink-200">Inspired by MLB The Show, OOTP, Football Manager, and AI Dungeon.</div>
      <div className="text-ink-300 text-xs cursor-pointer select-none pressable" onClick={tapVersion}>Berry Kid's Arcade · v8 · league created {new Date(league.createdAt).toLocaleDateString()}</div>
      {showDedication && (
        <div className="glass rounded-2xl p-5 border border-amber-400/50 mt-2 reveal">
          <div className="text-amber-300 text-[11px] uppercase tracking-widest mb-1">A note from the builder</div>
          <div className="font-display text-lg leading-snug">Built with love for Henry.</div>
          <div className="text-ink-100 mt-1">Now go win the World Series. 🏆</div>
        </div>
      )}
      <div className="pt-3 flex gap-2 flex-wrap">
        <button onClick={() => navigate("/title")} className="px-4 py-2 rounded-xl bg-white/5 text-sm pressable touch-target">Title Screen</button>
        <button onClick={() => navigate("/welcome")} className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-medium pressable touch-target">Set Up / Edit Owner</button>
        <RestoreFromBackupButton />
        <button onClick={() => navigate("/coach")} className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-sm font-medium pressable touch-target">Open Coach's Corner</button>
      </div>
      {league.gmProfile && (
        <div className="pt-3 border-t border-white/5 mt-3">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">GM Profile</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full" style={{ background: league.gmProfile.color }} />
            <div>
              <div className="font-medium">{league.gmProfile.name}</div>
              <div className="text-[11px] text-ink-300">Since {new Date(league.gmProfile.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewLeagueWizard({ onDone }: { onDone: () => void }) {
  const newLeague = useStore(s => s.newLeague);
  const [numTeams, setNumTeams] = useState(30);
  const [scheduleLength, setScheduleLength] = useState<30 | 60 | 82 | 120 | 162>(162);
  const [mlbMode, setMlbMode] = useState(false);
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-3">
      <h3 className="font-head text-lg uppercase tracking-widest">New League</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Number of Teams">
          <select value={numTeams} onChange={e => setNumTeams(+e.target.value)} className={inputCls}>
            {[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Schedule Length">
          <select value={scheduleLength} onChange={e => setScheduleLength(+e.target.value as any)} className={inputCls}>
            {[30,60,82,120,162].map(n => <option key={n} value={n}>{n} games</option>)}
          </select>
        </Field>
        <Field label="Mode">
          <select value={mlbMode ? "mlb" : "fantasy"} onChange={e => setMlbMode(e.target.value === "mlb")} className={inputCls}>
            <option value="fantasy">Fantasy</option>
            <option value="mlb">MLB (real teams)</option>
          </select>
        </Field>
      </div>
      <button disabled={creating} onClick={async () => { setCreating(true); await newLeague({ numTeams, scheduleLength, year: 2026, mlbMode }); setCreating(false); onDone(); }} className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-60 inline-flex items-center gap-2">
        {creating ? (<><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Building {numTeams}-team league…</>) : "Create League"}
      </button>
    </div>
  );
}

function Field({ label, children }: any) {
  return <label className="block"><div className="text-[10px] text-ink-200 uppercase tracking-widest mb-1">{label}</div>{children}</label>;
}
function Toggle({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-3 p-2 rounded-xl bg-white/3 border border-white/5 cursor-pointer touch-target pressable">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="appearance-none w-10 h-6 rounded-full bg-ink-600 checked:bg-accent transition relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition checked:after:left-[18px]" />
      <span className="text-sm flex-1">{label}</span>
    </label>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm";

function camelToTitle(s: string): string {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function RestoreFromBackupButton() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const [info, setInfo] = useState<{ ts: number; profile: any; training: any } | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const snap = readLocalStorageBackup();
    if (snap && snap.ts) setInfo({ ts: snap.ts, profile: snap.gmProfile, training: snap.training });
  }, []);

  if (!info) return null;
  const ageMin = Math.round((Date.now() - info.ts) / 60000);
  const ago = ageMin < 60 ? `${ageMin}m ago` : ageMin < 1440 ? `${Math.round(ageMin / 60)}h ago` : `${Math.round(ageMin / 1440)}d ago`;

  const doRestore = async () => {
    const snap = readLocalStorageBackup();
    if (!snap) return;
    await mutate(lg => {
      if (snap.gmProfile) lg.gmProfile = snap.gmProfile;
      if (snap.tutorial) lg.tutorial = snap.tutorial;
      if (snap.training) lg.training = snap.training;
      if (snap.userTeamId) lg.userTeamId = snap.userTeamId;
    });
    setRestored(true);
    setTimeout(() => setRestored(false), 2500);
  };

  if (!league) return null;
  // Only show "restore" button if the backup is newer than current league's modifiedAt
  const showRestore = info.ts > (league.modifiedAt ?? 0);

  return (
    <button onClick={doRestore} className={`px-4 py-2 rounded-xl text-sm pressable touch-target ${showRestore ? "bg-amber-400 text-ink-950 font-medium" : "bg-white/5"}`}>
      {restored ? "✓ Restored" : showRestore ? `↻ Restore backup (${ago})` : `Backup OK (${ago})`}
    </button>
  );
}

// ─── Drama Engine Tab ─────────────────────────────────────────────────────
function DramaTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  ensureDramaState(league);
  const d = (league as any).drama as ReturnType<typeof defaultDramaState>;

  const set = (patch: any) => mutate(lg => {
    const cur = (lg as any).drama ?? defaultDramaState();
    (lg as any).drama = { ...cur, ...patch };
  });

  const trainingKey = league.training?.settings?.anthropicApiKey ?? "";
  const hasKey = trainingKey.startsWith("sk-") || (import.meta as any).env?.VITE_ANTHROPIC_API_KEY?.startsWith?.("sk-");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-head text-base uppercase tracking-widest mb-2">Drama Engine</h3>
        <div className="text-xs text-ink-200 mb-3">Generates 3-4 random news events per league day — funny, dramatic, weird, sometimes serious. Affects player morale, hot/cold streaks, and freak injuries.</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Toggle label="Engine Enabled" checked={d.enabled} onChange={(v: boolean) => set({ enabled: v })} />
          <Field label="Intensity">
            <select value={d.intensity} onChange={e => set({ intensity: e.target.value as any })} className={inputCls}>
              <option value="mellow">🧘 Mellow (1-2/day, no major)</option>
              <option value="balanced">⚖️ Balanced (3-4/day)</option>
              <option value="chaos">🔥 Chaos (5-6/day)</option>
              <option value="soap-opera">🎭 Soap Opera (6-8/day)</option>
            </select>
          </Field>
          <Toggle label="Show News Ticker" checked={(d as any).showTicker !== false} onChange={(v: boolean) => set({ showTicker: v })} />
          <Toggle
            label={`AI-Augmented Events ${hasKey ? "(key found)" : "(no API key)"}`}
            checked={d.useAI && hasKey}
            onChange={(v: boolean) => set({ useAI: v })}
          />
        </div>
      </div>

      <hr className="border-white/5" />
      <div className="rounded-xl bg-white/3 border border-white/5 p-3 text-xs leading-relaxed">
        <div className="font-display text-sm uppercase tracking-widest text-accent mb-2">📊 Engine Stats</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <div><span className="text-ink-300">Active effects:</span> <span className="font-mono">{d.activeEffects?.length ?? 0}</span></div>
          <div><span className="text-ink-300">Memorable moments:</span> <span className="font-mono">{d.memorableMoments?.length ?? 0}</span></div>
          <div><span className="text-ink-300">Last run day:</span> <span className="font-mono">{d.lastRunDay >= 0 ? d.lastRunDay : "—"}</span></div>
        </div>
      </div>

      {!hasKey && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 text-xs">
          <div className="font-display text-amber-300 uppercase tracking-widest mb-1">💡 Tip</div>
          <div className="text-ink-100">Drama works great without an API key — 222 hand-written templates are baked in. Add an Anthropic key in Training Camp profile to unlock context-aware AI events too.</div>
        </div>
      )}

      <hr className="border-white/5" />
      <div>
        <h3 className="font-head text-base uppercase tracking-widest mb-2">Online League</h3>
        <div className="rounded-xl bg-white/3 border border-white/10 p-3 text-xs leading-relaxed">
          <div className="font-display text-sm tracking-wider mb-1">🛰️ Multiplayer status: SOLO ONLY</div>
          <div className="text-ink-200">Cloud-synced leagues, manager-to-manager messaging, and shared trade flow require a backend (Firebase). That's a multi-day setup and not wired up yet. All drama, reactions, and pinned moments are saved locally on this device + the IndexedDB+localStorage triple-layer backup.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Tab — multi-step safeguards ────────────────────────────────────
function ResetTab() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h3 className="font-head text-base uppercase tracking-widest">Reset Options</h3>
        <div className="text-xs text-ink-200 mt-1">Each option requires typing a confirmation phrase. You can't accidentally tap "reset" — that's the whole point.</div>
      </div>

      <ResetAction
        emoji="🔄"
        title="Reset Training Camp Progress"
        body="Wipes Henry's training stats, schedule progress, personal records, and weekly snapshots. Does NOT touch dynasty league, multiplayer, or achievements."
        confirmPhrase="RESET TRAINING"
        onConfirm={async () => {
          const { defaultTrainingState } = await import("../engine/league");
          await mutate(lg => {
            if (!lg.training) return;
            const profile = lg.training.henryProfile;
            const settings = lg.training.settings;
            const newT = defaultTrainingState();
            lg.training = { ...newT, henryProfile: profile, settings };
          });
          alert("Training Camp reset complete.");
        }}
      />

      <ResetAction
        emoji="🔄"
        title="Reset Drama Engine"
        body="Clears active morale/streak effects, recent-template cooldown, reactions, and the Memorable Moments archive. Keeps the engine settings."
        confirmPhrase="RESET DRAMA"
        onConfirm={async () => {
          await mutate(lg => {
            const cur = (lg as any).drama ?? defaultDramaState();
            (lg as any).drama = { ...defaultDramaState(), enabled: cur.enabled, intensity: cur.intensity, useAI: cur.useAI };
            // Also clear any drama news from the feed.
            lg.newsLog = lg.newsLog.filter(n => n.category !== "Drama");
          });
          alert("Drama engine reset. Sim a day to see fresh events.");
        }}
      />

      <ResetAction
        emoji="🔄"
        title="Reset Solo Dynasty"
        body="Starts a brand-new league. Henry's training stats, GM profile, and achievements are PRESERVED — only the league/teams/players are wiped."
        confirmPhrase="RESET DYNASTY"
        danger
        onConfirm={async () => {
          alert("Tap 'Create League' in the Data tab when ready, then your fresh league will replace this one.");
        }}
      />

      <ResetAction
        emoji="⚠️"
        title="Full Reset — Nuclear Option"
        body="ERASES EVERYTHING. Training stats, dynasty, achievements, drama history, reactions, photos. No undo. Backup will be auto-downloaded first."
        confirmPhrase="DELETE EVERYTHING"
        danger
        nuclear
        onConfirm={async () => {
          // Auto-download backup first.
          try {
            const data = await exportLeagueJSON(league);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dd-final-backup-before-wipe-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } catch { /* if backup fails, still proceed */ }
          try { await db.delete(); } catch { /* keep going */ }
          try { localStorage.clear(); } catch { /* keep going */ }
          alert("Everything deleted. App will reload.");
          location.reload();
        }}
      />
    </div>
  );
}

function ResetAction({ emoji, title, body, confirmPhrase, danger, nuclear, onConfirm }:
  { emoji: string; title: string; body: string; confirmPhrase: string; danger?: boolean; nuclear?: boolean; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const canExecute = typed.trim() === confirmPhrase;
  const bg = nuclear ? "bg-red-500/15 border-red-400/50" : danger ? "bg-orange-500/10 border-orange-400/30" : "bg-white/3 border-white/10";
  const accentText = nuclear ? "text-red-300" : danger ? "text-orange-300" : "text-ink-100";
  return (
    <div className={`p-3.5 rounded-2xl border ${bg}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-display text-sm tracking-wider ${accentText}`}>{title}</div>
          <div className="text-xs text-ink-200 mt-1 leading-relaxed">{body}</div>
          {!open ? (
            <button onClick={() => setOpen(true)} className={`mt-2 px-3.5 py-2 rounded-lg text-xs pressable touch-target font-medium ${nuclear ? "bg-red-500 text-white" : "bg-white/10"}`}>
              I want to do this →
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-ink-200">Type <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono">{confirmPhrase}</code> exactly to confirm:</div>
              <input
                autoFocus
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={confirmPhrase}
                className={`w-full px-3 py-2 rounded-lg border outline-none font-mono text-sm ${canExecute ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"}`}
              />
              <div className="flex gap-2">
                <button onClick={() => { setOpen(false); setTyped(""); }} className="px-3 py-2 rounded-lg text-xs bg-white/10 pressable touch-target">Cancel</button>
                <button
                  disabled={!canExecute || busy}
                  onClick={async () => {
                    if (!window.confirm(`Final confirmation: ${title}. This cannot be undone. Proceed?`)) return;
                    setBusy(true);
                    try { await onConfirm(); } finally { setBusy(false); setOpen(false); setTyped(""); }
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-display tracking-wider pressable touch-target disabled:opacity-30 ${nuclear ? "bg-red-500 text-white" : "bg-orange-500 text-ink-950"}`}
                >
                  {busy ? "Working…" : `Execute ${confirmPhrase.split(" ")[0]}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
