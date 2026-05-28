// Upgraded News feed — Story of the Day, drama-event cards with reactions,
// search, category filters with drama subcategories, Memorable Moments archive.
import { useStore } from "../store";
import { useMemo, useState } from "react";
import { Heart, Smile, Flame, Frown, Target as TargetIcon, Pin } from "lucide-react";
import { pinAsMemorable, reactToEvent, ensureDramaState } from "../engine/drama";
import type { NewsItem } from "../store/types";

const CATS = ["All", "Drama", "Trade", "Injury", "Milestone", "Game", "Award", "Draft", "FA", "Off-Field"] as const;

const DRAMA_CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  injury: { label: "Injury", emoji: "🤕", color: "text-orange-300 bg-orange-500/10 border-orange-400/30" },
  funny: { label: "Funny", emoji: "😂", color: "text-yellow-300 bg-yellow-500/10 border-yellow-400/30" },
  "hot-streak": { label: "Hot Streak", emoji: "🔥", color: "text-red-300 bg-red-500/10 border-red-400/30" },
  "cold-streak": { label: "Cold Streak", emoji: "❄️", color: "text-sky-300 bg-sky-500/10 border-sky-400/30" },
  drama: { label: "Drama", emoji: "🎭", color: "text-purple-300 bg-purple-500/10 border-purple-400/30" },
  rumor: { label: "Rumor", emoji: "💬", color: "text-slate-300 bg-white/5 border-white/10" },
  milestone: { label: "Milestone", emoji: "🏆", color: "text-amber-300 bg-amber-500/10 border-amber-400/30" },
  personal: { label: "Personal", emoji: "👶", color: "text-pink-300 bg-pink-500/10 border-pink-400/30" },
  weather: { label: "Weather", emoji: "⛈️", color: "text-teal-300 bg-teal-500/10 border-teal-400/30" },
  lucky: { label: "Lucky", emoji: "🍀", color: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30" },
  comeback: { label: "Comeback", emoji: "🦅", color: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30" },
  "pop-culture": { label: "Pop Culture", emoji: "🎬", color: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/30" },
  holiday: { label: "Holiday", emoji: "🎉", color: "text-rose-300 bg-rose-500/10 border-rose-400/30" },
  rivalry: { label: "Rivalry", emoji: "⚔️", color: "text-red-300 bg-red-500/10 border-red-400/30" },
  "hot-take": { label: "Hot Take", emoji: "🎤", color: "text-orange-300 bg-orange-500/10 border-orange-400/30" },
};

export default function News() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [q, setQ] = useState("");
  const [showMemorable, setShowMemorable] = useState(false);

  if (league) ensureDramaState(league);

  const items = useMemo(() => {
    const all = league.newsLog;
    return all
      .filter(n => cat === "All" || n.category === cat)
      .filter(n => !q.trim() || `${n.headline} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  }, [league.newsLog, cat, q]);

  // "Story of the Day" = most recent important event from today (or yesterday).
  const storyOfDay = useMemo(() => {
    const candidates = league.newsLog.filter(n =>
      n.year === league.year && n.day >= league.day - 1 && (n.important || n.severity === "major")
    );
    return candidates[0];
  }, [league.newsLog, league.day, league.year]);

  // Memorable moments archive.
  const drama = (league as any).drama;
  const memorable: NewsItem[] = drama?.memorableMoments ?? [];

  const onReact = (id: string, kind: keyof NonNullable<NewsItem["reactions"]>) => {
    mutate(lg => { reactToEvent(lg, id, kind); });
  };
  const onPin = (id: string) => {
    mutate(lg => { pinAsMemorable(lg, id); });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">League Feed</div>
          <h1 className="font-display text-4xl">NEWS</h1>
        </div>
        <button
          onClick={() => setShowMemorable(m => !m)}
          className={`px-3.5 py-2 rounded-xl text-sm pressable touch-target font-medium ${showMemorable ? "bg-amber-400 text-ink-950" : "bg-white/5"}`}
        >
          {showMemorable ? "← Back to Feed" : `🌟 Memorable Moments (${memorable.length})`}
        </button>
      </header>

      {showMemorable ? (
        <MemorableMoments items={memorable} />
      ) : (
        <>
          {/* Search + filters */}
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search news…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3.5 py-2 rounded-xl text-sm whitespace-nowrap pressable touch-target font-medium ${cat === c ? "bg-accent text-ink-950" : "bg-white/5"}`}
              >{c}</button>
            ))}
          </div>

          {storyOfDay && cat === "All" && !q.trim() && (
            <StoryOfDay item={storyOfDay} onReact={onReact} onPin={onPin} />
          )}

          <div className="space-y-2">
            {items.map(n => (
              <NewsCard key={n.id} item={n} onReact={onReact} onPin={onPin} />
            ))}
            {items.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-ink-200">
                No news matches that filter yet. Sim a day to generate fresh drama.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StoryOfDay({ item, onReact, onPin }: { item: NewsItem; onReact: (id: string, k: any) => void; onPin: (id: string) => void }) {
  const drama = item.dramaCategory ? DRAMA_CATEGORY_LABELS[item.dramaCategory] : null;
  return (
    <article className="rounded-2xl overflow-hidden border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent">
      <div className="px-4 pt-4 pb-2">
        <div className="text-[10px] text-amber-300 uppercase tracking-[0.3em] font-display">⭐ Story of the Day</div>
      </div>
      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-4 items-start">
        <div className="text-7xl shrink-0">{item.emoji ?? "📰"}</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl leading-tight">{item.headline}</h2>
          {item.body && <p className="text-sm text-ink-100 mt-2 leading-relaxed">{item.body}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {drama && <span className={`text-[10px] px-2 py-1 rounded-md border ${drama.color}`}>{drama.emoji} {drama.label}</span>}
            <span className="text-[10px] text-ink-300">Year {item.year} • Day {item.day}</span>
          </div>
          <ReactionsRow item={item} onReact={onReact} onPin={onPin} />
        </div>
      </div>
    </article>
  );
}

function NewsCard({ item, onReact, onPin }: { item: NewsItem; onReact: (id: string, k: any) => void; onPin: (id: string) => void }) {
  const drama = item.dramaCategory ? DRAMA_CATEGORY_LABELS[item.dramaCategory] : null;
  const accentBorder = drama
    ? drama.color.split(" ").find(c => c.startsWith("border-")) ?? "border-white/10"
    : "border-white/10";
  return (
    <article className={`p-3.5 rounded-2xl border ${accentBorder} bg-white/3 hover:bg-white/5 transition`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0 leading-none">{item.emoji ?? "📰"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            {drama
              ? <span className={`text-[9px] px-1.5 py-0.5 rounded border ${drama.color}`}>{drama.label}</span>
              : <span className="text-[10px] text-ink-200 uppercase tracking-widest">{item.category}</span>}
            <span className="text-[10px] text-ink-300">{item.year} Day {item.day}</span>
            {item.severity === "major" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/80 text-white font-display tracking-widest">MAJOR</span>}
            {item.memorable && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-ink-950 font-display tracking-widest">📌 PINNED</span>}
          </div>
          <div className={item.important ? "font-display text-lg leading-snug" : "font-semibold leading-snug"}>{item.headline}</div>
          {item.body && <div className="text-sm text-ink-200 mt-1.5 leading-relaxed">{item.body}</div>}
          {item.gameEffect && item.gameEffect.type !== "none" && (
            <div className="mt-2 text-[10px] text-ink-300 font-mono">
              ✦ Effect: {item.gameEffect.type} · {item.gameEffect.duration}d · mag {item.gameEffect.magnitude}
            </div>
          )}
          <ReactionsRow item={item} onReact={onReact} onPin={onPin} />
        </div>
      </div>
    </article>
  );
}

function ReactionsRow({ item, onReact, onPin }: { item: NewsItem; onReact: (id: string, k: any) => void; onPin: (id: string) => void }) {
  const r = item.reactions ?? { likes: 0, laughs: 0, fire: 0, sad: 0, bullseye: 0 };
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3">
      <ReactionBtn onClick={() => onReact(item.id, "likes")} count={r.likes} Icon={Heart} title="Like" />
      <ReactionBtn onClick={() => onReact(item.id, "laughs")} count={r.laughs} Icon={Smile} title="Funny" />
      <ReactionBtn onClick={() => onReact(item.id, "fire")} count={r.fire} Icon={Flame} title="Fire" />
      <ReactionBtn onClick={() => onReact(item.id, "sad")} count={r.sad} Icon={Frown} title="Sad" />
      <ReactionBtn onClick={() => onReact(item.id, "bullseye")} count={r.bullseye} Icon={TargetIcon} title="Spot on" />
      {!item.memorable && (
        <button
          onClick={() => onPin(item.id)}
          className="ml-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-400/20 text-[10px] flex items-center gap-1 pressable touch-target"
          title="Pin to Memorable Moments"
        >
          <Pin size={11} /> Pin
        </button>
      )}
    </div>
  );
}

function ReactionBtn({ Icon, count, onClick, title }: { Icon: any; count: number; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 pressable touch-target"
      title={title}
    >
      <Icon size={11} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

function MemorableMoments({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="text-5xl mb-2">📒</div>
        <div className="font-display text-xl mb-1">No memorable moments yet</div>
        <div className="text-sm text-ink-200">Major events and walk-offs get archived here. Pin any story you don't want to lose.</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-300 mb-1">Pinned stories. Major events auto-save here. Tap to revisit.</div>
      {items.map(n => (
        <article key={n.id} className="p-3.5 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-start gap-3">
            <div className="text-3xl">{n.emoji ?? "🌟"}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-amber-300 uppercase tracking-widest">Year {n.year} · Day {n.day}</div>
              <div className="font-display text-lg leading-snug mt-0.5">{n.headline}</div>
              {n.body && <div className="text-sm text-ink-200 mt-1">{n.body}</div>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
