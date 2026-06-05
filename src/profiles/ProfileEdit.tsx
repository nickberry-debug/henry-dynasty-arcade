// Profile customization screen — edit name, handle, tagline, avatar, color,
// age category, and favorite game for one profile. Reachable from the
// Profile Picker (pencil icon on each card) and from the corner badge on
// the Landing page.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Shuffle, Trash2 } from "lucide-react";
import { useProfiles, type Profile } from "./store";

// Avatar gallery — every Kenney CC0 Mini character we've already shipped
// to public/assets/kenney/mini/. Twelve options is plenty of variety for
// a 5-member family.
const AVATARS: { src: string; label: string }[] = [
  { src: "/assets/kenney/mini/character-male-a.png",   label: "Male A" },
  { src: "/assets/kenney/mini/character-male-b.png",   label: "Male B" },
  { src: "/assets/kenney/mini/character-male-c.png",   label: "Male C" },
  { src: "/assets/kenney/mini/character-male-d.png",   label: "Male D" },
  { src: "/assets/kenney/mini/character-male-e.png",   label: "Male E" },
  { src: "/assets/kenney/mini/character-male-f.png",   label: "Male F" },
  { src: "/assets/kenney/mini/character-female-a.png", label: "Female A" },
  { src: "/assets/kenney/mini/character-female-b.png", label: "Female B" },
  { src: "/assets/kenney/mini/character-female-c.png", label: "Female C" },
  { src: "/assets/kenney/mini/character-female-d.png", label: "Female D" },
  { src: "/assets/kenney/mini/character-female-e.png", label: "Female E" },
  { src: "/assets/kenney/mini/character-female-f.png", label: "Female F" },
];

// Curated color palette — bright, kid-friendly, well-separated hues.
const COLORS = [
  "#3D9BFF", "#60A5FA", "#0EA5E9",       // blues
  "#A78BFA", "#C084FC", "#F0ABFC",       // purples / pinks
  "#F472B6", "#FB7185",                  // pinks
  "#FB923C", "#FBBF24", "#FACC15",       // warm
  "#86EFAC", "#22C55E",                  // greens
  "#34D399", "#67E8F9",                  // teal / cyan
  "#FCA5A5", "#F87171",                  // red
  "#94A3B8",                             // neutral
];

const GAMES: { id: string; emoji: string; label: string }[] = [
  { id: "baseball",    emoji: "⚾", label: "Baseball" },
  { id: "football",    emoji: "🏈", label: "Football" },
  { id: "olympus",     emoji: "⚔️", label: "Olympus" },
  { id: "mogul",       emoji: "🎬", label: "Movie Studio" },
  { id: "wordplay",    emoji: "💬", label: "Wordplay" },
  { id: "cosmic",      emoji: "🚀", label: "Cosmic Squad" },
  { id: "temporal",    emoji: "🕰️", label: "Temporal" },
  { id: "battleforge", emoji: "⚔️", label: "Battle Forge" },
  { id: "potionlab",   emoji: "🧪", label: "Potion Lab" },
];

export function ProfileEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profiles, upsertProfile, deleteProfile } = useProfiles();

  const existing = profiles.find(p => p.id === id);
  // Local working copy so the user can edit freely and Save commits.
  const [draft, setDraft] = useState<Profile | null>(existing ?? null);

  useEffect(() => {
    if (!draft && existing) setDraft(existing);
  }, [existing, draft]);

  if (!existing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #050308 100%)", color: "#e5e7eb" }}>
        <div className="font-display text-xl mb-2">Profile not found</div>
        <button onClick={() => navigate("/")}
          className="px-4 py-2 rounded-full pressable touch-target"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", minHeight: 44 }}>
          Back to arcade
        </button>
      </div>
    );
  }

  const d = draft ?? existing;

  function patch(p: Partial<Profile>) {
    const base = existing;
    if (!base) return;
    setDraft(prev => ({ ...(prev ?? base), ...p, modifiedAt: Date.now() } as Profile));
  }

  function randomize() {
    const a = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    patch({ avatar: a.src, color: c });
  }

  function save() {
    if (!draft) return;
    upsertProfile(draft);
    navigate("/");
  }

  function remove() {
    const base = existing;
    if (!base) return;
    if (!window.confirm(`Delete profile "${base.name}"? This can't be undone.`)) return;
    deleteProfile(base.id);
    navigate("/");
  }

  return (
    <div className="min-h-screen"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, " + d.color + "26, transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.12), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto safe-top">
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: d.color }}>EDIT PROFILE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fff" }}>{d.name}</h1>
        </div>
        <button onClick={save}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-display tracking-widest text-[11px] pressable touch-target"
          style={{ background: d.color, color: "#0a0a14", minHeight: 44 }}>
          <Check size={14} aria-hidden="true" /> SAVE
        </button>
      </header>

      <main className="px-4 pb-12 max-w-3xl mx-auto space-y-6">
        {/* Preview */}
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{
            background: `linear-gradient(135deg, ${d.color}1f, rgba(10,10,20,0.85))`,
            border: `1px solid ${d.color}66`,
          }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `${d.color}22`, border: `2px solid ${d.color}aa`,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            boxShadow: `0 6px 18px ${d.color}44`,
          }}>
            <img src={d.avatar} alt="" aria-hidden="true" draggable={false}
              style={{ width: 60, height: 60, imageRendering: "pixelated", objectFit: "contain" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg tracking-wide" style={{ color: d.color }}>{d.handle || d.name}</div>
            <div className="text-[11px]" style={{ color: "rgba(229,231,235,0.7)" }}>{d.tagline || "—"}</div>
            <div className="text-[9px] mt-2 inline-flex gap-2">
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: `${d.color}22`, color: d.color, border: `1px solid ${d.color}55` }}>{d.title}</span>
            </div>
          </div>
          <button onClick={randomize} aria-label="Randomize avatar + color"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md pressable touch-target text-[11px]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#c9b6f0", minHeight: 40 }}>
            <Shuffle size={12} aria-hidden="true" /> Random
          </button>
        </motion.section>

        {/* Name + handle + tagline */}
        <section className="space-y-3">
          <Field label="Real Name" hint="Shown on the picker card.">
            <input value={d.name} onChange={e => patch({ name: e.target.value })}
              placeholder="Name"
              className="w-full rounded-md px-3 py-2 outline-none text-sm"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }} />
          </Field>
          <Field label="In-Game Handle" hint='Your "screen name" — what other games call you.'>
            <input value={d.handle} onChange={e => patch({ handle: e.target.value })}
              placeholder="HandleLikeThis"
              maxLength={24}
              className="w-full rounded-md px-3 py-2 outline-none text-sm tracking-wider"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }} />
          </Field>
          <Field label="Tagline" hint="A short catchphrase. Shown under your name.">
            <input value={d.tagline} onChange={e => patch({ tagline: e.target.value })}
              placeholder="Future Champion"
              maxLength={48}
              className="w-full rounded-md px-3 py-2 outline-none text-sm"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }} />
          </Field>
          <Field label="Age" hint="Optional — used by some games to scale difficulty (Math Blaster, Quiz, etc.). Skip if you'd rather not say.">
            <input
              type="number"
              min={3}
              max={120}
              inputMode="numeric"
              value={d.age ?? ""}
              onChange={e => {
                const raw = e.target.value.trim();
                // Persist as a string for backwards-compat with the legacy field
                // shape; getActiveProfileAge() parses to int when reading.
                if (!raw) patch({ age: undefined });
                else patch({ age: raw });
              }}
              placeholder="e.g. 10"
              className="w-full rounded-md px-3 py-2 outline-none text-sm"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }} />
          </Field>
        </section>

        {/* Avatar gallery */}
        <section>
          <SectionHeader>Avatar</SectionHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {AVATARS.map(a => {
              const selected = d.avatar === a.src;
              return (
                <button key={a.src} onClick={() => patch({ avatar: a.src })}
                  aria-label={`Pick avatar ${a.label}`}
                  aria-pressed={selected}
                  className="aspect-square rounded-lg pressable touch-target flex items-end justify-center overflow-hidden"
                  style={{
                    background: selected ? `linear-gradient(135deg, ${d.color}33, rgba(0,0,0,0.5))` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selected ? d.color : "rgba(255,255,255,0.10)"}`,
                    boxShadow: selected ? `0 0 0 1px ${d.color}66 inset` : undefined,
                  }}>
                  <img src={a.src} alt="" aria-hidden="true" draggable={false}
                    style={{ width: "78%", height: "78%", imageRendering: "pixelated", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Color */}
        <section>
          <SectionHeader>Color</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => {
              const selected = d.color.toUpperCase() === c.toUpperCase();
              return (
                <button key={c} onClick={() => patch({ color: c })}
                  aria-label={`Color ${c}`}
                  aria-pressed={selected}
                  className="pressable touch-target rounded-full"
                  style={{
                    width: 36, height: 36, minWidth: 36, minHeight: 36,
                    background: c,
                    border: selected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                    boxShadow: selected ? `0 0 0 2px ${c}aa, 0 4px 12px ${c}66` : undefined,
                  }} />
              );
            })}
          </div>
        </section>

        {/* Favorite game */}
        <section>
          <SectionHeader>Favorite Game</SectionHeader>
          <p className="text-[11px] mb-2" style={{ color: "rgba(229,231,235,0.6)" }}>
            Optional. We'll feature it first on your arcade home.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button onClick={() => patch({ favoriteGame: undefined })}
              aria-pressed={!d.favoriteGame}
              className="rounded-lg p-2 pressable touch-target text-center"
              style={{
                background: !d.favoriteGame ? `${d.color}1f` : "rgba(255,255,255,0.04)",
                border: `1px solid ${!d.favoriteGame ? d.color : "rgba(255,255,255,0.10)"}`,
                minHeight: 60,
              }}>
              <div className="text-base" aria-hidden="true">✨</div>
              <div className="text-[10px] mt-0.5">None</div>
            </button>
            {GAMES.map(g => {
              const selected = d.favoriteGame === g.id;
              return (
                <button key={g.id} onClick={() => patch({ favoriteGame: g.id })}
                  aria-pressed={selected}
                  className="rounded-lg p-2 pressable touch-target text-center"
                  style={{
                    background: selected ? `${d.color}1f` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selected ? d.color : "rgba(255,255,255,0.10)"}`,
                    minHeight: 60,
                  }}>
                  <div className="text-base" aria-hidden="true">{g.emoji}</div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: selected ? d.color : "#e5e7eb" }}>{g.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Delete (footer, secondary) */}
        <section className="pt-4 border-t border-white/10">
          <button onClick={remove}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-[12px] pressable touch-target"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.35)", color: "#fca5a5", minHeight: 40 }}>
            <Trash2 size={12} aria-hidden="true" /> Delete this profile
          </button>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#c9b6f0" }}>{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-1" style={{ color: "#c9b6f0" }}>{label}</div>
      {children}
      {hint && <div className="text-[10px] mt-1" style={{ color: "rgba(229,231,235,0.55)" }}>{hint}</div>}
    </label>
  );
}
