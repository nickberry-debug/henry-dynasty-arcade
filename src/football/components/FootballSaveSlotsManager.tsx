// Football save-slot manager. List / load / duplicate / rename / delete
// saved football leagues. Mirrors the baseball SaveSlotsManager shape.
import { useEffect, useState } from "react";
import { useFootball, listFootballLeagues } from "../store";
import { FolderOpen, Copy, Pencil, Trash2, Check, X } from "lucide-react";

interface SavedSummary { id: string; name: string; season: number; modifiedAt: number; phase?: string; week?: number; }

export function FootballSaveSlotsManager() {
  const league = useFootball(s => s.league);
  const switchLeague = useFootball(s => s.switchLeague);
  const renameCurrent = useFootball(s => s.renameCurrent);
  const duplicateCurrent = useFootball(s => s.duplicateCurrent);
  const removeLeague = useFootball(s => s.removeLeague);
  const [saves, setSaves] = useState<SavedSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const rows = await listFootballLeagues();
    setSaves(rows.map(r => ({ id: r.id, name: r.name, season: r.season, modifiedAt: r.modifiedAt, phase: r.data?.phase, week: r.data?.week })));
  };

  useEffect(() => { refresh(); }, [league?.id, league?.modifiedAt]);

  const onDuplicate = async () => {
    setBusy(true);
    await duplicateCurrent(`${league?.name ?? "Franchise"} — Copy`);
    await refresh();
    setBusy(false);
  };

  const onLoad = async (id: string) => {
    if (id === league?.id) return;
    setBusy(true);
    await switchLeague(id);
    setBusy(false);
  };

  const onDelete = async (id: string) => {
    setBusy(true);
    await removeLeague(id);
    setConfirmDelete(null);
    await refresh();
    setBusy(false);
  };

  const onSaveName = async () => {
    if (!editingId || !editName.trim()) { setEditingId(null); return; }
    setBusy(true);
    if (editingId === league?.id) await renameCurrent(editName.trim());
    setEditingId(null);
    await refresh();
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={onDuplicate} disabled={busy || !league} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs pressable touch-target disabled:opacity-40">
          <Copy size={12} /> Duplicate Current
        </button>
      </div>

      {saves.length === 0 && (
        <div className="rounded-xl p-4 text-center text-ink-300 text-sm" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          No saves yet. Your franchise auto-saves after every action.
        </div>
      )}

      {saves.map(s => {
        const isActive = s.id === league?.id;
        const lastSavedMin = Math.max(1, Math.floor((Date.now() - s.modifiedAt) / 60000));
        return (
          <div key={s.id} className="rounded-xl p-3" style={{
            background: isActive ? "rgba(255,184,28,0.10)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isActive ? "rgba(255,184,28,0.45)" : "rgba(255,255,255,0.06)"}`,
          }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              {editingId === s.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                    className="flex-1 bg-white/10 border border-white/15 rounded-md px-2 py-1 text-sm"
                  />
                  <button onClick={onSaveName} className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center pressable touch-target" aria-label="Save">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center pressable touch-target" aria-label="Cancel">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="font-display tracking-widest text-sm">
                  {s.name}
                  {isActive && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#FFB81C", color: "#0a0d13" }}>ACTIVE</span>}
                </div>
              )}
            </div>
            <div className="text-[11px] text-ink-200 mb-2">
              {s.season} season · Week {s.week ?? "?"} · {prettyPhase(s.phase ?? "—")} · saved {lastSavedMin}m ago
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {!isActive && (
                <button onClick={() => onLoad(s.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs pressable touch-target" style={{ background: "rgba(255,184,28,0.18)", border: "1px solid rgba(255,184,28,0.35)", color: "#FFB81C" }}>
                  <FolderOpen size={12} /> Load
                </button>
              )}
              <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} disabled={busy || !isActive} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 pressable touch-target disabled:opacity-30">
                <Pencil size={12} /> Rename
              </button>
              {confirmDelete === s.id ? (
                <>
                  <button onClick={() => onDelete(s.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs pressable touch-target" style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5" }}>
                    Confirm Delete?
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-white/5 pressable touch-target">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(s.id)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 pressable touch-target text-red-300">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function prettyPhase(phase: string): string {
  switch (phase) {
    case "regular": return "Regular Season";
    case "playoffs": return "Playoffs";
    case "offseason": return "Offseason";
    case "freeagency": return "Free Agency";
    case "draft": return "Draft";
    case "preseason": return "Preseason";
    default: return phase;
  }
}
