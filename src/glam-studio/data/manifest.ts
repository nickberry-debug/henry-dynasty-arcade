// Glam Studio — typed manifest + customization catalogs.
// The base GLBs (and per-asset metadata) live in
//   public/assets/glam/manifest.json
// This file mirrors the shape in TypeScript and bundles the procedural
// catalogs (hair, makeup palettes, accessories, skin tints) that the
// builder uses live at runtime.

// ── Feature flag ─────────────────────────────────────────────────────
// Flip to false to instantly hide Glam Studio from the app while keeping
// the code compiled. Used during Phase 0; left in for emergencies.
export const GLAM_STUDIO_ENABLED = true;

// ── Base doll catalog (mirrors manifest.json) ────────────────────────

export interface BaseDoll {
  id: string;
  label: string;
  file: string;          // public path, e.g. "/assets/glam/base/woman_dress.glb"
  preview: string;       // jpg preview path
  scale: number;
  src: string;
  license: "CC0" | "CC-BY-3.0" | "CC-BY-4.0";
  rigGroup: string;      // shared rigGroup => animation/skinning compatibility
  bones: number;
  animations: number;
}

export const BASE_DOLLS: BaseDoll[] = [
  { id: "woman_dress",    label: "Doll · Dress",     file: "/assets/glam/base/woman_dress.glb",
    preview: "/assets/glam/base/previews/woman_dress.jpg",
    scale: 1.0, src: "Quaternius", license: "CC0",
    rigGroup: "quaternius-women-v1", bones: 31, animations: 11 },
  { id: "woman_casual",   label: "Doll · Casual",    file: "/assets/glam/base/woman_casual.glb",
    preview: "/assets/glam/base/previews/woman_casual.jpg",
    scale: 1.0, src: "Quaternius", license: "CC0",
    rigGroup: "quaternius-women-v1", bones: 31, animations: 11 },
  { id: "woman_tank",     label: "Doll · Tank Top",  file: "/assets/glam/base/woman_tank.glb",
    preview: "/assets/glam/base/previews/woman_tank.jpg",
    scale: 1.0, src: "Quaternius", license: "CC0",
    rigGroup: "quaternius-women-v1", bones: 31, animations: 11 },
  { id: "woman_animated", label: "Doll · Showcase",  file: "/assets/glam/base/woman_animated.glb",
    preview: "/assets/glam/base/previews/woman_animated.jpg",
    scale: 1.0, src: "Quaternius", license: "CC0",
    rigGroup: "quaternius-women-v2", bones: 41, animations: 10 },
];

// ── Hair catalog (procedural) ────────────────────────────────────────

export type HairStyle =
  | "none" | "bob" | "long" | "ponytail" | "bun" | "pigtails" | "pixie" | "afro" | "braid";

export interface HairStyleDef { id: HairStyle; label: string; }

export const HAIR_STYLES: HairStyleDef[] = [
  { id: "none",     label: "No Hair (bald)" },
  { id: "bob",      label: "Bob" },
  { id: "long",     label: "Long" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun",      label: "Bun" },
  { id: "pigtails", label: "Pigtails" },
  { id: "pixie",    label: "Pixie" },
  { id: "afro",     label: "Afro" },
  { id: "braid",    label: "Braid" },
];

// ── Color palettes ───────────────────────────────────────────────────

export interface NamedColor { id: string; label: string; hex: string; }

export const HAIR_COLORS: NamedColor[] = [
  { id: "black",     label: "Jet Black",   hex: "#1a1a1a" },
  { id: "brown",     label: "Chestnut",    hex: "#6b3a17" },
  { id: "blonde",    label: "Blonde",      hex: "#e8c879" },
  { id: "platinum",  label: "Platinum",    hex: "#f4e9c1" },
  { id: "red",       label: "Auburn",      hex: "#a83232" },
  { id: "ginger",    label: "Ginger",      hex: "#d96a2c" },
  { id: "pink",      label: "Bubblegum",   hex: "#f9a8d4" },
  { id: "purple",    label: "Violet",      hex: "#a78bfa" },
  { id: "blue",      label: "Sky Blue",    hex: "#67e8f9" },
  { id: "teal",      label: "Teal",        hex: "#2dd4bf" },
  { id: "green",     label: "Mint",        hex: "#86efac" },
  { id: "rainbow",   label: "Rainbow",     hex: "#f43f5e" }, // hex is fallback; engine paints gradient
];

export const SKIN_TINTS: NamedColor[] = [
  { id: "none",      label: "Original",    hex: "#ffe6d5" },
  { id: "porcelain", label: "Porcelain",   hex: "#fde6cf" },
  { id: "fair",      label: "Fair",        hex: "#f3c7a2" },
  { id: "olive",     label: "Olive",       hex: "#d29976" },
  { id: "tan",       label: "Tan",         hex: "#b27a52" },
  { id: "brown",     label: "Brown",       hex: "#85553a" },
  { id: "deep",      label: "Deep",        hex: "#5a3826" },
];

export const LIP_COLORS: NamedColor[] = [
  { id: "none",      label: "Bare",        hex: "#00000000" },
  { id: "nude",      label: "Nude",        hex: "#c98c7a" },
  { id: "pink",      label: "Pink",        hex: "#ec4899" },
  { id: "rose",      label: "Rose",        hex: "#e11d48" },
  { id: "red",       label: "Classic Red", hex: "#b91c1c" },
  { id: "berry",     label: "Berry",       hex: "#9d174d" },
  { id: "plum",      label: "Plum",        hex: "#6b21a8" },
];

export const EYESHADOW_COLORS: NamedColor[] = [
  { id: "none",      label: "Bare",        hex: "#00000000" },
  { id: "neutral",   label: "Neutral",     hex: "#a78474" },
  { id: "rose",      label: "Rose Gold",   hex: "#fda4af" },
  { id: "smoky",     label: "Smoky",       hex: "#374151" },
  { id: "purple",    label: "Violet",      hex: "#a78bfa" },
  { id: "teal",      label: "Teal",        hex: "#2dd4bf" },
  { id: "gold",      label: "Gold",        hex: "#fbbf24" },
];

export const BLUSH_COLORS: NamedColor[] = [
  { id: "none",      label: "Bare",        hex: "#00000000" },
  { id: "peach",     label: "Peach",       hex: "#fb923c" },
  { id: "pink",      label: "Pink",        hex: "#f9a8d4" },
  { id: "rose",      label: "Rose",        hex: "#e11d48" },
  { id: "berry",     label: "Berry",       hex: "#9d174d" },
];

// ── Accessory catalog ────────────────────────────────────────────────

export type Accessory =
  | "none" | "glasses_round" | "glasses_heart" | "sunglasses"
  | "earrings_stud" | "earrings_hoop" | "necklace_chain"
  | "hat_beanie" | "hat_sunhat" | "bow" | "tiara" | "headband";

export interface AccessoryDef { id: Accessory; label: string; socket: "head" | "face" | "ears" | "neck"; }

export const ACCESSORIES: AccessoryDef[] = [
  { id: "none",            label: "No Accessory",   socket: "head" },
  { id: "glasses_round",   label: "Round Glasses",  socket: "face" },
  { id: "glasses_heart",   label: "Heart Glasses",  socket: "face" },
  { id: "sunglasses",      label: "Sunglasses",     socket: "face" },
  { id: "earrings_stud",   label: "Stud Earrings",  socket: "ears" },
  { id: "earrings_hoop",   label: "Hoop Earrings",  socket: "ears" },
  { id: "necklace_chain",  label: "Necklace",       socket: "neck" },
  { id: "hat_beanie",      label: "Beanie",         socket: "head" },
  { id: "hat_sunhat",      label: "Sun Hat",        socket: "head" },
  { id: "bow",             label: "Hair Bow",       socket: "head" },
  { id: "tiara",           label: "Tiara",          socket: "head" },
  { id: "headband",        label: "Headband",       socket: "head" },
];

// ── Pose presets ─────────────────────────────────────────────────────

export type Pose = "idle" | "walk" | "wave" | "spin" | "happy";

export interface PoseDef { id: Pose; label: string; clipNameHints: string[]; }

// Quaternius women anims are typically named "Idle", "Walk", "Run", "Wave",
// "Death", etc. The loader fuzz-matches against these hints.
export const POSES: PoseDef[] = [
  { id: "idle",  label: "Idle",          clipNameHints: ["idle", "stand"] },
  { id: "walk",  label: "Walk",          clipNameHints: ["walk", "move"] },
  { id: "wave",  label: "Wave",          clipNameHints: ["wave", "hello", "yes"] },
  { id: "spin",  label: "Spin / Run",    clipNameHints: ["run", "spin", "fast"] },
  { id: "happy", label: "Cheer",         clipNameHints: ["jump", "happy", "cheer", "victory", "dance"] },
];

// ── Saved look — schema mirrors StyleStudioDressup lookbook concept ──

export interface SavedLook {
  id: string;
  createdAt: number;
  name?: string;
  config: GlamConfig;
  preview?: string; // dataUrl PNG of the canvas at save time
}

export interface GlamConfig {
  baseId: string;
  hairStyle: HairStyle;
  hairColor: string;     // NamedColor id
  skinTint: string;      // NamedColor id (or "none")
  lipColor: string;
  eyeshadowColor: string;
  blushColor: string;
  accessory: Accessory;
  pose: Pose;
}

export const DEFAULT_CONFIG: GlamConfig = {
  baseId: "woman_dress",
  hairStyle: "long",
  hairColor: "brown",
  skinTint: "none",
  lipColor: "pink",
  eyeshadowColor: "none",
  blushColor: "peach",
  accessory: "none",
  pose: "idle",
};
