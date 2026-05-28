// Lightweight a11y primitives shared across the arcade.
// Keeps a single import path so we don't sprinkle reinventions
// of focus-trap / Esc-to-close logic across every modal.

import { useEffect, useRef } from "react";

/** Wire Esc-to-close + focus return on mount/unmount for a modal.
 *  Pair with role="dialog" aria-modal="true" on the dialog container.
 *  Caller passes the modal root ref so we can move initial focus inside
 *  it (so the next Tab traps inside the dialog naturally for most layouts). */
export function useModal(opts: {
  onClose: () => void;
  /** Optional ref to the dialog container; first focusable child is focused on mount. */
  containerRef?: React.RefObject<HTMLElement>;
  /** Set false to disable Esc handling (rare). */
  closeOnEsc?: boolean;
}): void {
  const { onClose, containerRef, closeOnEsc = true } = opts;
  const lastFocused = useRef<Element | null>(null);

  useEffect(() => {
    lastFocused.current = document.activeElement;
    // Move focus into the dialog (first focusable, or container itself).
    requestAnimationFrame(() => {
      const root = containerRef?.current;
      if (!root) return;
      const first = root.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (first ?? root).focus?.();
    });

    function onKey(e: KeyboardEvent) {
      if (!closeOnEsc) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll while modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (lastFocused.current && (lastFocused.current as HTMLElement).focus) {
        (lastFocused.current as HTMLElement).focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Standard a11y attributes to spread onto a dialog container. */
export function dialogProps(labelledBy?: string) {
  return {
    role: "dialog" as const,
    "aria-modal": true as const,
    ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
    tabIndex: -1,
  };
}
