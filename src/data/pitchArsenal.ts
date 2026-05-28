// Pitching Arsenal — 8 pitches with age-appropriate guidance. Critical safety:
// no breaking balls (curve, slider, cutter, splitter) until specified ages.

export type AgeStatus = "safe" | "wait14" | "wait16";

export interface PitchCard {
  id: string;
  name: string;
  emoji: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  ageStatus: AgeStatus;
  ageNote: string;
  whatItDoes: string;
  whenToThrow: string;
  gripSteps: string[];
  throwSteps: string[];
  feel: string;
  commonMistakes: string;
  proTip?: string;
  safetyNote?: string;
}

export const PITCH_CARDS: PitchCard[] = [
  {
    id: "four-seam",
    name: "Four-Seam Fastball",
    emoji: "⚾",
    difficulty: 1,
    ageStatus: "safe",
    ageNote: "Safe for all ages — this is the first pitch every pitcher learns.",
    whatItDoes: "Goes straight, fastest pitch in your arsenal, easiest to control.",
    whenToThrow: "Your bread-and-butter pitch. When you need a strike, when you want to attack the hitter, when you're behind in the count.",
    gripSteps: [
      "Find the 'horseshoe' — the part of the ball where the seams curve like a U",
      "Place your index and middle fingers ACROSS the top seam (perpendicular to it)",
      "Fingers should be about a half-inch apart, not touching",
      "Your thumb goes underneath the ball, resting on the smooth leather (no seam)",
      "Hold the ball with your fingertips, NOT jammed into your palm — leave a little space between the ball and your palm"
    ],
    throwSteps: [
      "Grip the ball lightly — squeezing too hard slows the pitch down",
      "Throw it like a normal hard throw to a target",
      "Snap your wrist forward at release so your fingers come straight down through the ball",
      "Follow through fully — throwing hand finishes near your opposite hip"
    ],
    feel: "Ball rolls cleanly off your fingertips, you can feel both seams catch on your fingers as it leaves your hand",
    commonMistakes: "Gripping too tight (slows velocity), pushing the ball instead of throwing through it, not following through",
    safetyNote: "Always warm up with arm circles and easy tosses before throwing hard"
  },
  {
    id: "two-seam",
    name: "Two-Seam Fastball (Sinker)",
    emoji: "↘️",
    difficulty: 2,
    ageStatus: "safe",
    ageNote: "Safe for all ages — natural grip variation, no extra arm strain.",
    whatItDoes: "Slightly slower than four-seam, but moves — runs in toward a same-handed batter and sinks down. Makes batters hit ground balls.",
    whenToThrow: "When you want a ground ball, when a hitter is sitting on your fastball, low in the strike zone.",
    gripSteps: [
      "Find the two seams that run closest together on the ball (where they come close before curving apart)",
      "Place your index and middle fingers ALONG those two seams (running with them, not across)",
      "Fingers touch the seams the whole way",
      "Thumb underneath, same as four-seam",
      "Slightly tighter grip than a four-seam"
    ],
    throwSteps: [
      "Throw it just like a fastball — same arm motion, same effort",
      "Don't try to do anything special at release — the grip does the work",
      "The seams running along the ball make it spin slightly different, causing the natural movement"
    ],
    feel: "Almost identical to a fastball, ball comes off slightly differently",
    commonMistakes: "Trying to 'manipulate' the ball at release (makes it worse), throwing it too hard (loses movement)",
    safetyNote: "Same as four-seam — no extra stress on the arm"
  },
  {
    id: "changeup",
    name: "Changeup",
    emoji: "🐢",
    difficulty: 3,
    ageStatus: "safe",
    ageNote: "Safe for all ages — this is the SECOND pitch every pitcher should learn after the fastball. No extra arm stress.",
    whatItDoes: "Looks like a fastball but comes in MUCH slower. Throws off the hitter's timing — they swing early and miss or hit weakly.",
    whenToThrow: "When the hitter is timing your fastball perfectly, especially with two strikes. The 'slow it down' pitch.",
    gripSteps: [
      "Make an 'OK' sign with your thumb and index finger — they form a circle on the side of the ball",
      "Wrap your other three fingers (middle, ring, pinky) across the top of the ball",
      "The ball sits DEEPER in your palm than a fastball (this is the key — it slows the pitch)",
      "Squeeze gently with all five fingers"
    ],
    throwSteps: [
      "MOST IMPORTANT: throw it with the same arm speed and motion as your fastball",
      "Do NOT slow down your arm — the grip slows the pitch, not your motion",
      "Same windup, same release, same follow-through",
      "If your arm slows down, the batter sees it coming"
    ],
    feel: "Throwing a fastball that just doesn't come out as fast — weird at first, gets natural with practice",
    commonMistakes: "Slowing the arm down (BIG mistake — tips the pitch), gripping too tight, throwing it too often",
    proTip: "Practice the changeup AS MUCH as the fastball. Only effective if it looks identical to your fastball out of the hand.",
    safetyNote: "Safest pitch in baseball for young arms — no wrist snap, no twisting"
  },
  {
    id: "curveball",
    name: "Curveball",
    emoji: "🌀",
    difficulty: 5,
    ageStatus: "wait14",
    ageNote: "NOT until age 14 minimum. MLB, USA Baseball, and pediatric sports medicine agree: throwing curveballs before puberty puts dangerous stress on the elbow's growth plate and can cause permanent injury. Show your dad and Coach Billy this card before EVER trying this pitch.",
    whatItDoes: "Drops sharply downward as it reaches the plate. Looks like a strike, then dives. Devastating when commanded.",
    whenToThrow: "Two-strike count, against a hitter who's expecting a fastball.",
    gripSteps: [
      "Find the horseshoe seam",
      "Place your middle finger ALONG the bottom seam of the horseshoe",
      "Index finger sits next to the middle finger (lighter pressure)",
      "Thumb sits along the back seam underneath, like a mirror to your middle finger",
      "Ball is held with index, middle, and thumb forming a 'C' shape around the seams"
    ],
    throwSteps: [
      "DO NOT ATTEMPT YET",
      "The wrist snaps and the arm rotates differently than a fastball — this twisting motion is exactly what hurts young elbows"
    ],
    feel: "Heavy wrist twist — and your elbow doesn't like that yet",
    commonMistakes: "Throwing it before age 14",
    safetyNote: "Your elbow has growth plates that are still developing. Curveball motion puts twisting force directly on those growth plates. Damage from too-early curveballs can shorten your career or end it before it starts. Master fastball + changeup FIRST. Two well-located fastballs and a good changeup will strike out way more hitters than a sloppy curveball.",
    proTip: "When you CAN learn it: Age 14+, after a coach who knows youth mechanics teaches you properly."
  },
  {
    id: "slider",
    name: "Slider",
    emoji: "🔪",
    difficulty: 5,
    ageStatus: "wait16",
    ageNote: "NOT until age 16 minimum. Even more stressful on the elbow than a curveball — lateral twist + speed. Most pro coaches won't teach this until late high school.",
    whatItDoes: "Moves laterally (sideways) and slightly down. Like a small, fast curveball. Hardest pitch to hit when thrown well.",
    whenToThrow: "Two-strike count, against a hitter on the same side as your throwing hand.",
    gripSteps: [
      "Hold the ball offset slightly to the side",
      "Index and middle fingers along the seam, with middle finger pressing harder",
      "Thumb tucked underneath",
      "Pressure is mostly on the middle finger"
    ],
    throwSteps: [
      "DO NOT ATTEMPT YET",
      "Released with a slight cut motion — wrist stays firmer than curveball but still twists at release"
    ],
    feel: "Tight cutting motion at the wrist",
    commonMistakes: "Throwing it before age 16",
    safetyNote: "Higher velocity than curveball + same twisting motion = more stress on the elbow. The slider has the highest injury rate of any pitch in baseball. Become unhittable with fastball location + changeup. Once you can paint corners with your fastball, you don't NEED a slider."
  },
  {
    id: "cutter",
    name: "Cutter",
    emoji: "✂️",
    difficulty: 4,
    ageStatus: "wait14",
    ageNote: "Wait until age 14+. Less stressful than a curveball but still requires advanced mechanics.",
    whatItDoes: "Like a fastball but moves a few inches sideways at the last second — breaks bats and forces weak contact.",
    whenToThrow: "When you want fastball velocity but a little movement to avoid the sweet spot of the bat.",
    gripSteps: [
      "Four-seam grip BUT shift fingers slightly off-center",
      "Index and middle fingers shifted toward the outside of the ball",
      "Pressure on middle finger",
      "Thumb underneath, slightly off-center the opposite direction"
    ],
    throwSteps: [
      "Throw it like a fastball — the off-center grip creates the cut movement naturally",
      "No special wrist motion needed"
    ],
    feel: "Fastball release but the ball spins off the side a touch",
    commonMistakes: "Trying to manipulate at release",
    safetyNote: "No wrist snap, but the off-center release does add some stress. Pediatric pitching coaches recommend mastering fastball + changeup completely before adding any movement pitches.",
    proTip: "For now: stick with two-seam fastball for movement — same grip principle, no extra stress."
  },
  {
    id: "knuckleball",
    name: "Knuckleball",
    emoji: "🤔",
    difficulty: 5,
    ageStatus: "safe",
    ageNote: "Actually SAFE for young arms because there's no wrist snap or twist — but incredibly hard to control. Most pros can't throw it. Fun party trick.",
    whatItDoes: "The wackiest pitch in baseball. Almost no spin — flutters and dances unpredictably.",
    whenToThrow: "Anytime if you're a knuckleball pitcher (rare specialty).",
    gripSteps: [
      "Dig your fingernails (index and middle) into the leather of the ball — grip with NAILS, not pads",
      "Thumb underneath for support",
      "Ring and pinky tucked away",
      "The whole point: NO spin when you release it"
    ],
    throwSteps: [
      "Push the ball out with your fingertips (or fingernails) — don't snap the wrist at all",
      "Release with stiff wrist and stiff fingers",
      "Arm motion is normal, but release is unique"
    ],
    feel: "Like pushing a small basketball — weird, slow, almost-flicking motion",
    commonMistakes: "Spinning the ball even a little (kills the movement), throwing too hard",
    proTip: "Most catchers HATE catching this. Some pro knuckleballers have a special catcher with a giant glove."
  },
  {
    id: "splitter",
    name: "Splitter",
    emoji: "🍴",
    difficulty: 4,
    ageStatus: "wait16",
    ageNote: "Wait until age 16+. The wide finger spread puts stress on the forearm and elbow.",
    whatItDoes: "Looks like a fastball, drops suddenly at the plate. Hitter swings over the top.",
    whenToThrow: "Two-strike strikeout pitch.",
    gripSteps: [
      "Spread your index and middle fingers WIDE — they straddle the ball on opposite sides of the seams",
      "Fingers are NOT on the seams — they're on the leather between",
      "Thumb underneath",
      "Ball sits deeper in your hand than a fastball"
    ],
    throwSteps: [
      "Like a fastball — same motion, no wrist snap",
      "The wide finger spread causes the late drop"
    ],
    feel: "Big finger spread creates a 'pulled' feeling at release",
    commonMistakes: "Throwing it before age 16",
    safetyNote: "The wide finger spread creates leverage on the forearm muscles and elbow. Young arms aren't strong enough to handle this safely."
  }
];

export function pitchesByAge(age: number): PitchCard[] {
  return PITCH_CARDS.filter(p =>
    p.ageStatus === "safe" ||
    (p.ageStatus === "wait14" && age >= 14) ||
    (p.ageStatus === "wait16" && age >= 16)
  );
}

export function pitchById(id: string): PitchCard | undefined {
  return PITCH_CARDS.find(p => p.id === id);
}
