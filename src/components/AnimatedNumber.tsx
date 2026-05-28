import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  fractionDigits?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({ value, fractionDigits = 0, duration = 600, className = "", prefix = "", suffix = "" }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (fromRef.current === value) return;
    const from = fromRef.current;
    const to = value;
    startRef.current = performance.now();
    cancelAnimationFrame(rafRef.current!);
    const step = (t: number) => {
      const e = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - e, 3);
      setDisplay(from + (to - from) * eased);
      if (e < 1) rafRef.current = requestAnimationFrame(step);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [value, duration]);

  return <span className={className}>{prefix}{display.toFixed(fractionDigits)}{suffix}</span>;
}
