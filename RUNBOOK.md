# Henry's Diamond Dynasty Sim — Runbook

A self-contained, installable PWA baseball management simulation. Pure simulation — no arcade gameplay.

## Launch

### Local development
```
cd henry-dynasty
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173). Hot-reload works.

### Production build
```
npm run build
npm run preview
```
Production assets land in `dist/`. The `preview` command serves them on http://localhost:4173.

### Deploying anywhere static
`dist/` is a flat folder of static files. Drop it onto Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3+CloudFront, or any nginx — no backend needed.

## Install as a PWA on iPhone

Same Add-to-Home-Screen flow as iPad but in **Safari on iPhone**:

1. Open the deployed site in Safari
2. Tap the **Share** button (square with up-arrow) at the bottom of the screen
3. Scroll to **Add to Home Screen**, tap it
4. Name it "Diamond Dynasty" → tap **Add**

iPhone-specific notes:
- Layouts collapse to single column under 768px
- Training Camp pitching screens stack the strike-zone grid below the net tap zone
- Score Keeper buttons are sized for one-handed thumb use (min 60×60px on primary actions)
- Camera Coach uses the **back camera** by default on iPhone for better quality — prop the phone 4–6 feet away
- Camera Coach will request camera permission on first use; if denied, fix it in iOS Settings → Safari → Camera

## Training Camp setup

1. After creating a league and finishing Welcome, open the side nav → **Training Camp**
2. First time: tap **"Add Henry to the league"** in the top-right of Training Camp → fill in name / bats / throws / age / jersey / team → Create
3. Henry now appears in the league roster, starting around OVR 36
4. From Training Camp home: pick a drill of the day, log swings/pitches, or jump to a Live Game

### Camera Coach (optional)

- Tap "Turn on Camera Coach" on Hitting or Pitching practice screens
- Allow camera access in Safari when prompted
- iPad: front camera by default, prop on a stand at side angle, 6–10 feet away
- iPhone: back camera, vertical framing, 4–6 feet away
- MediaPipe Pose loads from CDN on first use (~3 MB cached); offline-safe afterwards
- All video stays on-device — nothing is uploaded

### Live Game

- Training Camp → Live Game (or click the green ▶ Play button on any scheduled game)
- Pick teams, length, difficulty, hit PLAY BALL
- When YOUR team pitches: strike-zone grid + pitch type + result for every pitch you throw
- When YOUR team bats: net tap-zone + quality button for every swing you take
- Game state auto-saves every play; close + return without losing progress
- Final screen shows the box score side-by-side with Henry's personal stat line

## Install as a PWA on iPad

1. Open the deployed site (or `http://<your-laptop-ip>:4173` while preview is running) in **Safari** on the iPad.
2. Tap the **Share** button → **Add to Home Screen** → name it "Diamond Dynasty".
3. The icon launches the app fullscreen with no Safari chrome and remembers your league between sessions.

Saves are stored in IndexedDB, so they survive Safari restarts and reboots — but they are tied to the specific browser profile. Use **Settings → Data → Export League** for portable backups.

## First Run

1. The splash screen plays for ~1.5s.
2. On the Dashboard you'll see "No League Loaded".
3. Go to **Settings → New League** (also reachable from the Settings page when no league exists).
4. Choose:
   - Number of teams (2–32, default 30)
   - Schedule length (30/60/82/120/162 games)
   - Mode (Fantasy with random names + logos, or MLB with the 30 real franchises)
5. Click **Create League**. Generation takes ~1–2 seconds and produces:
   - 30 teams with procedural logos, colors, stadiums, managers
   - ~1,350 players on 45-man rosters
   - 120+ free agents
   - 50 years of pre-baked league history and award winners

## Daily Use

- **Sim Day / +1 Week / +1 Month** — buttons in the top-right command bar (desktop) or bottom-right floating action (tablet).
- Click any game in **Schedule** to **watch it live** (pitch-by-pitch with playable feed, linescore, score updates).
- Click any team card to manage the 45-man roster (Starters / Bench / Bullpen / Reserves / Schedule / Stats / Finances / History tabs).
- Click any player to open the baseball-card flip view with editable ratings.
- **Free Agency** is always available — drop a player onto your team subject to the salary cap.
- After the regular season ends, **Playoffs** unlocks the bracket. Sim round-by-round or all at once.
- After the World Series, transition to **Draft → Free Agency → Begin Next Season** for the offseason cycle.

## Reset / Wipe

**Settings → Data → New League** — Creates a fresh league. Old leagues remain in storage; switch with **Saved Leagues** at the bottom of the Data tab.

To wipe **everything**, in the iPad: Settings app → Safari → Advanced → Website Data → search "Diamond" → Delete.

On desktop: open DevTools → Application → IndexedDB → `HenryDiamondDynasty` → Delete database.

## Import / Export

- **Settings → Data → Export League** downloads the current league as `diamond-dynasty-<year>.json` (about 2-5 MB).
- **Import League** accepts that JSON file. Useful for sharing leagues between devices or backing up before risky edits.

## Known Limits

- **No backend, no multiplayer.** All games are local.
- **Storage is per-browser.** Safari iPad and Safari Mac don't share storage; export/import to move leagues.
- **No real-time pitch-by-pitch audio** — Howler is wired but only menu/SFX sounds are bundled. You can add walk-up music files into `public/audio/` and they'll be picked up by future builds.
- **Manager AI is simple** — lineup picks favor overall rating; bullpen logic uses fatigue + leverage but not full bullpen role optimization.
- **Trades engine is stubbed** — the model exists in types but a full trade UI isn't yet shipped. Roster moves are done via free agency.
- **Spray charts / heat maps** — feature flags exist; visual implementations are placeholder.
- **Real MLB Mode** ships with the 30 current teams but not the full historical roster — players are still procedurally generated.

## Touch Behavior

- All buttons are ≥44×44 px.
- Card taps use scale-down spring animation.
- Bottom tab bar on tablets and phones; side nav on ≥1024 px.
- Pull-down dismiss on overlays; tap-outside closes modals.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| App stuck on splash | Hard-reload (Cmd-Shift-R / pull-to-refresh). If persistent, clear site data. |
| Save not appearing on second device | Use Export → Import; storage is local per device. |
| Logos appear as broken squares | Browser is blocking inline SVG — try a fresh browser profile. |
| Sim hangs | Browser tab paused (mobile background). Bring app back to foreground. |

## File Layout

```
src/
  components/      shared UI primitives (Layout, TeamLogo, PlayerPortrait, etc.)
  data/            static name pools, mascot affinity table, palettes, MLB seed data
  db/              Dexie IndexedDB wrapper
  engine/          sim, season, playoffs, offseason logic
  generators/      teams, rosters, schedules, logos, portraits, history
  pages/           one file per route
  store/           Zustand + immer global state
  styles/          tailwind + globals.css
  utils/           rand, format helpers
public/            favicon, PWA icons
```
