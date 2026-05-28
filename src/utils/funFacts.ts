// K.23 — Deterministic, auto-generated fun facts per player.
import type { Player } from "../store/types";

const SNACKS = ["sunflower seeds","peanut butter sandwiches","bubble gum","gatorade ice","trail mix","beef jerky","banana bread","oatmeal cookies","apple slices","pretzels"];
const RITUALS = [
  "always taps home plate twice",
  "wears the same socks every game",
  "kisses the bat handle before each AB",
  "draws a cross in the dirt with his cleat",
  "humming a Tom Petty song",
  "fist bumps the third base coach",
  "yells the same one-liner from the dugout",
  "blows on his glove like it's good luck",
  "carries his grandfather's old baseball card in his back pocket",
  "writes his mom's initials inside his cap"
];
const HOBBIES = [
  "collects vintage glove leather",
  "raises chickens in the offseason",
  "is learning the ukulele",
  "binges sci-fi novels on road trips",
  "obsessed with home espresso",
  "drives a beat-up '92 Bronco",
  "watches every Western ever made",
  "plays competitive cornhole",
  "is a self-taught chess player",
  "builds model trains"
];

function seeded(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function funFact(p: Player): string[] {
  const seed = seeded(p.id);
  return [
    `Walk-up snack: ${SNACKS[seed % SNACKS.length]}.`,
    `Pre-game ritual: ${RITUALS[(seed >> 3) % RITUALS.length]}.`,
    `Offseason hobby: ${HOBBIES[(seed >> 7) % HOBBIES.length]}.`,
    p.nickname ? `"${p.nickname}" — the nickname stuck after a wild rookie season.` : `Wears #${p.jerseyNumber} because it was his dad's number.`
  ];
}
