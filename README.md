# Henry's Diamond Dynasty Sim

Pure baseball management simulation, made for Henry. PWA-installable on iPad. Vite + React + TypeScript + Tailwind. IndexedDB-backed saves. No backend.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serves dist/ on http://localhost:4173
```

See **RUNBOOK.md** for full launch + install instructions and **CHANGELOG.md** for feature inventory.

```
src/
├── components/   shared UI
├── data/         name pools, mascot affinities, palettes, MLB seed data
├── db/           Dexie IndexedDB
├── engine/       sim, season, playoffs, offseason
├── generators/   teams, players, logos (30+ shapes × 50+ mascots), portraits
├── pages/        one file per route
├── store/        Zustand + Immer
└── styles/       tailwind + globals
```
