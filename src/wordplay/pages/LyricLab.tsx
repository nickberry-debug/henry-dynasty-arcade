// New sub-app: Lyric Lab. AI generates completely original lyrics
// in verse-chorus-verse-chorus-bridge-chorus structure. Includes
// karaoke read-along with a tempo metronome.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Volume2, Save, Mic2, Library, Mic, Square } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak, stopSpeaking, useVoiceInput, sttSupported } from "../voice";

const ACCENT = "#A3E635";
const GRADIENT = "linear-gradient(135deg, rgba(163,230,53,0.30), rgba(20,30,8,0.95))";

const GENRES = ["Pop", "Rock", "Country", "Folk", "Rap", "Show Tune", "Lullaby", "Anthem", "Silly Kids"];
const MOODS = ["Happy", "Sad", "Silly", "Inspiring", "Surprise"];

interface Song {
  id: string;
  title: string;
  genre: string;
  mood: string;
  verse_1: string;
  chorus: string;
  verse_2: string;
  bridge: string;
  performance_notes: string;
  topic: string;
  ts: number;
}

const FALLBACK_SONG = (topic: string, genre: string, mood: string): Omit<Song, "id" | "ts"> => ({
  title: `Ballad of ${topic}`,
  genre, mood, topic,
  verse_1: `Started off another quiet day\nThinking of the ${topic.toLowerCase()} on its way\nLooked outside and felt the morning bright\nKnew that everything would turn out right`,
  chorus: `Oh oh, ${topic.toLowerCase()}, you light the way\nOh oh, ${topic.toLowerCase()}, I'll sing today\nThrough the easy and the hard\nYou're the rhythm in my yard`,
  verse_2: `Sometimes things don't always go to plan\nBut I try the best I really can\nOne small step then another after that\nGetting taller like a sleepy cat`,
  bridge: `And if the sky goes gray\nI'll still find the way\nTo sing it all anyway`,
  performance_notes: "Medium tempo, bouncy and warm. Smile through the chorus.",
});

export default function LyricLab() {
  const [view, setView] = useState<"make" | "library">("make");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [mood, setMood] = useState("Happy");
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [karaoke, setKaraoke] = useState(false);
  const [library, addLib] = useHistory<Song>("lyric_library", 30);
  const vi = useVoiceInput();

  if (vi.transcript && vi.transcript !== topic) {
    setTimeout(() => { setTopic(t => `${t} ${vi.transcript}`.trim()); vi.reset(); }, 0);
  }

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const finalMood = mood === "Surprise" ? MOODS[Math.floor(Math.random() * (MOODS.length - 1))] : mood;
    const ai = await callAI({
      system: "You write COMPLETELY ORIGINAL song lyrics for kids age 8-13. NEVER use existing song lyrics or copyrighted material. Fresh content only. PG, age-appropriate. Output ONLY JSON.",
      user: `TOPIC: ${topic}
GENRE: ${genre}
MOOD: ${finalMood}

CRITICAL: These must be COMPLETELY ORIGINAL lyrics. Do NOT use any existing song lyrics or copyrighted material.

Structure:
- Verse 1 (4 lines)
- Chorus (4 lines, catchy and repeatable)
- Verse 2 (4 lines, develops topic further)
- Bridge (2-3 lines, slight shift)

Requirements:
- PG, age-appropriate
- Rhyme scheme appropriate to genre
- Specific imagery (not generic)
- Match the requested mood
- Each line 5-10 syllables

Return JSON exactly:
{
  "title": "Song title",
  "verse_1": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "chorus": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "verse_2": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "bridge": "Line 1\\nLine 2\\nLine 3",
  "performance_notes": "Suggested tempo and vibe (e.g. 'slow and dreamy' or 'fast and bouncy')"
}`,
      maxTokens: 1000,
      model: "rich",
    });
    const parsed = parseJSON<Omit<Song, "id" | "ts" | "genre" | "mood" | "topic">>(ai);
    let s: Song;
    if (parsed && parsed.verse_1 && parsed.chorus) {
      s = { ...parsed, genre, mood: finalMood, topic, id: `sg-${Date.now()}`, ts: Date.now() };
    } else {
      s = { ...FALLBACK_SONG(topic, genre, finalMood), id: `sg-${Date.now()}`, ts: Date.now() };
    }
    setSong(s);
    addLib(s);
    setLoading(false);
  };

  const fullSongText = (s: Song) =>
    [s.verse_1, s.chorus, s.verse_2, s.chorus, s.bridge, s.chorus].join("\n\n");

  const startKaraoke = async () => {
    if (!song) return;
    setKaraoke(true);
    speak(fullSongText(song).replace(/\n/g, ". "));
  };

  const stopKaraoke = () => {
    stopSpeaking();
    setKaraoke(false);
  };

  return (
    <WordplayShell title="Lyric Lab" emoji="🎵" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setView("make")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "make" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "make" ? "#0c1a08" : "#fff", minHeight: 44 }}>WRITE</button>
          <button onClick={() => setView("library")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "library" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "library" ? "#0c1a08" : "#fff", minHeight: 44 }}>
            <Library size={11} className="inline mr-1" /> LIBRARY · {library.length}
          </button>
        </div>

        {view === "make" && (
          <>
            <section className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>WHAT'S THE SONG ABOUT?</div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder='e.g. "My dog Rex" or "How much I hate Mondays"'
                aria-label="What's the song about?"
                rows={2}
                className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
              {sttSupported() && (
                <button onClick={() => vi.listening ? vi.stop() : vi.start()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
                  style={{
                    background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: vi.listening ? "#fca5a5" : "#fff",
                    minHeight: 36,
                  }}>
                  <Mic size={11} /> {vi.listening ? "STOP" : "SPEAK TOPIC"}
                </button>
              )}
            </section>

            <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200 mb-2">GENRE</div>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <button key={g} onClick={() => setGenre(g)}
                    className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                    style={{
                      background: genre === g ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${genre === g ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                      color: genre === g ? ACCENT : "#fff",
                      minHeight: 34,
                    }}>{g}</button>
                ))}
              </div>
            </section>

            <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200 mb-2">MOOD</div>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMood(m)}
                    className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                    style={{
                      background: mood === m ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${mood === m ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                      color: mood === m ? ACCENT : "#fff",
                      minHeight: 34,
                    }}>{m}</button>
                ))}
              </div>
            </section>

            <button onClick={generate} disabled={!topic.trim() || loading}
              className="w-full px-4 py-4 rounded-2xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: ACCENT, color: "#0c1a08", minHeight: 60 }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> COMPOSING…</> : <><Sparkles size={14} /> WRITE SONG</>}
            </button>

            {song && (
              <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: `linear-gradient(135deg, ${ACCENT}22, rgba(20,30,8,0.95))`, border: `2px solid ${ACCENT}` }}>
                <header className="text-center">
                  <div className="text-[10px] tracking-widest text-ink-200">{song.genre.toUpperCase()} · {song.mood.toUpperCase()}</div>
                  <h1 className="font-display text-2xl text-white mt-1">"{song.title}"</h1>
                </header>

                <Block label="VERSE 1">{song.verse_1}</Block>
                <Block label="CHORUS" emphasized>{song.chorus}</Block>
                <Block label="VERSE 2">{song.verse_2}</Block>
                <Block label="CHORUS" emphasized>{song.chorus}</Block>
                <Block label="BRIDGE">{song.bridge}</Block>
                <Block label="CHORUS" emphasized>{song.chorus}</Block>

                <div className="text-[10px] text-ink-300 italic text-center">🎭 {song.performance_notes}</div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button onClick={karaoke ? stopKaraoke : startKaraoke}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                    style={{ background: karaoke ? "rgba(239,68,68,0.18)" : `${ACCENT}33`, color: karaoke ? "#fca5a5" : ACCENT, border: `1px solid ${karaoke ? "rgba(239,68,68,0.4)" : `${ACCENT}88`}`, minHeight: 44 }}>
                    {karaoke ? <><Square size={11} /> STOP</> : <><Mic2 size={11} /> KARAOKE</>}
                  </button>
                  <button onClick={() => speak(fullSongText(song).replace(/\n/g, ". "))}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                    <Volume2 size={11} /> READ
                  </button>
                  <button onClick={generate} disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target disabled:opacity-50"
                    style={{ background: ACCENT, color: "#0c1a08", minHeight: 44 }}>
                    <Sparkles size={11} /> ANOTHER
                  </button>
                </div>
              </motion.article>
            )}
          </>
        )}

        {view === "library" && (
          <div className="space-y-2">
            {library.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No songs yet. Write your first one!</div>}
            {library.map(s => (
              <button key={s.id} onClick={() => { setSong(s); setView("make"); }}
                className="w-full text-left rounded-xl p-3 pressable touch-target"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 60 }}>
                <div className="text-[10px]" style={{ color: ACCENT }}>{s.genre.toUpperCase()} · {s.mood.toUpperCase()}</div>
                <div className="font-display text-sm text-white mt-0.5">"{s.title}"</div>
                <div className="text-[11px] text-ink-200 mt-0.5 italic line-clamp-1">about: {s.topic}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}

function Block({ label, children, emphasized }: { label: string; children: React.ReactNode; emphasized?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{
      background: emphasized ? `${ACCENT}11` : "rgba(0,0,0,0.35)",
      border: `1px solid ${emphasized ? `${ACCENT}44` : "rgba(255,255,255,0.06)"}`,
    }}>
      <div className="text-[9px] tracking-[0.3em] font-display mb-1" style={{ color: ACCENT }}>{label}</div>
      <div className="text-[13px] text-white whitespace-pre-wrap leading-relaxed">{children}</div>
    </div>
  );
}
