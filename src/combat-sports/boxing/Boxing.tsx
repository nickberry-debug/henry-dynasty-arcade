// src/combat-sports/boxing/Boxing.tsx
//
// DEPRECATED — the standalone /boxing page was removed. Boxing now
// lives inside Sports Versus (`/versus/boxing`). This file is kept as
// a no-op stub because the host filesystem won't let us delete it from
// the workspace mount; once the file can be physically removed, this
// stub goes with it.
//
// All boxing engine logic now lives in `engine.ts`, `rps.ts`,
// `fighters.ts`, `boxerState.ts`, and `proceduralBoxer.ts`, which are
// imported directly by `src/versus/pages/BoxingVersus.tsx`.

import { Navigate } from "react-router-dom";

export default function Boxing() {
  return <Navigate to="/versus" replace />;
}
