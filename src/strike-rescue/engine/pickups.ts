// POWs, weapon-upgrade drops, chopper extraction zone.

import type { WeaponLevel } from "./vehicle";

export interface PowEntity {
  x: number; y: number;
  rescued: boolean;
  extracted: boolean;
}

export type PickupKind = "rapid" | "spread" | "dual" | "health";

export interface PickupEntity {
  kind: PickupKind;
  x: number; y: number;
  life: number;
  taken: boolean;
}

export interface ChopperLZ {
  x: number; y: number;
  state: "approach" | "land" | "extract" | "leave";
  timer: number;
  collected: number;
}

export const PICKUP_COLORS: Record<PickupKind, string> = {
  rapid:  "#fde047",
  spread: "#fb923c",
  dual:   "#67e8f9",
  health: "#86efac",
};

export function pickupToWeapon(p: PickupKind): WeaponLevel | "health" {
  if (p === "rapid")  return "rapid";
  if (p === "spread") return "spread";
  if (p === "dual")   return "dual";
  return "health";
}

export function rollPickup(r: number): PickupKind {
  if (r < 0.4) return "health";
  if (r < 0.65) return "rapid";
  if (r < 0.88) return "spread";
  return "dual";
}

export function makeChopperLZ(_levelHeight: number, x: number): ChopperLZ {
  return { x, y: 80, state: "approach", timer: 0, collected: 0 };
}

export function tickChopper(lz: ChopperLZ, dt: number, playerNear: boolean, carrying: number): { justLanded: boolean; justExtracted: number } {
  lz.timer += dt;
  let justLanded = false;
  let justExtracted = 0;
  if (lz.state === "approach" && lz.timer > 1.5) {
    lz.state = "land"; lz.timer = 0; justLanded = true;
  }
  if (lz.state === "land" && playerNear && carrying > 0) {
    lz.state = "extract"; lz.timer = 0;
  }
  if (lz.state === "extract" && lz.timer > 1.2) {
    justExtracted = carrying;
    lz.collected += carrying;
    lz.state = "leave"; lz.timer = 0;
  }
  return { justLanded, justExtracted };
}
