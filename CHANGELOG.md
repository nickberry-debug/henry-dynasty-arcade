# Changelog

## v1.4 — Training Camp V2 + Pitch Arsenal

**New top-level tab `/training`** with sub-pages: hitting practice, pitching practice, drill library, pitch arsenal, weekly schedule, achievements, create Henry, Live Game.

### Tap-Zone Practice Logging
- `/training/hit` — Net tap to mark where the ball went + quality button (Crushed / Okay / Weak / Whiff). Real-time coaching line per swing. Recent swings show as fading dots on the net for pattern recognition.
- `/training/pitch` — Net tap + auto-mirrored strike-zone (4×4 = 13-zone) confirmation + result (Strike / Painted / Close / Ball) + pitch-type pill. Strike streak detection.
- One-tap **Undo** on both screens.
- Auto-session grouping: actions within 30 minutes roll into the same session for in-session stats.

### Animated Drill Library (30 drills)
- **10 hitting:** Fence, Top Hand, No-Hands Hip, Towel Under Heel, Colored Ball Toss, Sharpie Line, One-Knee, Walk-Through, Slow-Motion, Two-Tee
- **10 pitching:** Target Practice, Inside/Outside Switch, High/Low Switch, Strike-Ball-Strike, Towel, Balance, Knee Throws, Long Toss, Pickoff, Bullpen Sequence
- **10 conditioning:** Sprints, Pushups, Squats, Plank, Lateral Shuffles, Jump Rope, Bear Crawls, Arm Circles, Mountain Climbers, Toe Touches
- Each card: purpose, equipment, numbered steps, "what to feel," common mistake, pro tip, difficulty stars, suggested reps + duration
- SVG-animated stick-figure demonstrations per category (CSS keyframes — swing motion, pitch motion, conditioning bob)
- "Mark Done" button feeds the weekly streak + bumps Henry's player ratings; hitting/pitching drills link straight to the practice screen

### Pitching Arsenal (8 pitches with age-appropriate safety)
- Four-seam, Two-seam, Changeup, Knuckleball — **safe at all ages**
- Curveball, Cutter — **wait until 14+** with pediatric medicine warnings
- Slider, Splitter — **wait until 16+**
- Each pitch: SVG grip diagram (finger placement on ball with seams), what it does, when to throw, grip steps, throw steps, feel, mistakes, pro tip, safety note
- **"Your Pitching Path"** card explaining the right pitches by age band
- **"Why Wait?"** card explaining growth-plate science in kid-language
- 5 new pitch-related achievements (#51-55): Fastball Master, The Sinker, Slow It Down, Two-Pitch Wonder, The Veteran

### Henry the Player
- `/training/create-henry` wizard creates Henry as a real player in the league. Starts low (~OVR 36) with realistic kid-age ratings.
- Practice taps → rating bumps. Crushed swings move contact/power. Painted corners move pitch control. Conditioning drills bump position-relevant ratings (sprints → speed, pushups → arm, squats → power, plank → durability, lateral shuffles → fielding+reaction).
- Diminishing returns so growth feels real. Path: ~OVR 60 after 3 months consistent practice, 70+ in 6.

### Live Game Mode
- `/training/live` — or click the green **Play** button on any scheduled game in `/schedule` to launch with that matchup.
- Setup: choose home + away teams, innings (3/6/9), difficulty (Rookie / Pro / All-Star).
- **Henry is every pitcher and every batter on both teams.** His inputs drive the simulation.
- When his team pitches: strike-zone grid + pitch-type + result. Pitcher ratings filter Henry's input quality (e.g. painted corner only stays painted if fictional pitcher has elite control).
- When his team bats: net-tap + quality button. Batter contact/power and pitcher difficulty shape the outcome.
- Full game state: visual base diamond, count, outs, linescore, scoreboard, scrolling play-by-play.
- **Parallel stat tracking** — his personal pitches/strikes/painted/swings/crushed/hits live in `henryStats`, separate from the box score. Toggle "Henry's Stats" panel mid-game.
- Final screen split: game box score on left, Henry's personal performance on right.
- Auto-save every play to localStorage for crash recovery; full state in IndexedDB.

### AI Camera Coach (MediaPipe Pose, lazy-loaded from CDN)
- Front or back camera, 33-landmark on-device pose detection
- **Hitting form:** stance, elbow-up, knee bend, hands-high (4 × 25 pts = Form Score 0–100)
- **Pitching form:** arm slot consistency + leg-lift balance + follow-through
- Per-rep text feedback ("Elbow stayed up — good", "Try a Fence Drill rep")
- Stick-figure overlay on live video (toggleable)
- Optional TTS voice feedback
- All processing on-device. Video never leaves the iPad.
- Falls back gracefully if MediaPipe CDN can't load (basic-mode message)

### Weekly Schedule (`/training/schedule`)
- This week + next week calendar
- Default plan (editable per-day): Mon hitting+hip, Tue pitching+long toss, Wed rest, Thu hitting+fence, Fri pitching+towel, Sat Live Game, Sun coach's choice
- Today highlight + check-off drill completion (only today's tasks can be marked done)
- Real-life tips block (warmup, water, rest, sleep, etc.)

### 55 Training Achievements
- 10 hitting (First Swing → The Slugger)
- 10 pitching (First Pitch → Filthy)
- 10 conditioning (Speed Demon → Athlete)
- 10 form & practice (Elbow Up → Night Owl)
- 10 Live Game / sim (Rookie Card → The Big Leagues)
- 5 pitch-arsenal additions (Fastball Master → The Veteran)
- Live unlock notifications via news feed
- `/training/achievements` grid with locked silhouettes + descriptions

### Coach's Corner — 8 new chapters
"Welcome to Training Camp", "How to Log a Swing", "How to Log a Pitch", "Using the Camera Coach", "Playing a Live Game", "Your Weekly Schedule", "Understanding Your Stats", "Earning Achievements"

### iPad + iPhone responsive
- All Training Camp screens stack to single-column < 768px
- Big touch targets (60×60px+ for primary actions, 44×44 minimum everywhere)
- Net tap-zone, strike-zone grid, and quality buttons re-flow naturally between iPad-landscape and iPhone-portrait
- `inputMode="numeric"` on numeric fields
- Input fields `scrollIntoView` on focus

### Auto-decisions (deferred to follow-up — documented)
- **MediaPipe full elbow analysis:** baseline 4-criteria scorer ships; deeper joint-angle clinic-grade analysis is a v1.5 follow-up
- **Lottie animations:** CSS keyframe stick-figures used instead — same effect, zero extra runtime dependency
- **Photo capture on funny moments / drill clips:** iPad Photos Save-as-PNG planned for v1.5 (Score Keeper photo attach already deferred)
- **Sound effects:** sound files not bundled (Howler library is bundled, drop CC0 files into `public/audio/` to enable)
- **Parent Portal Send-PDF / Practice Buddies / Custom Plan editor:** UI scaffolded by data; visual editor v1.5
- **Difficulty-modifier hot/cold zone overlays on batters:** zone hot map data hook in `StrikeZoneGrid`; default per-batter heatmap generation deferred (currently all zones neutral)
- **Mid-game pitching change announcement:** server-side; the pitcher swaps each half-inning automatically — explicit "manager pulls pitcher" UI deferred
- **Achievement #5 Switch Hitter, #4 Line Drive Legend etc. detection:** counters tracked, granular per-week / line-drive detection wired via `inferContactType` for next pass
- **Wake lock during practice:** Wake Lock API supported but disabled by default to avoid keeping iPad screens on indefinitely; opt-in toggle planned

### Bundle
868 KB JS / 265 KB gzipped (+118 KB for Training Camp module). TypeScript strict clean.

## v1.3 — V3 Polish + Section J + K + L (Score Keeper)

### Studio Graphics
- Multi-layer logos: gradients, specular highlight, inner shadow, metallic accents, grain
- Multi-tone portraits: 3-tone skin shading, layered hair, multi-path features, jersey/cap depth, position+OVR chips, rookie/all-star badges, age-aware grays
- Stadium silhouette generator (day/night/dusk + weather) — wired into TeamPage hero

### Title / Welcome / Tutorial
- Title screen with Career / Quick Tournament / Sandbox / Continue
- Welcome wizard: GM profile, favorite team, **lucky number, birthday**
- Coach's Corner: 17 chapters across Basics/Roster/Stats/Games/Off-Field/Long-Term, achievements grid, **Guided Tour toggle** with contextual `GuidedTip` cards on Dashboard
- Stat tooltips (`StatTip`) + per-page `HelpButton`

### Phases / Cinematic Transitions
- LeaguePhase enum: openingDay, allStarBreak, tradeDeadline, playoffRace, awardsNight, hofVoting
- `PhaseTransition` modal with per-phase content
- Dashboard weekly hero with progress bar + All-Star + Trade Deadline markers
- `ChampionshipCelebration` overlay: confetti, trophy, banner-raise + commissioner letter on first WS title

### All-Star Event
- Nomination + Home Run Derby (3 rounds) + ASG sim + MVP

### Player Development & Aging Engine (V3 Section I)
- Hidden potential with scout reveal fog
- Three dev archetypes (fast / normal / late bloomer)
- Per-skill aging (speed declines fast, vision/control improve, velocity peaks 24-28)
- Breakout / bust / mid-career resurgence / late bloom events
- Retirement curve 33-42 with performance modifiers
- HoF voting 5 years post-retirement
- Headless QA verified: balanced age bands across 8 seasons, ~70 retirees/year, HoF growing, ~20 breakouts/season

### Save Slots & Undo (Section J.1)
- SaveSlotsManager: list / load / **rename** / **duplicate** / **snapshot** / delete
- `switchLeague` action loads a different slot mid-session
- **Undo stack** — last 5 mutating actions can be undone, surfaced in Free Agency and elsewhere
- Auto-save debounced to 250ms (was 600ms)

### Section J Polish
- J.6 — **Today in History** banner on Dashboard
- J.4 — **Weekly Newspaper** front page (Diamond Daily) rendered on day-of-week boundary
- J.7 — **ConfirmDialog** component wired into Free Agency signing
- J.11 — Random flavor news (~5% per day): puppies at spring training, karaoke nights, lunch deliveries
- J.14 — Wow moments: championship celebration, HR confetti in Backyard mode

**Auto-decisions (J):**
- J.2/J.10 multi-user GM profiles: single GM profile per league for now; multi-profile is follow-up
- J.5 team comparison tool: deferred — Dashboard already shows side-by-side standings
- J.8/J.9 pre/post-game scout cards: partial — GameWatch already shows linescore; full pre-game graphic deferred
- J.12 pause/resume mid-game: GameWatch state persists via debouncedSave; half-inning snapshotting deferred
- J.13 PNG card export: deferred — JSON export available

### Section K Easter Eggs (46 total)
**Personal:** K.1 Henry trait (`Owner's Favorite` + clutch boost), K.2 Lucky Number, K.3 Birthday Mode (morale bump on your birthday), K.4 "Hi Henry" booth call, K.6 Family Name Pool (Settings → Secrets), K.46 Time Capsule (note buried, surfaces 10 seasons later)

**Discovery:** K.8 The Phenom (~0.01% all-99 rookie), K.18 Konami code on title → Arcade Mode, K.19 Tap logo 10× → throwback variant, K.23 Tap portrait 7× → fun facts, K.27 Streaky Saturdays, K.41 Tap version 3× on About → dedication

**Player badges (auto-awarded):** K.10 Iron Man, K.14 Hometown Hero, plus reserved unlock-only traits: Walk-Off King, Underdog, Phoenix

Full list surfaced in **Settings → Secrets** (with Show Spoilers toggle) per user override.

**Auto-decisions (K):**
- K.5 Henry Field stadium upgrade — stub (Henry-named stadium still works)
- K.9 Throwback Ghost — engine hook in place via `ghostLegacyName`; trigger pass deferred
- K.11/K.12/K.13/K.15-K.17 — trait slots reserved, season-end detection logic deferred
- K.20-K.25 long-press/shake/3-finger/pull gestures deferred (require gesture infra); tap eggs K.19/K.23 shipped
- K.30-K.45 narrative achievements: achievement IDs reserved; per-egg detection follow-up
- K.35/K.36 Retro/Future mode UI skins deferred

### Section L — Score Keeper Module
**New top-level page `/score` with two modes:**
- **Backyard Mode (L.2):** Setup with team names + colors + innings; huge +1 RUN buttons for each side; HR triggers confetti; "Amazing Catch", "Strikeout", "Funny Moment" event buttons; auto-saved game log; end-game trophy screen
- **Real Game Mode (L.3):** MLB-style linescore (R/H/E + per-inning); 5-button pitch tracker with auto walk/K detection; large IN PLAY button → 20-option submenu (single/double/triple/HR/outs/sac/error/HBP/SB/CS/WP/PB/balk/DP/TP); auto runner advancement; visual base diamond; collapsible pitch-by-pitch log; undo
- **Persistence:** new Dexie `scorecards` table; every tap auto-saved
- **History page:** browse all past scorecards (Backyard + Real separated), open or delete
- **Quick-start templates (L.8):** Quick Backyard, Watching MLB (9 innings), Henry's Little League (6 innings)
- Coach's Corner chapters for both modes

**Auto-decisions (L):**
- L.4 advanced features (pitch location grid, pitch type/velocity, spray chart, shifts) — deferred
- L.5 per-batter/per-pitcher stat lines — partial: linescore + R/H/E shipped; per-player stats follow-up
- L.6 PNG export — deferred (cards persist locally)
- L.10 sound effects — deferred (Howler is bundled but no SFX files included)
- L.13 Scorekeeper Level gamification — deferred

### iPad / Touch Polish (the deep audit)
- **16px minimum input font-size** — prevents iOS auto-zoom
- `@media (hover: none)` scoping removes stuck hover states on touch
- `useScrollLock` hook keeps the background still when modals are open
- **`NumberStepper`** replaces `type=number` on rating editor — **no keyboard popup**, press-and-hold repeats
- 44px minimum touch targets enforced globally
- Fixed `CommandBar` mobile FAB (was nested inside `hidden lg:block` — never rendered)
- Text inputs `scrollIntoView` on focus so virtual keyboard never covers them
- `inputMode="numeric"` hints on number-like fields
- Focus-visible outlines + `prefers-reduced-motion` respected
- ScoreKeeper buttons sized for live-game use (min-h 70-110px, big tap targets)

### Backward Compat
Migration shim in `store/index.ts` backfills V3 + J + K fields onto pre-V3 saves.

## v1.0.0 — Initial Build

### Foundation
- Vite + React 18 + TypeScript scaffold
- Tailwind CSS, custom dark theme with light mode toggle
- Zustand + Immer global state with debounced auto-save
- Dexie IndexedDB persistence + JSON export/import
- vite-plugin-pwa with installable manifest, offline service worker
- React Router v6 with bottom-nav (tablet) / side-nav (desktop) responsive layout
- Splash screen with branded animated loader
- Safe-area-inset and 44px touch-target compliance

### Generators
- 100+ city pool with climate/region tags
- 90+ mascot library with city affinity scoring and banned-pair table (no Phoenix Glaciers, etc.)
- 30+ logo shape templates: roundel, double-ring, multiple shield styles, diamond, pennant, ribbon, hex, octagon, starburst, varsity, baseball + crossed bats, banner arch, ring wreath, gear, compass, gem facet, etc.
- 50+ mascot silhouette renderers — eagle, hawk, bear/grizzly/polar, wolf, fox, lion, tiger, jaguar/panther, bull, ram, horse/longhorn/bison, shark/marlin/dolphin/stingray, pelican, snake/cobra, gator, raptor, dragon, phoenix, knight, viking, samurai, gladiator, spartan, pirate, anchor/ship/lighthouse, rocket/cannon/pickaxe/axe, cowboy, sun/moon/comet/mountain/cactus/tree, plus pure design symbols
- 30+ color palette presets (navy/gold, royal/orange, crimson, etc.) with primary/secondary/accent
- Three logo variants per team: primary crest, cap logo (initial), wordmark
- Player portrait composer with ~18 layers: BG gradient + stadium silhouette, jersey with team color and number, neck, head shape variants, hair styles (buzz, fade, flow, slick, bun, dreads, cornrows, mohawk, mullet, business cut, etc.), 10 skin tones, gray-hair aging for 33+ year-olds, eyebrows / eyes / nose / mouth / facial hair variations, glasses, chain, eye black, cap with team color + initial + tilt + brim style, pose props (glove for pitchers, bat for hitters, catcher mask), star-quality glow for OVR ≥ 90
- Realistic name pools weighted by origin (US 56%, DR 12%, VEN 10%, MEX 5%, PR 6%, CUB 4%, CAN 2%) with origin-appropriate birthplaces (no Japanese / Korean per spec)
- Position-aware roster generation: 5 SP, 7 RP, 1 CL, full positional starters, bench, plus 19 reserves to fill the 45-man cap

### Sim Engine
- Pitch-by-pitch at-bat resolution
- Pitcher arsenal with type/velo/break/control per pitch (4-Seam / 2-Seam / Sinker / Cutter / Slider / Curve / Changeup / Splitter / Knuckler)
- Handedness-aware contact and power matching (split contactL/contactR, powerL/powerR)
- Park-factor and altitude HR boosts (Coors-style 5,280 ft yields ~10% HR boost)
- Weather multiplier (cold suppresses, warm boosts, wind helps fly balls)
- Bullpen management with stamina-based pitcher fatigue and CL deployment in late + close games
- Realistic outcomes: pre-tuned to yield league AVG ~.225, ERA ~4.00, HR/G ~2.0, top teams 105–110 wins over 162-game seasons
- W/L/Save attribution
- Pitch-level play log for live game viewer with running linescore, base state, count

### Season + Postseason
- 30/60/82/120/162-game schedules with automatic round-robin pairing
- Auto-divisions (4 for 16+ teams, 2 for 8-15, single league for <8)
- Standings with division/wild-card seeding
- Playoff bracket: Wild Card → Division Series → Championship Series → World Series with editable best-of lengths
- Sim a single round or sim-all-playoffs
- Daily injury rolls with 18 distinct injuries, durability + trait modifiers, IL designations DTD/10/15/60/Season-Ending
- Year-end awards: MVP, Cy Young, Rookie of the Year, Reliever of the Year, Manager of the Year, Gold Glove (per position), Silver Slugger (per position), HR Title, Batting Title, ERA Title

### Offseason
- Reverse-standings draft order
- 6-round draft with scouted prospects (Elite / Top-100 / Strong / Solid / Project grades)
- User or CPU draft picks
- Free agency with salary cap enforcement (toggleable)
- CPU teams auto-fill rosters to the 45-man limit honoring cap
- Aging system: <28 grow potential, 30+ decline, 36+ retirement check, 42 mandatory retirement
- Hall of Fame qualifier (career milestones + awards count)
- Career stat archive each season

### 50-Year Pre-Generated History
- Past champions, runners-up, MVPs, Cy Youngs, RoY winners
- HR / BA / ERA leaders per year
- Browseable in History page

### UI
- Premium dashboard with hero leader card, live KPI strip, leaderboards (HR/AVG/ERA), news, today's games, recent results
- Teams grid with team-color gradient cards
- Team page with tabs: Starters (lineup + rotation), Bench, Bullpen, Reserves, Schedule, Stats, Finances, History
- Player profile with flip-card animation (front = portrait, back = bio)
- Editable ratings with color-coded sliders and rating bar visualisation
- Pitch arsenal display
- Career stat tables (hitting and pitching)
- Standings split by division with playoff cutoff indicator and run differential color coding
- Schedule view with day-by-day grouping, today highlight, click-to-watch
- Live Game Watch: animated scoreboard, running linescore, scrolling play feed with pitch/count, kind-colored events (HR golden, K crimson, hits emerald, events sky), pause / fast-forward / finish controls
- Stats leaderboards with hitting + pitching toggles, 13 categories
- Free Agency big board with team selector + contract years selector + sign button
- Draft board with prospect cards, scout grades, CPU auto-pick, sim-all options
- Playoff bracket with horizontal scroll, win indicators, champion trophy card
- History page with past champions table and HoF list
- News feed with category filters
- Settings: 5 tabs (Gameplay, Features, Audio, Visuals, Data, About) with 40+ feature flags

### Tip-the-Lamp Details Wired
- Player jersey numbers visible on portraits + roster lines
- Origin-aware names with birthplace tracking
- Auto-generated nicknames on ~18% of players ("The Wizard," "El Toro," etc.)
- Walk-up song assignment per player
- Closer entrance song for CL position
- Per-team manager with named personality + tendency sliders (aggression, quick-hook, bunt, platoon)
- Retired numbers on team page
- Rivalry detection (intra-division)
- Stadium with name, capacity, dimensions, altitude, surface, roof, park factor (real values for MLB teams)
- Personality traits affecting durability and morale
- Achievement system definitions ready (50+ achievements catalog in data/misc.ts)
- League news feed with 9 categories
- 40 feature flags individually toggleable in Settings → Features

### Settings — Full Toggle Coverage
All 40 spec-listed feature toggles wired:
hotCold, personality, chemistry, weather, managerAi, rivalries, nicknames, walkUpMusic, captains, retiredNumbers, throwbacks, closerEntrance, signatureFoods, pitchMix, sprayCharts, heatMaps, splits, streaks, milestones, recordsConfetti, walkoffs, featuredGames, immaculate, ejections, brawls, tradeRumors, faRumors, springTraining, internationalTourney, top100, powerRankings, dynasty, developmentCurves, warGraph, similarPlayers, hofVoting, numberCeremony, stadiumUpgrades, managerFirings, gmGrades, achievements, photoMode, throwbackThursday, columnist, headlineNews

Plus audio (master/music/sfx volumes, crowd, announcer text, music/sfx on toggles) and visual (theme, reduced motion, font scale, animation intensity, confetti) settings.

### QA
- TypeScript strict mode passes with zero errors
- Vite production build produces ~580 KB JS (182 KB gzipped) + 21 KB CSS
- 3-season + playoffs + draft + FA cycle runs in ~6 seconds headless with realistic stat distributions
- Save size stabilizes around 5 MB after 3 seasons (within standard IndexedDB quota)
- Headless Playwright E2E verifies all routes render without console errors

### Known Deferred
- Trade machine UI (engine types exist; sign-FA covers most roster moves)
- Spray chart / heat map rendering (toggles + data hooks exist; SVG composers are placeholder)
- Howler.js sound files (library is bundled but bundled audio not included; can drop CC0 mp3s into `public/audio/` and import in components)
- Full top-down diamond animation for Immersive mode (Standard mode has full play-by-play)
- Trade rumor mill content generator (UI/data flag in place, content TBD)
