// Temporal Order — procedural pixel-art sprites baked to canvas.
// 16×24 chunky pixels rendered at integer scale. No external asset
// packs needed; everything is generated from a palette.

function ctx(w: number, h: number): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.imageSmoothingEnabled = false;
  return { c, x };
}

export interface CharacterPalette {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  accent?: string;
}

/** 16×24 character sprite, idle pose, facing down. Returns the canvas
 *  so callers can use it directly as a texture or convert to a data URL. */
export function characterSprite(p: CharacterPalette): HTMLCanvasElement {
  const { c, x } = ctx(16, 24);
  // Head
  x.fillStyle = p.skin;
  x.fillRect(5, 3, 6, 6);
  // Hair on top
  x.fillStyle = p.hair;
  x.fillRect(4, 2, 8, 2);
  x.fillRect(4, 4, 1, 1);
  x.fillRect(11, 4, 1, 1);
  // Eyes
  x.fillStyle = "#000";
  x.fillRect(6, 6, 1, 1);
  x.fillRect(9, 6, 1, 1);
  // Mouth
  x.fillStyle = "#5a3a2a";
  x.fillRect(7, 8, 2, 1);
  // Neck
  x.fillStyle = p.skin;
  x.fillRect(7, 9, 2, 1);
  // Shirt
  x.fillStyle = p.shirt;
  x.fillRect(4, 10, 8, 6);
  // Accent (sash / belt)
  if (p.accent) {
    x.fillStyle = p.accent;
    x.fillRect(4, 13, 8, 1);
  }
  // Arms
  x.fillStyle = p.skin;
  x.fillRect(3, 11, 1, 4);
  x.fillRect(12, 11, 1, 4);
  // Hands
  x.fillRect(3, 15, 1, 1);
  x.fillRect(12, 15, 1, 1);
  // Pants
  x.fillStyle = p.pants;
  x.fillRect(5, 16, 3, 5);
  x.fillRect(8, 16, 3, 5);
  // Boots
  x.fillStyle = "#1a1a1a";
  x.fillRect(5, 21, 3, 2);
  x.fillRect(8, 21, 3, 2);
  return c;
}

export const AGENT_PALETTES: Record<string, CharacterPalette> = {
  agent1: { skin: "#e8c39e", hair: "#3d2817", shirt: "#1e293b", pants: "#0f172a", accent: "#f59e0b" },
  agent2: { skin: "#a87850", hair: "#1a1a1a", shirt: "#7c2d12", pants: "#1c1917", accent: "#fbbf24" },
  agent3: { skin: "#d4a574", hair: "#fbbf24", shirt: "#0f4c5c", pants: "#0c2530", accent: "#ef4444" },
  agent4: { skin: "#f0d4b0", hair: "#7c2d12", shirt: "#581c87", pants: "#1e1b4b", accent: "#fbbf24" },
};

// Era-flavored NPC palettes
export const NPC_PALETTES: Record<string, CharacterPalette> = {
  // Egypt
  "Pharaoh Akhenaten":   { skin: "#c89b6a", hair: "#1a1208", shirt: "#fbbf24", pants: "#fde68a", accent: "#dc2626" },
  "Queen Nefertiti":     { skin: "#d4a574", hair: "#0a0a0a", shirt: "#1d4ed8", pants: "#fef3c7", accent: "#fbbf24" },
  "Vizier Ramose":       { skin: "#a87850", hair: "#3d2817", shirt: "#fef9c3", pants: "#fef3c7", accent: "#dc2626" },
  "Scribe Ipy":          { skin: "#c89b6a", hair: "#1a1208", shirt: "#fef9c3", pants: "#fef9c3" },
  "Foreign Envoy":       { skin: "#e8c39e", hair: "#3d2817", shirt: "#7c2d12", pants: "#451a03", accent: "#fbbf24" },
  // Greece
  "Socrates":            { skin: "#d4a574", hair: "#e5e7eb", shirt: "#f3f4f6", pants: "#f3f4f6", accent: "#92400e" },
  "Plato (youth)":       { skin: "#e8c39e", hair: "#3d2817", shirt: "#f9fafb", pants: "#f3f4f6" },
  "Aspasia":             { skin: "#e8c39e", hair: "#1a1208", shirt: "#1e3a8a", pants: "#f9fafb", accent: "#fbbf24" },
  "Pericles":            { skin: "#d4a574", hair: "#9ca3af", shirt: "#fef3c7", pants: "#f3f4f6", accent: "#dc2626" },
  "Aristophanes":        { skin: "#d4a574", hair: "#7c2d12", shirt: "#a16207", pants: "#451a03" },
  "Sophist Polos":       { skin: "#e8c39e", hair: "#3d2817", shirt: "#7e22ce", pants: "#581c87", accent: "#fbbf24" },
  // Viking
  "Jarl Bjorn":          { skin: "#f0d4b0", hair: "#fbbf24", shirt: "#dc2626", pants: "#451a03", accent: "#fde68a" },
  "Skald Halvor":        { skin: "#f0d4b0", hair: "#a16207", shirt: "#1e3a8a", pants: "#1c1917" },
  "Merchant from the South": { skin: "#a87850", hair: "#1a1a1a", shirt: "#16a34a", pants: "#365314", accent: "#fbbf24" },
  // Renaissance
  "Leonardo da Vinci":   { skin: "#e8c39e", hair: "#9ca3af", shirt: "#7c2d12", pants: "#451a03", accent: "#fbbf24" },
  "Apprentice Salaì":    { skin: "#e8c39e", hair: "#1a1208", shirt: "#16a34a", pants: "#365314" },
  "Patron de'Medici":    { skin: "#e8c39e", hair: "#3d2817", shirt: "#7e22ce", pants: "#581c87", accent: "#fde68a" },
  "Rival Painter":       { skin: "#e8c39e", hair: "#3d2817", shirt: "#0c4a6e", pants: "#1e3a8a", accent: "#dc2626" },
  "Rival Painter Ghirlandaio": { skin: "#e8c39e", hair: "#3d2817", shirt: "#0c4a6e", pants: "#1e3a8a", accent: "#dc2626" },
  // Revolution
  "Benjamin Franklin":   { skin: "#f0d4b0", hair: "#9ca3af", shirt: "#7c2d12", pants: "#451a03", accent: "#fde68a" },
  "John Adams":          { skin: "#f0d4b0", hair: "#e5e7eb", shirt: "#1e3a8a", pants: "#1c1917", accent: "#fef9c3" },
  "Thomas Jefferson":    { skin: "#f0d4b0", hair: "#fbbf24", shirt: "#16a34a", pants: "#1c1917" },
  "Tavern Keeper":       { skin: "#e8c39e", hair: "#a16207", shirt: "#dc2626", pants: "#1c1917" },
  "Tavern Keeper Mrs. Reeve": { skin: "#e8c39e", hair: "#a16207", shirt: "#dc2626", pants: "#1c1917" },
  // Hollywood
  "Studio Mogul":        { skin: "#e8c39e", hair: "#1a1a1a", shirt: "#1c1917", pants: "#0f0f0f", accent: "#fbbf24" },
  "Silent Film Star":    { skin: "#f0d4b0", hair: "#1a1a1a", shirt: "#f43f5e", pants: "#1c1917", accent: "#fbbf24" },
  "Projectionist":       { skin: "#a87850", hair: "#1a1a1a", shirt: "#365314", pants: "#1c1917" },
  "Rival Reporter":      { skin: "#e8c39e", hair: "#3d2817", shirt: "#0c4a6e", pants: "#1c1917", accent: "#fbbf24" },
  "Future Historian":    { skin: "#a87850", hair: "#e5e7eb", shirt: "#67e8f9", pants: "#1e293b", accent: "#a78bfa" },
};

export function npcPalette(name: string): CharacterPalette {
  return NPC_PALETTES[name] ?? { skin: "#d4a574", hair: "#3d2817", shirt: "#475569", pants: "#1e293b" };
}

/** Returns a data URL — handy for using directly in <img> tags. */
export function characterDataUrl(p: CharacterPalette): string {
  return characterSprite(p).toDataURL();
}

/** A larger "portrait" rendering for dialogue panels — 48×48 (3x). */
export function portraitDataUrl(p: CharacterPalette): string {
  const small = characterSprite(p);
  const { c, x } = ctx(48, 72);
  x.imageSmoothingEnabled = false;
  x.drawImage(small, 0, 0, 16, 24, 0, 0, 48, 72);
  return c.toDataURL();
}
