// content/quests.ts — Story beats fired as the player descends.

import type { Quest } from "../types";

export const QUEST_BEATS: Omit<Quest, "seen">[] = [
  {
    id: "q1_entry",
    title: "The Whisper Below",
    beat: "You wake at the dungeon's mouth. The torches flicker green. Below you, something is *waiting* — and it knows your name. Three classes of hero have descended before. None have returned.",
    triggerFloor: 1,
  },
  {
    id: "q2_skulls",
    title: "Skulls in the Dirt",
    beat: "The second floor is paved with bones. Goblins skitter through them like they're stones in a creek. Whoever they're feeding to, it eats *well*.",
    triggerFloor: 2,
  },
  {
    id: "q3_merchant",
    title: "An Old Friend",
    beat: "A merchant has somehow set up shop down here — three floors deep, no exits behind him. He smiles too much. His prices, somehow, are fair.",
    triggerFloor: 3,
  },
  {
    id: "q4_groans",
    title: "The Cathedral",
    beat: "Floor 4 is a ruined cathedral. The faithful here pray with broken voices. The altar smells like rust and rain.",
    triggerFloor: 4,
  },
  {
    id: "q5_halfway",
    title: "Halfway Down",
    beat: "Halfway. The torches stopped being lit by mortals two floors ago. Whatever lives here keeps the lights on for a reason. You are no longer sure that reason is mercy.",
    triggerFloor: 5,
  },
  {
    id: "q6_trolls",
    title: "Trollkeep",
    beat: "Cave trolls roam these halls. Big, dumb, mean. The walls are scratched with tally marks — count: 47. You don't want to ask what they're counting.",
    triggerFloor: 6,
  },
  {
    id: "q7_webs",
    title: "The Weaver",
    beat: "Webs across every door. Some are silk. Some are not silk. The Weaver does not eat what it catches — it *stores*.",
    triggerFloor: 7,
  },
  {
    id: "q8_wraiths",
    title: "Among the Dead",
    beat: "Wraiths drift through walls down here. They speak in the voices of people you knew. Some of them call you home. *Don't listen.*",
    triggerFloor: 8,
  },
  {
    id: "q9_knights",
    title: "The Order That Failed",
    beat: "Floor 9. Plate armor — empty inside. The knights of the old order made it this far and stopped. They will fight you to make sure you do not.",
    triggerFloor: 9,
  },
  {
    id: "q10_boss",
    title: "The Dungeon Lord",
    beat: "Floor 10. A throne of obsidian. A crown of bone. The thing on the throne stands when you enter — and it is *taller than the room*. \"Welcome,\" it says, in your voice. \"I have been waiting.\"",
    triggerFloor: 10,
  },
  {
    id: "qend_victory",
    title: "The Climb Back Up",
    beat: "The Dungeon Lord falls. The crown rolls to your feet. You pick it up — it weighs nothing — and you understand, finally, what it costs to wear it. You climb. The dungeon, behind you, breathes a quiet sigh, and is still.",
    triggerFloor: 11, // sentinel — fired on victory
  },
];

export function questFor(floor: number) {
  return QUEST_BEATS.find(q => q.triggerFloor === floor);
}
