// Save slots manager: list / load / rename / duplicate / snapshot / delete saved leagues.
import { useEffect, useState } from "react";
import { useStore, listSavedLeagues, removeLeague } from "../store";
import { FolderOpen, Copy, Pencil, Trash2, Camera, Check, X } from "lucide-react";

interface SavedSummary { id: string; name: string; year: number; modifiedAt: number; phase?: string; }

export function SaveSlotsManager() {
  const league = useStore(s => s.league);
  const switchLeague = useStore(s => s.switchLeague);
  const snapshotCurrent = useStore(s => s.snapshotCurrent);
  const renameCurrent = useStore(s => s.renameCurrent);
  const duplicateCurrent = useStore(s => s.duplicateCurrent);
  const [saves, setSaves] = useState<SavedSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const rows = await listSavedLeagues();
    setSaves(rows.map((r: any) => ({ id: r.id, name: r.name, year: r.year, modifiedAt: r.modifiedAt, phase: r.data?.phase })));
  };

  useEffect(() => { refresh(); }, [league?.id, league?.modifiedAt]);

  const onSnapshot = async () => {
    setBusy(true);
    await snapshotCurrent();
    await refresh();
    setBusy(false);
  };

  const onDuplicate = async () => {
    setBusy(true);
    await duplicateCurrent(`${league?.name ?? "League"} — Copy`);
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
    await refresh();
    setConfirmDelete(null);
    setBusy(false);
  };

  const saveRename = async () => {
    if (!editingId) return;
    setBusy(true);
    if (editingId === league?.id) {
      await renameCurrent(editName);
    } else {
      // Rename a non-active slot via direct db helper
      const { renameLeague } = await import("../db/dexie");
      await renameLeague(editingId, editName);
    }
    await refresh();
    setEditingId(null);
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-head text-base uppercase tracking-widest">Save Slots</h3>
        <div className="flex gap-2">
          <button onClick={onSnapshot} disabled={!league || busy} className="px-3 py-2 rounded-xl bg-accent text-ink-950 text-xs font-medium pressable touch-target flex items-center gap-1 disabled:opacity-40">
            <Camera size={14} /> Snapshot Now
          </button>
          <button onClick={onDuplicate} disabled={!league || busy} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target flex items-center gap-1 disabled:opacity-40">
            <Copy size={14} /> Duplicate
          </button>
        </div>
      </div>
      <div className="text-xs text-ink-200">Snapshot creates a frozen copy of the current league so you can experiment without losing progress.</div>

      {saves.length === 0 && <div className="text-sm text-ink-300 py-4">No saved leagues.</div>}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {saves.map(s => {
          const isActive = s.id === league?.id;
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className={`rounded-xl p-3 border ${isActive ? "border-accent/40 bg-accent/5" : "border-white/5 bg-white/3"}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)} autoFocus enterKeyHint="done" inputMode="text" className="bg-black/40 border border-white/10 rounded-md px-3 py-2 w-full" />
                      <button onClick={saveRename} className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center pressable"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center pressable"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium truncate flex items-center gap-2">
                        {s.name}
                        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-ink-950 font-bold">ACTIVE</span>}
                      </div>
                      <div className="text-[11px] text-ink-300">
                        Year {s.year} • {s.phase} • saved {new Date(s.modifiedAt).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex gap-1 shrink-0">
                    {!isActive && (
                      <button onClick={() => onLoad(s.id)} disabled={busy} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target" title="Load"><FolderOpen size={16} /></button>
                    )}
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} disabled={busy} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target" title="Rename"><Pencil size={14} /></button>
                    {confirmDelete === s.id ? (
                      <>
                        <button onClick={() => onDelete(s.id)} disabled={busy} className="px-2 h-9 rounded-lg bg-red-500 text-white text-xs font-bold pressable touch-target">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} disabled={busy} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target"><X size={14} /></button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(s.id)} disabled={busy || isActive} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target disabled:opacity-30" title={isActive ? "Cannot delete active league" : "Delete"}><Trash2 size={14} /></button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
