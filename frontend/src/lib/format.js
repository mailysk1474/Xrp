export function fmtXRP(n, digits = 2) {
  if (n == null || isNaN(n)) n = 0;
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const TIER_META = {
  starter: { label: "Starter", color: "#64748B", badge: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)" },
  flex: { label: "Flex", color: "#0284C7", badge: "rgba(2,132,199,0.10)", border: "rgba(2,132,199,0.25)" },
  silver: { label: "Silver", color: "#64748B", badge: "rgba(100,116,139,0.10)", border: "rgba(148,163,184,0.35)" },
  gold: { label: "Gold", color: "#D97706", badge: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.30)" },
  platinum: { label: "Platinum", color: "#475569", badge: "rgba(71,85,105,0.10)", border: "rgba(71,85,105,0.30)" },
  diamond: { label: "Diamond", color: "#9333EA", badge: "rgba(147,51,234,0.10)", border: "rgba(147,51,234,0.30)" },
};

// Live per-second accrual rate for a stake, used for the ticking counter.
export function accrualRatePerSecond(stake) {
  return (stake.principal * stake.apy) / (365 * 24 * 3600);
}

// Compute live accrued profit for a stake given current time.
export function liveAccrued(stake, serverOffsetMs = 0) {
  const now = Date.now() + serverOffsetMs;
  const start = new Date(stake.start_at).getTime();
  let elapsed = (now - start) / 1000;
  if (elapsed < 0) elapsed = 0;
  const dur = stake.duration_days || 0;
  if (dur > 0) elapsed = Math.min(elapsed, dur * 86400);
  const gross = (stake.principal * stake.apy * elapsed) / (365 * 24 * 3600);
  const net = gross - (stake.claimed_profit || 0);
  return net > 0 ? net : 0;
}
