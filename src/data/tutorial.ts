// Tutorial chapter content for Coach's Corner.
// Each chapter has plain-language explanations written at a ~10-year-old reading level.

export interface TutorialChapter {
  id: string;
  title: string;
  emoji: string;
  category: "Basics" | "Roster" | "Stats" | "Games" | "Off-Field" | "Long-Term";
  summary: string;
  body: TutorialSection[];
  tryItRoute?: string;
  tryItLabel?: string;
}

export interface TutorialSection {
  heading?: string;
  text?: string;
  tip?: string;
}

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: "what-is-gm",
    title: "What is a GM?",
    emoji: "🎩",
    category: "Basics",
    summary: "Learn what a General Manager does and why you're in charge.",
    body: [
      { text: "Welcome, GM! In real baseball, the General Manager (GM) is the person who runs a team off the field. The players play. The manager picks the lineup. But the GM picks the players in the first place." },
      { heading: "What you control", text: "You decide who plays for your team. You sign free agents, draft new players, and watch your team grow over the seasons. You don't pitch or hit — you make smart moves so your team wins." },
      { tip: "Tip: there's no wrong way to play. Try things, see what happens, and you'll get better every season." }
    ],
    tryItRoute: "/teams",
    tryItLabel: "Open the Teams page"
  },
  {
    id: "reading-roster",
    title: "Reading a Roster",
    emoji: "📋",
    category: "Roster",
    summary: "Every team has 45 players. Here's how they're grouped.",
    body: [
      { heading: "Starters", text: "These are your everyday players. Eight hitters (one per position) + a Designated Hitter (DH) + a Starting Pitcher (SP). The SP changes every game." },
      { heading: "Bench", text: "Backup hitters. They come in to pinch-hit, give starters a day off, or sub in for an injury." },
      { heading: "Bullpen", text: "Relief pitchers (RP) and a Closer (CL). They come into games after the starting pitcher gets tired or in tight late-game spots." },
      { heading: "Reserves", text: "Depth players who fill out the 45-man roster. They're available if injuries hit." }
    ],
    tryItRoute: "/teams"
  },
  {
    id: "reading-player-cards",
    title: "Reading Player Cards",
    emoji: "🎴",
    category: "Roster",
    summary: "Player cards show everything about a player at a glance.",
    body: [
      { heading: "The Front", text: "Portrait, name, team, jersey number, position, age, and Overall rating (OVR). OVR is a single number from 1-99 that summarizes how good a player is overall. 90+ is a superstar, 80+ is great, 70+ is solid." },
      { heading: "The Back", text: "Detailed ratings, stats from this season and past seasons, awards, and contract info." },
      { tip: "Tap any player card anywhere in the app to open their full profile." }
    ]
  },
  {
    id: "stats-explained",
    title: "Understanding Stats",
    emoji: "📊",
    category: "Stats",
    summary: "What do AVG, HR, OPS, ERA, WHIP mean? Plain English here.",
    body: [
      { heading: "Hitting stats", text: "AVG (batting average): hits divided by at-bats. A .300 hitter gets a hit 3 out of every 10 times. HR (home runs): biggest hits — over the fence. RBI (runs batted in): runners who scored thanks to your hit. OPS (on-base + slugging): an overall hitting score. .800+ is great, .900+ is elite." },
      { heading: "Pitching stats", text: "ERA (earned run average): how many runs a pitcher gives up per 9 innings. Lower is better — 3.00 is great, 4.00 is average. WHIP: walks + hits per inning. Under 1.20 is good. K: strikeouts. W/L: wins and losses. SV: saves (for closers)." },
      { tip: "Long-press any stat name in a table to see its definition." }
    ],
    tryItRoute: "/stats"
  },
  {
    id: "watching-game",
    title: "Watching a Game",
    emoji: "⚾",
    category: "Games",
    summary: "Click any game to watch it pitch-by-pitch.",
    body: [
      { text: "Click any game in Schedule (or 'Today's Games' on the Dashboard) to open the live watch. You'll see the scoreboard, line score (runs by inning), and play-by-play feed." },
      { heading: "Controls", text: "Pause: stop the action. Play: continue at normal speed. Fast Forward: zoom through pitches. Finish Game: skip to the end and just see the result." },
      { tip: "Better teams usually win, but upsets happen — that's baseball." }
    ],
    tryItRoute: "/schedule"
  },
  {
    id: "standings",
    title: "Reading the Standings",
    emoji: "🏆",
    category: "Games",
    summary: "Who's winning, who's losing, who makes the playoffs.",
    body: [
      { heading: "Division leaders", text: "The team in first place in each division automatically gets a playoff spot." },
      { heading: "Wild Cards", text: "After divisions, the next best teams (regardless of division) get wild card spots. The exact number depends on your settings." },
      { heading: "GB (Games Back)", text: "How many games behind the division leader. '-' means you ARE the leader. '5.5' means you're 5.5 games behind." },
      { tip: "Watch the 'last 10' column to see who's hot and who's cold lately." }
    ],
    tryItRoute: "/standings"
  },
  {
    id: "free-agency",
    title: "Free Agency",
    emoji: "💰",
    category: "Off-Field",
    summary: "Sign players who aren't on a team. Mind the salary cap!",
    body: [
      { text: "Free Agency is where you sign players who aren't currently on any team. You see a big list, pick one, choose contract length, and click Sign." },
      { heading: "Salary Cap", text: "Each team has a budget. Total salaries can't go over the cap. Watch your payroll!" },
      { tip: "Don't blow your whole budget on one star — depth matters." }
    ],
    tryItRoute: "/freeagency"
  },
  {
    id: "draft",
    title: "The Draft",
    emoji: "🎯",
    category: "Off-Field",
    summary: "Pick new young players each offseason. The worst team picks first.",
    body: [
      { text: "Every year, brand-new prospects enter the league through the draft. Reverse order — the worst team picks first, the World Series winner picks last." },
      { heading: "Scout grades", text: "Each prospect has a grade: Elite, Top-100, Strong, Solid, or Project. Higher grades = higher potential, but also pickier." },
      { tip: "Drafting well builds your dynasty. Don't ignore the draft just because today's roster looks good." }
    ],
    tryItRoute: "/draft"
  },
  {
    id: "injuries",
    title: "Injuries & the IL",
    emoji: "🩹",
    category: "Off-Field",
    summary: "Players get hurt. Here's what to do.",
    body: [
      { text: "When a player gets injured, they go on the Injured List (IL). DTD = day-to-day (back soon). 10-day, 15-day, 60-day, or Season-Ending depending on how bad." },
      { heading: "Replacements", text: "Reserve players are promoted automatically to fill spots. If you don't have depth, sign a free agent or wait it out." }
    ]
  },
  {
    id: "all-star",
    title: "The All-Star Game",
    emoji: "⭐",
    category: "Games",
    summary: "Mid-season break with a Home Run Derby and All-Star Game.",
    body: [
      { text: "Halfway through the season, the All-Star Break happens. The best players from each league are picked." },
      { heading: "Your job", text: "Nominate one of YOUR team's players for the All-Star roster. The league picks the rest." },
      { heading: "Home Run Derby", text: "8 players, single elimination. Most homers wins!" }
    ]
  },
  {
    id: "playoffs",
    title: "Playoffs Explained",
    emoji: "🏟️",
    category: "Games",
    summary: "October baseball. Win 11 games, win the World Series.",
    body: [
      { heading: "Rounds", text: "Wild Card → Division Series → Championship Series → World Series. Each round is a best-of series (e.g., best-of-5 or best-of-7)." },
      { heading: "Best-of-5", text: "First team to win 3 games wins the series." },
      { heading: "Best-of-7", text: "First team to win 4 games wins. The World Series is best-of-7." },
      { tip: "Higher seeds (better regular-season records) play lower seeds. So winning the division matters!" }
    ],
    tryItRoute: "/playoffs"
  },
  {
    id: "awards",
    title: "Awards Night",
    emoji: "🏅",
    category: "Off-Field",
    summary: "After the season, the league hands out trophies.",
    body: [
      { heading: "MVP", text: "Most Valuable Player — the best hitter all-around." },
      { heading: "Cy Young", text: "Best pitcher." },
      { heading: "Rookie of the Year", text: "Best first-year player." },
      { heading: "Gold Glove / Silver Slugger", text: "Best fielder / best hitter at each position." },
      { tip: "Awards earn players a spot in the Hall of Fame later — collect as many as you can!" }
    ]
  },
  {
    id: "settings",
    title: "Settings 101",
    emoji: "⚙️",
    category: "Basics",
    summary: "Turn things on or off to make the game feel just right.",
    body: [
      { text: "The Settings page has tabs: Gameplay, Features, Audio, Visuals, Data, About." },
      { heading: "Features tab", text: "40+ on/off switches for things like Hot Streaks, Trade Rumors, Achievements, etc. Try turning some off if it feels like too much, or turn it all on for the full experience." },
      { tip: "Visit Settings → Data → Export League to save a backup of your league." }
    ],
    tryItRoute: "/settings"
  },
  {
    id: "dynasty",
    title: "Building a Dynasty",
    emoji: "👑",
    category: "Long-Term",
    summary: "Win, then win again. And again. That's a dynasty.",
    body: [
      { text: "A dynasty is when a team is great for many years in a row. To build one:" },
      { heading: "Draft well", text: "Young players are cheap. Develop them and they become your core." },
      { heading: "Sign smart", text: "Don't overpay aging stars. Find bargains and platoon pieces." },
      { heading: "Stay healthy", text: "Roster depth means injuries hurt less." },
      { heading: "Have fun", text: "Try different team-building styles. Power lineup vs. pitching staff. Speedy vs. patient." }
    ]
  },
  {
    id: "save-slots",
    title: "Save Slots & Undo",
    emoji: "💾",
    category: "Basics",
    summary: "Multiple saves, automatic saving, and an undo button for safety.",
    body: [
      { text: "The game saves automatically every couple of seconds. You won't lose anything by closing the tab." },
      { heading: "Multiple Leagues", text: "Settings → Data → Save Slots. You can run several dynasties at once. Tap 'Snapshot Now' to freeze a copy in time before trying something risky." },
      { heading: "Undo", text: "When you sign a free agent or sim a day, an Undo button appears at the top of those pages. The last 5 big actions can be undone. Mis-tap protection!" },
      { tip: "Tip: snapshot before the trade deadline so you can rewind if a move blows up." }
    ],
    tryItRoute: "/settings"
  },
  {
    id: "easter-eggs",
    title: "Secrets & Easter Eggs",
    emoji: "🥚",
    category: "Long-Term",
    summary: "There are 46 hidden bits of magic in the game.",
    body: [
      { text: "We hid 46 fun surprises in the game. Some you'll discover by accident. Some take seasons to find. A few are just for you." },
      { heading: "A few hints", text: "Name a player \"Henry\" and see what happens. Tap a team logo a lot. Tap a player portrait a lot. Try the Konami code on the title screen. Set your birthday in the welcome wizard." },
      { heading: "Want to peek?", text: "Settings → Secrets has the full list (with a 'Show Spoilers' toggle if you want to know everything)." },
      { tip: "Discovery > documentation. Try tapping things." }
    ],
    tryItRoute: "/settings"
  },
  {
    id: "development",
    title: "Player Development & Aging",
    emoji: "📈",
    category: "Long-Term",
    summary: "Players grow, peak, decline. That's the heart of a dynasty.",
    body: [
      { heading: "The arc", text: "Most players develop into their mid-20s, peak in their late-20s, then decline. Some peak early. Some are late bloomers. Speed and defense fade first; control and discipline can even improve with age." },
      { heading: "Potential", text: "Each player has a hidden potential rating. Scouts gradually reveal it for prospects. Young + high potential = future star." },
      { heading: "Breakouts and busts", text: "Each offseason a few players will randomly break out (+5 to +15 overall) or bust (-5 to -10). The news feed tells you who." },
      { heading: "Retirement", text: "Past age 33 players start retiring. Past 40 it gets steep. Hall of Famers might retire on top — their last AB has a 30% chance of being a HR." },
      { tip: "Draft well. Develop your young players. That's how dynasties are built." }
    ]
  },
  {
    id: "all-star-deep",
    title: "All-Star Break in Depth",
    emoji: "⭐",
    category: "Games",
    summary: "Mid-season pause with selection, Home Run Derby, and the game itself.",
    body: [
      { text: "Halfway through the schedule, the regular season pauses for the All-Star Break." },
      { heading: "Nominate", text: "Pick one of YOUR players for the All-Star roster. The league fills the rest based on first-half stats." },
      { heading: "Home Run Derby", text: "8 power hitters, 3 rounds, single elimination. Tap 'Start Round' to advance." },
      { heading: "All-Star Game", text: "AL vs NL. The winning league gets a MVP. Then resume the season." }
    ],
    tryItRoute: "/allstar"
  },
  {
    id: "phases",
    title: "Season Phases",
    emoji: "📅",
    category: "Games",
    summary: "The season flows through named phases — each has a transition screen.",
    body: [
      { text: "A full season cycle: Opening Day → Regular Season → All-Star Break → Trade Deadline → Playoff Race → Playoffs → World Series → Awards → HoF Voting → Offseason → New Season." },
      { heading: "Transitions", text: "Each big phase change shows a cinematic transition screen. Tap to continue." },
      { tip: "If a transition is blocking your sim, just tap it to acknowledge." }
    ]
  },
  {
    id: "score-keeper-real",
    title: "How to Score a Baseball Game",
    emoji: "📝",
    category: "Off-Field",
    summary: "Be the official scorekeeper. Real games — Little League, MLB, anything.",
    body: [
      { text: "Score Keeper (in the side menu) lets you track games happening in the real world — not just simulations. Open it, tap REAL GAME MODE, fill in team names, hit Start." },
      { heading: "Pitch by pitch", text: "Five buttons: BALL, FOUL, FOUL TIP, STRIKE Swinging, STRIKE Looking. Tap whichever happened. The count tracks automatically — 4 balls = walk, 3 strikes = K." },
      { heading: "When the ball is hit", text: "Tap the big blue IN PLAY button. A menu pops up with every possible outcome — single, double, triple, HR, ground out, fly out, error, sac fly, etc. Pick what happened and runners auto-advance." },
      { heading: "Undo!", text: "There's an Undo button right there if you fat-finger something. No stress." },
      { tip: "Your scorecard auto-saves after every tap. You can leave and come back any time." }
    ],
    tryItRoute: "/score",
    tryItLabel: "Open Score Keeper"
  },
  {
    id: "score-keeper-backyard",
    title: "Backyard Baseball",
    emoji: "🥎",
    category: "Off-Field",
    summary: "Playing pretend in the yard? Score that too.",
    body: [
      { text: "Backyard Mode is way simpler than Real Game Mode. Two giant buttons: +1 RUN for each team. No baseball rules required." },
      { heading: "Fun buttons", text: "HOME RUN sets off confetti. AMAZING CATCH and STRIKEOUT log fun events. FUNNY MOMENT lets you type what just happened (\"dog stole the ball\")." },
      { heading: "Ghost-runner rules", text: "Backyard rules are flexible. Got an invisible man on second? That's fine. The scoreboard just tracks the runs." },
      { tip: "All your backyard games are saved in My Scorecards. Track wins/losses against your friends over time." }
    ],
    tryItRoute: "/score"
  },
  {
    id: "training-welcome",
    title: "Welcome to Training Camp",
    emoji: "💪",
    category: "Long-Term",
    summary: "Real practice. Real progress. This is where you actually get better.",
    body: [
      { text: "Training Camp is where the sim meets real life. You practice in your backyard or on a field, log your reps in the app, and your player in the league actually gets better." },
      { heading: "How it works", text: "Tap zones tell the app what happened. The app tracks your reps, gives you Coach Billy feedback, and bumps your in-game ratings." },
      { heading: "Daily flow", text: "Open the Today plan. Pick a drill. Hit your goal reps. Mark it done. Streaks grow. Henry the player grows." }
    ],
    tryItRoute: "/training",
    tryItLabel: "Open Training Camp"
  },
  {
    id: "training-log-swing",
    title: "How to Log a Swing",
    emoji: "🏏",
    category: "Long-Term",
    summary: "Two taps to log every swing. Five seconds total.",
    body: [
      { text: "Swing in real life. Now: open the Hitting screen. Tap the net where the ball went. Then tap a quality button: CRUSHED / OKAY / WEAK / WHIFF." },
      { heading: "Why net taps?", text: "Where the ball ends up tells us a lot. Up the middle, pulled, opposite-field, ground ball, line drive, fly ball — the app figures it out from the tap." },
      { tip: "Mis-tapped? Hit Undo. No penalty." }
    ],
    tryItRoute: "/training/hit"
  },
  {
    id: "training-log-pitch",
    title: "How to Log a Pitch",
    emoji: "⚾",
    category: "Long-Term",
    summary: "Three taps per pitch. Track strikes, paint, and pitch types.",
    body: [
      { text: "Throw a pitch. Tap the net image where the ball hit. Confirm the strike-zone cell. Tap STRIKE / PAINTED / CLOSE / BALL. Pick a pitch type pill." },
      { heading: "Painted corners", text: "Painting = right on a corner. Filthy. The app counts painted corners separately because they're a big deal." }
    ],
    tryItRoute: "/training/pitch"
  },
  {
    id: "training-camera",
    title: "Using the Camera Coach",
    emoji: "📷",
    category: "Long-Term",
    summary: "Optional: the iPad watches your form and gives a Form Score.",
    body: [
      { text: "Prop the iPad on a stand 6–10 feet away (back camera) or set it up to selfie-watch (front camera). The app watches your swing or pitching form using on-device AI." },
      { heading: "What it sees", text: "Body landmarks — elbow up, knee bend, hip rotation, follow-through. It can't measure pitch velocity but it can catch form issues." },
      { heading: "Privacy", text: "Video never leaves your device. Everything is on the iPad itself. There's a 'turn off camera' switch in Settings any time." },
      { tip: "First time? Allow camera access in Safari when it asks. If you say no by mistake, fix it in iPad Settings → Safari → Camera." }
    ],
    tryItRoute: "/training/hit"
  },
  {
    id: "training-live-game",
    title: "Playing a Live Game",
    emoji: "🎬",
    category: "Long-Term",
    summary: "You pitch AND bat as every player on both teams. Your real reps drive the game.",
    body: [
      { text: "Open Live Game from Training Camp (or the Play button on any scheduled game). Pick teams, length, difficulty." },
      { heading: "Pitching", text: "When your team pitches, the app shows the opposing batter. You actually pitch in real life, then tap where it hit + result." },
      { heading: "Batting", text: "When your team bats, you swing for every batter. The fictional batter's ratings affect the outcome — a stronger batter can turn a hard-hit into a HR." },
      { heading: "Your stat line", text: "The app tracks YOUR pitches and swings separately from the game box score. Open the 'Henry's Stats' panel to see how you did personally." }
    ],
    tryItRoute: "/training/live"
  },
  {
    id: "training-schedule",
    title: "Your Weekly Schedule",
    emoji: "📅",
    category: "Long-Term",
    summary: "A week of focused practice plans, edit anytime.",
    body: [
      { heading: "Default plan", text: "Mon — Hitting + Hip Drill. Tue — Pitching + Long Toss. Wed — Rest (light conditioning). Thu — Hitting + Fence Drill. Fri — Pitching + Towel Drill. Sat — Live Game. Sun — Coach's Choice." },
      { heading: "Mark drills done", text: "Tap a drill on today's plan. Mark it done. The streak builds. Your player gets XP." },
      { tip: "Missing a day is fine. Streaks have a 1-day grace period." }
    ],
    tryItRoute: "/training/schedule"
  },
  {
    id: "training-stats",
    title: "Understanding Your Stats",
    emoji: "📊",
    category: "Long-Term",
    summary: "Every number, plain English.",
    body: [
      { heading: "Form Score", text: "0–100 rating of your swing/pitching form. Camera-powered. 80+ is great, 90+ is filthy." },
      { heading: "Strike %", text: "Of your pitches, how many were strikes or painted corners. 65%+ is a big-league rate." },
      { heading: "Contact %", text: "Of your swings, how many made contact (not whiffs). The higher the better." },
      { heading: "Overall rating", text: "Henry's player rating, 1–99. Grows with practice. Hit 70+ to make a real roster." }
    ]
  },
  {
    id: "training-achievements",
    title: "Earning Achievements",
    emoji: "🏅",
    category: "Long-Term",
    summary: "55 medals to collect. Each is a real milestone.",
    body: [
      { text: "Achievements unlock as you practice. First swing logged → Achievement. 100 crushed hits → Achievement. 30-day streak → Achievement." },
      { heading: "Where to see them", text: "Training Camp → Achievements. Locked ones show silhouettes with hints." },
      { tip: "Some are sneaky — practice before 9am five times for Early Bird. After 6pm for Night Owl." }
    ],
    tryItRoute: "/training/achievements"
  },
  {
    id: "glossary",
    title: "Baseball Glossary",
    emoji: "📖",
    category: "Stats",
    summary: "Every baseball term, defined simply.",
    body: [
      { text: "AB (At Bat): a turn at the plate where you tried to get a hit (walks don't count)." },
      { text: "BB (Walk): pitcher threw 4 balls, you go to first base." },
      { text: "K (Strikeout): you struck out — three strikes." },
      { text: "PA (Plate Appearance): any trip to the plate, including walks." },
      { text: "R (Run): scored when a player crosses home plate." },
      { text: "RBI (Run Batted In): a runner scored thanks to your hit." },
      { text: "HR (Home Run): hit ball over the fence — one or more runs." },
      { text: "2B / 3B: double / triple — hit and ended up at 2nd or 3rd base." },
      { text: "SB (Stolen Base): runner sprinted to the next base without a hit." },
      { text: "ERA: how many runs a pitcher allows per 9 innings." },
      { text: "WHIP: walks + hits per inning. Lower = better." },
      { text: "IP (Innings Pitched): total outs ÷ 3." }
    ]
  }
];

export const ACHIEVEMENT_DEFS = [
  { id: "first-league", name: "Welcome, GM", desc: "Create your first league.", icon: "🎩" },
  { id: "first-game-watched", name: "First Pitch", desc: "Watch a full game live.", icon: "⚾" },
  { id: "first-trade", name: "Wheelin' & Dealin'", desc: "Sign a free agent.", icon: "📝" },
  { id: "first-draft", name: "Future is Bright", desc: "Make your first draft pick.", icon: "🎯" },
  { id: "first-playoff", name: "October Baseball", desc: "Reach the playoffs.", icon: "🏟️" },
  { id: "first-championship", name: "Champions", desc: "Win the World Series.", icon: "🏆" },
  { id: "back-to-back", name: "Back-to-Back", desc: "Win the World Series two years in a row.", icon: "👑" },
  { id: "dynasty", name: "Dynasty", desc: "Win 3 World Series titles.", icon: "💎" },
  { id: "no-hitter", name: "No-No", desc: "A pitcher on your team throws a no-hitter.", icon: "🚫" },
  { id: "40-40", name: "40/40 Club", desc: "A player hits 40 HR and steals 40 bases.", icon: "💨" },
  { id: "perfect-month", name: "Perfect Month", desc: "Win every game in a 30-day stretch.", icon: "🔥" },
  { id: "comeback-king", name: "Comeback Kid", desc: "Win a playoff series after being down 0-2.", icon: "🔁" },
  { id: "first-tutorial", name: "Coach's Corner", desc: "Complete your first tutorial chapter.", icon: "📚" },
  { id: "all-tutorials", name: "Honor Student", desc: "Read every tutorial chapter.", icon: "🎓" },
  { id: "all-star-pick", name: "All-Star Selector", desc: "Pick one of your players for the All-Star Game.", icon: "⭐" },
  { id: "derby-champ", name: "Derby Champion", desc: "One of your players wins the Home Run Derby.", icon: "💥" }
];
