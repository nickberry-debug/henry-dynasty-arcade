// Glam Studio Hub — landing page with lookbook gallery and "Start" CTA.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import { useActiveProfile } from "../../profiles/store";
import {
  loadLookbook, subscribeLookbook, deleteLook,
} from "../engine/lookbook";
import type { SavedLook } from "../data/manifest";
import { GLAM_STUDIO_ENABLED } from "../data/manifest";

const TITLE_COLOR = "#f9a8d4";
const ACCENT      = "#a78bfa";

export default function GlamStudioHub() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [saved, setSaved] = useState<SavedLook[]>(() => loadLookbook());

  useEffect(() => {
    if (!profile?.id) return;
    return subscribeLookbook(setSaved) ?? undefined;
  }, [profile?.id]);

  if (!GLAM_STUDIO_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0814", color: "#fef3c7" }}>
        Glam Studio is temporarily disabled.
      </div>
    );
  }

  function startNew() { navigate("/glam-studio/build"); }
  function openLook(look: SavedLook) { navigate(`/glam-studio/build?look=${encodeURIComponent(look.id)}`); }
  function removeLook(id: string) {
    setSaved(prev => deleteLook(prev, id));
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, #1a0a22 0%, #0a0410 100%)", color: "#fef3c7" }}>
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.45)", borderBottom: `1px solid ${ACCENT}40` }}>
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 font-display text-[11px] tracking-widest" style={{ color: TITLE_COLOR }}>
          <Sparkles size={11} style={{ display: "inline", marginRight: 4 }} />
          GLAM STUDIO · 3D FASHION DOLL
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-3 py-6 gap-6 max-w-3xl w-full mx-auto">
        <div className="w-full flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-2xl tracking-widest" style={{ color: TITLE_COLOR }}>
            GLAM STUDIO
          </h1>
          <div className="text-[12px] opacity-80 max-w-md leading-relaxed">
            Style a 3D fashion doll. Pick an outfit, mix hair and color, add makeup and accessories.
            Save up to 24 looks to your Lookbook — synced across the family.
          </div>
          <button onClick={startNew}
            className="mt-3 px-6 py-3 rounded-full font-display tracking-widest text-[12px] pressable touch-target"
            style={{ background: ACCENT, color: "#0a0a14", boxShadow: `0 4px 22px ${ACCENT}80` }}>
            START NEW LOOK
          </button>
        </div>

        <section className="w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display tracking-widest text-[11px]" style={{ color: TITLE_COLOR }}>
              YOUR LOOKBOOK ({saved.length})
            </div>
            <div className="text-[10px] opacity-60">Cloud-synced per profile</div>
          </div>
          {saved.length === 0 ? (
            <div className="w-full text-center py-10 rounded-xl text-[12px] opacity-70"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)" }}>
              No saved looks yet. Tap START NEW LOOK to begin.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {saved.slice().reverse().map(s => (
                <div key={s.id} className="rounded-xl overflow-hidden relative group"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {s.preview ? (
                    <img src={s.preview} alt="" className="w-full block"
                      style={{ aspectRatio: "1/1", objectFit: "cover", background: "#1a0a22" }} />
                  ) : (
                    <div className="w-full flex items-center justify-center text-3xl"
                      style={{ aspectRatio: "1/1", background: "#1a0a22" }}>
                      💄
                    </div>
                  )}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                    style={{ background: "rgba(0,0,0,0.65)" }}>
                    <button onClick={() => openLook(s)}
                      className="px-2 py-1 rounded text-[10px] font-display tracking-widest"
                      style={{ background: ACCENT, color: "#0a0a14" }}>OPEN</button>
                    <button onClick={() => removeLook(s.id)}
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ background: "#f87171", color: "#0a0a14" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="px-2 py-1 text-[9px] opacity-75 truncate">
                    {s.name || new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="w-full mt-2 text-[10px] opacity-55 leading-relaxed text-center">
          Original fashion doll · CC0 base meshes by Quaternius via Poly Pizza.
          See ATTRIBUTION.md for full credits.
        </section>
      </main>

    </div>
  );
}
