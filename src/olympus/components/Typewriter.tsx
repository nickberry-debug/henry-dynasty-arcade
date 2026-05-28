// Reveals text one character at a time. Used for the adventure-end
// twist so the reveal lands as a moment rather than a wall of prose.

import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  /** Milliseconds between characters. Lower = faster. */
  speedMs?: number;
  /** Optional delay before starting. */
  delayMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Typewriter({ text, speedMs = 22, delayMs = 0, className = "", style }: TypewriterProps) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    let timer: number | null = null;
    const start = window.setTimeout(() => {
      const tick = () => {
        i += 1;
        setShown(text.slice(0, i));
        if (i < text.length) timer = window.setTimeout(tick, speedMs);
      };
      tick();
    }, delayMs);
    return () => {
      window.clearTimeout(start);
      if (timer) window.clearTimeout(timer);
    };
  }, [text, speedMs, delayMs]);
  return <span className={className} style={style}>{shown}<span className="opacity-50">{shown.length < text.length ? "▌" : ""}</span></span>;
}
