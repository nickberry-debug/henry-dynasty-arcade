// V3 Section 2.4 — Editable Henry profile + V3 Section 8 Anthropic API key.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { ArrowLeft, Upload, Eye, EyeOff, Check } from "lucide-react";

export default function TrainingProfile() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const t = league.training!;
  const p = t.henryProfile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(p.name);
  const [age, setAge] = useState(p.age);
  const [height, setHeight] = useState(p.heightInches);
  const [weight, setWeight] = useState(p.weightLbs);
  const [hometown, setHometown] = useState(p.hometown);
  const [bats, setBats] = useState(p.bats);
  const [throws, setThrows] = useState(p.throws);
  const [position, setPosition] = useState(p.position);
  const [jersey, setJersey] = useState(p.jerseyNumber);
  const [teamId, setTeamId] = useState(p.teamId);
  const [apiKey, setApiKey] = useState(t.settings.anthropicApiKey || "");
  const [aiOn, setAiOn] = useState(t.settings.aiCoachingEnabled);
  const [showKey, setShowKey] = useState(false);
  const [speedGunOn, setSpeedGunOn] = useState(t.settings.speedGunEnabled);
  const [speedGunDist, setSpeedGunDist] = useState(t.settings.speedGunDistanceFt);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const save = async () => {
    await mutate(lg => {
      const tp = lg.training!;
      tp.henryProfile = {
        ...tp.henryProfile,
        name: name.trim() || "Henry",
        age, heightInches: height, weightLbs: weight, hometown,
        bats, throws, position, jerseyNumber: jersey, teamId,
        modifiedAt: Date.now()
      };
      tp.settings.anthropicApiKey = apiKey.trim();
      tp.settings.aiCoachingEnabled = aiOn && !!apiKey.trim();
      tp.settings.speedGunEnabled = speedGunOn;
      tp.settings.speedGunDistanceFt = Math.max(15, Math.min(60, speedGunDist));
      // Sync Henry the player if exists
      if (tp.henryPlayerId) {
        const henry = lg.players.find(x => x.id === tp.henryPlayerId) ?? lg.freeAgents.find(x => x.id === tp.henryPlayerId);
        if (henry) {
          henry.name = tp.henryProfile.name;
          henry.firstName = tp.henryProfile.name.split(" ")[0] || tp.henryProfile.name;
          henry.lastName = tp.henryProfile.name.split(" ").slice(1).join(" ") || "";
          henry.age = age;
          henry.height = height;
          henry.weight = weight;
          henry.birthplace = hometown;
          henry.bats = bats;
          henry.throws = throws;
          henry.jerseyNumber = jersey;
          if (teamId !== henry.teamId) {
            // Move to new team
            if (teamId) henry.teamId = teamId;
          }
        }
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const small = canvas.toDataURL("image/jpeg", 0.78);
        await mutate(lg => {
          if (lg.training) {
            lg.training.henryProfile.photoDataUrl = small;
            lg.training.henryProfile.modifiedAt = Date.now();
          }
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) return;
    setTesting("Testing...");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 16,
          messages: [{ role: "user", content: "Reply with the single word OK." }]
        })
      });
      if (res.ok) setTesting("✅ Working!");
      else { const j = await res.json().catch(() => ({})); setTesting(`❌ ${res.status} ${j?.error?.message ?? ""}`); }
    } catch (e: any) {
      setTesting(`❌ ${e.message ?? "Network error"}`);
    }
  };

  const heightFt = Math.floor(height / 12);
  const heightIn = height % 12;

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Training</div>
          <h1 className="font-display text-3xl">🆔 EDIT PROFILE</h1>
        </div>
      </header>

      <div className="glass rounded-2xl p-5 card-elevated space-y-4">
        <h3 className="font-head text-base uppercase tracking-widest">Photo</h3>
        <div className="flex items-center gap-3">
          {p.photoDataUrl ? (
            <img src={p.photoDataUrl} alt={p.name} className="w-24 h-24 rounded-xl object-cover border-2 border-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center text-3xl">🧢</div>
          )}
          <div className="flex-1">
            <button onClick={() => fileRef.current?.click()} className="px-4 py-3 rounded-xl bg-accent text-ink-950 text-sm font-display tracking-wider pressable touch-target flex items-center gap-2">
              <Upload size={14}/> {p.photoDataUrl ? "Change Photo" : "Upload Photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
            <div className="text-[10px] text-ink-300 mt-1">Stored on your device only. iPad photo library or camera both work.</div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 card-elevated space-y-4">
        <h3 className="font-head text-base uppercase tracking-widest">Player Info</h3>
        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" enterKeyHint="next" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input inputMode="numeric" type="text" value={String(age)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (n >= 5 && n <= 18) setAge(n); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
          </Field>
          <Field label="Jersey #">
            <input inputMode="numeric" type="text" value={String(jersey)} onChange={e => { const n = +e.target.value.replace(/\D/g, ""); if (n >= 0 && n <= 99) setJersey(n); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Height: ${heightFt}'${heightIn}"`}>
            <input type="range" min={36} max={76} value={height} onChange={e => setHeight(+e.target.value)} className="w-full accent-accent" />
          </Field>
          <Field label={`Weight: ${weight} lbs`}>
            <input type="range" min={40} max={250} value={weight} onChange={e => setWeight(+e.target.value)} className="w-full accent-accent" />
          </Field>
        </div>
        <Field label="Hometown">
          <input value={hometown} onChange={e => setHometown(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
        </Field>
        <Field label="Position">
          <input value={position} onChange={e => setPosition(e.target.value)} placeholder="P/CF" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3" />
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
            {(["R","L"] as const).map(b => (
              <button key={b} onClick={() => setThrows(b)} className={`flex-1 px-3 py-3 rounded-xl pressable touch-target ${throws === b ? "bg-accent text-ink-950 font-display tracking-wider" : "bg-white/5"}`}>{b === "R" ? "Right" : "Left"}</button>
            ))}
          </div>
        </Field>
        <Field label="Team">
          <select value={teamId ?? ""} onChange={e => setTeamId(e.target.value || null)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3">
            <option value="">— No team —</option>
            {league.teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="glass rounded-2xl p-5 card-elevated space-y-4">
        <h3 className="font-head text-base uppercase tracking-widest">🤖 AI Camera Coach</h3>
        <div className="text-sm text-ink-200">
          Optional: paste your Anthropic API key to get personalized coaching feedback from Claude after every rep. Without a key, you'll still get basic on-device Form Score from MediaPipe.
        </div>
        <Field label="Anthropic API Key">
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 font-mono text-xs"
              autoComplete="off"
            />
            <button onClick={() => setShowKey(s => !s)} className="px-3 rounded-xl bg-white/5 pressable touch-target">{showKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          <div className="text-[10px] text-ink-300 mt-1">Stored locally only. Never logged. Get one at console.anthropic.com.</div>
        </Field>
        <label className="flex items-center gap-3 cursor-pointer touch-target">
          <input
            type="checkbox" checked={aiOn} onChange={e => setAiOn(e.target.checked)}
            className="appearance-none w-11 h-6 rounded-full bg-ink-600 checked:bg-emerald-500 transition relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition checked:after:left-[22px]"
          />
          <span className="text-sm">Enhanced AI coaching {aiOn && !apiKey.trim() ? <span className="text-amber-300">(need API key first)</span> : ""}</span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={testApiKey} disabled={!apiKey.trim()} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target disabled:opacity-40">Test connection</button>
          {testing && <span className="text-xs text-ink-200">{testing}</span>}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 card-elevated space-y-4">
        <h3 className="font-head text-base uppercase tracking-widest">📡 Speed Gun</h3>
        <div className="text-sm text-ink-200">Estimates pitch velocity using a tap-on-release and tap-on-net timing system. ±3 mph accuracy.</div>
        <label className="flex items-center gap-3 cursor-pointer touch-target">
          <input
            type="checkbox" checked={speedGunOn} onChange={e => setSpeedGunOn(e.target.checked)}
            className="appearance-none w-11 h-6 rounded-full bg-ink-600 checked:bg-emerald-500 transition relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition checked:after:left-[22px]"
          />
          <span className="text-sm">Enable speed gun in practice + live games</span>
        </label>
        <Field label={`Distance to net: ${speedGunDist} ft`}>
          <input type="range" min={15} max={60} value={speedGunDist} onChange={e => setSpeedGunDist(+e.target.value)} className="w-full accent-accent" />
        </Field>
      </div>

      <div className="sticky bottom-3 lg:static">
        <button onClick={save} className="w-full px-5 py-4 rounded-2xl bg-accent text-ink-950 font-display tracking-widest text-lg pressable touch-target flex items-center justify-center gap-2 shadow-2xl">
          {saved ? <><Check size={18}/> Saved!</> : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1.5">{label}</div>{children}</label>;
}
