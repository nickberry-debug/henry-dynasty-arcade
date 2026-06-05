// Football — News feed.
// Mirrors Baseball's News page: category filter, search, story-of-the-day
// callout, reactions per item, "memorable moments" pinning.
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Smile, Flame, Frown, Pin, Sparkles } from "lucide-react";
import { useFootball } from "../store";
import type { FootballNewsItem } from "../types";
import { STORYLINE_EMOJI } from "../../sports-engine";

const CATS = ["All", "Game", "Drama", "Injury", "Trade", "Milestone", "Award", "Draft", "FA"] as const;

export default function FootballNews() {
  const lg = useFootball(s => s.league);
  const mutate = useFootball(s => s.mutate);
  const [cat, setCat] = useState<typeof CATS[number]>("All");
  const [q, setQ] = useState("");
  const [showMemorable, setShowMemorable] = useState(false);

  const items = useMemo<FootballNewsItem[]>(() => {
    if (!lg) return [];
    const all = lg.newsLog;
    return all
      .filter(n => cat === "All" || n.category === cat)
      .filter(n => !q.trim() || `${n.headline} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  }, [lg?.newsLog, cat, q]);

  const memorable = useMemo<FootballNewsItem[]>(() => {
    if (!lg) return [];
    return lg.newsLog.filter(n => n.memorable);
  }, [lg?.newsLog]);

  const storyOfWeek = useMemo<FootballNewsItem | undefined>(() => {
    if (!lg) return undefined;
    return lg.newsLog.find(n => n.season === lg.season && n.important);
  }, [lg?.newsLog, lg?.season]);

  if (!lg) return <div className="p-8 text-ink-200">No league.</div>;

  const onReact = async (id: string, kind: "likes" | "laughs" | "fire" | "sad") => {
    await mutate(lgs => {
      const n = lgs.newsLog.find(x => x.id === id);
      if (!n) return;
      if (!n.reactions) n.reactions = { likes: 0, laughs: 0, fire: 0, sad: 0 };
      n.reactions[kind] = (n.reactions[kind] ?? 0) + 1;
    });
  };
  const onPin = async (id: string) => {
    await mutate(lgs => {
      const n = lgs.newsLog.find(x => x.id === id);
      if (n) n.memorable = !n.memorable;
    });
  };

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>League Feed · Week {lg.week}</div>
            <h1 className="font-display text-3xl">NEWS</h1>
          </div>
        </div>
        <button onClick={() => setShowMemorable(m => !m)}
          className="px-3 py-2 rounded-xl text-sm pressable touch-target font-medium"
          style={showMemorable ? { background: "#fcd34d", color: "#0a0d13" } : { background: "rgba(255,255,255,0.06)" }}>
          {showMemorable ? "← Back to Feed" : `🌟 Memorable (${memorable.length})`}
        </button>
      </header>

      {showMemorable ? (
        memorable.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-2">📒</div>
            <div className="font-display text-xl mb-1">No memorable moments yet</div>
            <div className="text-sm text-ink-200">Pin any story you want to remember — it'll live here.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {memorable.map(n => <NewsCard key={n.id} item={n} onReact={onReact} onPin={onPin} />)}
          </div>
        )
      ) : (
        <>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search news…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-2 rounded-xl text-sm whitespace-nowrap pressable touch-target font-medium"
                style={cat === c ? { background: "#FFB81C", color: "#0a0d13" } : { background: "rgba(255,255,255,0.05)" }}>
                {c}
              </button>
            ))}
          </div>

          {/* Active storylines surface above the feed when viewing All. */}
          {cat === "All" && !q.trim() && lg.storylines && lg.storylines.active.length > 0 && (
            <section className="rounded-2xl p-4"
              style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.10), rgba(8,12,20,0.85))", border: "1px solid rgba(167,139,250,0.35)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-violet-300" />
                <div className="text-[10px] tracking-[0.3em] font-display text-violet-200">STORYLINES · {lg.storylines.active.length} ACTIVE</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {lg.storylines.active
                  .slice()
                  .sort((a, b) => b.intensity - a.intensity)
                  .slice(0, 8)
                  .map(s => (
                  <div key={s.id} className="flex items-start gap-2 rounded-lg p-2"
                    style={{ background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg shrink-0">{s.emoji ?? STORYLINE_EMOJI[s.kind]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-display tracking-wide truncate" style={{ color: "#fef3c7" }}>{s.label}</div>
                      {s.body && <div className="text-[10px] text-ink-200 mt-0.5 leading-snug">{s.body}</div>}
                      {s.intensity > 1 && (
                        <div className="text-[9px] mt-0.5" style={{ color: "#fde047" }}>
                          {"★".repeat(Math.min(3, s.intensity - 1))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {storyOfWeek && cat === "All" && !q.trim() && (
            <article className="rounded-2xl overflow-hidden border border-amber-400/30"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(11,8,4,0.85))" }}>
              <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] text-amber-300 uppercase tracking-[0.3em] font-display">⭐ Story of the Week</div>
              </div>
              <div className="px-4 pb-4 flex flex-col sm:flex-row gap-4 items-start">
                <div className="text-6xl shrink-0">{storyOfWeek.emoji ?? "📰"}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl leading-tight">{storyOfWeek.headline}</h2>
                  {storyOfWeek.body && <p className="text-sm text-ink-100 mt-2 leading-relaxed">{storyOfWeek.body}</p>}
                  <ReactionsRow item={storyOfWeek} onReact={onReact} onPin={onPin} />
                </div>
              </div>
            </article>
          )}

          <div className="space-y-2">
            {items.map(n => <NewsCard key={n.id} item={n} onReact={onReact} onPin={onPin} />)}
            {items.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-ink-200">
                No news matches that filter yet. Sim a week to generate fresh stories.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────

function NewsCard({ item, onReact, onPin }: {
  item: FootballNewsItem;
  onReact: (id: string, kind: "likes" | "laughs" | "fire" | "sad") => void;
  onPin: (id: string) => void;
}) {
  return (
    <article className="p-3.5 rounded-2xl border border-white/10 bg-white/3">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0 leading-none">{item.emoji ?? "📰"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <span className="text-[10px] text-ink-200 uppercase tracking-widest">{item.category}</span>
            <span className="text-[10px] text-ink-300">Week {item.week} · {item.season}</span>
            {item.important && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/80 text-ink-950 font-display tracking-widest">IMPORTANT</span>}
            {item.memorable && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-ink-950 font-display tracking-widest">📌 PINNED</span>}
          </div>
          <div className={item.important ? "font-display text-lg leading-snug" : "font-semibold leading-snug"}>{item.headline}</div>
          {item.body && <div className="text-sm text-ink-200 mt-1.5 leading-relaxed">{item.body}</div>}
          <ReactionsRow item={item} onReact={onReact} onPin={onPin} />
        </div>
      </div>
    </article>
  );
}

function ReactionsRow({ item, onReact, onPin }: {
  item: FootballNewsItem;
  onReact: (id: string, kind: "likes" | "laughs" | "fire" | "sad") => void;
  onPin: (id: string) => void;
}) {
  const r = item.reactions ?? { likes: 0, laughs: 0, fire: 0, sad: 0 };
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3">
      <RBtn onClick={() => onReact(item.id, "likes")}  count={r.likes ?? 0}  Icon={Heart}  title="Like" />
      <RBtn onClick={() => onReact(item.id, "laughs")} count={r.laughs ?? 0} Icon={Smile}  title="Funny" />
      <RBtn onClick={() => onReact(item.id, "fire")}   count={r.fire ?? 0}   Icon={Flame}  title="Fire" />
      <RBtn onClick={() => onReact(item.id, "sad")}    count={r.sad ?? 0}    Icon={Frown}  title="Sad" />
      <button onClick={() => onPin(item.id)}
        className="ml-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-400/20 text-[10px] flex items-center gap-1 pressable touch-target"
        title={item.memorable ? "Unpin" : "Pin"}>
        <Pin size={11} /> {item.memorable ? "Pinned" : "Pin"}
      </button>
    </div>
  );
}

function RBtn({ Icon, count, onClick, title }: { Icon: any; count: number; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 pressable touch-target"
      title={title}>
      <Icon size={11} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
