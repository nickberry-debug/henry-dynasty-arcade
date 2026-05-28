// Awards — Golden Reel nominations + ceremony history.
import { useMogul } from "../store";
import { Trophy, Sparkles, Star } from "lucide-react";

export default function Awards() {
  const studio = useMogul(s => s.studio)!;
  const ceremonies = studio.awards;
  const myWinsTotal = ceremonies.reduce((acc, c) => {
    if (!c.ceremonyDone) return acc;
    return acc + c.nominations.filter(n => n.winnerIdx != null && n.nominees[n.winnerIdx!].studioId === studio.player.id).length;
  }, 0);
  const walkOfFame = studio.player.walkOfFame.map(id => studio.talent.find(t => t.id === id) ?? studio.retiredTalent.find(t => t.id === id)).filter(Boolean) as import("../types").Talent[];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(8,4,12,0.85))", border: "1px solid rgba(212,175,55,0.5)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} style={{ color: "#D4AF37" }} />
          <div className="font-display tracking-widest" style={{ color: "#D4AF37" }}>THE GOLDEN REEL AWARDS</div>
        </div>
        <div className="text-[12px] text-ink-200">
          Annual ceremony in March. Your studio has won <span className="font-mono text-white">{myWinsTotal}</span> Reels across <span className="font-mono text-white">{ceremonies.length}</span> ceremony{ceremonies.length === 1 ? "" : "ies"}.
        </div>
      </div>

      {/* WALK OF FAME — talent who hit 5+ career hits at your studio */}
      {walkOfFame.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.10), rgba(20,12,28,0.65))", border: "1px solid rgba(212,175,55,0.35)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} style={{ color: "#D4AF37" }} />
            <div className="font-display tracking-widest" style={{ color: "#D4AF37" }}>HOLLYWOOD WALK OF FAME · {walkOfFame.length}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {walkOfFame.map(t => (
              <div key={t.id} className="rounded-lg p-2.5 text-center" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)" }}>
                <div className="text-2xl">⭐</div>
                <div className="font-display text-sm truncate" style={{ color: "#D4AF37" }}>{t.name}</div>
                <div className="text-[10px] text-ink-300">{prettyRole(t.role)} · {t.hits} hits</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ceremonies.length === 0 && (
        <div className="rounded-xl p-4 text-center text-sm text-ink-300 italic" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Release a movie to be eligible for the next ceremony. Nominations are announced at year-end.
        </div>
      )}

      {ceremonies.map(c => (
        <div key={c.year} className="rounded-2xl p-4" style={{ background: "rgba(20,12,28,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-xl">{c.year}</div>
            <div className="text-[10px] tracking-widest font-display" style={{ color: c.ceremonyDone ? "#D4AF37" : "#94a3b8" }}>
              {c.ceremonyDone ? "CEREMONY CONCLUDED" : "NOMINATIONS"}
            </div>
          </div>
          <div className="space-y-2">
            {c.nominations.map(nom => (
              <div key={nom.category} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">{nom.category.toUpperCase()}</div>
                <ul className="space-y-0.5">
                  {nom.nominees.map((n, idx) => {
                    const movie = studio.releases.find(r => r.id === n.movieId);
                    const mine = n.studioId === studio.player.id;
                    const isWinner = c.ceremonyDone && nom.winnerIdx === idx;
                    if (!movie) return null;
                    return (
                      <li key={`${nom.category}-${idx}`} className="flex items-center gap-2 text-[12px]" style={{
                        color: isWinner ? "#D4AF37" : mine ? "#fff" : "#cbd5e1",
                      }}>
                        {isWinner && <Sparkles size={11} style={{ color: "#D4AF37" }} />}
                        <span className="truncate">
                          "{movie.title}"
                          {mine && <span className="ml-1 text-[9px] tracking-widest font-display" style={{ color: studio.player.accent }}>· YOU</span>}
                        </span>
                        {isWinner && <span className="ml-auto text-[9px] font-display tracking-widest">WINNER</span>}
                      </li>
                    );
                  })}
                </ul>
                {c.ceremonyDone && c.speeches?.[nom.category] && (
                  <div className="mt-2 text-[11px] italic px-2 py-1.5 rounded" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.20)", color: "#f5deb3" }}>
                    "{c.speeches[nom.category]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function prettyRole(r: "actor" | "director" | "writer"): string {
  return r === "actor" ? "Actor" : r === "director" ? "Director" : "Writer";
}
