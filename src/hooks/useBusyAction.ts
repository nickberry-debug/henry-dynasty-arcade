// Shared helper for kicking off heavy state mutations with a busy
// indicator and an explicit yield to the browser between the tap and
// the heavy work. Without the yield, the spinner doesn't paint before
// the main thread blocks — that was the football "froze up a bit"
// experience. Now every long-running action in the app can use this.
import { useState, useCallback } from "react";

/** Pattern:
 *
 *   const [busy, run] = useBusyAction();
 *   ...
 *   <button disabled={busy} onClick={() => run(async () => {
 *     await mutate(lg => { simNDays(lg, 30); });
 *   })}>Sim Month</button>
 *
 * The yield happens INSIDE run(): React renders the disabled+spinner
 * state, then setTimeout(0) fires, then the work happens.
 */
export function useBusyAction(): [boolean, (work: () => Promise<void> | void) => Promise<void>] {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    // Two-phase yield: rAF schedules after the next paint, setTimeout
    // pushes past it. Combined, this is the most reliable way to make
    // the busy state render before we block the main thread.
    await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 0)));
    try { await work(); }
    finally { setBusy(false); }
  }, [busy]);
  return [busy, run];
}
