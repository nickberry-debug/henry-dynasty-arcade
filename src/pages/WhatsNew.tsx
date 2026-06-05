// What's New — kid-facing changelog. Hand-curated highlights from the
// recent versions, written in plain language (not commit-speak). New
// entries get pinned to the top with a "NEW" badge that fades after
// the user has visited this page.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";

interface Entry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  accent: string;
  emoji: string;
}

// Newest first. Update this when shipping a new version with anything
// the kids would care about.
const CHANGELOG: Entry[] = [
  {
    version: "1.10.73", date: "2026-05", title: "Polish continued — Football draft class review, Sports last-5, more wordplay content, FA confirm",
    accent: "#86efac", emoji: "🛠️",
    highlights: [
      "🎓 Football: new Draft Class review page at /football/draft-class. Every offseason your rookie class lands here — filter by position, sort by OVR or potential, scout prospects 1-3 times to tighten the noisy potential estimate (3 scouts reveals the truth), see your team's rookies highlighted with the team accent. Surfaces automatically in the home page task banner the first season after each offseason.",
      "🏒🏀🎓 Sports Hub team page now shows the team's last 5 games as W/L tiles at the top — matches Baseball Dynasty's TeamPage. Tap FULL SCHEDULE to jump to the per-sport schedule view.",
      "✍️ Football Free Agency: signing a player now opens a confirmation dialog (yes / not-yet, with player summary + team you're signing them to). Successful signings flash a toast. No more accidental signings.",
      "🎮 Video Game Helper (wordplay): if the mic-asked first turn returns nothing (mic permission denied, no speech, timeout), the helper now says 'I didn't catch that — you can tap the mic again, or type your answer below.' No more silent stalls.",
      "💬 More wordplay content: Quiz Show 23→45 questions across all 9 categories, Fortune Cookie 17→39 fortunes, Jokes 30→60 across every existing category.",
    ],
  },
  {
    version: "1.10.72", date: "2026-05", title: "Big audit pass — Style Studio rebuild, sports parity, content depth, polish across the arcade",
    accent: "#f9a8d4", emoji: "🎯",
    highlights: [
      "👗 Style Studio rebuilt from scratch. The old version stacked Kenney modular-character parts via DOM images with hardcoded percentages — but those parts have wildly different native sizes (head 173×168, hair 158×119, shoes 94×42, eyes 21×21), so the composed character looked broken on every screen. New version uses Kenney's toon-characters pack (pre-composed single-image PNGs in 40+ poses) — no compositing math to get wrong. Customize: 6 characters × 16 poses × 12 color tints × 8 scene backgrounds = 9,216 combos. Lookbook persists across visits and devices.",
      "🏒🏀🎓 Sports Hub leveled up to match Baseball Dynasty's visual depth: real Kenney sports-pack athlete sprites for every player (color bucketed from team primary, variant stable per player id), team-identity hero panel with huge crest + city/nickname + record + conference rank, next-matchup card with crests + sim button, your last 5 games as W/L tiles, full standings (PCT / GB / DIFF / L10 sparkline) with playoff line shaded.",
      "📅 New SCHEDULE page per sport — every game of the season grouped by week, results inline, current week highlighted, your team's games tinted. Tap any played result to see a Final modal with team boxes + star-of-the-game line. Available at /sports/<sport>/schedule.",
      "🏈 Football Standings: added L10 sparkline column to match Baseball Dynasty's standings.",
      "🃏 Card Clash hardened: extracted cloneMatch() that uses structuredClone (with JSON fallback) so future state changes can't accidentally hit the Infinity→null trap the previous fix worked around.",
      "💬 Wordplay content depth: Story Starters 10→30 (longer multi-paragraph openings), Would-You-Rather 18→51 pairs, What Am I? riddles 13→38, Improv Scenes 12→35, Conversation Starters 22→61. Categories preserved; new entries spread across them so kids don't see the same prompt twice in a row.",
      "🎤 RapBattle: END BATTLE button is always visible now, with a contextual hint ('Drop a verse to start' / 'Your turn — drop a verse' / 'Ready to crown a winner') instead of being silently disabled.",
      "🧠 Olympus Settings back button now uses navigate(-1), so closing settings returns you where you opened it from (not always to the Olympus hub).",
      "⏳ Temporal Order: NPC dialogue requests no longer fire stale setState if you close the dialogue mid-fetch.",
      "⏳ Loading spinner: lazy-loaded game chunks now show a rotating ring instead of static 'Loading…' text. On slow networks you can tell your tap registered.",
    ],
  },
  {
    version: "1.10.71", date: "2026-05", title: "Owned-it pass — Card Clash drag bug fix + Style Studio asset audit",
    accent: "#86efac", emoji: "🔬",
    highlights: [
      "🐛 CRITICAL bug found and fixed: Card Clash drag-and-drop was silently failing every play. Root cause: playerState.playsRemaining was initialized to Infinity, but React's JSON.parse(JSON.stringify(match)) clone converted Infinity to null. The canPlay check 'state.playsRemaining <= 0' returned true for null, blocking every play with 'No plays remaining.' Replaced with sentinel value 999. Verified end-to-end via engine trace script.",
      "🐛 39 broken asset URLs in Style Studio found and fixed via disk-existence audit: Yellow shirts don't exist in the pack (removed), Woman hair only goes to style 6 not 8 (clamped on gender change), pants palette is completely different from shirts (Blue 1/Blue 2/Light Blue/Tan, dedicated PANTS_COLORS), shoe filenames are 'Shoe' singular not 'Shoes' (and Brown 2 has its own naming convention). All 301 URLs verify clean now.",
      "✅ Verified each task with concrete acceptance tests instead of just code review: 60-frame Maze simulation traces (player moves + pellets eaten), Card Clash engine through JSON clone + snap/retreat lock + cube cap, Silent Depths torpedo hits moving target at 1.88s, 1092 sports roster players generated deterministically across 40 teams, dev server serves every route + asset 200 OK.",
      "📋 COMPLETION_REPORT.md at repo root documents per-task: acceptance test run, observed output, and exactly which verification level was achieved (engine layer / route layer / asset layer). Honest about what I can't verify from the sandbox (no headless browser → no visual / animation / real-pointer verification).",
    ],
  },
  {
    version: "1.10.70", date: "2026-05", title: "Sports rosters + Silent Depths submarine sim rebuild",
    accent: "#67e8f9", emoji: "⚓",
    highlights: [
      "🏒🏀🎓 Every team in Hockey, Basketball, College Football now has a full deterministic roster — 20+ players per team with names, jersey numbers, positions, ratings, ages, and unique procedural avatars. Tap any team row in standings (or VIEW ROSTER from your team header) to dive in.",
      "👤 Player detail modal — tap a roster row to see overall rating + sport-specific stat line (hockey G has GAA/SV%, basketball PPG/RPG/APG/FG%/3P%, CFB QB has YDS/TD/INT, etc.) + prev/next navigation through the roster.",
      "⭐ Each team's star (set on the team config) gets the franchise-cornerstone treatment — name preserved, +5 rating, gold-bordered banner.",
      "⚓ Silent Depths rebuilt from arcade-style into proper Silent-Service-lineage submarine sim with TWO STATIONS: Nav map (pilot the boat, spot contacts, watch depth charges) + Periscope (visual horizon, target lock, firing solution with bearing/range/lead, torpedo launch).",
      "🚢 Convoy + escort AI: 3 cargo + 1 tanker convoy + 2 destroyer escorts. Get spotted (detection meter) → destroyers hunt you → silent-running by going deep at low throttle clears them.",
      "🎚️ Sub management: surface/scope/deep depth controls, throttle slider, heading dial, battery (drains submerged, recharges on surface), hull HP (depth charges damage less if you're deep), tonnage goal 30k tons.",
      "Old one-screen arcade Silent Depths preserved at /classics/depths-arcade.",
    ],
  },
  {
    version: "1.10.69", date: "2026-05", title: "Bug-fix pass — Card Clash mechanics, Style Studio dress-up, stale-cache escape hatch",
    accent: "#f9a8d4", emoji: "🔧",
    highlights: [
      "👗 Style Studio rebuilt as the layered character dress-up game it was always meant to be — skin tints, hair (color × style × masc/fem), face (eyes + mouth), shirt color + style, pants, shoes. Save outfits to a per-profile lookbook (cloud-synced). The old drawing-canvas Style Studio moved to /classics/sketch.",
      "🃏 Card Clash mechanics aligned with proper Snap rules: PRIORITY SYSTEM (whoever's winning more locations reveals their cards first — big for Arrival/On-Reveal interactions), CUBE LADDER (1 → 2 → 4 → 8 with auto-double at show), SNAP-LOCK (can't retreat the turn you call GO BOLD — RETREAT button disabled with tooltip until next turn).",
      "🃏 Card Clash drag-and-drop: pick up a card from your hand and drag it onto any revealed location. Hover highlight glows the target. Tap-to-select still works as a fallback.",
      "🧊 New 'STUCK? RESET APP CACHE' link on the home page — one tap unregisters the Service Worker, clears all caches, reloads. Fixes the iPad stuck-on-old-version issue cleanly.",
      "📋 Wrote FIX_REPORT.md at the repo root with honest scoping of what's left (Hockey/Basketball/CFB-at-Baseball-depth and Silent-Service-style sub sim are both multi-week, not one-session work; written up there with concrete one-session alternatives).",
    ],
  },
  {
    version: "1.10.68", date: "2026-05", title: "Home page rebuilt as iOS-style category folders — registry-driven",
    accent: "#fde047", emoji: "📁",
    highlights: [
      "🏠 New home: instead of one long flat scroll of every game, the home page is now 8 category folders + Resources. Tap a folder to open its games. The library's gotten big enough that this is just easier.",
      "📂 Categories: 🏆 Sports · ⚔️ Action & Combat · 🗺️ Adventure & RPG · 🚀 Space · 🎲 Strategy & Sim · 🐾 Create & Care · 🧠 Brain & Puzzle · 🎉 Party & Online · 📚 Resources. Each folder shows 4 preview tiles + game count.",
      "🔁 Continue Playing strip: when you've played anything, your last 6 games surface above the folders — one tap back into whatever you were playing.",
      "🔎 Search: tap the magnifier icon to search every game by name, subtitle, or description. Cross-category results, deep-links into the game.",
      "📋 Registry-driven (src/config/games.ts): every game has a category tag. Adding a new game = one entry in the registry and it auto-files itself into the right folder. No more editing the home page by hand.",
      "📍 Hubs (Wordplay) clearly marked 'OPENS HUB' so kids know it's a collection rather than dropping straight into gameplay.",
      "🔗 Routing preserved: /play and /all still load the old flat-grid Landing if you bookmarked it or just prefer the long scroll. Every game route resolves directly — saves, profiles, multiplayer, stats all untouched.",
    ],
  },
  {
    version: "1.10.67", date: "2026-05", title: "Polish pass — Versus stadium turf, Family Mascots, Battle Forge K.O. sounds",
    accent: "#86efac", emoji: "✨",
    highlights: [
      "🏟️ Versus mode (Baseball + Football) now has a tiled grass field anchored at the bottom of the screen — fades into the page background, gives a subtle stadium vibe behind the pitch-by-pitch / play-call UI. Uses Kenney sports-pack ground tiles.",
      "👹 New MonsterCompositor system in art/ — deterministic Kenney monster-builder-pack composite from any stable id. Picks a body / eyes / mouth / optional detail and stacks them. Same id always yields the same monster.",
      "🐉 Family Stats page got a new 'Family Mascots' strip at the top — one unique monster per family profile id, color-shadowed in each profile's accent. Tiny cosmetic flourish, big personality.",
      "🥊 Battle Forge now plays a hurt-grunt SFX on K.O. (state → 'dying') and a power-up chime when a fighter enters rage mode. Rate-limited so big melees don't clatter.",
      "MonsterCompositor is exported from art/index — available to drop into any game that wants procedural monster art.",
    ],
  },
  {
    version: "1.10.66", date: "2026-05", title: "Visual Overhaul Pass B (4/4) — audio across every action moment in the arcade",
    accent: "#fde047", emoji: "🎼",
    highlights: [
      "Finished the audio sweep. Six more games got their key moments wired: Mech Battle (win/lose VO + big explosion), Olympus Duel (win/lose/tie VO + bell), Creature Battle (victory cheer + level-up chime on win / 'oh no' VO on loss), Cosmic Squad mission complete (win VO + bonus boom / loss VO), Movie Mogul (premiere crowd cheer when a film releases during the tick / quiet click otherwise), Temporal Order Resolution (win/lose VO on case close).",
      "Every action game in the arcade now has audio. The 'just played a moment' feeling carries everywhere instead of being on for two games and silent on the rest.",
      "All audio routes through the same v1.10.65 AudioLibrary — mute / master / SFX / music sliders in the Settings modal apply globally. iOS-safe (AudioContext resumed on first gesture per-page).",
      "Pass B Visual Overhaul is now feature-complete. Items remaining for future work: monster-builder-pack creature compositor (LPC-style), Olympus/Dungeon dedicated parallax backdrops, deeper sport-pack stadium scenes — all polish, not foundations.",
    ],
  },
  {
    version: "1.10.65", date: "2026-05", title: "Visual Overhaul Pass B (3/N) — Audio everywhere + Sports Hub athletes + settings UI",
    accent: "#86efac", emoji: "🔊",
    highlights: [
      "🎚️ Audio settings UI in the Arcade Settings modal (gear icon on home). Master / SFX / Music volume sliders + global mute toggle. Persists per device. Test-chirps on slider release so you can hear the change.",
      "🎵 Audio wired into 14 games this release: Tank Duel, Strike Force, Math Blaster, Card Clash (carryover from v1.10.60), plus all five classics (Maze Muncher pellet blips + power-pellet, Girder Climb barrel-hop ding + rescue cheer, Silent Depths torpedo whoosh + cargo boom), plus Versus baseball (HOMER cheer, strikeout whistle, hit thud) + football (TOUCHDOWN cheer), Battle Forge (random impact-metal clashes on attack swings), Crew Traitor (sabotage alarm, meeting buzzer, win/lose VO), Odd One Out (phase buzzes, win/lose VO), Main Event (ring bell on simulate + crowd cheer for 4+ star shows), Potion Lab (cauldron whoosh, success ding, fizz on bad brew), Survivor (level-up VO, win/lose VO).",
      "🏟️ Sports Hub team picker now shows a Kenney sports-pack athlete sprite next to each crest — 4 jersey colors × 14 character poses cycled across the 12-16 teams per league, so each card has a distinct figure with the team's color drop-shadow.",
      "🌆 Sports Hub landing page got a low-opacity parallax city skyline at the bottom — Warped City silhouettes drifting slowly behind the cards. Subtle 'stadium horizon' vibe.",
      "v1.10.62-64 (rolled into this entry): tried parallax on the Landing, didn't read well against the existing gradient + logo, removed. Saved for game routes where the full-screen context fits.",
    ],
  },
  {
    version: "1.10.61", date: "2026-05", title: "Visual Overhaul Pass B (2/N) — ImageParallax + living dusk backdrop on the home page",
    accent: "#c084fc", emoji: "🌄",
    highlights: [
      "New ImageParallax system (src/art/ImageParallax.tsx) — multi-layer scrolling backdrops built from real CC0 art layers (ansimuz Mountain Dusk / Warped City / Sunny Land). Each layer scrolls at its own speed for genuine depth. GPU-accelerated CSS transforms, cheap even with 6 layers on mobile.",
      "The arcade home page now has a living animated dusk backdrop — drifting clouds + parallax mountains anchored to the bottom, low-opacity so it adds depth without fighting the game cards. This is the 'alive on load' moment.",
      "Three presets ready to drop into any game: mountainDusk (RPG/adventure), warpedCity (sci-fi/space), sunnyLand (platformer). Available via `<ImageParallax preset=... />`.",
      "ansimuz + Pixel Frog + LuizMelo fighter packs are now vendored (700 art files) — feeding the next Pass B installments: Olympus/Temporal parallax, Creature Keeper alt sprites, Battle Forge fighters.",
    ],
  },
  {
    version: "1.10.60", date: "2026-05", title: "Visual Overhaul Pass B (1/N) — Tank Duel + Strike Force sprite art, AudioLibrary live",
    accent: "#fde047", emoji: "🎨",
    highlights: [
      "🎵 AudioLibrary — new shared audio system (src/art/AudioLibrary.ts) using the Web Audio API + Kenney CC0 sound packs you just vendored. Drop-in `playSfx('explosion')` / `playMusic('victory')` from any game. Master/SFX/music volume + global mute persist per-profile. iOS-safe (explicit AudioContext.resume on first gesture — same fix as the Quiet Game).",
      "💣 Tank Duel — replaced the procedural canvas tanks with the Kenney `tanks` side-view pack you downloaded (hull + rotatable barrel + 12-frame animated explosion + 6 bullet sprites mapped per weapon type). Player gets a green tank, bot/P2 gets a navy tank. Audio: shell-fire on launch, rocket whoosh for nuke/homing, explosion boom on impact, all with pitch variation so they don't get repetitive.",
      "🚀 Strike Force — replaced procedural ships with Kenney `space-shooter-remastered`. Player ship (blue), three enemy archetypes (red scouts, green wings, black boss), proper laser sprites for bullets. Audio: laser blip per shot, metal impact on enemy hit, big explosion on kill, player-hurt on damage taken.",
      "🚀 Math Blaster — wired audio: ding on correct, power-up streak on combo, fizz on wrong answer, laser blip on each tap-fire.",
      "🃏 Card Clash — audio on card play / unplay / reveal at end-of-turn / GO BOLD callout.",
      "Pass B continues next session: Sports Hub athletes, Olympus/Dungeon/Potion Lab art swap, Creature Keeper alt sprites, background parallax layers everywhere.",
    ],
  },
  {
    version: "1.10.59", date: "2026-05", title: "Main Event (wrestling booking sim) + Card Clash (Snap-style battler)",
    accent: "#f87171", emoji: "🤼",
    highlights: [
      "🤼 Main Event — original wrestling booking sim. You're the booker, not a wrestler. Each month: 4 weekly TV episodes + 1 monthly PPV. Drag matches + promos onto the card, assign 20 original wrestlers (Titanius Maximus, The Specter, Rocket Riley, Dr. Drama, +16 more), simulate the show, watch each segment get a 0-5 star rating. Pop / momentum / show ratings are the visible feedback loop — exactly the indicators players care about.",
      "Main Event mechanics: 3 championship titles (World / Spotlight / Tag), promotion tiers (Indie → Regional → National → Global) unlock as fans grow, feud heat builds across weeks and pays off in main-event blow-offs, 6 match types (singles, tag, ladder, steel cage, battle royal, title) and 7 promo beats (callout, run-in, betrayal, contract signing, open challenge, alliance, reckoning).",
      "🃏 Card Clash — original Marvel-Snap-style card battler. 3 locations reveal one per turn, 6 turns total, energy = turn number, both players play face-down and reveal simultaneously, win 2 of 3 locations. Call GO BOLD to double stakes, opponent can match or retreat. ~5 minute matches.",
      "Card Clash roster: 40 ORIGINAL balanced cards across 6 elements (Ember/Tide/Stone/Gale/Spark/Shade) following the Snap power curve — vanilla cards are baseline, ability cards trade power for effect strength, downside cards (Doom Herald 5/12 with one-play-left aura) sit above curve. Keyword system: Arrival, Aura, Last Stand, Echo, Link. Art is composited from /assets/game-icons (CC-BY 3.0).",
      "Card Clash locations: 20 original (Sunspire +2 power, The Choke 2-card cap, Null Zone silences abilities, Wellspring draws on play, Echo Chamber doubles Arrival, Graveyard doubles Last Stand, ...). Deck builder, collection, rank ladder.",
      "Both games save per-profile + cloud-sync via the existing blob path.",
    ],
  },
  {
    version: "1.10.58", date: "2026-05", title: "Tank Duel + Math Blaster + Sports Hub (Hockey, Basketball, College Football)",
    accent: "#fb923c", emoji: "🏆",
    highlights: [
      "Tank Duel — original turn-based artillery. Six weapons (shell, cluster, big nuke, bouncer, dirt mover, homing). Wind affects shots; terrain breaks with each impact. Best-of-1/3/5 formats, 2-player same-device or vs bot, aim-assist toggle for younger kids.",
      "Math Blaster — original educational arcade. Tap the asteroid carrying the correct answer. Four difficulty tiers (Pre-K counting → Advanced fractions) auto-pick by family profile. Math modes: +, −, ×, ÷, fractions, mixed. Practice mode never lets a kid get stuck; Blaster mode has lives + streak combos. Hints kick in after misses. Per-skill mastery tracking (parent report).",
      "Sports Hub — top-level grouping page for all sports sims. Groups existing Baseball + Football + Versus with three NEW sport modes: Hockey (12 teams, 28-game season, 8-team playoffs), Basketball (12 teams, 30 games, OT decides ties), College Football (16 schools, 12-game regular + 4-team bowl playoff, class years roll over with senior graduations).",
      "CrestGenerator — every team in the new sports gets an ORIGINAL procedural crest (6 shield shapes × 20 mascot silhouettes × team colors). Real-world team logos are trademarked; these are deterministically generated from the team id, so each team has a unique stable identity without IP risk.",
      "EffectsLibrary (shared art) — drop-in canvas effects: ion-cannon beam, laser bolt, rocket with propulsion + smoke trail, explosion with shockwave ring + sparks + smoke + flame chunks, energy shield, magic burst, impact spark, muzzle flash. Tank Duel + Math Blaster already use it; available to every game.",
    ],
  },
  {
    version: "1.10.57", date: "2026-05", title: "Quiet Game — mic actually picks up sound now (iOS fix)",
    accent: "#A78BFA", emoji: "🤫",
    highlights: [
      "Root cause: on iOS Safari the AudioContext starts in a 'suspended' state — frequency data was all zeros, so the volume level never crossed the threshold and the streak ran forever no matter how loud the room got. Fix: explicit ctx.resume() after the user-gesture grant.",
      "Switched the volume calculation from frequency-domain average (which dilutes the signal across empty high bins) to time-domain RMS (true loudness) blended with peak — more reliable on iOS and matches actual room noise.",
      "Fixed a stale-closure bug: changing sensitivity or pausing mid-streak now actually applies to the running detector (was reading the value captured at start time).",
      "Volume bar rescaled to the new 0-100 level so it visually tracks loudness correctly.",
    ],
  },
  {
    version: "1.10.56", date: "2026-05", title: "Five classic-arcade homages — Girder Climb, Strike Force, Maze Muncher, Style Studio, Silent Depths",
    accent: "#fde047", emoji: "🕹️",
    highlights: [
      "🏗️ Girder Climb — Donkey Kong-lineage platformer. Dodge runaway girders rolling down four floors, climb ladders, reach the SOS rescue beacon at the top. Three lives. Score for hops over barrels + time bonus on rescue.",
      "🚀 Strike Force — vertical-scroll shooter in the 1942/Galaga lineage. Auto-fire ship at the bottom, enemy waves scroll down (scouts in V-formations, wing sweeps, heavies). Boss every 30 seconds. Extra side-bullets unlock at 200 points.",
      "👻 Maze Muncher — Pac-Man-lineage maze chase. 21x23 grid maze, four ghosts with chase/scatter/scared/eaten modes. Power pellets in the corners turn ghosts vulnerable for 6 seconds. Tunnel wrap on the middle rows.",
      "🎨 Style Studio — kid-safe drawing app. 12-color palette, 4 brush sizes, eraser, undo, save-to-gallery (syncs across the family via cloud blob), export PNG.",
      "🌊 Silent Depths — submarine survival. Drift through three threat layers: drifting mines, depth charges from cargo ships above, enemy subs cruising across. Torpedo upward to sink cargo, hit enemy subs for big points. Joystick + FIRE button.",
      "All five are 100% original — homage to the genre, not the IP. Wired into the ARCADE shelf on Landing with per-game stats and route-level ErrorBoundary recovery.",
    ],
  },
  {
    version: "1.10.55", date: "2026-05", title: "Creature Keeper — full sprite coverage + depth shading",
    accent: "#a78bfa", emoji: "🦊",
    highlights: [
      "Every species in the catalog now has proper distinct sprite art. Wave 2 species (Scaldsprout, Kindlesnake, Dewdrip, Seapearl, Dustkit, Clayling, Staticfox, Hexpup, Petalbug, Vinekit, Sunbug, Eclipsekit) were drawing as plain colored circles — now they all share a body shape with one of the originals matched by silhouette + type.",
      "Two brand-new body templates: Snake (coiled serpent with forked tongue + fangs on Kindlesnake) and Golem (blocky humanoid earth-creature with stone crown on Clayling's apex).",
      "Added a bottom-right shade gradient to every creature — pairs with the existing top-left highlight to give the bodies a 3D-painted feel instead of a flat-sticker look. Tiny but huge for visual quality.",
      "Sheen highlight strengthened so the painted-toy look lands.",
      "Fallback dispatch by silhouette.body means any future species addition draws cleanly without code changes.",
    ],
  },
  {
    version: "1.10.54", date: "2026-05", title: "Survivor — biome-aware scenery + projectile polish",
    accent: "#a3e635", emoji: "⚡",
    highlights: [
      "Survivor's arena no longer looks like a dotted grid. Each of the four biomes paints proper scenery: Sun Meadow gets grass tufts + scattered wildflowers, Ashlands gets cracked terra-cotta plates + glowing embers, Starfield gets nebula glow patches + twinkling stars, Old Ruins gets stone-tile flooring with cracks and moss patches.",
      "Soft radial vignette darkens the corners so the hero pops in the center — same trick the pros use.",
      "XP gems are now glowing diamonds (color-coded by value: green / cyan / purple) instead of the 💎 emoji. Pickups (heal / bomb / magnet) show as glowing colored chips with bob animation.",
      "Projectiles got a streak-trail upgrade — aim-shape bullets leave a motion blur + white-hot tip, orbit weapons get a soft halo, aura/wave weapons get an inner glow gradient.",
      "Damage popups now have a drop shadow so they read against any background.",
    ],
  },
  {
    version: "1.10.53", date: "2026-05", title: "Odd One Out — social deduction with word packs",
    accent: "#fbbf24", emoji: "🕵️",
    highlights: [
      "New game: Odd One Out. 3-8 players, online cross-device. Everyone gets the same secret word — except one, who gets a similar-but-different word and has to bluff.",
      "Six themed word packs: Animals, Foods, Places, Jobs, Sports, Family. Pairs are intentionally close (Dog vs Cat, Pizza vs Burger) so the Odd One can plausibly fake a clue.",
      "Roles are private — tap-to-reveal so you don't spoil it walking past someone's phone. Take turns dropping one-word clues, then discuss, then vote. Outcome reveals the Odd One and the secret word.",
      "Scoring: Odd One wins +2 if they survive the vote. Crew each get +1 when they bag the impostor. Cross-profile stats track wins-as-crew vs wins-as-odd plus head-to-head.",
    ],
  },
  {
    version: "1.10.52", date: "2025-12", title: "Versus Mode — pick timer countdown live",
    accent: "#fb923c", emoji: "⏱️",
    highlights: [
      "When you turn on the pick timer in the Versus Hub (15s or 30s), each picker now shows a countdown bar that drains green → amber → red as time runs out.",
      "When the timer hits zero, the picker auto-locks with whatever's currently selected — no more freezing kids out of a turn because they're still thinking.",
      "Resets per pitch (Baseball) or per play (Football) — every fresh pick gets a fresh clock.",
      "Default is still OFF, so chill matches stay chill. Works in both Baseball Versus and Football Versus.",
    ],
  },
  {
    version: "1.10.51", date: "2025-12", title: "Potion Lab → Family Stats: ✦ Most Discoveries leaderboard",
    accent: "#a78bfa", emoji: "✦",
    highlights: [
      "Every Potion Lab brew now reports your hidden-discoveries count to the cross-profile stats blob (cloud-synced via the same path as wins / level / hours).",
      "Family Stats page has a new champion line: ✦ Most Discoveries — whoever's been most curious in the lab gets the crown.",
      "GameStat shape gained an optional `discoveries` field — other games with a discovery layer (future Creature Pokedex, Survivor evolved-weapon mastery, etc.) can plug in the same way.",
    ],
  },
  {
    version: "1.10.50", date: "2025-12", title: "Versus Mode polish — rematch, switch sides, pick timer",
    accent: "#fb923c", emoji: "🔁",
    highlights: [
      "End-of-match buttons now offer REMATCH (same setup), 🔄 SWITCH SIDES (A/B swap), and HOME — both Baseball and Football.",
      "Rematch + Switch Sides reload the page with the chosen setup so the game state resets clean — no leftover scores from the previous match.",
      "Pick Timer option in the Hub: OFF (default · no pressure), 15s (fast), 30s (balanced). Captured on the setup payload — actual countdown enforcement is staged for the next round so kids who want chill matches stay chill by default.",
    ],
  },
  {
    version: "1.10.49", date: "2025-12", title: "Crew Traitor: safe chat + head-to-head stats",
    accent: "#9be3ff", emoji: "💬",
    highlights: [
      "Safe chat panel shows up in the Emergency Meeting modal — 8 preset phrases ('I'm in {ROOM}.', 'Was that you?', 'Skip — I dunno.', etc.) and 8 emotes. Tap-only; no free-text input. Ghosts can read but can't post during the playing phase.",
      "Live chat feed shows the last 6 messages within a 20-second window, then fades — keeps the room doc small and the meeting focused.",
      "Head-to-head stats now track wins/losses against each family-profile opponent (parity with Versus). Solo wins against bots don't count toward h2h (bots aren't profiles).",
      "Field-backfill migration on CrewStats means existing saves keep all their progress.",
    ],
  },
  {
    version: "1.10.48", date: "2025-12", title: "🤖 Crew Traitor — VS CPU launches (one device, anytime)",
    accent: "#a78bfa", emoji: "🤖",
    highlights: [
      "Tap '🤖 VS CPU · ONE DEVICE' on the Crew Traitor lobby to play solo against bots — no room codes, no siblings required.",
      "Pick 3-7 bots, two difficulty levels (Chill / Sharp), and your role (Random / Crew / Traitor).",
      "Bots wander, complete their own tasks, tag isolated crewmates if they're the traitor, trigger sabotages, and vote in meetings based on suspicion they accumulated by watching tag-outs.",
      "Crew bots beeline to sabotage-fix rooms when one's active. Traitor bots hunt isolated rooms and avoid groups.",
      "Voting bots lean on suspicion scores — they remember who they saw with whom. Sharp difficulty follows suspicion more strictly; Chill skips often.",
      "Same rules as online: 5 rooms, 12 tasks, 4 sabotages, vents (Bridge↔Engine, Reactor↔Lab), Detective peek, Engineer vent access, ghost mode, win conditions.",
      "Wins record to the same per-profile CrewStats blob as online — your bot wins count.",
    ],
  },
  {
    version: "1.10.47", date: "2025-12", title: "🧪 Potion Lab rebalance + Discovery layer",
    accent: "#a78bfa", emoji: "🔮",
    highlights: [
      "No more recipe spoilers up front. The Brewmaster's panel now gives a progressive HINT instead of the full answer — a conceptual nudge first, narrower guidance after one miss, then a single specific hint after two misses.",
      "REVEAL THE RECIPE button only unlocks after the THIRD miss — and it's still optional. You can keep experimenting if you want.",
      "Trial-and-error matters again: when you stumble onto a HIDDEN recipe (one not in the Grimoire), it's celebrated as a ✦ DISCOVERY! and added to your Discoveries collection.",
      "Discoveries: X / ?? counter on the Hub and Cauldron — the '??' preserves mystery (the kid chases the question mark).",
      "Epic + Ultra (Legendary + Mythic) ingredients now UNLOCK as you make hidden discoveries — 1 Legendary per discovery, 1 Mythic every 3 discoveries. Required-recipe ingredients still always available (access rule preserved via the safety net).",
      "Failed brews now teach: 'That wasn't it — the Brewmaster's hint above just got sharper.' One more miss unlocks the reveal option.",
    ],
  },
  {
    version: "1.10.46", date: "2025-12", title: "Crew Traitor phase 2 — sabotage, roles, vents, ghosts",
    accent: "#9be3ff", emoji: "🛰️",
    highlights: [
      "SABOTAGE: traitors can trigger one of 4 crises (Reactor Meltdown, Comms Blackout, Oxygen Leak, Lights Out). Each has a 35-60 second fix window — crew must visit the listed rooms to repair. If the timer hits zero, traitors win immediately. Big red banner with countdown + room list keeps the pressure on.",
      "DETECTIVE (special crew role): one crewmate gets a one-shot PEEK — pick any player, see their role. Host-mediated so it stays private to the detective.",
      "ENGINEER (special crew role): one crewmate gets vent access alongside traitors. VENT SHORTCUT button shows when standing in a vented room.",
      "VENT NETWORK: two vent pairs on Station Gamma (Bridge↔Engine Bay · Reactor↔Lab). Traitors + engineers fast-travel between them.",
      "GHOST MODE: eliminated players keep walking + completing their remaining tasks — their work still counts toward the crew win. They show as dimmed dotted-outline dots on the map, so living players can spot bodies.",
      "Role variant chip now shows on your role banner (🕵️ DETECTIVE / 🔧 ENGINEER) so kids know their special.",
    ],
  },
  {
    version: "1.10.45", date: "2025-12", title: "Stale-deploy auto-recovery (no more 'text/html' crash)",
    accent: "#fca5a5", emoji: "🛟",
    highlights: [
      "Fixed the 'TypeError: text/html is not a valid JavaScript MIME type' crash that hit when navigating to a game (Breeding, Habitats, etc.) after a deploy while still cached on the old version.",
      "Root cause: old service worker was serving the previous index.html which referenced chunk hashes that no longer exist on the new deploy. Browser fetched the missing chunk, got HTML back, refused to execute it.",
      "Now every lazy-loaded route retries once, then auto-unregisters the stale service worker, clears caches, and force-reloads to pick up the fresh deploy. Once-per-session guard prevents any loop.",
      "ErrorBoundary also detects this error class and triggers the same recovery — covers any deep inline dynamic import I missed.",
    ],
  },
  {
    version: "1.10.44", date: "2025-12", title: "🛰️ Crew Traitor — online social deduction launches",
    accent: "#9be3ff", emoji: "🛰️",
    highlights: [
      "Brand-new game: 3-10 players across their own devices on Station Gamma. Crew complete tasks; secret Traitors sabotage and tag out crewmates.",
      "Lobby with 6-char room codes (same flow as Versus Online). Each player taps READY, host taps START.",
      "5 rooms across the station (Bridge · Reactor · Cafeteria · Lab · Engine Bay) with 12 tasks scattered between them. Tap a room to walk there.",
      "Crew get private task lists. Hold a task button for 3 seconds to complete it. Traitors see fake task buttons for cover.",
      "Traitors get a TAG OUT button on any crewmate in the same room. Bodies stay where they fell.",
      "EMERGENCY MEETING button at the bottom — anyone alive can call one. 75-second discussion + voting. Most-voted player is ejected; if it's a traitor everyone gets to celebrate.",
      "Win conditions: crew win all tasks OR vote out every traitor. Traitors win when they match crew count.",
      "Per-profile stats (wins as crew, wins as traitor, tasks done, total matches) sync across the family.",
      "MVP scope — coming next round: vents/shortcuts, sabotage system, special roles (Detective/Engineer), ghost mode, safe-chat presets.",
    ],
  },
  {
    version: "1.10.43", date: "2025-12", title: "🌐 Versus Mode goes ONLINE — play across devices",
    accent: "#86efac", emoji: "🌐",
    highlights: [
      "Cross-device Versus is live for Baseball + Football! Host creates a room → shares the 6-character code → opponent types it in from their device.",
      "New /src/multiplayer/ module powers everything: lobby + room codes + presence + private pick submission + reveal sync + reconnect. Reusable foundation for future games (Crew Traitor, Odd One Out, live Card Battler).",
      "Hidden simultaneous selection works exactly like Pass & Play — but now you're each on your own device so there's no handoff needed.",
      "The host resolves picks server-side and writes the new shared state; both clients see the result in lockstep.",
      "Heartbeat-based presence: if either side disconnects > 2 min, the seat opens up. The lobby shows when your opponent is connected, picked a team, and tapped ready.",
      "Per-profile and head-to-head stats track wins from online matches the same way as pass-and-play.",
    ],
  },
  {
    version: "1.10.42", date: "2025-12", title: "🥊 Sports Versus Mode — head-to-head, Pass & Play",
    accent: "#fb923c", emoji: "🥊",
    highlights: [
      "Brand-new two-player mode for Baseball + Football. Hidden simultaneous selection is the spine — neither player sees the other's pick until both lock in.",
      "BASEBALL VERSUS: pitcher picks pitch + zone (or intentional ball); batter picks bat type + swing + guesses the zone. Counts/outs/innings/scoring all work; HRs, strikeouts, walks, the whole shape.",
      "FOOTBALL VERSUS: Tecmo-style. Offense calls one of 6 plays (inside/outside run, short/long pass, play-action, screen); defense calls one of 5 (run-stuff, blitz, short/deep zone, balanced). Matchups + ratings drive yardage, TDs, INTs, sacks.",
      "Pass-the-phone handoff with a double-tap screen-hide so neither kid can peek.",
      "8 original baseball teams + 8 original football teams. Pick yours and your opponent's.",
      "Per-profile stats + head-to-head record per family member ('Henry 7-4 vs Dad in Baseball Versus').",
      "Online mode (cross-device) coming next round — the state machine is already mode-agnostic so it's an additive layer.",
    ],
  },
  {
    version: "1.10.41", date: "2025-12", title: "Creature Keeper: classes + 11 new species + a hidden one",
    accent: "#c084fc", emoji: "🔍",
    highlights: [
      "Every creature now has a CLASS in addition to its element: Warrior / Scout / Sage / Brawler / Guardian / Trickster.",
      "10 new species added to the catalog — Scaldsprout, Kindlesnake, Dewdrip, Seapearl, Dustkit, Clayling, Staticfox, Hexpup, Petalbug, Vinekit, Sunbug — bringing the visible roster from 14 to 24.",
      "A 25th HIDDEN species lurks in the wild — Eclipsekit, a Mythic Shade Trickster. Battle the apex form of all 3 starters (Pyrekit · Tideling · Mossling) to reveal them.",
      "Catalog panel on the Hub now teases the reveal rumor + reports total discoveries.",
      "Wild Hunt opponent cards show class so you can plan your matchup.",
      "Foundation in place to keep adding toward the 77-species goal — adding more is now incremental data work.",
    ],
  },
  {
    version: "1.10.40", date: "2025-12", title: "Olympus cross-profile hero duels",
    accent: "#DAA520", emoji: "⚔️",
    highlights: [
      "Family Roster Olympus cards get a new DUEL button — tap to fight your hero against another family member's hero in a stat-driven turn-by-turn showdown.",
      "Combat respects level + strength + magic on offense, endurance + intuition on defense. Higher agility hero strikes first.",
      "Duel results post to the family Activity feed so everyone sees who won. The duel also publishes a live-session so spectators see 'Hero duel · X vs Y' in the new family strip.",
      "VS (stat comparison) and DUEL (real fight) live side-by-side on hero cards now.",
    ],
  },
  {
    version: "1.10.39", date: "2025-12", title: "Family live-presence across every game",
    accent: "#86efac", emoji: "📡",
    highlights: [
      "Every game now broadcasts a live-session presence when someone in the family is playing: Mech fights, Creature battles, Survivor runs, Battle Forge — all of them.",
      "New Landing strip shows up to 3 live family sessions at once with a pulsing green dot, the profile color, the game, and what they're doing.",
      "Battle Forge sessions still expose a WATCH button so spectators can drop straight into the spectator view.",
      "Stale sessions auto-clear after 5 minutes of no heartbeat — no phantom 'still playing' if someone closes the tab.",
    ],
  },
  {
    version: "1.10.38", date: "2025-12", title: "Scrapyard Kings: parts shop + replays + overdrive",
    accent: "#fb923c", emoji: "🛠️",
    highlights: [
      "Parts shop: every part now has a cash price (Common $80–$110, Uncommon $220–$300, Rare $560–$760, Legendary $1,400–$1,890). Unowned parts show a 🛒 BUY badge in the Builder; owned ones unlock for free swap.",
      "Higher-rarity parts gated by league — same climb logic as weapons. The Builder shows 'Unlocks at higher league' so you can see what you're working toward.",
      "Bot Templates still give you their preset parts free as a kid-friendly starter pack.",
      "New REPLAYS page (link from the Hub) — last 20 battles with winner, opponent, duration, and a quick REMATCH button.",
      "OVERDRIVE indicator: when a bot's HP drops below 25% it pulses a red banner + scale animation. The whole arena reads 'finish them!'",
    ],
  },
  {
    version: "1.10.37", date: "2025-12", title: "Survivor weapon evolution",
    accent: "#fde047", emoji: "✦",
    highlights: [
      "Weapons now EVOLVE mid-run with combo unlocks: Spear + maxed Iron Vest = Sky-Spear; Fireball + maxed Wisdom = Inferno; Lightning + maxed Luck = Sky-Thunder; Axe + maxed Spinach = Whirlblade; Arrow + maxed Boots = Storm Volley; Shield-Orb + maxed Magnet = Aegis.",
      "Tier 3 weapons show a 🔒 hint card telling you exactly which passive to max for the evolved form.",
      "When the combo lands, a big celebration overlay pops up at the top of the run for 2.4 seconds so you SEE the evolution moment.",
    ],
  },
  {
    version: "1.10.36", date: "2025-12", title: "Starters, catch-em-all, XP bars, Mech achievements",
    accent: "#f9a8d4", emoji: "🎯",
    highlights: [
      "Pokemon-style starter selection: every fresh save now picks 1 of 3 starters (Pyrekit · Tideling · Mossling) instead of being auto-assigned.",
      "Catch-on-win: defeat a wild creature you don't already own and a fresh L1 of that species joins your archive instantly.",
      "XP bar on every creature card — see exactly how close they are to their next level / evolution.",
      "Sprites cleaned up: dropped the blurry specular shader for a crisp painted-highlight overlay.",
      "Scrapyard Kings: 10-achievement Hall on the Hub with cash-bonus unlocks (First Blood, Rookie Graduate, Pro Material, Champion, Legend, Ten/Fifty Wins, Cash King, Loaded, Back to the Shop).",
      "Version badge now pinned to the TOP of the landing page so you can confirm deploys at a glance.",
    ],
  },
  {
    version: "1.10.35", date: "2025-12", title: "Creatures get personality + painted depth",
    accent: "#86efac", emoji: "✨",
    highlights: [
      "Every creature now has a soft 3D-painted look — top-down highlight + cast shadow + sheen overlay across all 14 species.",
      "Baby creatures grew blush cheeks 🥹 and big bouncy eyes.",
      "Idle bob animation — each creature breathes/bounces gently at their own tempo so a row of them doesn't sync up.",
      "Eyes look in different directions based on personality: Playful looks up-and-right, Shy glances down-left, Curious peeks sideways, Bold stares straight ahead.",
      "Variants (shiny ✨) got extra sparkle ribbons for that 'is that a SHINY?!' moment.",
    ],
  },
  {
    version: "1.10.34", date: "2025-12", title: "Scrapyard Kings combat overhaul",
    accent: "#fb923c", emoji: "💥",
    highlights: [
      "Real attack animations! Rockets fly with exhaust trails, plasma beams flash full-width like a Hadouken, rail tracers streak across the arena, sawblades spin and explode on contact, flamers cone out a heat plume, lightning forks crackle.",
      "Animated arena background: parallax starfield + horizon hex grid + screen-shake on every hit.",
      "Bot Templates picker on the Builder: 5 archetype quick-starts (Scout · Iron Tank · Brawler · Sniper · Pyromancer) — pick one and your whole bot reconfigures in a tap.",
      "Weapon shop now shows a hand-drawn icon for every weapon — cannon, beam, missile, rail, cluster, flamer, saw, shock — so you can pick at a glance.",
    ],
  },
  {
    version: "1.10.33", date: "2025-12", title: "Survivor sprites + consolation XP",
    accent: "#fde047", emoji: "⚡",
    highlights: [
      "Survivor heroes and enemies now render as proper hand-drawn canvas sprites instead of emoji glyphs — Spartans have crested helmets + shields, Mages get wizard hats + glowing orbs, Berserkers swing horned helmets + axes, Pyrekits are full foxes with flame tails. Each enemy archetype has its own silhouette (bug, wolf, boar, hooded caster, robot, dragon, crowned boss).",
      "Creature Keeper: losing a battle now still earns ~30% XP. Kids who get steamrolled by a too-tough opponent keep moving forward instead of stalling.",
    ],
  },
  {
    version: "1.10.32", date: "2025-12", title: "Sports player portraits — unified across baseball + football",
    accent: "#fbbf24", emoji: "🏟️",
    highlights: [
      "New SportPortrait component generates the same hand-drawn headshot for any sport — same proportions, same lighting, same style.",
      "Football player cards now show full portraits instead of plain team-color tiles.",
      "Future Hockey, Basketball, and College Football will plug into the same renderer the moment they ship.",
    ],
  },
  {
    version: "1.10.31", date: "2025-12", title: "Scrapyard Kings: bigger arsenal + chunkier bots",
    accent: "#fb923c", emoji: "🤖",
    highlights: [
      "9 new weapons — Autocannon, Scrap Shotgun, Frost Lance, Grenade Lobber, Coil Railgun, Napalm Tossbox, Singularity Lance, Void Shot, Swarm Drone Pod. 18 weapons total now across 4 tiers.",
      "Weapons unlock as you climb leagues — Common at Rookie, Uncommon at Amateur, Rare at Pro, Legendary at Champion. The shop shows locked weapons with the league they unlock at, so you can see what you're climbing toward.",
      "Prize purses scaled up: 120 → 360 → 850 → 2,200 → 5,500 cash per win. Champions can finally afford the legendary parts.",
      "Bot sprites overhauled — gradient body panels, rivets, glowing visor slit, mouth grilles, boot pistons, weapon barrels that glow. Much chunkier Contra/Stardew feel in both the Hub and the Arena.",
    ],
  },
  {
    version: "1.10.30", date: "2025-12", title: "Olympus polish — premium shop fronts + settings",
    accent: "#DAA520", emoji: "🏛️",
    highlights: [
      "Shop selector now shows gold-framed storefronts with a 'today's stock' teaser line and a corner gleam — feels like walking into Athens.",
      "Shop stock cards got kind-icons (🗡 / 🛡 / ✨ / 🧪), a gold halo on hover, and a clearer BUY → call to action.",
      "Settings sections now use the same gold-frame chrome as the rest of Olympus instead of plain rectangles.",
    ],
  },
  {
    version: "1.10.29", date: "2025-12", title: "Breeding, training, and Olympus ↔ Creature bonds",
    accent: "#f9a8d4", emoji: "🥚",
    highlights: [
      "Breeding Nest: pair two creatures (both need bond ≥ 40) to hatch a baby that inherits traits. Variant parents = 6× the chance of a variant baby.",
      "Training: 30-second tap-rhythm mini-game. Tap glowing orbs as they pop up — hits + accuracy convert to XP for your creature.",
      "Olympus ↔ Creature bond: tap any creature, link it to one of your Olympus heroes. The hero's profile page now shows their bonded creature — tap it to visit them.",
      "Hub nav grew to 5 tiles: Wild Hunt · Training · Breeding · Berry Store · Habitats.",
    ],
  },
  {
    version: "1.10.28", date: "2025-12", title: "Pokémon-style creature sprites + name cleanup",
    accent: "#86efac", emoji: "🎨",
    highlights: [
      "Every Creature Keeper species got its own hand-crafted art: foxes have tails + ears, beetles have antennae, birds have wings, ghosts float, crystals shine.",
      "Stage-aware features — babies have bigger heads + eyes, apex stages add manes, wings, fangs, halos.",
      "Type-themed accents: flame creatures get flame puffs, tide creatures wear water-drop crowns, spark creatures crackle with lightning.",
      "Variants (✨) now sparkle with extra gold dots — they really feel special when one shows up.",
      "Renamed 'Beckett's Battle Forge' to 'Battle Forge' and 'Beckett Movie Studios' to 'Movie Studios' so every player feels like the games are theirs.",
    ],
  },
  {
    version: "1.10.27", date: "2025-12", title: "Creature Keeper: battles + berries + habitats",
    accent: "#86efac", emoji: "⚔️",
    highlights: [
      "Turn-based battles are LIVE — pick a move, watch the foe react, win to earn 🍒 berries + XP + sometimes an item drop.",
      "Wild Hunt: roll a list of opponents at your creature's level, pick who to fight. Reroll any time.",
      "Berry Store: 9 items — food, healing tonics, battle potions, XP candies. Spend the berries you earn.",
      "Habitats: 6 themed homes (Meadow, Embers, Tidepool, Storm Peak, Shadow Grove, Star Garden) that change the hub's look and give matching-type creatures a bond bonus.",
      "Type matchups matter — flame vs bloom is super effective (✦), tide vs flame too. Strategy starts here.",
    ],
  },
  {
    version: "1.10.26", date: "2025-12", title: "Profile picker crash fixed",
    accent: "#86efac", emoji: "🎯",
    highlights: [
      "The 'Something Broke' loop on no-profile devices is fixed: the Who's Playing? picker was using a router hook outside the router, which threw an empty-message invariant in production. Both screens now share the same BrowserRouter.",
      "All five family profiles should load normally again — Henry, Beckett, Everly, Mom, and Dad.",
    ],
  },
  {
    version: "1.10.25", date: "2025-12", title: "Crash armor + readable names",
    accent: "#86efac", emoji: "🛡️",
    highlights: [
      "Every Firestore subscriber (heroes, adventures, activity, battles, blobs) now catches errors inside its callback — a single malformed cloud doc can't crash the landing anymore.",
      "Switched the minifier to terser with keep_fnames so the next error screen shows real function names like 'subscribeHeroes' instead of two-letter blobs.",
    ],
  },
  {
    version: "1.10.24", date: "2025-12", title: "Readable crash reports",
    accent: "#fde047", emoji: "🔎",
    highlights: [
      "Production builds now keep original function names — error stacks read like 'Landing' / 'LiveActivityFeed' instead of 'qW' / 'Dw'.",
      "Next time the error screen appears we'll be able to point straight at the broken file.",
    ],
  },
  {
    version: "1.10.23", date: "2025-12", title: "Loop-proof recovery",
    accent: "#fca5a5", emoji: "🛟",
    highlights: [
      "Stuck on the 'Something Broke' screen? There's a new FRESH START button that wipes only this device's cache and gets you back in.",
      "The SAFE PAGE button now sends you to What's New (always loads) instead of looping back to a broken home screen.",
      "Production builds now ship source maps — future error screens show real file names and line numbers, not cryptic minified gibberish.",
      "More defensive guards: corrupted hero/save lists can no longer crash the landing render.",
    ],
  },
  {
    version: "1.10.22", date: "2025-12", title: "Folders + crash-proof landing",
    accent: "#c4b5fd", emoji: "📁",
    highlights: [
      "Arcade home now organized into five shelves: Sports, Adventure & RPG, Tycoon & Sim, Arcade, Wordplay & Brain.",
      "Sports games (Baseball + Football) live in their own row — ready for Hockey, Basketball, and College Football later.",
      "Landing no longer crashes if an old save is missing fields — every game's status line is defensive now.",
      "Fixed the 'Reload & Clear Cache' button: it now unregisters stuck service workers too, so a bad cache can't strand a device on a broken build.",
      "New deploys take effect immediately — no more waiting on the old worker.",
    ],
  },
  {
    version: "1.10.21", date: "2025-12", title: "⚡ Survivor launches",
    accent: "#fde047", emoji: "⚡",
    highlights: [
      "Brand-new arcade game: pick a hero, move with one thumb, your weapons auto-fire.",
      "Every level: pick 1 of 3 upgrades — new weapons, evolve existing ones, or pick passives.",
      "Six original heroes (Spartan, Mage, Huntress, Berserker, Wind Monk, Pyrekit), 10 weapons, 6 passives, 4 biomes.",
      "Earn coins per run; buy permanent boosts between runs (HP, speed, damage, luck, magnet).",
      "Last 10 minutes against escalating swarms — a final boss spawns at the end.",
    ],
  },
  {
    version: "1.10.20", date: "2025-12", title: "Live battles + family showdowns",
    accent: "#fca5a5", emoji: "📺",
    highlights: [
      "Watch live: when a family member starts a Battle Forge fight, a 'LIVE NOW' banner pops on every other device. Tap to spectate the HP bars + result in real time.",
      "VS button on hero / pilot / agent / studio Roster cards — head-to-head stat comparison with a clear winner.",
      "Showdown results post to the Family Activity feed so the whole family sees them.",
    ],
  },
  {
    version: "1.10.19", date: "2025-12", title: "Family polish round",
    accent: "#86efac", emoji: "✨",
    highlights: [
      "Mech bots now show up in the Family Roster — tap to view full stats.",
      "Challenge another family member's bot to a duel from the Roster page.",
      "A live Family Activity feed on the Landing page shows everyone's recent wins.",
      "Conflict notifications now cover Baseball, Football, and Movie Studio saves too.",
      "Roster cards open a detail modal with full stats and parts.",
      "This What's New page!",
    ],
  },
  {
    version: "1.10.18", date: "2025-12", title: "Creature Keeper launch",
    accent: "#86efac", emoji: "🥚",
    highlights: [
      "Brand-new game: raise an original creature.",
      "14 species across 3 evolution stages each (42 forms total).",
      "8 elemental types with rock-paper-scissors matchups.",
      "Care loop ready: feed, play, clean, rest, heal — your creature reacts.",
    ],
  },
  {
    version: "1.10.17", date: "2025-12", title: "Fast loading",
    accent: "#fbbf24", emoji: "⚡",
    highlights: [
      "Initial app load is half the size — landing screen appears way faster.",
      "Each game loads on demand instead of all at once.",
    ],
  },
  {
    version: "1.10.16", date: "2025-12", title: "Mech battles playable",
    accent: "#fb923c", emoji: "🤖",
    highlights: [
      "Scrapyard Kings: your bot can now fight!",
      "Build it, hit FIND A FIGHT, watch the brawl, win cash + scrap.",
      "Rivals scale to your league — fights stay fair as you climb.",
    ],
  },
  {
    version: "1.10.15", date: "2025-12", title: "Mech Combat launch",
    accent: "#fb923c", emoji: "🛠️",
    highlights: [
      "New game foundation: Scrapyard Kings, original mech-combat.",
      "24 parts + 9 weapons. Build a bot, save per profile.",
    ],
  },
  {
    version: "1.10.14", date: "2025-12", title: "Family Brawl + conflict toast",
    accent: "#c084fc", emoji: "👨‍👩‍👧‍👦",
    highlights: [
      "Battle Forge now has a 'FAMILY' category — fight as your family mascot.",
      "When two devices edit the same thing offline, a toast asks who wins.",
    ],
  },
  {
    version: "1.10.13", date: "2025-12", title: "Selection screens polish",
    accent: "#DAA520", emoji: "🏛️",
    highlights: [
      "Olympus class + subclass cards got a premium gold treatment.",
      "Baseball and Football roster cards now show team colors and badges.",
    ],
  },
  {
    version: "1.10.12", date: "2025-12", title: "Battle Forge weight + memory wall",
    accent: "#fca5a5", emoji: "⚔️",
    highlights: [
      "Battle Forge picker back to the meme style — emojis read at a glance.",
      "Combat sprites bigger and heavier with proper shadows.",
      "New Memory Wall on Family Stats — your wins and discoveries get remembered.",
      "Games now use the active player's name instead of 'Beckett'.",
    ],
  },
  {
    version: "1.10.11", date: "2025-12", title: "Family Roster",
    accent: "#9be3ff", emoji: "📋",
    highlights: [
      "New Family Roster page shows every family member's heroes, pilots, agents, and studios in one place.",
    ],
  },
  {
    version: "1.10.10", date: "2025-12", title: "Live cloud sync",
    accent: "#86efac", emoji: "☁️",
    highlights: [
      "Changes on one device show up on others in real time.",
      "Top 50 movie chart and Family Stats update live.",
      "A sync indicator pill on every screen shows online/offline.",
    ],
  },
  {
    version: "1.10.7", date: "2025-12", title: "Profile customization",
    accent: "#c084fc", emoji: "🎨",
    highlights: [
      "Edit your avatar, color, handle, tagline, and favorite game.",
      "Your favorite game gets a gold ★ ribbon on the home screen.",
    ],
  },
  {
    version: "1.10.5", date: "2025-12", title: "Family Top 50",
    accent: "#D4AF37", emoji: "🎬",
    highlights: [
      "Mogul movies now share one family Top 50 highest-grossing chart.",
      "Every family member's films compete on the same leaderboard.",
    ],
  },
  {
    version: "1.10.0", date: "2025-12", title: "Player profiles + cloud saves",
    accent: "#3D9BFF", emoji: "👨‍👩‍👧",
    highlights: [
      "Each family member has their own profile, saves, and stats.",
      "Switch profiles instantly from the corner badge.",
      "Saves now follow you across devices.",
      "New Family Stats page tracks everyone's wins.",
    ],
  },
];

const SEEN_KEY = "dd_whats_new_seen";

export default function WhatsNew() {
  const navigate = useNavigate();
  const [seenVersion, setSeenVersion] = useState<string | null>(() => {
    try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
  });
  useEffect(() => {
    // Mark the latest version as seen the first time the user opens this page.
    try { localStorage.setItem(SEEN_KEY, CHANGELOG[0].version); } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 20% 0%, rgba(192,132,252,0.16), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c084fc" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider flex items-center gap-2" style={{ color: "#ffd54a" }}>
            <Sparkles size={20} aria-hidden="true" /> WHAT'S NEW
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-12 max-w-3xl mx-auto w-full space-y-3">
        <p className="text-[12px] leading-relaxed mb-2" style={{ color: "rgba(229,231,235,0.7)" }}>
          The arcade keeps getting better. Here's what's been added recently — newest first.
        </p>
        {CHANGELOG.map((e, i) => {
          const isNewToThisDevice = seenVersion !== CHANGELOG[0].version && i === 0;
          return (
            <motion.section key={e.version}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.4, i * 0.04) }}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${e.accent}1f, rgba(10,10,20,0.85))`,
                border: `1.5px solid ${e.accent}55`,
                boxShadow: isNewToThisDevice ? `0 4px 18px -4px ${e.accent}66` : undefined,
              }}>
              <header className="flex items-center gap-3 mb-2">
                <div className="text-2xl" aria-hidden="true">{e.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base tracking-wide" style={{ color: e.accent }}>{e.title}</div>
                  <div className="text-[10px] tracking-widest opacity-70">v{e.version} · {e.date}</div>
                </div>
                {isNewToThisDevice && (
                  <span className="text-[9px] tracking-[0.3em] uppercase font-display px-2 py-0.5 rounded-full"
                    style={{ background: e.accent, color: "#0a0a14" }}>NEW</span>
                )}
              </header>
              <ul className="space-y-1 ml-2">
                {e.highlights.map((h, j) => (
                  <li key={j} className="text-[12px] leading-snug flex gap-2" style={{ color: "rgba(229,231,235,0.88)" }}>
                    <span aria-hidden="true" style={{ color: e.accent }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          );
        })}
        <div className="text-center text-[10px] opacity-60 pt-2" style={{ color: "#c4b5fd" }}>
          New updates land all the time. Check back later!
        </div>
      </main>
    </div>
  );
}

/** Used by the Landing footer pill to show a NEW dot when there's a
 *  recent update the player hasn't read. */
export function unseenLatest(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== CHANGELOG[0].version;
  } catch { return false; }
}

export { CHANGELOG };
