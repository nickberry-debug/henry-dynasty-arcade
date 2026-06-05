// Shared art foundation — one import path for the whole arcade.
//   import { ParticleSystem, ShadowRenderer, ParallaxBackground,
//            LightingOverlay, JuiceKit } from "../../art";
export { ParticleSystem, type ParticleKind } from "./ParticleSystem";
export { ShadowRenderer } from "./ShadowRenderer";
export { ParallaxBackground, type ParallaxTheme } from "./ParallaxBackground";
export { LightingOverlay, type LightingMood } from "./LightingOverlay";
export * as JuiceKit from "./JuiceKit";
export * as EffectsLibrary from "./EffectsLibrary";
export { stepParticles as stepEffectsParticles, drawParticles as drawEffectsParticles, clearParticles as clearEffectsParticles } from "./EffectsLibrary";
export { Crest, autoCrest, resolveCrest, type CrestSpec, type ShieldShape, type MascotKind } from "./CrestGenerator";
export {
  playSfx, playMusic, stopMusic,
  isMuted, setMuted, setVolume, getAudioState, unlockAudio,
  type SfxKey, type MusicKey,
} from "./AudioLibrary";
export { ImageParallax, type ParallaxPreset, type ParallaxLayer } from "./ImageParallax";
export { MonsterCompositor } from "./MonsterCompositor";
export { KENNEY, tintFilter, kenneyInstalled } from "./kenney-manifest";
// Unified intent→path manifest (Kenney CC0 + game-icons CC-BY) and the
// programmatic recolor/variant system. Populated by scripts/fetch-assets.mjs.
export { ASSETS, allAssetPaths } from "./asset-manifest";
export { recolorFilter, spriteFilter, variantIndex } from "./variants";
