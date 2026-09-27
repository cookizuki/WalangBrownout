import { useEffect, useRef, useState } from "react";

/** React Bits style CountUp — animates from `from` to `to` on mount / value change. */
export function CountUp({
  to,
  from = 0,
  duration = 900,
  suffix = "",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const [value, setValue] = useState(from);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const startVal = from;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(startVal + (to - startVal) * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, from, duration]);

  return (
    <span className={className}>
      {value}
      {suffix}
    </span>
  );
}
