// HeroSprite — thin wrapper around CharacterSprite so every surface
// (Profile, Adventure, Home, Shops) renders the same DiceBear personas
// portrait the creation flow uses. The old hand-drawn SVG was the
// cartoonish stick-figure look the user wanted gone.

import type { Hero } from "../types";
import { CharacterSprite } from "./CharacterSprite";

interface Props {
  hero: Hero;
  /** Optional pixel size — when omitted, defaults to 96. The old
   *  HeroSprite took a number; we keep that API so callers don't have
   *  to change. */
  size?: number;
  className?: string;
}

export function HeroSprite({ hero, size, className }: Props) {
  const px = size ?? 96;
  // Pick the closest CharacterSprite bucket, then pin with inline
  // width/height for an exact size match.
  const bucket: "sm" | "md" | "lg" | "xl" =
    px <= 64 ? "sm" : px <= 128 ? "md" : px <= 192 ? "lg" : "xl";
  // Seed on the hero id so visuals stay stable across sessions even
  // if the player renames the hero.
  return (
    <div
      style={{ width: px, height: px, display: "inline-block" }}
      className={className}
    >
      <CharacterSprite
        seed={hero.id}
        appearance={hero.appearance}
        size={bucket}
        className="w-full h-full"
      />
    </div>
  );
}
