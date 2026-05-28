// Training Camp drill library — 30 drills with detailed instructions.
// Animations described as simple SVG keyframes per drill (kept inline in drillAnimations.tsx).

export type DrillCategory = "hitting" | "pitching" | "conditioning";

export interface Drill {
  id: string;
  name: string;
  emoji: string;
  category: DrillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  purpose: string;
  equipment: string[];
  steps: string[];
  feel: string;
  commonMistake: string;
  proTip: string;
  suggestedReps?: string;
  durationMin?: number;
}

export const DRILLS: Drill[] = [
  // HITTING
  {
    id: "fence-drill",
    name: "Fence Drill",
    emoji: "🚧",
    category: "hitting",
    difficulty: 2,
    purpose: "Forces hands to stay high and elbow up. Targets Coach Billy's #1 fix — dropping the elbow.",
    equipment: ["A fence, wall, or net", "A bat"],
    steps: [
      "Stand sideways to the fence, like at the plate facing a pitcher",
      "Your back should be about a bat-length from the fence",
      "Take your batting stance (feet set, knees bent, hands above shoulder)",
      "Take a slow, controlled dry swing",
      "If your bat hits the fence behind you, your elbow dropped or your swing got loopy",
      "Goal: 15–20 swings without touching the fence"
    ],
    feel: "Hands stay high through the zone, swing stays on a level plane, no 'casting' the bat behind you",
    commonMistake: "Standing too close (impossible) or too far (defeats purpose)",
    proTip: "Start very slow to feel the path, then speed up",
    suggestedReps: "15–20 swings",
    durationMin: 10
  },
  {
    id: "top-hand",
    name: "Top Hand Drill",
    emoji: "✋",
    category: "hitting",
    difficulty: 3,
    purpose: "Strengthens the top hand and builds muscle memory for keeping elbow up and driving the knob of the bat forward.",
    equipment: ["Light bat or training bat", "Tee with ball"],
    steps: [
      "Grip bat with ONLY your top hand (right hand for righties)",
      "Tuck bottom hand behind back or in pocket",
      "Take stance with tee at front-foot contact point",
      "Swing with just the top hand — short, compact, knob-forward motion",
      "Focus on elbow staying up and swing on a line",
      "Goal: 10–15 reps per round, 2–3 rounds"
    ],
    feel: "Top hand is the engine. Barrel follows the pitch line, doesn't loop",
    commonMistake: "Swinging too hard one-handed and getting loopy",
    proTip: "Use a lighter bat — goal is path, not power",
    suggestedReps: "10-15 reps × 2-3 rounds",
    durationMin: 10
  },
  {
    id: "no-hands-hip",
    name: "No-Hands Hip Drill",
    emoji: "🔄",
    category: "hitting",
    difficulty: 1,
    purpose: "Isolates lower half to teach hip rotation. Coach Billy wants more belly-button-to-pitcher and back-foot pivot.",
    equipment: ["A bat"],
    steps: [
      "Hold bat horizontally behind back, tucked in crooks of both elbows",
      "Take batting stance",
      "Without using arms at all, rotate hips like you're swinging",
      "Belly button should end pointing at the pitcher",
      "Back foot should pivot up onto toe (heel up)",
      "Hold finish 2 seconds, reset",
      "Goal: 20 reps"
    ],
    feel: "Core and legs only. Arms do nothing. Should feel it in obliques and back leg",
    commonMistake: "Spinning the upper body instead of driving from legs",
    proTip: "Imagine squashing a bug with your back foot as you rotate",
    suggestedReps: "20 reps",
    durationMin: 8
  },
  {
    id: "towel-heel",
    name: "Towel Under Back Heel",
    emoji: "🧺",
    category: "hitting",
    difficulty: 1,
    purpose: "Forces back foot to pivot — impossible to fake. Visual feedback on rotation.",
    equipment: ["Small hand towel", "Tee with ball"],
    steps: [
      "Place folded hand towel under back heel",
      "Take normal batting stance with towel in place",
      "Swing normally",
      "After swing, check towel — should have rolled or moved as heel pivoted",
      "If towel is in exact same spot, you didn't rotate",
      "Goal: 15 swings, towel moves every time"
    ],
    feel: "Back heel rolling off, weight transferring through swing",
    commonMistake: "Just lifting foot straight up instead of rotating",
    proTip: "Try slow first to feel proper pivot motion",
    suggestedReps: "15 swings",
    durationMin: 10
  },
  {
    id: "colored-ball",
    name: "Colored Ball Toss",
    emoji: "🎨",
    category: "hitting",
    difficulty: 3,
    purpose: "Fixes ball tracking. Forces eyes all the way to contact instead of guessing.",
    equipment: ["Two different-colored balls (red & yellow)", "Partner for soft toss"],
    steps: [
      "Partner stands 10 feet away with both colored balls",
      "Partner tosses one ball, calling the color right before release ('YELLOW!')",
      "Henry must process color call and track that ball all the way to contact",
      "If wrong color, don't swing",
      "Goal: 15–20 reps, hitting correct ball 90%+ of the time"
    ],
    feel: "Eyes locked on ball from release through contact, no head pulling",
    commonMistake: "Guessing the color and swinging anyway",
    proTip: "Partner can speed up or vary timing to challenge Henry",
    suggestedReps: "15-20 reps",
    durationMin: 12
  },
  {
    id: "sharpie-line",
    name: "Tee Work with Sharpie Line",
    emoji: "🖊️",
    category: "hitting",
    difficulty: 2,
    purpose: "Fixes contact point. Forces eyes locked on specific spot through swing.",
    equipment: ["Sharpie", "Baseballs", "Tee"],
    steps: [
      "Draw a clear line around the middle of the ball (equator)",
      "Place ball on tee",
      "Goal: hit the line itself with the bat",
      "Take stance, focus eyes on the line, swing",
      "Check bat marks — should be on or near the line",
      "Goal: 15 swings, hitting line on majority"
    ],
    feel: "Eyes locked on contact zone, swing comes through that specific point",
    commonMistake: "Watching the bat instead of the ball",
    proTip: "Draw the line a different color each session to keep eyes fresh",
    suggestedReps: "15 swings",
    durationMin: 10
  },
  {
    id: "one-knee",
    name: "One-Knee Drill",
    emoji: "🦵",
    category: "hitting",
    difficulty: 2,
    purpose: "Isolates upper body. Eliminates lower-half compensation so swing flaws show up clearly.",
    equipment: ["Tee", "Ball", "Knee pad optional"],
    steps: [
      "Kneel on back knee (right knee for righties), front leg out in normal stride position",
      "Place tee at contact point",
      "Take batting grip, get into upper-body stance",
      "Swing using only upper body — no leg drive possible",
      "Focus on hand path and bat plane",
      "Goal: 10–15 reps"
    ],
    feel: "Pure upper-body mechanics, hands leading the barrel",
    commonMistake: "Trying to add hip turn (you can't — that's the point)",
    proTip: "Great diagnostic — if swing feels wrong here, your hands need work",
    suggestedReps: "10-15 reps",
    durationMin: 10
  },
  {
    id: "walk-through",
    name: "Walk-Through Drill",
    emoji: "🚶",
    category: "hitting",
    difficulty: 2,
    purpose: "Fixes timing and weight transfer. Teaches forward momentum into the swing.",
    equipment: ["Tee", "Ball", "Open space"],
    steps: [
      "Start 2 steps behind your normal batting position",
      "Take a relaxed walking step with back foot, then front foot into your stance",
      "As front foot lands, immediately swing",
      "Don't pause — flow through the motion",
      "Goal: 10–15 reps"
    ],
    feel: "Weight transferring smoothly from back to front, momentum into ball",
    commonMistake: "Stopping in stance instead of swinging immediately",
    proTip: "Build it slow first, then add pace",
    suggestedReps: "10-15 reps",
    durationMin: 10
  },
  {
    id: "slow-motion",
    name: "Slow-Motion Swings",
    emoji: "🐢",
    category: "hitting",
    difficulty: 1,
    purpose: "Builds form muscle memory by isolating each checkpoint.",
    equipment: ["Bat — no ball needed"],
    steps: [
      "Take batting stance",
      "Swing at 25% speed — should take 5 full seconds",
      "Check each position: stance ✓ load ✓ stride ✓ rotation ✓ contact ✓ follow-through ✓",
      "Hold any position that feels off for 3 seconds, then continue",
      "Goal: 10 ultra-slow swings"
    ],
    feel: "Every checkpoint Coach Billy talked about, one at a time",
    commonMistake: "Speeding up because it feels weird",
    proTip: "Do these before regular tee work to set form",
    suggestedReps: "10 reps",
    durationMin: 8
  },
  {
    id: "two-tee",
    name: "Two-Tee Drill",
    emoji: "📍",
    category: "hitting",
    difficulty: 3,
    purpose: "Fixes swing path. Visual confirmation that bat travels on a level plane through the zone.",
    equipment: ["Two tees", "Two balls"],
    steps: [
      "Set primary tee at contact point with ball",
      "Set second tee 12 inches in front of primary, slightly higher, with ball",
      "Goal: hit primary ball, follow-through should clear front ball (knock it off too is okay)",
      "If bat goes UNDER front ball, swing was loopy (uppercut)",
      "If bat goes WAY OVER front ball, swing was chopping down",
      "Goal: 10–15 reps with clean path"
    ],
    feel: "Bat traveling through the hitting zone, not around it",
    commonMistake: "Trying to hit both balls instead of focusing on path",
    proTip: "Adjust front tee height to challenge swing plane",
    suggestedReps: "10-15 reps",
    durationMin: 12
  },
  // PITCHING
  {
    id: "target-practice",
    name: "Target Practice",
    emoji: "🎯",
    category: "pitching",
    difficulty: 1,
    purpose: "Basic command. Hitting one specific spot repeatedly.",
    equipment: ["Net or backstop", "Ball bucket", "Optional small target"],
    steps: [
      "Pick one zone (start with middle-low)",
      "Throw 10 pitches at exactly that spot",
      "Track how many actually hit the spot",
      "Goal: 7+ out of 10"
    ],
    feel: "Consistent release point, eyes locked on target through release",
    commonMistake: "Aiming generally vs. focusing on a single point",
    proTip: "Smaller target = more focus",
    suggestedReps: "10 pitches",
    durationMin: 10
  },
  {
    id: "inside-outside",
    name: "Inside/Outside Switch",
    emoji: "↔️",
    category: "pitching",
    difficulty: 2,
    purpose: "Develops command on both sides of the plate.",
    equipment: ["Net", "Ball bucket"],
    steps: [
      "Throw one pitch to inside corner",
      "Next pitch to outside corner",
      "Alternate 10 total pitches",
      "Goal: 8+ corners hit"
    ],
    feel: "Subtle release point change for each side",
    commonMistake: "All pitches drifting middle",
    proTip: "Pause between pitches to reset",
    suggestedReps: "10 pitches",
    durationMin: 10
  },
  {
    id: "high-low",
    name: "High/Low Switch",
    emoji: "↕️",
    category: "pitching",
    difficulty: 2,
    purpose: "Develops vertical command.",
    equipment: ["Net", "Ball bucket"],
    steps: [
      "Throw one pitch high in zone",
      "Next pitch low in zone",
      "Alternate 10 total",
      "Goal: 8+ targeted zones hit"
    ],
    feel: "Arm angle adjustment for high (slightly over the top) vs low (slightly more downward release)",
    commonMistake: "Aiming the same height every pitch",
    proTip: "Practice with a real strike zone visual",
    suggestedReps: "10 pitches",
    durationMin: 10
  },
  {
    id: "strike-ball-strike",
    name: "Strike-Ball-Strike",
    emoji: "🔁",
    category: "pitching",
    difficulty: 3,
    purpose: "Mix pitches without losing control. Simulates game pitching sequences.",
    equipment: ["Net", "Ball bucket"],
    steps: [
      "Throw a strike (anywhere in zone)",
      "Throw a ball intentionally (off the corner)",
      "Throw another strike",
      "Repeat sequence 5 times = 15 pitches",
      "Goal: 100% executed pattern"
    ],
    feel: "Deliberate command of both strike and ball",
    commonMistake: "All strikes (good) or all balls (bad) — must execute the pattern",
    proTip: "Trains pitch-to-pitch focus",
    suggestedReps: "15 pitches",
    durationMin: 12
  },
  {
    id: "towel-drill",
    name: "Towel Drill",
    emoji: "🏳️",
    category: "pitching",
    difficulty: 1,
    purpose: "Builds full follow-through and proper finish position.",
    equipment: ["Hand towel"],
    steps: [
      "Hold a hand towel in pitching hand like a ball",
      "Go through full pitching motion",
      "Goal is to 'snap' the towel at release point",
      "Follow through must be complete — back leg should kick up, towel should brush front leg",
      "Goal: 15 reps"
    ],
    feel: "Full extension, complete follow-through, balance at finish",
    commonMistake: "Short-arming or stopping early",
    proTip: "Listen for the towel snap — confirms speed and extension",
    suggestedReps: "15 reps",
    durationMin: 8
  },
  {
    id: "balance",
    name: "Balance Drill",
    emoji: "⚖️",
    category: "pitching",
    difficulty: 2,
    purpose: "Eliminates falling-off-mound mechanics. Trains balance at every phase.",
    equipment: ["Ball", "Net"],
    steps: [
      "Start pitching motion normally",
      "At leg lift apex, PAUSE for 2 full seconds",
      "Then continue delivery",
      "After pitch, hold finish position for 2 seconds",
      "If you fall off line or lose balance, restart",
      "Goal: 10 balanced pitches"
    ],
    feel: "Stable leg lift, controlled tempo, finish on balance",
    commonMistake: "Rushing through the pause",
    proTip: "Slow tempo first, build speed gradually",
    suggestedReps: "10 pitches",
    durationMin: 12
  },
  {
    id: "knee-throws",
    name: "Knee Throws",
    emoji: "⚾",
    category: "pitching",
    difficulty: 2,
    purpose: "Isolates arm slot and upper-body mechanics.",
    equipment: ["Ball", "Partner or net", "Knee pad optional"],
    steps: [
      "Kneel on back leg (right knee for righties)",
      "Front leg pointing toward target",
      "Throw using only upper body",
      "Focus on arm slot consistency and follow-through",
      "Goal: 10–15 reps"
    ],
    feel: "Pure arm mechanics, clean release",
    commonMistake: "Pushing the ball instead of throwing",
    proTip: "Great for warmup and arm care",
    suggestedReps: "10-15 reps",
    durationMin: 10
  },
  {
    id: "long-toss",
    name: "Long Toss",
    emoji: "🚀",
    category: "pitching",
    difficulty: 2,
    purpose: "Builds arm strength and durability over time.",
    equipment: ["Ball", "Partner", "Open space (40–80 feet)"],
    steps: [
      "Start at 30 feet, easy throws",
      "Each round, back up 10 feet",
      "Throw 5 at each distance",
      "Reach a max comfortable distance — don't strain",
      "Work back down to 30 feet",
      "Goal: 25 throws total, no pain"
    ],
    feel: "Full extension, smooth release, no arm strain",
    commonMistake: "Throwing too hard early, hurting arm",
    proTip: "This is once a week max — heavy on the arm",
    suggestedReps: "25 throws",
    durationMin: 20
  },
  {
    id: "pickoff",
    name: "Pickoff Practice",
    emoji: "🏃‍♂️",
    category: "pitching",
    difficulty: 2,
    purpose: "Quick step-off and accurate throw to base. Game-realistic skill.",
    equipment: ["Ball", "Target representing first base (towel, cone)"],
    steps: [
      "Stand on imaginary mound, glove side facing first base",
      "Quick step off rubber with back foot",
      "Pivot and throw to first base target",
      "Throw should be chest-high, on-target",
      "Goal: 10 reps, 8+ accurate"
    ],
    feel: "Quick feet, smooth pivot, accurate throw",
    commonMistake: "Slow feet or off-target throws",
    proTip: "Practice both right and left pickoffs",
    suggestedReps: "10 reps",
    durationMin: 8
  },
  {
    id: "bullpen-sequence",
    name: "Bullpen Sequence",
    emoji: "🥎",
    category: "pitching",
    difficulty: 3,
    purpose: "Simulates real game pitching. Mix pitches and locations.",
    equipment: ["Net", "Ball bucket"],
    steps: [
      "Pretend you're pitching to a hitter",
      "Throw 5 pitches per 'at-bat' — mix pitch types and locations",
      "Sequence example: FB inside, FB outside, change low, curve, FB strike",
      "Do 3 simulated at-bats (15 pitches total)",
      "Goal: command in all four quadrants"
    ],
    feel: "Game-pace concentration, pitch-to-pitch focus",
    commonMistake: "Throwing same pitch repeatedly (not game-realistic)",
    proTip: "Write down the sequence before throwing",
    suggestedReps: "15 pitches",
    durationMin: 15
  },
  // CONDITIONING
  { id: "sprints", name: "Speed Sprints", emoji: "💨", category: "conditioning", difficulty: 2,
    purpose: "Builds explosive baseball speed (home to first, base stealing).",
    equipment: ["Open space ~20 yards"],
    steps: ["10 short 20-yard sprints at full speed, 60 seconds rest between"],
    feel: "Drive arms hard, lean slightly forward, accelerate through the line",
    commonMistake: "Slowing before the line", proTip: "Form first — drive arms hard, lean slightly forward",
    suggestedReps: "10 sprints", durationMin: 15 },
  { id: "pushups", name: "Pushups", emoji: "💪", category: "conditioning", difficulty: 1,
    purpose: "Upper body strength for throwing and swinging.",
    equipment: ["None"], steps: ["3 sets of as many as possible, 60 seconds rest. Modify on knees if needed."],
    feel: "Chest engaged, core tight", commonMistake: "Sagging hips or partial range", proTip: "Keep body in straight line, full range of motion",
    suggestedReps: "3 sets to fatigue", durationMin: 8 },
  { id: "squats", name: "Squats", emoji: "🦵", category: "conditioning", difficulty: 2,
    purpose: "Leg drive for hitting and pitching power.",
    equipment: ["None"], steps: ["3 sets of 15, feet shoulder-width, knees track over toes"],
    feel: "Sit back into hips, push through heels", commonMistake: "Knees caving in or coming off heels", proTip: "Sit back like into a chair, chest up",
    suggestedReps: "3 × 15", durationMin: 8 },
  { id: "plank", name: "Plank", emoji: "🪵", category: "conditioning", difficulty: 2,
    purpose: "Core strength for rotation in batting and pitching.",
    equipment: ["None"], steps: ["Hold 30–60 seconds, body straight from head to heels, no sagging"],
    feel: "Core engaged head to toe, no sag at hips", commonMistake: "Hips drifting up or down", proTip: "Squeeze glutes and core the whole time",
    suggestedReps: "30-60s × 3", durationMin: 6 },
  { id: "lateral-shuffles", name: "Lateral Shuffles", emoji: "↔️", category: "conditioning", difficulty: 1,
    purpose: "Fielding agility — moving side to side quickly.",
    equipment: ["Open space ~10 ft"], steps: ["30 seconds each direction, stay low, quick feet"],
    feel: "Low athletic stance, fast feet", commonMistake: "Crossing feet", proTip: "Don't cross feet — quick shuffles",
    suggestedReps: "30s × each direction × 3", durationMin: 5 },
  { id: "jump-rope", name: "Jump Rope", emoji: "🪢", category: "conditioning", difficulty: 2,
    purpose: "Footwork, coordination, conditioning.",
    equipment: ["Jump rope"], steps: ["2 minutes continuous, basic two-foot jumps"],
    feel: "Light on feet, rhythmic", commonMistake: "Big bouncy jumps", proTip: "Stay on balls of feet, small hops",
    suggestedReps: "2 min × 3 rounds", durationMin: 10 },
  { id: "bear-crawls", name: "Bear Crawls", emoji: "🐻", category: "conditioning", difficulty: 2,
    purpose: "Full-body coordination and core.",
    equipment: ["~20 yards space"], steps: ["Crawl forward 20 yards on hands and feet (not knees), back straight"],
    feel: "Whole body working, core stable", commonMistake: "Knees touching ground", proTip: "Move opposite arm and leg together",
    suggestedReps: "20 yds × 4", durationMin: 6 },
  { id: "arm-circles", name: "Arm Circles", emoji: "🌀", category: "conditioning", difficulty: 1,
    purpose: "Shoulder warmup and rotator cuff strength.",
    equipment: ["None"], steps: ["20 small circles forward, 20 backward, then 20 large each direction"],
    feel: "Loose shoulders warming up", commonMistake: "Skipping it before throwing", proTip: "Critical before any throwing session",
    suggestedReps: "80 total reps", durationMin: 4 },
  { id: "mountain-climbers", name: "Mountain Climbers", emoji: "⛰️", category: "conditioning", difficulty: 2,
    purpose: "Core strength and cardio.",
    equipment: ["None"], steps: ["30 seconds, plank position, alternate driving knees to chest fast"],
    feel: "Core tight, hips stable", commonMistake: "Bouncing hips up", proTip: "Keep hips low, don't bounce them up",
    suggestedReps: "30s × 4", durationMin: 6 },
  { id: "toe-touches", name: "Toe Touches", emoji: "🦶", category: "conditioning", difficulty: 1,
    purpose: "Flexibility for full swing range of motion.",
    equipment: ["None"], steps: ["15 slow reps, reach for toes without bouncing, hold each rep 2 seconds"],
    feel: "Gentle stretch in hamstrings and lower back", commonMistake: "Bouncing", proTip: "Don't force it — gradual improvement",
    suggestedReps: "15 reps", durationMin: 5 }
];

export function drillsByCategory(cat: DrillCategory): Drill[] {
  return DRILLS.filter(d => d.category === cat);
}
export function drillById(id: string): Drill | undefined {
  return DRILLS.find(d => d.id === id);
}
