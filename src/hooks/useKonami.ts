// K.18 — Konami code listener: ↑ ↑ ↓ ↓ ← → ← → B A on keyboard,
// or up-up-down-down-swipe-tap pattern on touch (simplified to tap pattern).
import { useEffect } from "react";

const SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export function useKonami(onUnlock: () => void) {
  useEffect(() => {
    let idx = 0;
    const handler = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === SEQ[idx]) {
        idx++;
        if (idx === SEQ.length) {
          onUnlock();
          idx = 0;
        }
      } else {
        idx = k === SEQ[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onUnlock]);
}
