# Deploying Berry Kids' Arcade from a fresh PC

Use this when you're on a Windows machine that has never built or
deployed the arcade before.

## One-time install (5 min)

1. Install **Node.js LTS** — https://nodejs.org/
2. Install **Git for Windows** — https://git-scm.com/download/win
3. (Optional) Make sure you can log into Vercel with
   `nick.berry@yomamasfoods.com` — same account as the original PC.

Verify both are installed by opening Command Prompt and running:

```cmd
node --version
git --version
```

You should see versions print, not "not recognized".

## Deploy

1. Download `deploy-new-pc.bat` (this file lives in the repo at
   `henry-dynasty/scripts/deploy-new-pc.bat`).
2. Drop it anywhere — Desktop is fine.
3. Double-click it.

What it does:

- First run: clones the repo into `C:\Arcade\yom-ops-hub`, installs
  dependencies, builds, and deploys.
- Subsequent runs: pulls the latest commits from
  `origin/polish-pass`, rebuilds, redeploys.

First-run prompts you'll see:

- **Vercel login** — browser tab opens; sign in with your usual email.
- **"Link to existing project?"** — answer **Y**, then pick the
  existing project called `henry-dynasty`. After that, every run is
  one click.

## What's in the latest deploy

Branch `polish-pass`, commit `ac6ff04` and earlier, includes:

- Spell Game (adaptive difficulty + 6-tier hint stack)
- Shared art foundation (procedural parallax / particles / lighting /
  shadows / juice kit)
- v1.9.1 footer chip
- Battle Forge fixes (canvas size floor + 60s safety timeout)
- Potion Lab themed expansion
- WCAG 2.1 AA accessibility pass

## Troubleshooting

- **"git not recognized"** → reinstall Git for Windows; close + reopen
  Command Prompt so PATH refreshes.
- **"vercel: command not found"** → the script uses `npx vercel`
  which downloads it on demand; the first run takes ~30 s extra.
- **Build fails with TS errors** → pull is up to date but a transient
  source error slipped in. Re-run the script; if it persists, paste
  the error back to Claude.
- **Vercel asks for a team / scope** → pick your personal scope
  (same one that owns henry-dynasty.vercel.app).
