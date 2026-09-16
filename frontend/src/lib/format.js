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
  starter: { label: "Starter", color: "#94A3B8", badge: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
  flex: { label: "Flex", color: "#38BDF8", badge: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" },
  silver: { label: "Silver", color: "#CBD5E1", badge: "rgba(203,213,225,0.12)", border: "rgba(203,213,225,0.3)" },
  gold: { label: "Gold", color: "#F59E0B", badge: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  platinum: { label: "Platinum", color: "#E2E8F0", badge: "rgba(226,232,240,0.15)", border: "rgba(226,232,240,0.4)" },
  diamond: { label: "Diamond", color: "#A855F7", badge: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.4)" },
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
  return (stake.principal * stake.apy * elapsed) / (365 * 24 * 3600);
}
