// AETHERSONG touch d-pad. Reports unit-vector via onMove.

import { useEffect, useRef } from "react";

interface Props {
  onMove: (dx: number, dy: number) => void;
  size?: number;
}

export function JrpgJoystick({ onMove, size = 140 }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activeId = useRef<number | null>(null);
  const center = useRef<{ x: number; y: number } | null>(null);
  const radius = size * 0.38;

  useEffect(() => {
    const base = baseRef.current;
    const stick = stickRef.current;
    if (!base || !stick) return;

    function handleStart(ev: PointerEvent): void {
      ev.preventDefault();
      const baseEl = baseRef.current; if (!baseEl) return;
      activeId.current = ev.pointerId;
      const rect = baseEl.getBoundingClientRect();
      center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      baseEl.setPointerCapture(ev.pointerId);
    }
    function handleMove(ev: PointerEvent): void {
      if (activeId.current !== ev.pointerId || !center.current) return;
      const dx = ev.clientX - center.current.x;
      const dy = ev.clientY - center.current.y;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, radius);
      const nx = dist > 0.001 ? (dx / dist) * clamped : 0;
      const ny = dist > 0.001 ? (dy / dist) * clamped : 0;
      const stickEl = stickRef.current;
      if (stickEl) stickEl.style.transform = "translate(" + nx + "px, " + ny + "px)";
      const ux = dist > 0.001 ? dx / dist : 0;
      const uy = dist > 0.001 ? dy / dist : 0;
      const mag = Math.min(1, dist / radius);
      onMove(ux * mag, uy * mag);
    }
    function handleEnd(ev: PointerEvent): void {
      if (activeId.current !== ev.pointerId) return;
      activeId.current = null;
      const stickEl = stickRef.current;
      if (stickEl) stickEl.style.transform = "translate(0px, 0px)";
      onMove(0, 0);
      const baseEl = baseRef.current;
      if (baseEl && baseEl.hasPointerCapture(ev.pointerId)) baseEl.releasePointerCapture(ev.pointerId);
    }

    base.addEventListener("pointerdown", handleStart, { passive: false });
    base.addEventListener("pointermove", handleMove, { passive: false });
    base.addEventListener("pointerup", handleEnd);
    base.addEventListener("pointercancel", handleEnd);
    return () => {
      base.removeEventListener("pointerdown", handleStart);
      base.removeEventListener("pointermove", handleMove);
      base.removeEventListener("pointerup", handleEnd);
      base.removeEventListener("pointercancel", handleEnd);
    };
  }, [onMove, radius]);

  const stickSize = Math.floor(size * 0.45);
  return (
    <div
      ref={baseRef}
      style={{
        position: "fixed", left: 14, bottom: 18,
        width: size, height: size,
        borderRadius: "50%",
        background: "rgba(20,20,30,0.45)",
        border: "2px solid rgba(255,255,255,0.18)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
        touchAction: "none",
        zIndex: 25,
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div
        ref={stickRef}
        style={{
          width: stickSize, height: stickSize, borderRadius: "50%",
          background: "rgba(255,255,255,0.34)",
          border: "2px solid rgba(255,255,255,0.6)",
          transform: "translate(0px, 0px)",
          transition: "transform 80ms ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

interface ActionProps { onA: () => void; onB?: () => void; }
export function JrpgActionButtons({ onA, onB }: ActionProps) {
  function Btn({ label, onClick, right }: { label: string; onClick: () => void; right: number }) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); onClick(); }}
        onTouchStart={(e) => { e.preventDefault(); onClick(); }}
        style={{
          position: "fixed", right, bottom: 28,
          width: 70, height: 70, borderRadius: "50%",
          background: "rgba(40,30,50,0.7)",
          border: "2px solid #fbbf24",
          color: "#fde68a",
          fontFamily: "system-ui",
          fontWeight: 800, fontSize: 22,
          touchAction: "manipulation",
          zIndex: 25,
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <>
      <Btn label="A" onClick={onA} right={18} />
      {onB && <Btn label="B" onClick={onB} right={100} />}
    </>
  );
}
