import { useEffect, useRef, useState } from "react";
import { liveAccrued, fmtXRP } from "@/lib/format";

// Smooth live-ticking profit counter using requestAnimationFrame.
export function LiveProfit({ stakes = [], bonus = 0, offsetRef, digits = 4, className = "", testid }) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const tick = () => {
      const off = offsetRef?.current || 0;
      let total = bonus || 0;
      for (const s of stakes) total += liveAccrued(s, off);
      setValue(total);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [stakes, bonus, offsetRef]);

  return (
    <span className={`font-mono tabular-nums ${className}`} data-testid={testid}>
      {fmtXRP(value, digits)}
    </span>
  );
}
