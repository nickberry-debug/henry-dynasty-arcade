// One-shot confetti burst. Renders a fixed-position overlay of falling
// colored particles for ~2.5 seconds when active. Pure CSS animation,
// no external deps.

import { useEffect, useState } from "react";

interface ConfettiProps {
  /** Set to true to trigger a burst. Auto-resets after the animation. */
  active: boolean;
  count?: number;
}

const COLORS = ["#DAA520", "#FFD700", "#86efac", "#b39dff", "#fb7185", "#7dd3fc"];

export function Confetti({ active, count = 60 }: ConfettiProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (active) {
      setShow(true);
      const t = window.setTimeout(() => setShow(false), 2800);
      return () => window.clearTimeout(t);
    }
  }, [active]);

  if (!show) return null;

  const pieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.6 + Math.random() * 1.2;
    const color = COLORS[i % COLORS.length];
    const rotate = Math.random() * 360;
    const size = 6 + Math.random() * 6;
    return (
      <span
        key={i}
        className="absolute top-0 block"
        style={{
          left: `${left}%`,
          width: size,
          height: size * 0.5,
          background: color,
          transform: `rotate(${rotate}deg)`,
          animation: `dd-confetti-fall ${duration}s linear ${delay}s forwards`,
          opacity: 0.95,
          borderRadius: 1,
        }}
      />
    );
  });

  return (
    <>
      <style>{`@keyframes dd-confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(120vh) rotate(720deg); opacity: 0; } }`}</style>
      <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">{pieces}</div>
    </>
  );
}
