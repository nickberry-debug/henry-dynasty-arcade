// Touch-first numeric stepper. No keyboard popup. Press-and-hold for fast change.
import { useRef } from "react";
import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
  width?: string;
}

export function NumberStepper({ value, min, max, step = 1, onChange, className = "", width = "w-12" }: Props) {
  const holdRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const startHold = (delta: number) => {
    onChange(clamp(value + delta));
    holdRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onChange(Math.max(min, Math.min(max, (Number(holdRef.current?.v ?? value)) + delta)));
        holdRef.current.v = (holdRef.current.v ?? value) + delta;
      }, 80);
    }, 350);
  };
  const stopHold = () => {
    clearTimeout(holdRef.current);
    clearInterval(intervalRef.current);
    holdRef.current = null;
    intervalRef.current = null;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onPointerDown={() => startHold(-step)}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onPointerLeave={stopHold}
        className="w-9 h-9 rounded-lg bg-white/5 active:bg-white/10 flex items-center justify-center pressable touch-target disabled:opacity-30"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <span className={`${width} text-center font-mono font-bold tabular-nums select-none`} aria-live="polite">{Math.round(value)}</span>
      <button
        type="button"
        onPointerDown={() => startHold(step)}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onPointerLeave={stopHold}
        className="w-9 h-9 rounded-lg bg-white/5 active:bg-white/10 flex items-center justify-center pressable touch-target disabled:opacity-30"
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
