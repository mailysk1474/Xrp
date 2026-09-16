import { useEffect, useState } from "react";

// Live countdown to a target ISO timestamp, ticking every second.
export function Countdown({ target, offsetRef, className = "", testid }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    const tick = () => {
      const now = Date.now() + (offsetRef?.current || 0);
      setRemaining(Math.max(0, t - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, offsetRef]);

  if (!target) return null;
  if (remaining <= 0) return <span className={className} data-testid={testid}>Matured</span>;

  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`;

  return <span className={className} data-testid={testid}>{label}</span>;
}
