// Industry — rivals, the talent pool, the open script market, weekly
// box office. Henry's window into the rest of Hollywood.
import { useMogul } from "../store";
import { useMemo, useState } from "react";
import { buyScript, runCoverage, signTalent } from "../engine";
import { ScriptRow } from "./StudioManage";
import type { Talent, Genre } from "../types";
import { Users, ScrollText, BarChart3, Building2, Search } from "lucide-react";

type Sub = "rivals" | "talent" | "scripts" | "boxoffice";

export default function Industry() {
  const [sub, setSub] = useState<Sub>("scripts");
  const tabs: { id: Sub; label: string; icon: any }[] = [
    { id: "scripts", label: "Script Market", icon: ScrollText },
    { id: "talent", label: "Talent Pool", icon: Users },
    { id: "rivals", label: "Rival Studios", icon: Building2 },
    { id: "boxoffice", label: "Box Office", icon: BarChart3 },
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} className="px-3 py-2 rounded-xl text-xs font-display tracking-widest whitespace-nowrap touch-target pressable inline-flex items-center gap-1.5" style={{
            background: sub === t.id ? "#D4AF37" : "rgba(255,255,255,0.05)",
            color: sub === t.id ? "#0a0a0a" : "#fff",
            border: sub === t.id ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.10)",
            touchAction: "manipulation",
          }}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>
      {sub === "scripts" && <ScriptMarketTab />}
      {sub === "talent" && <TalentPoolTab />}
      {sub === "rivals" && <RivalStudiosTab />}
      {sub === "boxoffice" && <BoxOfficeTab />}
    </div>
  );
}

// ─── SCRIPT MARKET ───────────────────────────────────────────

function ScriptMarketTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const open = studio.scripts.filter(s => s.studioId === null && !s.used);
  const [filter, setFilter] = useState<Genre | "all">("all");

  // Pull the Black List scripts to the top, visually flagged.
  const blackListIds = new Set(studio.blackList?.scriptIds ?? []);
  const blackList = open.filter(s => blackListIds.has(s.id));
  const others = open.filter(s => !blackListIds.has(s.id));

  const filteredOthers = filter === "all" ? others : others.filter(s => s.genre === filter);

  return (
    <div className="space-y-2">
      {blackList.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.10), rgba(20,12,28,0.6))", border: "1px solid rgba(168,85,247,0.45)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-purple-300 mb-2">
            📜 THE {studio.blackList?.year} BLACK LIST — PRE-VETTED ELITE SCREENPLAYS
          </div>
          {blackList.map(s => (
            <ScriptRow
              key={s.id}
              script={s}
              mode="market"
              onBuy={() => mutate(st => {
                buyScript(st, s.id);
                if (st.blackList && st.blackList.scriptIds.includes(s.id)) {
                  // Mark resolved once user buys at least one.
                  st.blackList.resolved = true;
                }
              })}
            />
          ))}
        </div>
      )}

      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1 mt-2">SCRIPT MARKET · {others.length} available</div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {(["Action","Drama","Comedy","Thriller","Horror","Romance","SciFi","Fantasy","Family"] as Genre[]).map(g => (
          <FilterChip key={g} active={filter === g} onClick={() => setFilter(g)}>{g}</FilterChip>
        ))}
      </div>
      {filteredOthers.length === 0 && <div className="text-sm text-ink-300 italic px-1">Market empty for this filter — try advancing a month.</div>}
      {filteredOthers.map(s => (
        <ScriptRow
          key={s.id}
          script={s}
          mode="market"
          onBuy={() => mutate(st => { buyScript(st, s.id); })}
        />
      ))}
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-md text-[11px] whitespace-nowrap pressable touch-target" style={{
      background: active ? "rgba(212,175,55,0.20)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.07)"}`,
      color: active ? "#D4AF37" : "#fff",
      touchAction: "manipulation",
      minHeight: 36,  // borderline OK for chip-style filter; bumped from 24
    }}>{children}</button>
  );
}

// ─── TALENT POOL ─────────────────────────────────────────────

function TalentPoolTab() {
  const studio = useMogul(s => s.studio)!;
  const mutate = useMogul(s => s.mutate);
  const [role, setRole] = useState<"actor" | "director" | "writer">("actor");
  const pool = studio.talent.filter(t => t.role === role && !t.retired);
  const free = pool.filter(t => !t.studioId);
  const sorted = free.slice().sort((a, b) => b.star - a.star || b.fee - a.fee);

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">TALENT POOL</div>
      <div className="flex gap-1">
        {(["actor", "director", "writer"] as const).map(r => (
          <button key={r} onClick={() => setRole(r)} className="flex-1 px-2 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target" style={{
            background: role === r ? "rgba(212,175,55,0.20)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${role === r ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.07)"}`,
            color: role === r ? "#D4AF37" : "#fff",
            touchAction: "manipulation",
          }}>{r.charAt(0).toUpperCase() + r.slice(1)}s</button>
        ))}
      </div>
      <div className="text-[11px] text-ink-300 px-1">{sorted.length} free agents — under-contract talent hidden.</div>
      <div className="space-y-1.5">
        {sorted.slice(0, 30).map(t => (
          <div key={t.id} className="rounded-xl px-3 py-2 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex-1 min-w-0">
              <div className="font-display tracking-wide truncate flex items-center gap-1.5">{t.name}</div>
              <div className="text-[10px] text-ink-300">Age {t.age} · {"★".repeat(t.star)}{t.specialties.length > 0 ? ` · ${t.specialties.join(", ")}` : ""}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xs">${t.fee.toFixed(1)}M</div>
              <button onClick={() => mutate(s => { signTalent(s, t.id); })} className="text-[10px] px-2 py-1 mt-1 rounded pressable touch-target" style={{ background: "#D4AF37", color: "#0a0a0a" }}>
                Sign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIVAL STUDIOS ───────────────────────────────────────────

function RivalStudiosTab() {
  const studio = useMogul(s => s.studio)!;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">RIVAL STUDIOS · {studio.rivals.length}</div>
      {studio.rivals.map(r => {
        const open = openId === r.id;
        const recent = studio.releases.filter(rel => rel.studioId === r.id).slice(0, 3);
        return (
          <div key={r.id} className="rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${r.primary}55` }}>
            <button onClick={() => setOpenId(open ? null : r.id)} className="w-full text-left px-3 py-2.5 pressable touch-target flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm" style={{ background: r.primary, color: r.accent }}>{r.abbr}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display tracking-wide truncate">{r.name}</div>
                <div className="text-[10px] text-ink-300">{"★".repeat(r.prestige)} · {r.activeProductions.length} in production · favors {r.personality.favoredGenres.join(", ")}</div>
              </div>
              <div className="text-[11px] font-mono text-ink-300">${r.cash.toFixed(0)}M</div>
            </button>
            {open && recent.length > 0 && (
              <div className="px-3 pb-2.5 text-[11px] text-ink-200 space-y-0.5">
                <div className="text-[9px] tracking-widest text-ink-400 mb-1">RECENT RELEASES</div>
                {recent.map(rel => (
                  <div key={rel.id} className="flex justify-between gap-2">
                    <span className="truncate">"{rel.title}"</span>
                    <span className="font-mono text-ink-300">${rel.totalBO.toFixed(1)}M</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── BOX OFFICE ──────────────────────────────────────────────

function BoxOfficeTab() {
  const studio = useMogul(s => s.studio)!;
  const sorted = studio.releases.slice().sort((a, b) => b.totalBO - a.totalBO).slice(0, 20);
  const opening = studio.records.biggestOpening
    ? studio.releases.find(r => r.id === studio.records.biggestOpening!.movieId)
    : null;
  const total = studio.records.biggestTotalBO
    ? studio.releases.find(r => r.id === studio.records.biggestTotalBO!.movieId)
    : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[9px] tracking-widest text-ink-300">BIGGEST OPENING</div>
          <div className="font-display text-lg mt-0.5" style={{ color: "#D4AF37" }}>{opening ? `$${opening.opening.toFixed(1)}M` : "—"}</div>
          <div className="text-[10px] text-ink-300 truncate">{opening?.title ?? ""}</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[9px] tracking-widest text-ink-300">BIGGEST TOTAL</div>
          <div className="font-display text-lg mt-0.5" style={{ color: "#D4AF37" }}>{total ? `$${total.totalBO.toFixed(1)}M` : "—"}</div>
          <div className="text-[10px] text-ink-300 truncate">{total?.title ?? ""}</div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-2">TOP 20 ALL-TIME (this save)</div>
        {sorted.length === 0 && <div className="text-[12px] text-ink-300 italic">No releases tracked yet.</div>}
        <div className="space-y-1">
          {sorted.map((r, i) => {
            const owner = r.studioId === studio.player.id ? studio.player.abbr : studio.rivals.find(rv => rv.id === r.studioId)?.abbr ?? "—";
            return (
              <div key={r.id} className="flex items-center gap-2 text-[12px] px-2 py-1 rounded" style={{ background: r.studioId === studio.player.id ? `${studio.player.primary}22` : "transparent" }}>
                <span className="font-mono text-ink-300 w-6">{i + 1}.</span>
                <span className="flex-1 truncate">"{r.title}"</span>
                <span className="text-[10px] text-ink-300">{owner}</span>
                <span className="font-mono text-ink-100">${r.totalBO.toFixed(1)}M</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
