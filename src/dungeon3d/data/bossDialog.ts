// Dungeon3D — boss intro/outro dialog.
//
// One-liner spoken on the boss spawn banner and again on death.
// Skippable on tap; auto-dismisses after ~2 seconds.
//
// Boss kind matches engine.ts `BossKind`: iron_tyrant | hexblade | hollowmage.

export type BossDialogKind = "iron_tyrant" | "hexblade" | "hollowmage";

export interface BossDialog {
  kind: BossDialogKind;
  intro: string;
  outro: string;
  introTint: string;  // banner accent on spawn
  outroTint: string;  // banner accent on death
}

export const BOSS_DIALOG: Record<BossDialogKind, BossDialog> = {
  iron_tyrant: {
    kind: "iron_tyrant",
    intro: "WHO DARES ENTER MY HALL?",
    outro: "...so quiet now... you have... inherited... the silence...",
    introTint: "#ef4444",
    outroTint: "#fca5a5",
  },
  hexblade: {
    kind: "hexblade",
    intro: "Blink. Now look again. I've already moved.",
    outro: "Clever. Tell the others I let you. ...tell them anything you like.",
    introTint: "#a78bfa",
    outroTint: "#c4b5fd",
  },
  hollowmage: {
    kind: "hollowmage",
    intro: "Stand still — I want to remember exactly where I unmade you.",
    outro: "I had a proof for everything. I should have... saved one... for this...",
    introTint: "#22d3ee",
    outroTint: "#67e8f9",
  },
};

export function getBossDialog(kind: string): BossDialog | null {
  if (kind === "iron_tyrant" || kind === "hexblade" || kind === "hollowmage") {
    return BOSS_DIALOG[kind];
  }
  return null;
}
