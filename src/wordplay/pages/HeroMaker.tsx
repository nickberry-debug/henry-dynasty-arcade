// New sub-app: Superhero Origin Maker. AI generates a full original
// hero (name, alias, powers, costume, weakness, origin, nemesis,
// catchphrase). Save to roster.

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Save, Volume2, Trash2, Users } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak } from "../voice";

const ACCENT = "#F87171";
const GRADIENT = "linear-gradient(135deg, rgba(248,113,113,0.30), rgba(40,10,10,0.95))";

const POWER_TYPES = ["Strength", "Speed", "Magic", "Tech", "Mind", "Nature", "Weather", "Time", "Animal", "Surprise Me"];
const TONES = ["Classic Hero", "Funny", "Dark/Brooding", "Reluctant", "Sidekick-Style", "Surprise Me"];

interface Hero {
  id: string;
  hero_name: string;
  alias: string;
  real_name: string;
  powers: string[];
  costume: string;
  weakness: string;
  origin_story: string;
  archnemesis: { name: string; description: string };
  catchphrase: string;
  power_type: string;
  tone: string;
  ts: number;
}

const FALLBACK_HERO = (powerType: string, tone: string): Omit<Hero, "id" | "ts"> => ({
  hero_name: "Crimson Gust",
  alias: "The Whisper of the Storm",
  real_name: "Maya Chen",
  powers: ["Wind manipulation in focused gusts", "Hyper-speed running", "Whisper voice that travels miles"],
  costume: "Deep red running gear with silver wind motifs, goggles mask, and a flowing crimson scarf that flutters even when air is still.",
  weakness: "Heavy rain — water weighs down her wind powers.",
  origin_story: "Maya Chen was an asthmatic 12-year-old who could never finish the mile at school. One stormy walk home, lightning struck a tree above her — and instead of falling, the splinters spun around her, carried by a wind that listened. From then on, her lungs no longer struggled. Air itself had decided to keep her company. She wears the goggles she used during her first secret training run, when she discovered she could hear her grandmother's whispered worries from three blocks away.",
  archnemesis: { name: "The Stillness", description: "A villain who absorbs all motion and sound from any area he enters — Maya's powers are useless in his presence." },
  catchphrase: "You won't see me coming. But you'll hear me.",
  power_type: powerType, tone,
});

export default function HeroMaker() {
  const [powerType, setPowerType] = useState("Surprise Me");
  const [tone, setTone] = useState("Surprise Me");
  const [inspiration, setInspiration] = useState("");
  const [hero, setHero] = useState<Hero | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"make" | "roster">("make");
  const [roster, addToRoster, clearAll] = useHistory<Hero>("hero_roster", 40);

  const generate = async () => {
    setLoading(true);
    const ai = await callAI({
      system: "You generate completely ORIGINAL superheroes for kids age 8-13. Real names, specific details, vivid imagery, kid-friendly. Output ONLY JSON.",
      user: `PARAMETERS:
- Power Type: ${powerType === "Surprise Me" ? "any" : powerType}
- Tone: ${tone === "Surprise Me" ? "any" : tone}
- Inspiration: ${inspiration || "fully original"}

Generate a COMPLETELY ORIGINAL superhero (do NOT copy any existing hero):
- Hero name (catchy, 1-3 words, original)
- Alias ("The X of Y" format)
- Real civilian name (with first & last name)
- 2-3 specific powers (creative, not generic)
- Costume description (colors, motifs, distinctive features)
- A weakness that creates good story tension
- Origin story (100-150 words, character-driven, specific)
- Archnemesis (name + brief description with opposing power)
- Catchphrase (memorable line)

Return JSON exactly:
{
  "hero_name": "Codename",
  "alias": "The X of Y",
  "real_name": "First Last",
  "powers": ["Power 1", "Power 2", "Power 3"],
  "costume": "Detailed description",
  "weakness": "Specific weakness",
  "origin_story": "Full origin (100-150 words)",
  "archnemesis": { "name": "...", "description": "..." },
  "catchphrase": "Memorable line"
}`,
      maxTokens: 1200,
      model: "rich",
    });
    const parsed = parseJSON<Omit<Hero, "id" | "ts" | "power_type" | "tone">>(ai);
    let h: Hero;
    if (parsed && parsed.hero_name && parsed.origin_story) {
      h = { ...parsed, id: `h-${Date.now()}`, ts: Date.now(), power_type: powerType, tone };
    } else {
      h = { ...FALLBACK_HERO(powerType, tone), id: `h-${Date.now()}`, ts: Date.now() };
    }
    setHero(h);
    setLoading(false);
  };

  const save = () => {
    if (!hero) return;
    addToRoster(hero);
  };

  const readAloud = () => {
    if (!hero) return;
    const blurb = `${hero.hero_name}, ${hero.alias}. Real name: ${hero.real_name}. Powers: ${hero.powers.join(", ")}. Origin: ${hero.origin_story} Their archnemesis is ${hero.archnemesis.name}: ${hero.archnemesis.description}. Catchphrase: ${hero.catchphrase}`;
    speak(blurb);
  };

  return (
    <WordplayShell title="Hero Maker" emoji="🦸" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setView("make")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "make" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "make" ? "#1a0606" : "#fff", minHeight: 44 }}>MAKE A HERO</button>
          <button onClick={() => setView("roster")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "roster" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "roster" ? "#1a0606" : "#fff", minHeight: 44 }}>
            <Users size={11} className="inline mr-1" /> ROSTER · {roster.length}
          </button>
        </div>

        {view === "make" && (
          <>
            <section className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200">POWER TYPE</div>
              <div className="flex flex-wrap gap-1.5">
                {POWER_TYPES.map(p => (
                  <button key={p} onClick={() => setPowerType(p)}
                    className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                    style={{
                      background: powerType === p ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${powerType === p ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                      color: powerType === p ? ACCENT : "#fff",
                      minHeight: 34,
                    }}>{p}</button>
                ))}
              </div>
            </section>

            <section className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200">TONE</div>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                    style={{
                      background: tone === t ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${tone === t ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                      color: tone === t ? ACCENT : "#fff",
                      minHeight: 34,
                    }}>{t}</button>
                ))}
              </div>
            </section>

            <section className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200">INSPIRATION (OPTIONAL)</div>
              <input value={inspiration} onChange={e => setInspiration(e.target.value)}
                placeholder='e.g. "a hero based on weather" or "a kid sidekick to a hero pizza chef"'
                aria-label="Hero inspiration (optional)"
                className="w-full rounded-lg bg-black/40 px-3 py-2 text-[13px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
            </section>

            <button onClick={generate} disabled={loading}
              className="w-full px-4 py-4 rounded-2xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: ACCENT, color: "#1a0606", minHeight: 60 }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> FORGING HERO…</> : <><Sparkles size={14} /> GENERATE HERO</>}
            </button>

            {hero && (
              <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-2xl p-4"
                style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(40,10,10,0.95))`, border: `2px solid ${ACCENT}` }}>
                <header className="text-center">
                  <div className="text-[10px] tracking-widest text-ink-200">INTRODUCING</div>
                  <h1 className="font-display text-3xl text-white mt-1">{hero.hero_name}</h1>
                  <div className="font-display text-sm mt-1" style={{ color: ACCENT }}>{hero.alias}</div>
                  <div className="text-[11px] text-ink-200 mt-1">aka {hero.real_name}</div>
                </header>

                <Block label="POWERS">
                  <ul className="space-y-1">
                    {hero.powers.map((p, i) => <li key={i} className="text-[12px] text-white">⚡ {p}</li>)}
                  </ul>
                </Block>
                <Block label="COSTUME"><span className="text-[12px] text-white">{hero.costume}</span></Block>
                <Block label="WEAKNESS"><span className="text-[12px] text-white">{hero.weakness}</span></Block>
                <Block label="ORIGIN STORY"><span className="text-[12px] text-white leading-relaxed whitespace-pre-wrap">{hero.origin_story}</span></Block>
                <Block label="ARCHNEMESIS">
                  <div className="text-[12px]">
                    <span className="font-display" style={{ color: ACCENT }}>{hero.archnemesis.name}</span>
                    <span className="text-white"> — {hero.archnemesis.description}</span>
                  </div>
                </Block>
                <Block label="CATCHPHRASE">
                  <div className="text-center text-[14px] font-display text-white italic">"{hero.catchphrase}"</div>
                </Block>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button onClick={save}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                    style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}88`, minHeight: 44 }}>
                    <Save size={11} /> SAVE TO ROSTER
                  </button>
                  <button onClick={readAloud}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                    <Volume2 size={11} /> READ
                  </button>
                  <button onClick={generate} disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                    style={{ background: ACCENT, color: "#1a0606", minHeight: 44 }}>
                    <Sparkles size={11} /> ANOTHER
                  </button>
                </div>
              </motion.article>
            )}
          </>
        )}

        {view === "roster" && (
          <div className="space-y-2">
            {roster.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No heroes saved yet.</div>}
            {roster.map(h => (
              <div key={h.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base text-white">{h.hero_name}</div>
                    <div className="text-[11px]" style={{ color: ACCENT }}>{h.alias}</div>
                    <div className="text-[10px] text-ink-300 mt-0.5">{h.real_name}</div>
                    <div className="text-[11px] text-ink-100 mt-2 line-clamp-2">{h.origin_story}</div>
                    <div className="text-[10px] text-ink-300 mt-2 italic">"{h.catchphrase}"</div>
                  </div>
                </div>
              </div>
            ))}
            {roster.length > 0 && (
              <button onClick={() => { if (confirm("Clear the roster?")) clearAll(); }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#fca5a5", minHeight: 40 }}>
                <Trash2 size={11} /> CLEAR ROSTER
              </button>
            )}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[9px] tracking-[0.3em] font-display mb-1" style={{ color: ACCENT }}>{label}</div>
      {children}
    </div>
  );
}
