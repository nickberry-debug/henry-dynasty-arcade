export const TRAITS = [
  "Leader","Team Player","Hothead","Prankster","Quiet","Intense","Showboat","Mentor","Workhorse",
  "Fragile","Streaky","Clutch Performer","Choke Artist","Veteran Presence","Cancer",
  "Owner's Favorite","Iron Man","Walk-Off King","Hometown Hero","Underdog","Phoenix"
] as const;
export type Trait = typeof TRAITS[number];

export interface InjuryDef {
  name: string;
  min: number; max: number;
  affects: "any" | "pitcher" | "hitter";
}
export const INJURIES: InjuryDef[] = [
  { name: "Hamstring Strain", min: 7, max: 21, affects: "any" },
  { name: "Sprained Ankle", min: 10, max: 30, affects: "any" },
  { name: "Sore Shoulder", min: 10, max: 45, affects: "pitcher" },
  { name: "UCL Sprain", min: 30, max: 180, affects: "pitcher" },
  { name: "Tommy John Surgery", min: 365, max: 540, affects: "pitcher" },
  { name: "Rotator Cuff Strain", min: 60, max: 180, affects: "pitcher" },
  { name: "Concussion", min: 7, max: 30, affects: "any" },
  { name: "Oblique Strain", min: 15, max: 40, affects: "any" },
  { name: "Broken Hand", min: 30, max: 60, affects: "hitter" },
  { name: "Knee Inflammation", min: 10, max: 28, affects: "any" },
  { name: "Back Spasm", min: 5, max: 15, affects: "any" },
  { name: "Wrist Tendonitis", min: 10, max: 25, affects: "hitter" },
  { name: "Hip Flexor", min: 10, max: 21, affects: "any" },
  { name: "Lat Strain", min: 15, max: 45, affects: "pitcher" },
  { name: "Calf Strain", min: 10, max: 20, affects: "any" },
  { name: "Elbow Soreness", min: 7, max: 30, affects: "pitcher" },
  { name: "Forearm Tightness", min: 10, max: 25, affects: "pitcher" },
  { name: "Hand Contusion", min: 5, max: 14, affects: "hitter" }
];

export const PITCH_TYPES = ["4-Seam","2-Seam","Sinker","Cutter","Slider","Curve","Changeup","Splitter","Knuckler"] as const;
export type PitchType = typeof PITCH_TYPES[number];

export const STADIUM_NAMES = [
  "Heritage Park","Pioneer Field","Liberty Park","Centennial Stadium","Crown Park","Garrison Field",
  "Anchor Park","Iron Works Field","Riverside Park","Summit Stadium","Frontier Field","Diamond Park",
  "Crescent Park","Beacon Stadium","Skyline Park","Harbor Stadium","Highland Field","Independence Park",
  "Victory Field","Coast Stadium","Lakeside Park","Cathedral Park","Foundry Field","Pacific Park",
  "Atlantic Park","Continental Stadium","Cascade Field","Pacific Crest Park"
];

export const FOOD_ITEMS = [
  "Riverbat Pretzel","Bullpen Brisket","Slugger Slider","Foul Pole Pizza","Triple Play Tacos",
  "Dugout Dog","Grand Slam Burger","Curveball Corndog","Walk-Off Wings","Heater Hot Sauce Fries",
  "Power Alley Poutine","Squeeze Play Smoothie","Bunt Cake","Fastball Funnel Cake"
];

export const WALK_UP_SONGS = [
  "Enter Sandman","Crazy Train","Welcome to the Jungle","Thunderstruck","Sandstorm","Eye of the Tiger",
  "Renegade","Sirius","Down with the Sickness","Pursuit of Happiness","No Hands Up","HUMBLE.",
  "Mo Bamba","X Gon' Give It To Ya","Run This Town","All I Do Is Win","Lose Yourself","Till I Collapse",
  "Stronger","Power","Bad","Smooth Criminal","Beat It","Thriller","Rock You Like a Hurricane",
  "We Will Rock You","Don't Stop Believin'","Sweet Caroline","Take Me Out to the Ball Game"
];

export const CLOSER_ENTRANCES = [
  "Wild Thing","Enter Sandman","Hells Bells","Thunderstruck","Crazy Train","Roundtable Rival",
  "Closer","Welcome to the Jungle","Sandman","Renegade","TNT","Highway to Hell"
];

export const MASCOT_NAMES = [
  "Slider","Wally","Crazy Crab","Mr. Met","Phanatic","Stomper","Lou Seal","Dinger","Homer","Bernie",
  "Captain Fear","Rosie","Pat","Mr. Redlegs","Paws","Junction","Diamond","Sluggrr","Smokey","Stretch"
];

export const ACHIEVEMENTS = [
  { id: "first-sim", title: "Play Ball!", desc: "Sim your first game", icon: "trophy" },
  { id: "first-win", title: "W in the books", desc: "Win your first game", icon: "trophy" },
  { id: "first-season", title: "Full Season", desc: "Complete a full regular season", icon: "trophy" },
  { id: "first-playoff", title: "October Baseball", desc: "Make the playoffs", icon: "trophy" },
  { id: "first-ring", title: "World Series Champion", desc: "Win the World Series", icon: "crown" },
  { id: "back-to-back", title: "Back-to-Back", desc: "Win two championships in a row", icon: "crown" },
  { id: "dynasty", title: "Dynasty", desc: "Win 3 championships in 10 years", icon: "crown" },
  { id: "no-hitter", title: "No-Hitter", desc: "Throw a no-hitter", icon: "star" },
  { id: "perfect-game", title: "Perfect", desc: "Throw a perfect game", icon: "star" },
  { id: "cycle", title: "Hit for the Cycle", desc: "A player hits for the cycle", icon: "star" },
  { id: "triple-crown", title: "Triple Crown", desc: "Win the Triple Crown", icon: "trophy" },
  { id: "300-wins", title: "300 Win Club", desc: "A pitcher reaches 300 wins", icon: "trophy" },
  { id: "500-hr", title: "500 HR Club", desc: "A hitter reaches 500 HR", icon: "trophy" },
  { id: "3000-h", title: "3000 Hit Club", desc: "A hitter reaches 3000 hits", icon: "trophy" }
];
