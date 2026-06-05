// Style Studio — layered character compositor (v3, rebuilt 1.10.76).
//
// History: v1 stacked kenney/modular-characters PNG body parts via DOM
// percentage offsets — looked broken because Kenney ships per-piece
// PNGs at varying sizes (head 173×168, leg 93×164, eye 21×21, mouth
// ~28×16) with NO positional metadata. v2 punted to single pre-composed
// poses from kenney/toon-characters — no layering at all, no makeup,
// no recolor. Card promised "Mix hair, face, outfits, shoes" — lie.
//
// v3 rebuild: pure procedural SVG character compositor. Every layer
// (skin tone, hair style + color, brows, eyes, lipstick, blush,
// eyeshadow, top, bottom, shoes, accessories) is an SVG group with a
// `fill` attribute driven by component state. Color changes are
// instant. Face-zoom mode reframes the viewBox to the face area for
// precise makeup application. Backgrounds use real on-disk PNGs
// (kenney/background-elements-remastered + ansimuz packs) with
// gradient fallbacks if a PNG is missing.
//
// Why SVG and not the kenney modular-characters PNGs: Kenney's parts
// are illustration-grade but each PNG is a different size with no
// shipped offset table, so stacking them only looks right if you
// hand-tune positions per-piece per-pose. That's a Kenney-specific
// engineering project, not a kids' dress-up game. Procedural SVG
// gives perfect recolor + face-zoom makeup precision.
//
// Per-profile lookbook + cloud sync. PNG export via foreignObject →
// SVG → canvas serialization. No fail state — purely creative.
//
// File layout (single file, ~1100 lines):
//   1. Palettes + catalogs (skin/hair/eyes/lip/outfit/accessory)
//   2. Look type + defaults + storage
//   3. DollAvatar — the SVG compositor (the heart of this file)
//   4. Theme challenges + surprise stylist + salon flow
//   5. Main StyleStudio page — tabs, editor, stage, lookbook, photo mode

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Trash2, Shuffle, BookOpen, Camera, Sparkles,
  ZoomIn, ZoomOut, Wand2, Download, X, Heart, Brush,
} from "lucide-react";
import { getActiveProfileId, profileKey, recordGameSession, useActiveProfile } from "../../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../../sync/cloudBlob";
import { playSfx, unlockAudio } from "../../art";

const ACCENT = "#f9a8d4";

// ── 1. Palettes + catalogs ──────────────────────────────────────────

// Skin tones span fair → deep, calibrated so they look natural with
// the procedural shading. Each is one tone; the SVG layers darken/
// lighten it programmatically for shadow + lip + cheek pass-through.
const SKIN_TONES = [
  { id: "ivory",   label: "Ivory",   hex: "#f6dcc4" },
  { id: "porcelain", label: "Porcelain", hex: "#f0c9aa" },
  { id: "peach",   label: "Peach",   hex: "#e8b48a" },
  { id: "honey",   label: "Honey",   hex: "#d39a6a" },
  { id: "tan",     label: "Tan",     hex: "#b97f54" },
  { id: "almond",  label: "Almond",  hex: "#9a6440" },
  { id: "cocoa",   label: "Cocoa",   hex: "#74452c" },
  { id: "espresso",label: "Espresso",hex: "#4d2c1c" },
] as const;
type SkinId = typeof SKIN_TONES[number]["id"];

// Hair styles — each is an SVG path renderer in DollAvatar. Adding a
// new style means adding a case in the renderer + an entry here.
const HAIR_STYLES = [
  { id: "long_straight", label: "Long Straight" },
  { id: "long_wavy",     label: "Long Wavy"     },
  { id: "bob",           label: "Bob"           },
  { id: "pixie",         label: "Pixie"         },
  { id: "ponytail",      label: "Ponytail"      },
  { id: "pigtails",      label: "Pigtails"      },
  { id: "bun",           label: "Bun"           },
  { id: "braid",         label: "Side Braid"    },
  { id: "afro",          label: "Afro"          },
  { id: "curls",         label: "Curls"         },
  { id: "mohawk",        label: "Mohawk"        },
  { id: "bald",          label: "Bald"          },
] as const;
type HairStyleId = typeof HAIR_STYLES[number]["id"];

// Hair colors — 16 covering natural + fashion. Each is a hex
// value applied directly to the hair SVG `fill`.
const HAIR_COLORS = [
  { id: "platinum", label: "Platinum", hex: "#f4ecdc" },
  { id: "blonde",   label: "Blonde",   hex: "#e8c069" },
  { id: "honeyhair",label: "Honey",    hex: "#b8854a" },
  { id: "auburn",   label: "Auburn",   hex: "#8b3a1a" },
  { id: "redhead",  label: "Red",      hex: "#c54a2c" },
  { id: "ginger",   label: "Ginger",   hex: "#e88a3a" },
  { id: "brunette", label: "Brunette", hex: "#6b3e22" },
  { id: "espressohair",label: "Dark Brown",hex: "#3a2110" },
  { id: "raven",    label: "Black",    hex: "#1a1410" },
  { id: "ash",      label: "Ash Grey", hex: "#a8a89a" },
  { id: "silver",   label: "Silver",   hex: "#d8d8da" },
  { id: "rose",     label: "Rose Pink",hex: "#ec96b8" },
  { id: "pinkhair", label: "Hot Pink", hex: "#e44a90" },
  { id: "purple",   label: "Purple",   hex: "#8e54c4" },
  { id: "teal",     label: "Teal",     hex: "#3aa494" },
  { id: "bluehair", label: "Blue",     hex: "#3a78d4" },
] as const;
type HairColorId = typeof HAIR_COLORS[number]["id"];

// Eye colors — applied to iris fill. Pupil stays #1a1410.
const EYE_COLORS = [
  { id: "brown",  label: "Brown",  hex: "#6e3e1a" },
  { id: "blue",   label: "Blue",   hex: "#4a86c4" },
  { id: "green",  label: "Green",  hex: "#5ca06c" },
  { id: "hazel",  label: "Hazel",  hex: "#8a6a3a" },
  { id: "grey",   label: "Grey",   hex: "#8a96a4" },
  { id: "amber",  label: "Amber",  hex: "#c48a3a" },
  { id: "violet", label: "Violet", hex: "#9a6acc" },
  { id: "gold",   label: "Gold",   hex: "#d8a830" },
  { id: "pinkeyes",label: "Pink",  hex: "#e478a4" },
  { id: "aqua",   label: "Aqua",   hex: "#5acaca" },
] as const;
type EyeColorId = typeof EYE_COLORS[number]["id"];

// Eye shapes — drive iris/sclera size + lash style.
const EYE_SHAPES = [
  { id: "round",   label: "Round"   },
  { id: "almond",  label: "Almond"  },
  { id: "monolid", label: "Monolid" },
  { id: "anime",   label: "Big Eyes"},
] as const;
type EyeShapeId = typeof EYE_SHAPES[number]["id"];

// Brow shapes.
const BROW_SHAPES = [
  { id: "arched",   label: "Arched"   },
  { id: "straight", label: "Straight" },
  { id: "thick",    label: "Thick"    },
  { id: "thin",     label: "Thin"     },
] as const;
type BrowShapeId = typeof BROW_SHAPES[number]["id"];

// Mouth shapes.
const MOUTH_SHAPES = [
  { id: "smile",   label: "Smile"   },
  { id: "smirk",   label: "Smirk"   },
  { id: "neutral", label: "Neutral" },
  { id: "pout",    label: "Pout"    },
] as const;
type MouthShapeId = typeof MOUTH_SHAPES[number]["id"];

// Lipstick colors — last one is "Bare" (no lipstick, lips inherit skin tone).
const LIP_COLORS = [
  { id: "bare",    label: "Bare",    hex: null },
  { id: "nude",    label: "Nude",    hex: "#d49184" },
  { id: "petal",   label: "Petal",   hex: "#e8a4a8" },
  { id: "rose_lip",label: "Rose",    hex: "#d8688a" },
  { id: "coral",   label: "Coral",   hex: "#e87a6a" },
  { id: "cherry",  label: "Cherry",  hex: "#c83040" },
  { id: "ruby",    label: "Ruby",    hex: "#a8203a" },
  { id: "berry",   label: "Berry",   hex: "#9a3a6a" },
  { id: "plum",    label: "Plum",    hex: "#6a2a5a" },
  { id: "mauve",   label: "Mauve",   hex: "#b08494" },
  { id: "wine",    label: "Wine",    hex: "#5a1a2a" },
  { id: "fuchsia", label: "Fuchsia", hex: "#d83898" },
] as const;
type LipColorId = typeof LIP_COLORS[number]["id"];

// Blush — pink/peach/rose with intensity range (alpha).
const BLUSH_COLORS = [
  { id: "blush_off",  label: "Off",     hex: null    },
  { id: "soft_pink",  label: "Soft Pink",hex: "#e8a4b4" },
  { id: "peach_blush",label: "Peach",   hex: "#e8a890" },
  { id: "rose_blush", label: "Rose",    hex: "#d8788a" },
  { id: "coral_blush",label: "Coral",   hex: "#e8826a" },
  { id: "berry_blush",label: "Berry",   hex: "#b0506a" },
] as const;
type BlushColorId = typeof BLUSH_COLORS[number]["id"];

const EYESHADOW_COLORS = [
  { id: "eshadow_off", label: "Off",    hex: null },
  { id: "champagne",   label: "Champagne", hex: "#e8d4a8" },
  { id: "rose_gold",   label: "Rose Gold", hex: "#d4a48a" },
  { id: "lilac",       label: "Lilac",     hex: "#b8a4d8" },
  { id: "sky",         label: "Sky",       hex: "#a4c8e8" },
  { id: "mint",        label: "Mint",      hex: "#a8d4b8" },
  { id: "smoky",       label: "Smoky",     hex: "#6a5a6a" },
  { id: "bronze",      label: "Bronze",    hex: "#a87038" },
  { id: "emerald",     label: "Emerald",   hex: "#3a8060" },
  { id: "sapphire",    label: "Sapphire",  hex: "#3a5ab0" },
] as const;
type EyeshadowColorId = typeof EYESHADOW_COLORS[number]["id"];

// Outfit types: top + bottom (separates), OR a dress (one piece).
const TOP_STYLES = [
  { id: "tshirt",  label: "T-Shirt"  },
  { id: "blouse",  label: "Blouse"   },
  { id: "crop",    label: "Crop Top" },
  { id: "hoodie",  label: "Hoodie"   },
  { id: "tank",    label: "Tank"     },
  { id: "sweater", label: "Sweater"  },
] as const;
type TopId = typeof TOP_STYLES[number]["id"];

const BOTTOM_STYLES = [
  { id: "jeans",   label: "Jeans"    },
  { id: "skirt",   label: "Skirt"    },
  { id: "shorts",  label: "Shorts"   },
  { id: "leggings",label: "Leggings" },
  { id: "flowy",   label: "Flowy Pants" },
] as const;
type BottomId = typeof BOTTOM_STYLES[number]["id"];

const DRESS_STYLES = [
  { id: "none",     label: "None (separates)" },
  { id: "sundress", label: "Sundress"  },
  { id: "gown",     label: "Ball Gown" },
  { id: "mini",     label: "Mini"      },
  { id: "princess", label: "Princess"  },
] as const;
type DressId = typeof DRESS_STYLES[number]["id"];

const SHOE_STYLES = [
  { id: "sneakers", label: "Sneakers" },
  { id: "boots",    label: "Boots"    },
  { id: "heels",    label: "Heels"    },
  { id: "sandals",  label: "Sandals"  },
  { id: "flats",    label: "Flats"    },
] as const;
type ShoeId = typeof SHOE_STYLES[number]["id"];

// Big outfit palette — 20 colors that work for any garment.
const OUTFIT_COLORS = [
  "#e44a90","#ec96b8","#9a6acc","#8e54c4","#3a5ab0","#3a78d4","#5acaca","#3aa494",
  "#5ca06c","#e8c069","#e88a3a","#c54a2c","#74452c","#1a1410","#a8a89a","#d8d8da",
  "#f4ecdc","#d8a830","#ffffff","#0a0a14",
];

// Accessories — each is an SVG group, recolorable.
const GLASSES = ["none","round","square","cateye","sport"] as const;
type GlassesId = typeof GLASSES[number];
const HATS     = ["none","beanie","sunhat","crown","cap","tiara"] as const;
type HatId     = typeof HATS[number];
const EARRINGS = ["none","stud","hoop","dangle","star"] as const;
type EarringsId= typeof EARRINGS[number];
const NECKLACE = ["none","choker","pendant","pearls","heart"] as const;
type NecklaceId= typeof NECKLACE[number];
const HAIR_DECO = ["none","bow","flower","headband","clip"] as const;
type HairDecoId = typeof HAIR_DECO[number];

// Backgrounds — real on-disk PNGs, with built-in gradient fallback if
// a PNG fails to load. img.onError swaps to css gradient.
const BACKGROUNDS = [
  { id: "studio_pink", label: "Pink Studio",
    css: "radial-gradient(800px 600px at 50% 20%, rgba(244,114,182,0.40), transparent), linear-gradient(180deg, #2a0a24 0%, #050308 100%)" },
  { id: "stage_lights", label: "Stage Lights",
    css: "radial-gradient(900px 500px at 50% 0%, rgba(251,191,36,0.45), transparent), radial-gradient(600px 400px at 30% 100%, rgba(167,139,250,0.30), transparent), #0a0a14" },
  { id: "sunset_runway", label: "Sunset Runway",
    css: "linear-gradient(180deg, #fb923c 0%, #f97316 35%, #b45309 65%, #1f1308 100%)" },
  { id: "garden", label: "Garden",
    img: "/assets/kenney/background-elements-remastered/Backgrounds/backgroundColorForest.png",
    css: "linear-gradient(180deg, #1c4a30 0%, #0a2a14 100%)" },
  { id: "desert", label: "Desert",
    img: "/assets/kenney/background-elements-remastered/Backgrounds/backgroundColorDesert.png",
    css: "linear-gradient(180deg, #d4a868 0%, #8a5a30 100%)" },
  { id: "fall", label: "Autumn",
    img: "/assets/kenney/background-elements-remastered/Backgrounds/backgroundColorFall.png",
    css: "linear-gradient(180deg, #c46038 0%, #6a2a18 100%)" },
  { id: "meadow", label: "Meadow",
    img: "/assets/kenney/background-elements-remastered/Backgrounds/backgroundColorGrass.png",
    css: "linear-gradient(180deg, #94c068 0%, #2a4a18 100%)" },
  { id: "castle", label: "Castle",
    img: "/assets/kenney/background-elements-remastered/Backgrounds/backgroundCastles.png",
    css: "linear-gradient(180deg, #4a5a8a 0%, #0a0a24 100%)" },
  { id: "ocean", label: "Ocean",
    css: "linear-gradient(180deg, #0c6a8a 0%, #042a4a 60%, #0a0a14 100%)" },
  { id: "space", label: "Space",
    css: "radial-gradient(700px 400px at 50% 0%, rgba(167,139,250,0.45), transparent), linear-gradient(180deg, #0a0a14 0%, #000 100%)" },
  { id: "dawn", label: "Dawn",
    css: "linear-gradient(180deg, #f9a8d4 0%, #c084fc 50%, #312e81 90%, #0a0a14 100%)" },
  { id: "candy", label: "Candy",
    css: "radial-gradient(600px 400px at 30% 30%, rgba(244,114,182,0.50), transparent), radial-gradient(500px 300px at 70% 70%, rgba(125,211,252,0.40), transparent), linear-gradient(180deg, #fef3c7 0%, #fbcfe8 100%)" },
] as const;
type BackgroundId = typeof BACKGROUNDS[number]["id"];

// ── 2. Look type + defaults + storage ───────────────────────────────

export interface Look {
  // Base
  skin: SkinId;
  // Hair
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  hairDeco: HairDecoId;
  hairDecoColor: string;  // hex
  // Face
  eyeShape: EyeShapeId;
  eyeColor: EyeColorId;
  browShape: BrowShapeId;
  browColor: HairColorId;
  mouthShape: MouthShapeId;
  // Makeup
  lipColor: LipColorId;
  blushColor: BlushColorId;
  eyeshadowColor: EyeshadowColorId;
  // Outfit
  dress: DressId;
  dressColor: string;
  top: TopId;
  topColor: string;
  bottom: BottomId;
  bottomColor: string;
  shoes: ShoeId;
  shoeColor: string;
  // Accessories
  glasses: GlassesId;
  glassesColor: string;
  hat: HatId;
  hatColor: string;
  earrings: EarringsId;
  earringsColor: string;
  necklace: NecklaceId;
  necklaceColor: string;
  // Stage
  background: BackgroundId;
}

// Default look — tuned for "cute out of the box": big round eyes,
// soft hair-bow accent, pink-petal lips, soft-pink blush, friendly
// pose. Avoids the previous "neutral plain" first-impression.
const DEFAULT_LOOK: Look = {
  skin: "peach",
  hairStyle: "long_wavy",
  hairColor: "brunette",
  hairDeco: "bow",
  hairDecoColor: "#ec96b8",
  eyeShape: "round",
  eyeColor: "blue",
  browShape: "arched",
  browColor: "brunette",
  mouthShape: "smile",
  lipColor: "petal",
  blushColor: "soft_pink",
  eyeshadowColor: "eshadow_off",
  dress: "sundress",
  dressColor: "#ec96b8",
  top: "tshirt",
  topColor: "#9a6acc",
  bottom: "jeans",
  bottomColor: "#3a5ab0",
  shoes: "flats",
  shoeColor: "#ffffff",
  glasses: "none",
  glassesColor: "#1a1410",
  hat: "none",
  hatColor: "#e44a90",
  earrings: "stud",
  earringsColor: "#d8a830",
  necklace: "heart",
  necklaceColor: "#ec96b8",
  background: "candy",
};

interface SavedLook { id: string; name: string; look: Look; createdAt: number; }
const LOOK_KEY_BASE = "dd_stylestudio_looks_v3";
const LOOK_BLOB     = "stylestudio_looks_v3";
const CURRENT_KEY_BASE = "dd_stylestudio_current_v3";
function lookKey()    { return profileKey(LOOK_KEY_BASE); }
function currentKey() { return profileKey(CURRENT_KEY_BASE); }

function loadLooks(): SavedLook[] {
  try {
    const raw = localStorage.getItem(lookKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((l): l is SavedLook =>
          l && typeof l === "object" && l.look && typeof l.look.skin === "string")
      : [];
  } catch { return []; }
}
function persistLooks(looks: SavedLook[]) {
  try { localStorage.setItem(lookKey(), JSON.stringify(looks)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, LOOK_BLOB, looks); } catch { /* ignore */ }
}
function loadCurrent(): Look {
  try {
    const raw = localStorage.getItem(currentKey());
    if (!raw) return DEFAULT_LOOK;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.skin === "string") {
      // Defensive merge — old saved looks might miss new fields.
      return { ...DEFAULT_LOOK, ...parsed } as Look;
    }
  } catch { /* ignore */ }
  return DEFAULT_LOOK;
}
function persistCurrent(look: Look) {
  try { localStorage.setItem(currentKey(), JSON.stringify(look)); } catch { /* ignore */ }
}

// Helpers to find catalog entries.
const skinHex     = (id: SkinId)     => SKIN_TONES.find(s => s.id === id)?.hex     ?? "#e8b48a";
const hairHex     = (id: HairColorId)=> HAIR_COLORS.find(h => h.id === id)?.hex    ?? "#6b3e22";
const eyeHex      = (id: EyeColorId) => EYE_COLORS.find(e => e.id === id)?.hex     ?? "#6e3e1a";
const lipHex      = (id: LipColorId, skin: string) => {
  const h = LIP_COLORS.find(l => l.id === id)?.hex;
  return h ?? darken(skin, 0.18);
};
const blushHex    = (id: BlushColorId) => BLUSH_COLORS.find(b => b.id === id)?.hex ?? null;
const eyeshadowHex= (id: EyeshadowColorId) => EYESHADOW_COLORS.find(e => e.id === id)?.hex ?? null;
const bgEntry     = (id: BackgroundId) => BACKGROUNDS.find(b => b.id === id) ?? BACKGROUNDS[0];

// Color math — darken/lighten a hex for cheek shading + hair highlights.
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}
function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

// ── 3. DollAvatar — the SVG compositor ──────────────────────────────
//
// viewBox is 400×600. All layer paths are designed for this coord
// space. face area roughly: x 130..270, y 80..240. Face-zoom mode
// just reframes the viewBox to "100 60 200 220" so the user can place
// makeup precisely.

interface DollAvatarProps {
  look: Look;
  zoom?: "full" | "face";
  /** Render without a wrapper div, for export to PNG. */
  bare?: boolean;
}

export function DollAvatar({ look, zoom = "full", bare = false }: DollAvatarProps) {
  const skin = skinHex(look.skin);
  const skinShadow = darken(skin, 0.12);
  const skinHi     = lighten(skin, 0.10);
  const hair = hairHex(look.hairColor);
  const hairHi = lighten(hair, 0.15);
  const eye  = eyeHex(look.eyeColor);
  const lip  = lipHex(look.lipColor, skin);
  const blush = blushHex(look.blushColor);
  const eyeshadow = eyeshadowHex(look.eyeshadowColor);

  const viewBox = zoom === "face" ? "100 60 200 220" : "0 0 400 600";
  const dressOn = look.dress !== "none";

  const svg = (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Soft drop-shadow */}
      <defs>
        <radialGradient id="cheekblush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={blush ?? "transparent"} stopOpacity="0.7" />
          <stop offset="100%" stopColor={blush ?? "transparent"} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hairshine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={hairHi} stopOpacity="0.7" />
          <stop offset="100%" stopColor={hair} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── BACK HAIR (long styles render behind body) ── */}
      <BackHair style={look.hairStyle} color={hair} />

      {/* ── LEGS (skin, behind bottom/shoes) ── */}
      <Legs skin={skin} skinShadow={skinShadow} dressOn={dressOn} />

      {/* ── SHOES ── */}
      <Shoes style={look.shoes} color={look.shoeColor} />

      {/* ── BOTTOM (skirt/pants/etc) — hidden if dress ── */}
      {!dressOn && <Bottom style={look.bottom} color={look.bottomColor} />}

      {/* ── BODY/TORSO (skin) ── */}
      <Torso skin={skin} skinShadow={skinShadow} />

      {/* ── ARMS (skin, behind top sleeves) ── */}
      <Arms skin={skin} skinShadow={skinShadow} />

      {/* ── DRESS or TOP ── */}
      {dressOn
        ? <Dress style={look.dress} color={look.dressColor} />
        : <Top style={look.top} color={look.topColor} />}

      {/* ── NECK + HEAD (skin) ── */}
      <Neck skin={skin} skinShadow={skinShadow} />
      <Head skin={skin} skinShadow={skinShadow} skinHi={skinHi} />

      {/* ── EYESHADOW (behind eyes, above face) ── */}
      {eyeshadow && <Eyeshadow color={eyeshadow} shape={look.eyeShape} />}

      {/* ── EYES ── */}
      <Eyes shape={look.eyeShape} iris={eye} />

      {/* ── BROWS ── */}
      <Brows shape={look.browShape} color={hairHex(look.browColor)} />

      {/* ── NOSE ── */}
      <Nose skinShadow={skinShadow} />

      {/* ── BLUSH (radial overlay on cheeks) ── */}
      {blush && (
        <>
          <ellipse cx="168" cy="192" rx="22" ry="13" fill="url(#cheekblush)" />
          <ellipse cx="232" cy="192" rx="22" ry="13" fill="url(#cheekblush)" />
        </>
      )}

      {/* ── MOUTH + LIPSTICK ── */}
      <Mouth shape={look.mouthShape} lip={lip} skinShadow={skinShadow}
        hasLipstick={look.lipColor !== "bare"} />

      {/* ── EARRINGS (on head sides) ── */}
      <Earrings style={look.earrings} color={look.earringsColor} />

      {/* ── NECKLACE (on neck/upper chest) ── */}
      <Necklace style={look.necklace} color={look.necklaceColor} />

      {/* ── FRONT HAIR (fringe + front-facing styles) ── */}
      <FrontHair style={look.hairStyle} color={hair} hairHi={hairHi} />

      {/* ── HAIR DECO (bow/flower/headband/clip) ── */}
      <HairDeco style={look.hairDeco} color={look.hairDecoColor} />

      {/* ── HAT (over hair) ── */}
      <Hat style={look.hat} color={look.hatColor} />

      {/* ── GLASSES (in front of eyes/face) ── */}
      <Glasses style={look.glasses} color={look.glassesColor} />
    </svg>
  );

  if (bare) return svg;
  return (
    <div style={{ width: "100%", height: "100%", filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.55))" }}>
      {svg}
    </div>
  );
}

// ── SVG layer subcomponents (kept inline as small functions) ─────────

function Head({ skin, skinShadow, skinHi }: { skin: string; skinShadow: string; skinHi: string }) {
  // Rounder egg-shape head with soft jaw — wider at temples, gently
  // narrows to a soft round chin. Aim is chibi/cute proportion: head
  // a touch wider than v2, no straight side walls, rounded chin.
  return (
    <g>
      <path d="M 124 145 Q 124 64 200 60 Q 276 64 276 145 Q 276 220 200 248 Q 124 220 124 145 Z"
        fill={skin} stroke={skinShadow} strokeWidth={1.4} />
      {/* Soft round cheek glow — gives the face a "round" read */}
      <ellipse cx="168" cy="186" rx="22" ry="16" fill={skinHi} opacity="0.42" />
      <ellipse cx="232" cy="186" rx="22" ry="16" fill={skinHi} opacity="0.42" />
      {/* Tiny forehead highlight — adds a soft round dome */}
      <ellipse cx="200" cy="100" rx="40" ry="22" fill={skinHi} opacity="0.25" />
      {/* Ears tucked further out + slightly higher to read as small/cute */}
      <ellipse cx="122" cy="166" rx="10" ry="16" fill={skin} stroke={skinShadow} strokeWidth={1} />
      <ellipse cx="278" cy="166" rx="10" ry="16" fill={skin} stroke={skinShadow} strokeWidth={1} />
    </g>
  );
}

function Neck({ skin, skinShadow }: { skin: string; skinShadow: string }) {
  return <path d="M 175 230 L 175 270 Q 200 280 225 270 L 225 230 Z" fill={skin} stroke={skinShadow} strokeWidth={1} />;
}

function Torso({ skin, skinShadow }: { skin: string; skinShadow: string }) {
  return <path d="M 160 270 Q 150 290 150 340 L 150 410 Q 200 425 250 410 L 250 340 Q 250 290 240 270 Z"
    fill={skin} stroke={skinShadow} strokeWidth={1} />;
}

function Arms({ skin, skinShadow }: { skin: string; skinShadow: string }) {
  return (
    <g>
      <path d="M 155 275 Q 130 305 122 360 Q 118 405 124 440 Q 132 444 140 442 Q 144 405 148 360 Q 156 320 165 290 Z"
        fill={skin} stroke={skinShadow} strokeWidth={1} />
      <path d="M 245 275 Q 270 305 278 360 Q 282 405 276 440 Q 268 444 260 442 Q 256 405 252 360 Q 244 320 235 290 Z"
        fill={skin} stroke={skinShadow} strokeWidth={1} />
      {/* Hands */}
      <ellipse cx="131" cy="448" rx="11" ry="14" fill={skin} stroke={skinShadow} strokeWidth={1} />
      <ellipse cx="269" cy="448" rx="11" ry="14" fill={skin} stroke={skinShadow} strokeWidth={1} />
    </g>
  );
}

function Legs({ skin, skinShadow, dressOn }: { skin: string; skinShadow: string; dressOn: boolean }) {
  // When a dress is on we still render legs from knee down for shoes context.
  const yStart = dressOn ? 470 : 410;
  return (
    <g>
      <path d={`M 165 ${yStart} L 165 545 Q 175 552 185 545 L 185 ${yStart} Z`} fill={skin} stroke={skinShadow} strokeWidth={1} />
      <path d={`M 215 ${yStart} L 215 545 Q 225 552 235 545 L 235 ${yStart} Z`} fill={skin} stroke={skinShadow} strokeWidth={1} />
    </g>
  );
}

// ── EYES ─────────────────────────────────────────────────────────────

function Eyes({ shape, iris }: { shape: EyeShapeId; iris: string }) {
  // Cute-character eye rules:
  // - Iris fills most of the sclera (small-sclera-ratio = friendly)
  // - Dark thick top lash (lower lash thin)
  // - Two catchlights — big top-right, small bottom-left (gives sparkle)
  // - Iris color band darker at top → lighter at bottom (subtle gradient
  //   via overlay ellipse)
  const lash = "#1a1410";
  const irisLow = lighten(iris, 0.25);

  if (shape === "round") {
    return (
      <g>
        {/* sclera */}
        <ellipse cx="170" cy="163" rx="15" ry="17" fill="#ffffff" stroke={lash} strokeWidth={1.7} />
        <ellipse cx="230" cy="163" rx="15" ry="17" fill="#ffffff" stroke={lash} strokeWidth={1.7} />
        {/* iris (big!) */}
        <ellipse cx="170" cy="165" rx="11" ry="13" fill={iris} />
        <ellipse cx="230" cy="165" rx="11" ry="13" fill={iris} />
        {/* iris bottom-glow */}
        <ellipse cx="170" cy="171" rx="9" ry="5" fill={irisLow} opacity="0.7" />
        <ellipse cx="230" cy="171" rx="9" ry="5" fill={irisLow} opacity="0.7" />
        {/* pupil */}
        <ellipse cx="170" cy="166" rx="5" ry="7" fill={lash} />
        <ellipse cx="230" cy="166" rx="5" ry="7" fill={lash} />
        {/* big top-right catchlight */}
        <circle cx="174" cy="159" r="3" fill="#fff" />
        <circle cx="234" cy="159" r="3" fill="#fff" />
        {/* small bottom-left catchlight */}
        <circle cx="166" cy="171" r="1.5" fill="#fff" />
        <circle cx="226" cy="171" r="1.5" fill="#fff" />
        {/* thick top lash arc */}
        <path d="M 155 152 Q 170 144 185 154" stroke={lash} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <path d="M 215 154 Q 230 144 245 152" stroke={lash} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        {/* tiny outer lashes for sparkle */}
        <path d="M 154 154 L 150 150" stroke={lash} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M 184 156 L 188 152" stroke={lash} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M 216 156 L 212 152" stroke={lash} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M 246 154 L 250 150" stroke={lash} strokeWidth={1.4} strokeLinecap="round" />
      </g>
    );
  }
  if (shape === "almond") {
    return (
      <g>
        {/* sclera — almond curve, prominent top lash */}
        <path d="M 153 162 Q 170 146 187 162 Q 170 176 153 162 Z" fill="#ffffff" stroke={lash} strokeWidth={1.9} />
        <path d="M 213 162 Q 230 146 247 162 Q 230 176 213 162 Z" fill="#ffffff" stroke={lash} strokeWidth={1.9} />
        {/* iris (big, partly hidden by upper lid) */}
        <ellipse cx="170" cy="163" rx="10" ry="12" fill={iris} />
        <ellipse cx="230" cy="163" rx="10" ry="12" fill={iris} />
        <ellipse cx="170" cy="168" rx="8" ry="4" fill={irisLow} opacity="0.7" />
        <ellipse cx="230" cy="168" rx="8" ry="4" fill={irisLow} opacity="0.7" />
        {/* pupil */}
        <ellipse cx="170" cy="164" rx="4.5" ry="6" fill={lash} />
        <ellipse cx="230" cy="164" rx="4.5" ry="6" fill={lash} />
        {/* catchlights */}
        <circle cx="174" cy="158" r="2.6" fill="#fff" />
        <circle cx="234" cy="158" r="2.6" fill="#fff" />
        <circle cx="167" cy="168" r="1.3" fill="#fff" />
        <circle cx="227" cy="168" r="1.3" fill="#fff" />
        {/* dramatic top lash line — winged out */}
        <path d="M 153 162 Q 170 146 187 162" fill="none" stroke={lash} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M 213 162 Q 230 146 247 162" fill="none" stroke={lash} strokeWidth="2.8" strokeLinecap="round" />
        {/* lash flick on outer corner */}
        <path d="M 187 162 Q 192 158 195 156" fill="none" stroke={lash} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 213 162 Q 208 158 205 156" fill="none" stroke={lash} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (shape === "monolid") {
    return (
      <g>
        {/* sclera — long and lower-set */}
        <ellipse cx="170" cy="164" rx="14" ry="9" fill="#ffffff" stroke={lash} strokeWidth={1.6} />
        <ellipse cx="230" cy="164" rx="14" ry="9" fill="#ffffff" stroke={lash} strokeWidth={1.6} />
        {/* iris */}
        <ellipse cx="170" cy="164" rx="8" ry="8" fill={iris} />
        <ellipse cx="230" cy="164" rx="8" ry="8" fill={iris} />
        <ellipse cx="170" cy="168" rx="6" ry="3" fill={irisLow} opacity="0.7" />
        <ellipse cx="230" cy="168" rx="6" ry="3" fill={irisLow} opacity="0.7" />
        <ellipse cx="170" cy="165" rx="3.5" ry="5" fill={lash} />
        <ellipse cx="230" cy="165" rx="3.5" ry="5" fill={lash} />
        <circle cx="173" cy="162" r="2" fill="#fff" />
        <circle cx="233" cy="162" r="2" fill="#fff" />
        {/* soft upper lash line */}
        <path d="M 156 159 Q 170 153 184 160" stroke={lash} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 216 160 Q 230 153 244 159" stroke={lash} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // anime — huge sparkly eyes
  return (
    <g>
      <ellipse cx="170" cy="164" rx="19" ry="23" fill="#ffffff" stroke={lash} strokeWidth={2.4} />
      <ellipse cx="230" cy="164" rx="19" ry="23" fill="#ffffff" stroke={lash} strokeWidth={2.4} />
      {/* big iris */}
      <ellipse cx="170" cy="166" rx="14" ry="17" fill={iris} />
      <ellipse cx="230" cy="166" rx="14" ry="17" fill={iris} />
      {/* iris gradient band */}
      <ellipse cx="170" cy="174" rx="11" ry="7" fill={irisLow} opacity="0.75" />
      <ellipse cx="230" cy="174" rx="11" ry="7" fill={irisLow} opacity="0.75" />
      {/* pupil */}
      <ellipse cx="170" cy="168" rx="7" ry="9" fill={lash} />
      <ellipse cx="230" cy="168" rx="7" ry="9" fill={lash} />
      {/* big sparkly catchlights */}
      <circle cx="176" cy="158" r="4.5" fill="#fff" />
      <circle cx="236" cy="158" r="4.5" fill="#fff" />
      <circle cx="164" cy="173" r="2.2" fill="#fff" />
      <circle cx="224" cy="173" r="2.2" fill="#fff" />
      {/* mini glint band */}
      <ellipse cx="178" cy="170" rx="2" ry="4" fill="#fff" opacity="0.55" />
      <ellipse cx="238" cy="170" rx="2" ry="4" fill="#fff" opacity="0.55" />
      {/* thick top lash */}
      <path d="M 151 152 Q 170 138 189 152" stroke={lash} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <path d="M 211 152 Q 230 138 249 152" stroke={lash} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      {/* outer flicks */}
      <path d="M 151 152 L 146 148" stroke={lash} strokeWidth={2} strokeLinecap="round" />
      <path d="M 189 152 L 192 148" stroke={lash} strokeWidth={2} strokeLinecap="round" />
      <path d="M 211 152 L 208 148" stroke={lash} strokeWidth={2} strokeLinecap="round" />
      <path d="M 249 152 L 254 148" stroke={lash} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Eyeshadow({ color, shape }: { color: string; shape: EyeShapeId }) {
  // Slightly raised + wider for the bigger eyes. Anime eyes get the
  // widest band so the shadow doesn't get swallowed by the lash arc.
  const r = shape === "anime" ? 22 : shape === "round" ? 18 : 17;
  const cy = shape === "anime" ? 146 : 148;
  return (
    <g opacity="0.6">
      <ellipse cx="170" cy={cy} rx={r} ry="7.5" fill={color} />
      <ellipse cx="230" cy={cy} rx={r} ry="7.5" fill={color} />
    </g>
  );
}

function Brows({ shape, color }: { shape: BrowShapeId; color: string }) {
  // Smaller, softer, slightly higher than v2 to make room for big
  // eyes underneath without crowding. Brow stroke ends are rounded
  // and tapered visually via a stacked secondary stroke.
  const sw = shape === "thick" ? 4.2 : shape === "thin" ? 1.8 : 3;
  if (shape === "arched") return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d="M 154 138 Q 170 128 187 140" strokeWidth={sw} />
      <path d="M 213 140 Q 230 128 246 138" strokeWidth={sw} />
    </g>
  );
  if (shape === "straight") return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d="M 154 136 L 187 136" strokeWidth={sw} />
      <path d="M 213 136 L 246 136" strokeWidth={sw} />
    </g>
  );
  // thick + thin use the arched curve at different weights
  return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d="M 154 138 Q 170 130 187 140" strokeWidth={sw} />
      <path d="M 213 140 Q 230 130 246 138" strokeWidth={sw} />
    </g>
  );
}

function Nose({ skinShadow }: { skinShadow: string }) {
  // Tiny "u" with a small bridge dot — cute character convention:
  // small, low-contrast nose so it doesn't compete with the eyes.
  return (
    <g stroke={skinShadow} fill="none" strokeLinecap="round">
      <path d="M 197 192 Q 200 198 203 192" strokeWidth={1.4} />
      <circle cx="200" cy="184" r="0.8" fill={skinShadow} stroke="none" />
    </g>
  );
}

function Mouth({ shape, lip, skinShadow, hasLipstick }: {
  shape: MouthShapeId; lip: string; skinShadow: string; hasLipstick: boolean;
}) {
  const stroke = hasLipstick ? darken(lip, 0.3) : skinShadow;
  const hi = lighten(lip, 0.35);
  if (shape === "smile") {
    // Sweet upturned smile with a defined Cupid's bow + slight lip
    // highlight on the lower lip. The little corner dimples are tiny
    // commas that give the mouth life.
    return (
      <g>
        {/* lower lip — gently curved cushion */}
        <path d="M 188 210 Q 200 222 212 210 Q 210 218 200 219 Q 190 218 188 210 Z" fill={lip} stroke={stroke} strokeWidth={1.2} />
        {/* upper lip — Cupid's bow */}
        <path d="M 188 210 Q 193 207 196 210 Q 200 207 204 210 Q 207 207 212 210 Q 200 213 188 210 Z" fill={lip} stroke={stroke} strokeWidth={0.9} />
        {/* lip highlight on lower */}
        {hasLipstick && <path d="M 194 215 Q 200 217 206 215" stroke={hi} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity="0.85" />}
        {/* mouth-line shadow between lips */}
        <path d="M 188 210 Q 200 213 212 210" stroke={darken(stroke, 0.2)} strokeWidth={0.7} fill="none" />
        {/* corner dimples — tiny upturned ticks */}
        <path d="M 186 212 Q 188 209 190 211" stroke={stroke} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        <path d="M 210 211 Q 212 209 214 212" stroke={stroke} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (shape === "smirk") return (
    <g>
      <path d="M 188 212 Q 200 220 213 207 Q 209 215 200 216 Q 191 215 188 212 Z" fill={lip} stroke={stroke} strokeWidth={1.2} />
      <path d="M 188 212 Q 193 209 196 212 Q 200 209 204 212 Q 207 209 213 207" fill="none" stroke={stroke} strokeWidth={0.8} />
      {hasLipstick && <path d="M 194 215 Q 200 216 206 213" stroke={hi} strokeWidth={1} fill="none" strokeLinecap="round" opacity="0.8" />}
    </g>
  );
  if (shape === "pout") {
    // Plump heart-shaped lips
    return (
      <g>
        {/* lower lip — full cushion */}
        <path d="M 187 211 Q 200 224 213 211 Q 211 220 200 221 Q 189 220 187 211 Z" fill={lip} stroke={stroke} strokeWidth={1.2} />
        {/* upper lip — two soft mounds (heart shape) */}
        <path d="M 187 211 Q 191 204 196 209 Q 200 205 204 209 Q 209 204 213 211 Q 200 214 187 211 Z" fill={lip} stroke={stroke} strokeWidth={1} />
        {hasLipstick && <ellipse cx="200" cy="216" rx="4" ry="1.4" fill={hi} opacity="0.85" />}
      </g>
    );
  }
  // neutral — soft small smile
  return (
    <g>
      <path d="M 189 212 Q 200 217 211 212" stroke={stroke} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {hasLipstick && <path d="M 189 212 Q 200 215 211 212 Q 200 215 189 212 Z" fill={lip} opacity="0.85" />}
    </g>
  );
}

// ── HAIR ─────────────────────────────────────────────────────────────

function BackHair({ style, color }: { style: HairStyleId; color: string }) {
  // Long-style hair behind body. Renders nothing for short styles.
  if (style === "long_straight" || style === "long_wavy") {
    return <path d="M 110 110 Q 100 200 105 290 Q 110 360 125 410 L 165 410 L 165 220 Q 130 200 130 130 L 145 90 Q 200 60 255 90 L 270 130 Q 270 200 235 220 L 235 410 L 275 410 Q 290 360 295 290 Q 300 200 290 110 Q 270 60 200 50 Q 130 60 110 110 Z"
      fill={color} />;
  }
  if (style === "ponytail") return (
    <g>
      <path d="M 230 90 Q 320 100 330 230 Q 330 320 290 380 Q 305 350 310 280 Q 310 200 280 150 Z" fill={color} />
    </g>
  );
  if (style === "pigtails") return (
    <g>
      <path d="M 120 110 Q 90 200 110 320 Q 130 310 130 240 Q 130 170 145 130 Z" fill={color} />
      <path d="M 280 110 Q 310 200 290 320 Q 270 310 270 240 Q 270 170 255 130 Z" fill={color} />
    </g>
  );
  if (style === "braid") return (
    <g>
      <path d="M 250 110 Q 305 160 305 240 Q 305 320 270 390 Q 275 350 275 280 Q 275 200 250 160 Z" fill={color} />
      <ellipse cx="294" cy="200" rx="9" ry="11" fill={darken(color, 0.15)} />
      <ellipse cx="294" cy="240" rx="9" ry="11" fill={darken(color, 0.15)} />
      <ellipse cx="294" cy="280" rx="9" ry="11" fill={darken(color, 0.15)} />
      <ellipse cx="285" cy="320" rx="8" ry="10" fill={darken(color, 0.15)} />
    </g>
  );
  if (style === "afro" || style === "curls") return (
    <ellipse cx="200" cy="115" rx="105" ry="80" fill={color} />
  );
  return null;
}

function FrontHair({ style, color, hairHi }: { style: HairStyleId; color: string; hairHi: string }) {
  if (style === "bald") return null;
  if (style === "mohawk") return (
    <g>
      <path d="M 175 85 L 175 50 Q 200 35 225 50 L 225 85 Z" fill={color} />
      <path d="M 175 85 L 175 65 Q 200 50 225 65 L 225 85 Z" fill={hairHi} opacity="0.5" />
      {/* Shaved sides peek-thru — just leave default. */}
    </g>
  );
  if (style === "bun") return (
    <g>
      <ellipse cx="200" cy="60" rx="34" ry="28" fill={color} />
      <ellipse cx="200" cy="60" rx="22" ry="17" fill={hairHi} opacity="0.45" />
      {/* Hairline + small fringe */}
      <path d="M 130 110 Q 200 80 270 110 Q 270 100 200 78 Q 130 100 130 110 Z" fill={color} />
    </g>
  );
  if (style === "pixie") return (
    <g>
      <path d="M 128 130 Q 130 80 200 65 Q 270 80 272 130 Q 270 110 240 105 Q 220 130 200 115 Q 175 130 160 105 Q 132 110 128 130 Z" fill={color} />
      <path d="M 175 100 Q 195 90 220 100 Q 205 105 175 100 Z" fill={hairHi} opacity="0.5" />
    </g>
  );
  if (style === "bob") return (
    <g>
      <path d="M 122 180 Q 122 95 200 65 Q 278 95 278 180 L 268 180 Q 268 140 240 130 Q 200 120 160 130 Q 132 140 132 180 Z" fill={color} />
      <path d="M 165 100 Q 200 85 235 100 Q 215 110 165 100 Z" fill={hairHi} opacity="0.5" />
    </g>
  );
  if (style === "ponytail") return (
    <g>
      <path d="M 122 150 Q 122 80 200 65 Q 278 80 278 150 Q 270 130 240 125 Q 200 115 160 125 Q 130 130 122 150 Z" fill={color} />
      <path d="M 175 95 Q 200 82 225 95 Q 205 102 175 95 Z" fill={hairHi} opacity="0.55" />
    </g>
  );
  if (style === "pigtails") return (
    <g>
      <path d="M 122 150 Q 122 80 200 65 Q 278 80 278 150 Q 270 130 240 125 Q 200 115 160 125 Q 130 130 122 150 Z" fill={color} />
      <path d="M 170 90 Q 200 80 230 90 Q 210 100 170 90 Z" fill={hairHi} opacity="0.5" />
    </g>
  );
  if (style === "braid") return (
    <g>
      <path d="M 122 150 Q 122 80 200 65 Q 278 80 278 150 Q 270 130 240 125 Q 200 115 160 125 Q 130 130 122 150 Z" fill={color} />
      <path d="M 175 95 Q 200 82 225 95 Q 205 102 175 95 Z" fill={hairHi} opacity="0.55" />
    </g>
  );
  if (style === "afro") return (
    <g>
      {/* extra puff on top to add height */}
      <ellipse cx="200" cy="85" rx="70" ry="45" fill={color} />
      <ellipse cx="200" cy="75" rx="42" ry="20" fill={hairHi} opacity="0.4" />
    </g>
  );
  if (style === "curls") return (
    <g>
      <path d="M 130 130 Q 135 85 200 65 Q 265 85 270 130" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      <circle cx="148" cy="100" r="14" fill={color} />
      <circle cx="178" cy="80"  r="14" fill={color} />
      <circle cx="200" cy="74"  r="14" fill={color} />
      <circle cx="225" cy="80"  r="14" fill={color} />
      <circle cx="252" cy="100" r="14" fill={color} />
    </g>
  );
  // long_straight or long_wavy — front fringe
  if (style === "long_wavy") return (
    <g>
      <path d="M 122 165 Q 130 80 200 65 Q 270 80 278 165 Q 270 130 235 120 Q 210 140 195 120 Q 170 145 155 120 Q 130 130 122 165 Z" fill={color} />
      <path d="M 170 95 Q 200 82 230 95 Q 210 105 170 95 Z" fill={hairHi} opacity="0.5" />
    </g>
  );
  // long_straight
  return (
    <g>
      <path d="M 122 165 Q 122 80 200 65 Q 278 80 278 165 Q 268 135 240 130 Q 200 120 160 130 Q 132 135 122 165 Z" fill={color} />
      <path d="M 175 100 Q 200 85 225 100 Q 205 110 175 100 Z" fill={hairHi} opacity="0.5" />
    </g>
  );
}

function HairDeco({ style, color }: { style: HairDecoId; color: string }) {
  if (style === "none") return null;
  if (style === "bow") return (
    <g transform="translate(160 70)">
      <path d="M 0 0 Q -20 -12 -22 6 Q -10 14 0 8 Z" fill={color} />
      <path d="M 0 0 Q 20 -12 22 6 Q 10 14 0 8 Z" fill={color} />
      <circle cx="0" cy="4" r="4" fill={darken(color, 0.2)} />
    </g>
  );
  if (style === "flower") return (
    <g transform="translate(155 75)">
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse key={deg} cx="0" cy="-7" rx="5" ry="8" fill={color} transform={`rotate(${deg})`} />
      ))}
      <circle r="3.5" fill="#fde047" />
    </g>
  );
  if (style === "headband") return (
    <path d="M 122 105 Q 200 75 278 105 L 278 95 Q 200 65 122 95 Z" fill={color} />
  );
  if (style === "clip") return (
    <g transform="translate(238 95) rotate(20)">
      <rect x="-12" y="-3" width="24" height="7" rx="2" fill={color} />
      <circle cx="-8" cy="0.5" r="1.6" fill="#fff" />
      <circle cx="8"  cy="0.5" r="1.6" fill="#fff" />
    </g>
  );
  return null;
}

// ── HAT ──────────────────────────────────────────────────────────────

function Hat({ style, color }: { style: HatId; color: string }) {
  if (style === "none") return null;
  if (style === "beanie") return (
    <g>
      <path d="M 118 110 Q 118 65 200 50 Q 282 65 282 110 Q 200 92 118 110 Z" fill={color} />
      <rect x="118" y="100" width="164" height="16" fill={darken(color, 0.15)} />
    </g>
  );
  if (style === "sunhat") return (
    <g>
      <ellipse cx="200" cy="115" rx="135" ry="22" fill={color} />
      <path d="M 130 100 Q 130 60 200 50 Q 270 60 270 100 Q 200 80 130 100 Z" fill={darken(color, 0.1)} />
      <ellipse cx="200" cy="115" rx="100" ry="6" fill={darken(color, 0.15)} />
    </g>
  );
  if (style === "crown") return (
    <g>
      <path d="M 140 90 L 150 50 L 170 80 L 200 40 L 230 80 L 250 50 L 260 90 Z" fill={color} stroke={darken(color, 0.3)} strokeWidth="1.5" />
      <circle cx="170" cy="60" r="3" fill="#ef4444" />
      <circle cx="200" cy="50" r="3" fill="#3b82f6" />
      <circle cx="230" cy="60" r="3" fill="#10b981" />
    </g>
  );
  if (style === "cap") return (
    <g>
      <path d="M 118 110 Q 118 65 200 55 Q 282 65 282 110 Q 200 92 118 110 Z" fill={color} />
      <ellipse cx="220" cy="118" rx="60" ry="12" fill={color} />
    </g>
  );
  if (style === "tiara") return (
    <g>
      <path d="M 150 95 Q 200 75 250 95" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="200" cy="80" r="5" fill="#fff" stroke={color} strokeWidth="1.5" />
      <circle cx="175" cy="85" r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
      <circle cx="225" cy="85" r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
    </g>
  );
  return null;
}

// ── GLASSES ──────────────────────────────────────────────────────────

function Glasses({ style, color }: { style: GlassesId; color: string }) {
  if (style === "none") return null;
  const sw = 2.5;
  if (style === "round") return (
    <g fill="none" stroke={color} strokeWidth={sw}>
      <circle cx="170" cy="162" r="16" />
      <circle cx="230" cy="162" r="16" />
      <path d="M 186 162 L 214 162" />
    </g>
  );
  if (style === "square") return (
    <g fill="none" stroke={color} strokeWidth={sw}>
      <rect x="152" y="148" width="32" height="26" rx="3" />
      <rect x="216" y="148" width="32" height="26" rx="3" />
      <path d="M 184 162 L 216 162" />
    </g>
  );
  if (style === "cateye") return (
    <g fill="none" stroke={color} strokeWidth={sw}>
      <path d="M 152 165 Q 152 145 184 150 Q 188 162 184 174 Q 165 178 152 165 Z" />
      <path d="M 248 165 Q 248 145 216 150 Q 212 162 216 174 Q 235 178 248 165 Z" />
      <path d="M 184 162 L 216 162" />
    </g>
  );
  if (style === "sport") return (
    <g fill={color} stroke={darken(color, 0.3)} strokeWidth={1.2}>
      <path d="M 148 150 Q 148 174 175 174 Q 200 175 225 174 Q 252 174 252 150 Q 252 145 200 145 Q 148 145 148 150 Z" />
    </g>
  );
  return null;
}

// ── EARRINGS ─────────────────────────────────────────────────────────

function Earrings({ style, color }: { style: EarringsId; color: string }) {
  if (style === "none") return null;
  if (style === "stud") return (
    <g>
      <circle cx="125" cy="168" r="3.5" fill={color} />
      <circle cx="275" cy="168" r="3.5" fill={color} />
    </g>
  );
  if (style === "hoop") return (
    <g fill="none" stroke={color} strokeWidth="2.5">
      <ellipse cx="125" cy="178" rx="6" ry="10" />
      <ellipse cx="275" cy="178" rx="6" ry="10" />
    </g>
  );
  if (style === "dangle") return (
    <g>
      <circle cx="125" cy="168" r="2.8" fill={color} />
      <line x1="125" y1="170" x2="125" y2="185" stroke={color} strokeWidth="1.5" />
      <circle cx="125" cy="190" r="4" fill={color} />
      <circle cx="275" cy="168" r="2.8" fill={color} />
      <line x1="275" y1="170" x2="275" y2="185" stroke={color} strokeWidth="1.5" />
      <circle cx="275" cy="190" r="4" fill={color} />
    </g>
  );
  if (style === "star") return (
    <g fill={color}>
      <polygon points="125,165 126.5,170 131,170 127,173 128.5,178 125,175 121.5,178 123,173 119,170 123.5,170" />
      <polygon points="275,165 276.5,170 281,170 277,173 278.5,178 275,175 271.5,178 273,173 269,170 273.5,170" />
    </g>
  );
  return null;
}

// ── NECKLACE ─────────────────────────────────────────────────────────

function Necklace({ style, color }: { style: NecklaceId; color: string }) {
  if (style === "none") return null;
  if (style === "choker") return (
    <path d="M 178 268 Q 200 274 222 268 L 222 274 Q 200 280 178 274 Z" fill={color} />
  );
  if (style === "pendant") return (
    <g>
      <path d="M 178 268 Q 200 282 222 268" fill="none" stroke={color} strokeWidth="1.6" />
      <ellipse cx="200" cy="288" rx="7" ry="9" fill={color} stroke={darken(color, 0.3)} strokeWidth="1" />
    </g>
  );
  if (style === "pearls") return (
    <g fill={color}>
      {Array.from({ length: 11 }).map((_, i) => {
        const t = i / 10;
        const x = 178 + 44 * t;
        const y = 268 + Math.sin(t * Math.PI) * 14;
        return <circle key={i} cx={x} cy={y} r="2.6" />;
      })}
    </g>
  );
  if (style === "heart") return (
    <g>
      <path d="M 178 268 Q 200 282 222 268" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M 200 285 L 194 291 Q 188 296 194 301 Q 200 305 200 309 Q 200 305 206 301 Q 212 296 206 291 Z" fill={color} />
    </g>
  );
  return null;
}

// ── OUTFIT — TOP / BOTTOM / DRESS / SHOES ────────────────────────────

function Top({ style, color }: { style: TopId; color: string }) {
  const trim = darken(color, 0.2);
  if (style === "tshirt") return (
    <g>
      <path d="M 160 270 Q 150 290 150 340 L 150 405 Q 200 420 250 405 L 250 340 Q 250 290 240 270 Q 220 275 200 275 Q 180 275 160 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Sleeves */}
      <path d="M 152 278 Q 130 295 128 320 L 145 318 Q 150 295 160 280 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 248 278 Q 270 295 272 320 L 255 318 Q 250 295 240 280 Z" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  if (style === "blouse") return (
    <g>
      <path d="M 160 270 Q 145 295 145 345 L 145 415 Q 200 425 255 415 L 255 345 Q 255 295 240 270 Q 220 280 200 278 Q 180 280 160 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 145 280 Q 122 310 122 360 L 138 360 Q 142 310 158 285 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 255 280 Q 278 310 278 360 L 262 360 Q 258 310 242 285 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Collar ruffle */}
      <path d="M 180 270 Q 200 285 220 270 Q 200 275 180 270 Z" fill={lighten(color, 0.2)} />
    </g>
  );
  if (style === "crop") return (
    <g>
      <path d="M 160 270 Q 150 290 150 320 L 150 350 Q 200 360 250 350 L 250 320 Q 250 290 240 270 Q 220 275 200 275 Q 180 275 160 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* sleeveless */}
    </g>
  );
  if (style === "hoodie") return (
    <g>
      <path d="M 160 270 Q 142 295 142 350 L 142 420 Q 200 430 258 420 L 258 350 Q 258 295 240 270 Q 220 275 200 275 Q 180 275 160 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 142 280 Q 118 310 118 360 L 135 362 Q 142 310 158 285 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 258 280 Q 282 310 282 360 L 265 362 Q 258 310 242 285 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Hood */}
      <path d="M 170 268 Q 200 240 230 268 Q 220 280 200 282 Q 180 280 170 268 Z" fill={trim} />
      {/* Drawstring */}
      <line x1="195" y1="290" x2="195" y2="320" stroke={trim} strokeWidth="1.5" />
      <line x1="205" y1="290" x2="205" y2="320" stroke={trim} strokeWidth="1.5" />
    </g>
  );
  if (style === "tank") return (
    <g>
      <path d="M 168 270 Q 158 285 158 345 L 158 410 Q 200 420 242 410 L 242 345 Q 242 285 232 270 Q 220 280 200 278 Q 180 280 168 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Thin straps */}
      <rect x="175" y="265" width="4" height="14" fill={color} />
      <rect x="221" y="265" width="4" height="14" fill={color} />
    </g>
  );
  if (style === "sweater") return (
    <g>
      <path d="M 158 268 Q 144 292 144 348 L 144 420 Q 200 432 256 420 L 256 348 Q 256 292 242 268 Q 220 278 200 276 Q 180 278 158 268 Z" fill={color} stroke={trim} strokeWidth="1.5" />
      <path d="M 144 278 Q 118 312 118 365 L 138 365 Q 142 312 158 282 Z" fill={color} stroke={trim} strokeWidth="1.5" />
      <path d="M 256 278 Q 282 312 282 365 L 262 365 Q 258 312 242 282 Z" fill={color} stroke={trim} strokeWidth="1.5" />
      {/* Knit texture lines */}
      <g stroke={trim} strokeWidth="0.6" opacity="0.55">
        <line x1="160" y1="320" x2="240" y2="320" />
        <line x1="160" y1="340" x2="240" y2="340" />
        <line x1="160" y1="360" x2="240" y2="360" />
        <line x1="160" y1="380" x2="240" y2="380" />
      </g>
      {/* Turtleneck */}
      <path d="M 178 260 Q 200 268 222 260 L 222 274 Q 200 282 178 274 Z" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  return null;
}

function Bottom({ style, color }: { style: BottomId; color: string }) {
  const trim = darken(color, 0.2);
  if (style === "jeans") return (
    <g>
      <path d="M 150 405 L 150 545 L 178 548 L 188 410 L 200 410 L 212 410 L 222 548 L 250 545 L 250 405 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Pocket lines */}
      <path d="M 158 415 Q 175 422 175 440" fill="none" stroke={trim} strokeWidth="0.8" />
      <path d="M 242 415 Q 225 422 225 440" fill="none" stroke={trim} strokeWidth="0.8" />
      {/* Belt line */}
      <rect x="150" y="405" width="100" height="6" fill={darken(color, 0.3)} />
    </g>
  );
  if (style === "skirt") return (
    <g>
      <path d="M 148 405 Q 140 460 130 510 L 270 510 Q 260 460 252 405 Q 200 418 148 405 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Pleats */}
      <line x1="170" y1="420" x2="160" y2="505" stroke={trim} strokeWidth="0.7" opacity="0.6" />
      <line x1="200" y1="420" x2="200" y2="508" stroke={trim} strokeWidth="0.7" opacity="0.6" />
      <line x1="230" y1="420" x2="240" y2="505" stroke={trim} strokeWidth="0.7" opacity="0.6" />
    </g>
  );
  if (style === "shorts") return (
    <g>
      <path d="M 150 405 L 152 460 L 180 462 L 188 410 L 212 410 L 220 462 L 248 460 L 250 405 Z" fill={color} stroke={trim} strokeWidth="1" />
      <rect x="150" y="405" width="100" height="6" fill={darken(color, 0.3)} />
    </g>
  );
  if (style === "leggings") return (
    <g>
      <path d="M 156 408 L 160 545 L 178 548 L 192 410 L 208 410 L 222 548 L 240 545 L 244 408 Z" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  if (style === "flowy") return (
    <g>
      <path d="M 150 405 Q 138 470 132 545 L 192 548 L 196 410 L 204 410 L 208 548 L 268 545 Q 262 470 250 405 Q 200 418 150 405 Z" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  return null;
}

function Dress({ style, color }: { style: DressId; color: string }) {
  if (style === "none") return null;
  const trim = darken(color, 0.2);
  if (style === "sundress") return (
    <g>
      {/* Bodice */}
      <path d="M 168 270 Q 158 285 158 330 L 158 380 Q 200 392 242 380 L 242 330 Q 242 285 232 270 Q 220 278 200 276 Q 180 278 168 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Skirt */}
      <path d="M 158 380 Q 130 450 110 535 L 290 535 Q 270 450 242 380 Q 200 394 158 380 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Straps */}
      <rect x="175" y="262" width="5" height="14" fill={color} />
      <rect x="220" y="262" width="5" height="14" fill={color} />
      {/* Sash */}
      <path d="M 158 378 Q 200 388 242 378 L 242 385 Q 200 395 158 385 Z" fill={trim} />
    </g>
  );
  if (style === "gown") return (
    <g>
      <path d="M 160 270 Q 144 290 144 350 L 144 410 Q 200 420 256 410 L 256 350 Q 256 290 240 270 Q 220 278 200 276 Q 180 278 160 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 144 410 Q 95 475 70 555 L 330 555 Q 305 475 256 410 Q 200 422 144 410 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Sparkles */}
      <g fill={lighten(color, 0.5)} opacity="0.7">
        <circle cx="120" cy="470" r="1.5" />
        <circle cx="170" cy="500" r="1.5" />
        <circle cx="230" cy="500" r="1.5" />
        <circle cx="280" cy="470" r="1.5" />
        <circle cx="200" cy="450" r="2" />
      </g>
    </g>
  );
  if (style === "mini") return (
    <g>
      <path d="M 162 270 Q 152 290 152 340 L 152 415 Q 200 425 248 415 L 248 340 Q 248 290 238 270 Q 220 278 200 276 Q 180 278 162 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 152 415 Q 140 440 132 470 L 268 470 Q 260 440 248 415 Q 200 425 152 415 Z" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  if (style === "princess") return (
    <g>
      <path d="M 168 270 Q 154 285 154 320 L 154 372 Q 200 384 246 372 L 246 320 Q 246 285 232 270 Q 220 278 200 276 Q 180 278 168 270 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Multi-tier puff skirt */}
      <path d="M 154 372 Q 110 410 90 460 L 310 460 Q 290 410 246 372 Q 200 384 154 372 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 95 458 Q 80 490 70 520 L 330 520 Q 320 490 305 458 Q 200 470 95 458 Z" fill={lighten(color, 0.1)} stroke={trim} strokeWidth="1" />
      <path d="M 72 518 Q 60 540 55 558 L 345 558 Q 340 540 328 518 Q 200 528 72 518 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Bow */}
      <path d="M 186 380 Q 174 372 172 386 Q 184 392 196 388 Z" fill={trim} />
      <path d="M 214 380 Q 226 372 228 386 Q 216 392 204 388 Z" fill={trim} />
      <circle cx="200" cy="386" r="3" fill={trim} />
    </g>
  );
  return null;
}

function Shoes({ style, color }: { style: ShoeId; color: string }) {
  const trim = darken(color, 0.25);
  // Two shoes — left and right.
  if (style === "sneakers") return (
    <g>
      <path d="M 154 542 L 154 562 L 198 562 L 198 548 Q 178 542 154 542 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 202 548 Q 222 542 246 542 L 246 562 L 202 562 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Laces */}
      <line x1="165" y1="548" x2="190" y2="548" stroke="#fff" strokeWidth="1.4" />
      <line x1="165" y1="553" x2="190" y2="553" stroke="#fff" strokeWidth="1.4" />
      <line x1="210" y1="548" x2="235" y2="548" stroke="#fff" strokeWidth="1.4" />
      <line x1="210" y1="553" x2="235" y2="553" stroke="#fff" strokeWidth="1.4" />
      {/* Sole */}
      <rect x="148" y="560" width="54" height="5" fill="#fff" />
      <rect x="198" y="560" width="54" height="5" fill="#fff" />
    </g>
  );
  if (style === "boots") return (
    <g>
      <path d="M 154 510 L 154 565 L 200 565 L 200 535 Q 180 530 165 530 L 165 510 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 235 510 L 235 530 Q 220 530 200 535 L 200 565 L 246 565 L 246 510 Z" fill={color} stroke={trim} strokeWidth="1" />
      <rect x="148" y="563" width="54" height="5" fill={trim} />
      <rect x="198" y="563" width="54" height="5" fill={trim} />
    </g>
  );
  if (style === "heels") return (
    <g>
      <path d="M 158 545 L 158 558 L 195 565 L 195 550 Q 178 545 158 545 Z" fill={color} stroke={trim} strokeWidth="1" />
      <path d="M 205 550 Q 222 545 242 545 L 242 558 L 205 565 Z" fill={color} stroke={trim} strokeWidth="1" />
      {/* Heel spikes */}
      <rect x="180" y="558" width="4" height="14" fill={trim} />
      <rect x="216" y="558" width="4" height="14" fill={trim} />
    </g>
  );
  if (style === "sandals") return (
    <g>
      <ellipse cx="178" cy="562" rx="22" ry="5" fill={color} stroke={trim} strokeWidth="1" />
      <ellipse cx="222" cy="562" rx="22" ry="5" fill={color} stroke={trim} strokeWidth="1" />
      <line x1="166" y1="555" x2="190" y2="555" stroke={color} strokeWidth="2.5" />
      <line x1="210" y1="555" x2="234" y2="555" stroke={color} strokeWidth="2.5" />
    </g>
  );
  if (style === "flats") return (
    <g>
      <ellipse cx="178" cy="562" rx="24" ry="6" fill={color} stroke={trim} strokeWidth="1" />
      <ellipse cx="222" cy="562" rx="24" ry="6" fill={color} stroke={trim} strokeWidth="1" />
    </g>
  );
  return null;
}

// ── 4. Theme challenges + surprise stylist ──────────────────────────

const THEME_CHALLENGES = [
  { id: "party",   label: "Party Look",   hint: "Bright colors, sparkly accessories, fun makeup." },
  { id: "sporty",  label: "Sporty Look",  hint: "Tank or t-shirt, leggings or shorts, sneakers." },
  { id: "fantasy", label: "Fantasy Look", hint: "Princess or gown, crown or tiara, dramatic makeup." },
  { id: "school",  label: "School Day",   hint: "Blouse or sweater, jeans or skirt, comfy shoes." },
  { id: "beach",   label: "Beach Day",    hint: "Sundress or shorts, sandals, sunhat." },
  { id: "winter",  label: "Cozy Winter",  hint: "Sweater or hoodie, boots, beanie." },
  { id: "stage",   label: "On Stage",     hint: "Bold outfit, full makeup, statement accessory." },
  { id: "casual",  label: "Just Hangin'", hint: "T-shirt, jeans, sneakers, simple makeup." },
] as const;

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function randomLook(): Look {
  const useDress = Math.random() < 0.45;
  return {
    skin: pick(SKIN_TONES).id,
    hairStyle: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS).id,
    hairDeco: pick(HAIR_DECO),
    hairDecoColor: pick(OUTFIT_COLORS),
    eyeShape: pick(EYE_SHAPES).id,
    eyeColor: pick(EYE_COLORS).id,
    browShape: pick(BROW_SHAPES).id,
    browColor: pick(HAIR_COLORS).id,
    mouthShape: pick(MOUTH_SHAPES).id,
    lipColor: pick(LIP_COLORS).id,
    blushColor: pick(BLUSH_COLORS).id,
    eyeshadowColor: pick(EYESHADOW_COLORS).id,
    dress: useDress ? pick(DRESS_STYLES.filter(d => d.id !== "none")).id : "none",
    dressColor: pick(OUTFIT_COLORS),
    top: pick(TOP_STYLES).id,
    topColor: pick(OUTFIT_COLORS),
    bottom: pick(BOTTOM_STYLES).id,
    bottomColor: pick(OUTFIT_COLORS),
    shoes: pick(SHOE_STYLES).id,
    shoeColor: pick(OUTFIT_COLORS),
    glasses: Math.random() < 0.35 ? pick(GLASSES.filter(g => g !== "none")) : "none",
    glassesColor: pick(OUTFIT_COLORS),
    hat: Math.random() < 0.35 ? pick(HATS.filter(h => h !== "none")) : "none",
    hatColor: pick(OUTFIT_COLORS),
    earrings: Math.random() < 0.6 ? pick(EARRINGS.filter(e => e !== "none")) : "none",
    earringsColor: pick(OUTFIT_COLORS),
    necklace: Math.random() < 0.5 ? pick(NECKLACE.filter(n => n !== "none")) : "none",
    necklaceColor: pick(OUTFIT_COLORS),
    background: pick(BACKGROUNDS).id,
  };
}

// ── 5. Main page ────────────────────────────────────────────────────

type Tab = "base" | "hair" | "makeup" | "outfit" | "extras" | "stage";

export default function StyleStudio() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [look, setLook] = useState<Look>(() => loadCurrent());
  const [tab, setTab] = useState<Tab>("base");
  const [looks, setLooks] = useState<SavedLook[]>(() => loadLooks());
  const [showLookbook, setShowLookbook] = useState(false);
  const [zoomFace, setZoomFace] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [salonStep, setSalonStep] = useState<number | null>(null);   // null = off
  const startedAt = useRef(Date.now());
  const svgWrapRef = useRef<HTMLDivElement | null>(null);

  // Update one field — partial Look merge.
  const patch = (p: Partial<Look>) => setLook(l => ({ ...l, ...p }));

  useEffect(() => { unlockAudio(); }, []);
  useEffect(() => { persistCurrent(look); }, [look]);

  // Subscribe to cloud lookbook updates so a save on another device appears.
  useEffect(() => {
    if (!profile?.id) return;
    return cloudSubscribe<SavedLook[]>(profile.id, LOOK_BLOB, remote => {
      if (Array.isArray(remote)) {
        setLooks(remote);
        try { localStorage.setItem(lookKey(), JSON.stringify(remote)); } catch { /* ignore */ }
      }
    });
  }, [profile?.id]);

  // Record a session every 25s while the page is open.
  useEffect(() => {
    if (!profile?.id) return;
    const id = setInterval(() => {
      const secs = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
      try { recordGameSession(profile.id, "stylestudio", { seconds: secs, sessions: 0 }); } catch { /* ignore */ }
      startedAt.current = Date.now();
    }, 25000);
    return () => clearInterval(id);
  }, [profile?.id]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  }

  function saveCurrent() {
    const name = prompt("Name this look:", `Look ${looks.length + 1}`);
    if (!name) return;
    const entry: SavedLook = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: name.trim() || `Look ${looks.length + 1}`,
      look: { ...look },
      createdAt: Date.now(),
    };
    const next = [entry, ...looks].slice(0, 60);
    setLooks(next); persistLooks(next);
    playSfx("confirm");
    showFlash("Saved to lookbook ✨");
  }

  function loadLook(id: string) {
    const entry = looks.find(l => l.id === id);
    if (!entry) return;
    setLook({ ...DEFAULT_LOOK, ...entry.look });
    setShowLookbook(false);
    playSfx("pop");
    showFlash(`Loaded "${entry.name}"`);
  }

  function deleteLook(id: string) {
    const next = looks.filter(l => l.id !== id);
    setLooks(next); persistLooks(next);
  }

  function surpriseStylist() {
    setLook(randomLook());
    playSfx("pop");
    showFlash("Surprise! 🎨");
  }

  function startTheme(id: string) {
    setTheme(id);
    showFlash(`Challenge: ${THEME_CHALLENGES.find(t => t.id === id)?.label}`);
  }

  function startSalon() {
    setSalonStep(0);
    setTab("base");
    setZoomFace(false);
    showFlash("Salon: start with skin & hair");
  }

  function salonNext() {
    if (salonStep === null) return;
    const order: Tab[] = ["base", "hair", "makeup", "outfit", "extras", "stage"];
    const next = salonStep + 1;
    if (next >= order.length) {
      setSalonStep(null);
      showFlash("Salon complete! ✨ Save to lockbook?");
      return;
    }
    setSalonStep(next);
    setTab(order[next]);
    setZoomFace(order[next] === "makeup");
  }

  // PNG export — serializes SVG + background to a canvas → blob → download.
  async function exportPhoto() {
    if (!svgWrapRef.current) return;
    const svgEl = svgWrapRef.current.querySelector("svg");
    if (!svgEl) return;
    const bg = bgEntry(look.background);
    const W = 720, H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background — try PNG first, fall back to CSS gradient mapped to canvas gradient.
    await drawBackground(ctx, W, H, bg);

    // Draw SVG character on top, centered.
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const charH = H * 0.92;
        const charW = charH * (400 / 600);
        ctx.drawImage(img, (W - charW) / 2, (H - charH) / 2, charW, charH);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("svg load fail")); };
      img.src = url;
    });

    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement("a");
      const dlUrl = URL.createObjectURL(blob);
      a.href = dlUrl;
      a.download = `style-studio-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
      showFlash("Saved photo ✨");
    }, "image/png");
  }

  async function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, bg: typeof BACKGROUNDS[number]) {
    // Try PNG if present.
    if ("img" in bg && bg.img) {
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // cover-fit
            const ratio = Math.max(W / img.width, H / img.height);
            const cw = img.width * ratio, ch = img.height * ratio;
            ctx.drawImage(img, (W - cw) / 2, (H - ch) / 2, cw, ch);
            resolve();
          };
          img.onerror = () => reject(new Error("bg load fail"));
          img.src = bg.img!;
        });
        return;
      } catch { /* fall through to gradient */ }
    }
    // CSS gradient fallback → approximate with a simple vertical gradient.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2a0a24");
    grad.addColorStop(1, "#050308");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Background rendering for the stage ──────────────────────────────
  const bg = bgEntry(look.background);
  const bgStyle: React.CSSProperties = {
    background: bg.css,
    backgroundImage: "img" in bg && bg.img ? `url(${bg.img}), ${bg.css}` : bg.css,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(180deg, #1a0a18 0%, #050308 100%)",
      color: "#fff",
    }}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 sticky top-0 z-30"
        style={{ background: "rgba(10,5,12,0.85)", backdropFilter: "blur(8px)" }}>
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="p-2 rounded-md" style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-display text-sm tracking-[0.25em] uppercase">Style Studio</div>
        <div className="flex-1" />
        <button onClick={() => setShowLookbook(true)} aria-label="Lookbook"
          className="p-2 rounded-md flex items-center gap-1 text-xs"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <BookOpen size={16} /> <span>{looks.length}</span>
        </button>
      </div>

      {/* Salon banner */}
      {salonStep !== null && (
        <div className="px-3 py-2 text-[11px]" style={{ background: "rgba(244,114,182,0.18)" }}>
          <div className="flex items-center gap-2">
            <Wand2 size={14} />
            <div className="flex-1">
              Salon step {salonStep + 1} of 6 — {(["Choose skin tone", "Pick a hairstyle", "Apply makeup", "Build the outfit", "Add accessories", "Set the stage"])[salonStep]}
            </div>
            <button onClick={() => setSalonStep(null)} className="text-[10px] opacity-70" aria-label="Exit salon">SKIP</button>
            <button onClick={salonNext} className="text-[11px] px-2 py-1 rounded"
              style={{ background: ACCENT, color: "#1a0a18" }}>NEXT →</button>
          </div>
        </div>
      )}

      {/* Theme banner */}
      {theme && (
        <div className="px-3 py-2 text-[11px]" style={{ background: "rgba(167,139,250,0.18)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <div className="flex-1">
              <strong>{THEME_CHALLENGES.find(t => t.id === theme)?.label}:</strong>{" "}
              {THEME_CHALLENGES.find(t => t.id === theme)?.hint}
            </div>
            <button onClick={() => setTheme(null)} aria-label="Clear theme"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Flash */}
      {flash && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-md text-xs"
          style={{ background: "rgba(244,114,182,0.95)", color: "#1a0a18" }}>
          {flash}
        </div>
      )}

      {/* Photo (full-screen runway) mode */}
      {photoMode ? (
        <div className="fixed inset-0 z-40 flex flex-col" style={bgStyle}>
          <div className="flex justify-between p-3">
            <button onClick={() => setPhotoMode(false)} aria-label="Exit photo"
              className="p-2 rounded-md" style={{ background: "rgba(0,0,0,0.5)" }}>
              <X size={18} />
            </button>
            <button onClick={exportPhoto} aria-label="Download"
              className="p-2 rounded-md flex items-center gap-1 text-xs"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <Download size={16} /> SAVE PNG
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center" ref={svgWrapRef}>
            <div style={{ width: "min(80vw, 480px)", height: "min(92vh, 720px)" }}>
              <DollAvatar look={look} />
            </div>
          </div>
          <div className="text-center text-[10px] tracking-[0.3em] uppercase pb-3 opacity-70">
            Runway Mode
          </div>
        </div>
      ) : (
        <>
          {/* Main split: stage + editor */}
          <div className="flex flex-col md:flex-row gap-3 px-3 pt-3 pb-24">
            {/* Stage */}
            <div className="md:w-1/2">
              <div ref={svgWrapRef} className="rounded-xl overflow-hidden relative"
                style={{ ...bgStyle, aspectRatio: "2 / 3" }}>
                <div style={{ position: "absolute", inset: 0 }}>
                  <DollAvatar look={look} zoom={zoomFace ? "face" : "full"} />
                </div>
                {/* Zoom toggle */}
                <button onClick={() => setZoomFace(z => !z)}
                  aria-label="Zoom face"
                  className="absolute top-2 right-2 p-2 rounded-md text-xs flex items-center gap-1"
                  style={{ background: "rgba(0,0,0,0.55)" }}>
                  {zoomFace ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                  {zoomFace ? "FULL" : "FACE"}
                </button>
              </div>

              {/* Quick action row */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <ActionBtn onClick={surpriseStylist} icon={<Shuffle size={14} />} label="Surprise" />
                <ActionBtn onClick={startSalon} icon={<Wand2 size={14} />} label="Salon" />
                <ActionBtn onClick={() => setPhotoMode(true)} icon={<Camera size={14} />} label="Photo" />
                <ActionBtn onClick={saveCurrent} icon={<Save size={14} />} label="Save" primary />
              </div>

              {/* Theme prompts */}
              <details className="mt-3 text-xs rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                <summary className="px-3 py-2 cursor-pointer flex items-center gap-2">
                  <Sparkles size={14} /> Theme Challenges
                </summary>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {THEME_CHALLENGES.map(t => (
                    <button key={t.id} onClick={() => startTheme(t.id)}
                      className="text-left px-2 py-1.5 rounded text-[10px] hover:opacity-80"
                      style={{ background: "rgba(244,114,182,0.15)" }}>
                      <div className="font-semibold">{t.label}</div>
                      <div className="opacity-60 leading-tight">{t.hint}</div>
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {/* Editor */}
            <div className="md:w-1/2">
              {/* Tab bar */}
              <div className="flex gap-1 mb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {(["base","hair","makeup","outfit","extras","stage"] as Tab[]).map(t => (
                  <button key={t} onClick={() => {
                    setTab(t);
                    setZoomFace(t === "makeup");
                  }}
                    className="px-3 py-2 rounded-md text-[11px] uppercase tracking-wider whitespace-nowrap"
                    style={{
                      background: tab === t ? ACCENT : "rgba(255,255,255,0.06)",
                      color: tab === t ? "#1a0a18" : "#fff",
                    }}>
                    {t === "base" ? "Skin" : t === "extras" ? "Extras" : t}
                  </button>
                ))}
              </div>

              <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                {tab === "base"    && <BaseEditor    look={look} patch={patch} />}
                {tab === "hair"    && <HairEditor    look={look} patch={patch} />}
                {tab === "makeup"  && <MakeupEditor  look={look} patch={patch} />}
                {tab === "outfit"  && <OutfitEditor  look={look} patch={patch} />}
                {tab === "extras"  && <ExtrasEditor  look={look} patch={patch} />}
                {tab === "stage"   && <StageEditor   look={look} patch={patch} />}
              </div>
            </div>
          </div>

          {/* Lookbook overlay */}
          {showLookbook && (
            <LookbookOverlay
              looks={looks}
              onClose={() => setShowLookbook(false)}
              onLoad={loadLook}
              onDelete={deleteLook}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Editor subcomponents ────────────────────────────────────────────

function ActionBtn({ icon, label, onClick, primary }: {
  icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 px-3 py-2 rounded-md text-[11px] uppercase tracking-wider"
      style={{
        background: primary ? ACCENT : "rgba(255,255,255,0.08)",
        color: primary ? "#1a0a18" : "#fff",
      }}>
      {icon} {label}
    </button>
  );
}

function PickerGrid<T extends { id: string; label?: string; hex?: string | null }>({
  items, value, onPick, swatch,
}: {
  items: readonly T[];
  value: string;
  onPick: (id: string) => void;
  swatch?: (it: T) => string | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map(it => {
        const sw = swatch ? swatch(it) : it.hex ?? null;
        const active = value === it.id;
        return (
          <button key={it.id} onClick={() => onPick(it.id)}
            className="rounded-md p-1.5 text-[9px] text-center flex flex-col items-center gap-1"
            style={{
              background: active ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
              border: active ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
            }}>
            {sw !== null && sw !== undefined ? (
              <div className="w-6 h-6 rounded-full" style={{ background: sw, border: "1px solid rgba(255,255,255,0.2)" }} />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: "rgba(255,255,255,0.08)" }}>—</div>
            )}
            <div className="leading-tight">{it.label ?? it.id}</div>
          </button>
        );
      })}
    </div>
  );
}

function ColorSwatchPicker({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {OUTFIT_COLORS.map(c => (
        <button key={c} onClick={() => onPick(c)}
          className="aspect-square rounded-md"
          style={{
            background: c,
            border: value === c ? `2px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.15)",
          }}
          aria-label={`Color ${c}`} />
      ))}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1.5 mt-3 first:mt-0">{children}</div>;
}

function BaseEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  return (
    <div>
      <SectionHead>Skin Tone</SectionHead>
      <PickerGrid items={SKIN_TONES} value={look.skin} onPick={id => patch({ skin: id as SkinId })} />
    </div>
  );
}

function HairEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  return (
    <div>
      <SectionHead>Hairstyle</SectionHead>
      <div className="grid grid-cols-3 gap-1.5">
        {HAIR_STYLES.map(s => {
          const active = look.hairStyle === s.id;
          return (
            <button key={s.id} onClick={() => patch({ hairStyle: s.id })}
              className="rounded-md py-2 text-[10px]"
              style={{
                background: active ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
                border: active ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
              }}>
              {s.label}
            </button>
          );
        })}
      </div>
      <SectionHead>Hair Color</SectionHead>
      <PickerGrid items={HAIR_COLORS} value={look.hairColor} onPick={id => patch({ hairColor: id as HairColorId })} />
    </div>
  );
}

function MakeupEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  return (
    <div>
      <div className="text-[10px] opacity-60 mb-2 flex items-center gap-1">
        <ZoomIn size={11} /> Face-zoom is active — see the changes up close.
      </div>
      <SectionHead>Eye Shape</SectionHead>
      <PickerGrid items={EYE_SHAPES} value={look.eyeShape} onPick={id => patch({ eyeShape: id as EyeShapeId })} />
      <SectionHead>Eye Color</SectionHead>
      <PickerGrid items={EYE_COLORS} value={look.eyeColor} onPick={id => patch({ eyeColor: id as EyeColorId })} />
      <SectionHead>Brow Shape</SectionHead>
      <PickerGrid items={BROW_SHAPES} value={look.browShape} onPick={id => patch({ browShape: id as BrowShapeId })} />
      <SectionHead>Brow Color</SectionHead>
      <PickerGrid items={HAIR_COLORS} value={look.browColor} onPick={id => patch({ browColor: id as HairColorId })} />
      <SectionHead>Mouth Shape</SectionHead>
      <PickerGrid items={MOUTH_SHAPES} value={look.mouthShape} onPick={id => patch({ mouthShape: id as MouthShapeId })} />
      <SectionHead>Lipstick</SectionHead>
      <PickerGrid items={LIP_COLORS} value={look.lipColor} onPick={id => patch({ lipColor: id as LipColorId })}
        swatch={it => it.hex ?? null} />
      <SectionHead>Blush</SectionHead>
      <PickerGrid items={BLUSH_COLORS} value={look.blushColor} onPick={id => patch({ blushColor: id as BlushColorId })}
        swatch={it => it.hex ?? null} />
      <SectionHead>Eyeshadow</SectionHead>
      <PickerGrid items={EYESHADOW_COLORS} value={look.eyeshadowColor} onPick={id => patch({ eyeshadowColor: id as EyeshadowColorId })}
        swatch={it => it.hex ?? null} />
    </div>
  );
}

function OutfitEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  const dressed = look.dress !== "none";
  return (
    <div>
      <SectionHead>Outfit Style</SectionHead>
      <div className="grid grid-cols-3 gap-1.5">
        {DRESS_STYLES.map(d => {
          const active = look.dress === d.id;
          return (
            <button key={d.id} onClick={() => patch({ dress: d.id })}
              className="rounded-md py-2 text-[10px]"
              style={{
                background: active ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
                border: active ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
              }}>
              {d.label}
            </button>
          );
        })}
      </div>

      {dressed ? (
        <>
          <SectionHead>Dress Color</SectionHead>
          <ColorSwatchPicker value={look.dressColor} onPick={c => patch({ dressColor: c })} />
        </>
      ) : (
        <>
          <SectionHead>Top</SectionHead>
          <div className="grid grid-cols-3 gap-1.5">
            {TOP_STYLES.map(t => (
              <button key={t.id} onClick={() => patch({ top: t.id })}
                className="rounded-md py-2 text-[10px]"
                style={{
                  background: look.top === t.id ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
                  border: look.top === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <SectionHead>Top Color</SectionHead>
          <ColorSwatchPicker value={look.topColor} onPick={c => patch({ topColor: c })} />

          <SectionHead>Bottom</SectionHead>
          <div className="grid grid-cols-3 gap-1.5">
            {BOTTOM_STYLES.map(b => (
              <button key={b.id} onClick={() => patch({ bottom: b.id })}
                className="rounded-md py-2 text-[10px]"
                style={{
                  background: look.bottom === b.id ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
                  border: look.bottom === b.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                }}>
                {b.label}
              </button>
            ))}
          </div>
          <SectionHead>Bottom Color</SectionHead>
          <ColorSwatchPicker value={look.bottomColor} onPick={c => patch({ bottomColor: c })} />
        </>
      )}

      <SectionHead>Shoes</SectionHead>
      <div className="grid grid-cols-3 gap-1.5">
        {SHOE_STYLES.map(s => (
          <button key={s.id} onClick={() => patch({ shoes: s.id })}
            className="rounded-md py-2 text-[10px]"
            style={{
              background: look.shoes === s.id ? "rgba(244,114,182,0.30)" : "rgba(255,255,255,0.05)",
              border: look.shoes === s.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
            }}>
            {s.label}
          </button>
        ))}
      </div>
      <SectionHead>Shoe Color</SectionHead>
      <ColorSwatchPicker value={look.shoeColor} onPick={c => patch({ shoeColor: c })} />
    </div>
  );
}

function ExtrasEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  return (
    <div>
      <SectionHead>Glasses</SectionHead>
      <ChipPicker items={GLASSES as readonly string[]} value={look.glasses} onPick={v => patch({ glasses: v as GlassesId })} />
      {look.glasses !== "none" && (
        <>
          <SectionHead>Glasses Color</SectionHead>
          <ColorSwatchPicker value={look.glassesColor} onPick={c => patch({ glassesColor: c })} />
        </>
      )}

      <SectionHead>Hat</SectionHead>
      <ChipPicker items={HATS as readonly string[]} value={look.hat} onPick={v => patch({ hat: v as HatId })} />
      {look.hat !== "none" && (
        <>
          <SectionHead>Hat Color</SectionHead>
          <ColorSwatchPicker value={look.hatColor} onPick={c => patch({ hatColor: c })} />
        </>
      )}

      <SectionHead>Earrings</SectionHead>
      <ChipPicker items={EARRINGS as readonly string[]} value={look.earrings} onPick={v => patch({ earrings: v as EarringsId })} />
      {look.earrings !== "none" && (
        <>
          <SectionHead>Earring Color</SectionHead>
          <ColorSwatchPicker value={look.earringsColor} onPick={c => patch({ earringsColor: c })} />
        </>
      )}

      <SectionHead>Necklace</SectionHead>
      <ChipPicker items={NECKLACE as readonly string[]} value={look.necklace} onPick={v => patch({ necklace: v as NecklaceId })} />
      {look.necklace !== "none" && (
        <>
          <SectionHead>Necklace Color</SectionHead>
          <ColorSwatchPicker value={look.necklaceColor} onPick={c => patch({ necklaceColor: c })} />
        </>
      )}

      <SectionHead>Hair Accessory</SectionHead>
      <ChipPicker items={HAIR_DECO as readonly string[]} value={look.hairDeco} onPick={v => patch({ hairDeco: v as HairDecoId })} />
      {look.hairDeco !== "none" && (
        <>
          <SectionHead>Hair Accessory Color</SectionHead>
          <ColorSwatchPicker value={look.hairDecoColor} onPick={c => patch({ hairDecoColor: c })} />
        </>
      )}
    </div>
  );
}

function ChipPicker({ items, value, onPick }: {
  items: readonly string[]; value: string; onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => {
        const active = value === it;
        return (
          <button key={it} onClick={() => onPick(it)}
            className="px-3 py-1.5 rounded-full text-[10px] capitalize"
            style={{
              background: active ? ACCENT : "rgba(255,255,255,0.06)",
              color: active ? "#1a0a18" : "#fff",
            }}>
            {it}
          </button>
        );
      })}
    </div>
  );
}

function StageEditor({ look, patch }: { look: Look; patch: (p: Partial<Look>) => void }) {
  return (
    <div>
      <SectionHead>Background</SectionHead>
      <div className="grid grid-cols-3 gap-2">
        {BACKGROUNDS.map(b => {
          const active = look.background === b.id;
          return (
            <button key={b.id} onClick={() => patch({ background: b.id })}
              className="rounded-md overflow-hidden relative"
              style={{
                aspectRatio: "1",
                border: active ? `2px solid ${ACCENT}` : "1.5px solid rgba(255,255,255,0.12)",
                backgroundImage: "img" in b && b.img ? `url(${b.img}), ${b.css}` : b.css,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={b.label}>
              <div className="absolute bottom-0 left-0 right-0 text-[9px] py-1 text-center"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                {b.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LookbookOverlay({ looks, onClose, onLoad, onDelete }: {
  looks: SavedLook[];
  onClose: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(10,5,12,0.95)", backdropFilter: "blur(6px)" }}>
      <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <BookOpen size={18} />
        <div className="font-display tracking-[0.2em] uppercase text-sm">Lookbook</div>
        <div className="flex-1" />
        <button onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {looks.length === 0 ? (
          <div className="opacity-60 text-center mt-12 text-sm">
            <Heart size={32} className="mx-auto mb-2 opacity-50" />
            No saved looks yet. Style a character and tap Save!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {looks.map(l => (
              <div key={l.id} className="rounded-md overflow-hidden flex flex-col"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <button onClick={() => onLoad(l.id)} className="relative"
                  style={{
                    aspectRatio: "2 / 3",
                    background: bgEntry(l.look.background).css,
                  }}>
                  <DollAvatar look={l.look} />
                </button>
                <div className="flex items-center gap-1 p-2">
                  <div className="flex-1 text-[10px] truncate">{l.name}</div>
                  <button onClick={() => onDelete(l.id)} aria-label="Delete"
                    className="p-1 opacity-60 hover:opacity-100"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
