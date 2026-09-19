import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { usePrice } from "@/context/PriceContext";
import { api, apiError } from "@/lib/api";
import { LiveProfit } from "@/components/LiveProfit";
import { Countdown } from "@/components/Countdown";
import { ensureNotifyPermission } from "@/lib/notify";
import { fmtXRP, xrpToUsdLabel, TIER_META } from "@/lib/format";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp, Layers, ArrowDownToLine, ArrowUpFromLine,
  Lock, Crown, Sparkles, Clock, Repeat, Loader2, LogOut, AlertTriangle,
} from "lucide-react";

function ReinvestDialog({ open, onClose, profit, onDone }) {
  const [vaults, setVaults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const { rate } = usePrice();

  useEffect(() => {
    if (!open) return;
    api.get("/vaults").then(({ data }) => {
      setVaults(data.vaults);
      setSelected(data.vaults.find((v) => v.key === "xrp_flex") || data.vaults[0]);
    }).catch(() => {});
  }, [open]);

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.post("/reinvest", { vault_key: selected.key });
      toast.success(`Restaked ${fmtXRP(data.amount)} XRP into ${selected.name}.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md" data-testid="reinvest-dialog">
        <DialogHeader><DialogTitle className="text-xl">Restake your profit</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
            <p className="text-xs text-blue-100 uppercase tracking-wider">Available profit</p>
            <p className="font-mono text-3xl font-bold mt-1 tabular-nums" data-testid="reinvest-amount">{fmtXRP(profit)} <span className="text-sm text-blue-200">XRP</span></p>
            {rate ? <p className="font-mono text-sm text-blue-100">{xrpToUsdLabel(profit, rate, 2)}</p> : null}
            <p className="text-xs text-blue-200 mt-1">Compounds into a fresh stake — no new deposit needed.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0030cf] mb-2">Choose a vault</p>
            <div className="flex flex-wrap gap-2">
              {vaults.map((v) => {
                const ok = profit >= (v.min_amount || 0);
                return (
                  <button key={v.key} disabled={!ok} onClick={() => setSelected(v)} data-testid={`reinvest-vault-${v.key}`}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40 ${selected?.key === v.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                    {v.name} · {(v.apy * 100).toFixed(1)}%
                  </button>
                );
              })}
            </div>
            {selected && profit < (selected.min_amount || 0) && (
              <p className="text-xs text-amber-600 mt-2">Needs {fmtXRP(selected.min_amount, 0)} XRP profit for this vault.</p>
            )}
          </div>
          <button onClick={confirm} disabled={busy || !selected || profit <= 0} data-testid="confirm-reinvest-button"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl glow-blue transition-all">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <><Repeat size={16} /> Restake now</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExitStakeDialog({ stake, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const { rate } = usePrice();
  const open = !!stake;

  const confirm = async () => {
    if (!stake) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/stakes/${stake.id}/exit`);
      toast.success(`Stake stopped. ${fmtXRP(data.returned)} XRP credited to your balance.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const feePct = stake ? (stake.early_exit_fee * 100).toFixed(1) : "0";
  const slipPct = stake ? (stake.slippage * 100).toFixed(1) : "0";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md" data-testid="exit-stake-dialog">
        <DialogHeader><DialogTitle className="text-xl">Stop this stake early?</DialogTitle></DialogHeader>
        {stake && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={17} />
              <p className="text-xs text-amber-700">Stopping before the lock ends forfeits your accrued profit and applies an early exit fee and slippage. This can't be undone.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100" data-testid="exit-breakdown">
              <Row label="Principal" value={`${fmtXRP(stake.principal)} XRP`} sub={rate ? xrpToUsdLabel(stake.principal, rate, 0) : null} />
              <Row label={`Early exit fee (${feePct}%)`} value={`− ${fmtXRP(stake.early_exit_fee_amount)} XRP`} negative sub={rate ? xrpToUsdLabel(stake.early_exit_fee_amount, rate, 0) : null} />
              <Row label={`Slippage (${slipPct}%)`} value={`− ${fmtXRP(stake.early_exit_slippage_amount)} XRP`} negative sub={rate ? xrpToUsdLabel(stake.early_exit_slippage_amount, rate, 0) : null} />
              <Row label="Forfeited profit" value={`− ${fmtXRP(stake.accrued)} XRP`} negative sub={rate ? xrpToUsdLabel(stake.accrued, rate, 2) : null} />
              <Row label="You receive" value={`${fmtXRP(stake.early_exit_return)} XRP`} strong sub={rate ? xrpToUsdLabel(stake.early_exit_return, rate, 2) : null} />
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} data-testid="exit-cancel-button" className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors">Keep staking</button>
              <button onClick={confirm} disabled={busy} data-testid="confirm-exit-button" className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <><LogOut size={16} /> Stop stake</>}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, sub, negative, strong }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right">
        <span className={`font-mono text-sm ${strong ? "font-bold text-slate-900" : negative ? "text-red-600 font-medium" : "font-semibold text-slate-900"}`}>{value}</span>
        {sub ? <span className="block text-[11px] text-slate-400 font-mono">{sub}</span> : null}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, children, accent = "#0030cf", testid, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden glow-card shadow-sm"
      data-testid={testid}
    >
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
        <Icon size={15} style={{ color: accent }} /> {label}
      </div>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { serverState, user, serverOffset, refresh } = useAuth();
  const { rate } = usePrice();
  const navigate = useNavigate();
  const [reinvestOpen, setReinvestOpen] = useState(false);
  const [exitStake, setExitStake] = useState(null);

  useEffect(() => {
    ensureNotifyPermission();
  }, []);

  if (!serverState) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-9 h-9 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = serverState;
  const tier = TIER_META[s.tier] || TIER_META.starter;
  const activeStakes = s.stakes.filter((x) => x.principal > 0);
  const ti = s.tier_info;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-slate-500 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold text-slate-900">{user?.first_name} {user?.last_name}</h1>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold" style={{ background: tier.badge, color: tier.color, border: `1px solid ${tier.border}` }} data-testid="dashboard-tier-badge">
          <Crown size={15} /> {tier.label} VIP
        </div>
      </div>

      {s.user.locked && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4" data-testid="locked-banner">
          <Lock className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700">Your wallet is locked by an administrator. Actions are disabled until it's restored.</p>
        </div>
      )}
      {s.user.withdrawals_disabled && !s.user.locked && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4" data-testid="withdrawals-disabled-banner">
          <ArrowUpFromLine className="text-amber-600 shrink-0" size={18} />
          <p className="text-sm text-amber-700">Withdrawals are currently disabled for your account.</p>
        </div>
      )}

      {/* Hero balance — blue gradient */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 shadow-lg shadow-blue-600/20" data-testid="balance-hero">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Available Balance</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl sm:text-5xl font-bold text-white font-mono tabular-nums" data-testid="balance-amount">{fmtXRP(s.balance)}</span>
            <span className="text-lg text-blue-200 font-semibold mb-1">XRP</span>
          </div>
          {rate ? <p className="text-blue-100/90 font-mono text-sm mt-1" data-testid="balance-usd">{xrpToUsdLabel(s.balance, rate, 2)}</p> : null}
          <div className="flex items-center gap-2 mt-4 text-sm">
            <TrendingUp size={15} className="text-emerald-300" />
            <span className="text-blue-100">Live yield</span>
            <LiveProfit stakes={activeStakes} bonus={s.bonus_profit} offsetRef={serverOffset} testid="dashboard-live-profit" className="text-white font-semibold" />
            <span className="text-blue-200">XRP</span>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate("/app/deposit")} data-testid="quick-deposit-button" className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold py-3 rounded-xl hover:bg-blue-50 active:scale-[0.99] transition-all">
              <ArrowDownToLine size={17} /> Deposit
            </button>
            <button onClick={() => navigate("/app/withdraw")} data-testid="quick-withdraw-button" className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors">
              <ArrowUpFromLine size={17} /> Withdraw
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Layers} label="Total Staked" accent="#0030cf" testid="stat-total-staked" delay={0.05}>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{fmtXRP(s.total_staked)} <span className="text-sm text-slate-400">XRP</span></p>
          {rate ? <p className="text-xs text-slate-400 font-mono mt-1">{xrpToUsdLabel(s.total_staked, rate, 2)}</p> : null}
        </StatCard>
        <StatCard icon={Sparkles} label="Total Profit" accent="#059669" testid="stat-total-profit" delay={0.1}>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            <LiveProfit stakes={activeStakes} bonus={s.bonus_profit} offsetRef={serverOffset} /> <span className="text-sm text-slate-400">XRP</span>
          </p>
          {rate ? <p className="text-xs text-slate-400 font-mono mt-1">{xrpToUsdLabel(s.profit, rate, 2)}</p> : null}
          {s.profit >= 10 && (
            <button onClick={() => setReinvestOpen(true)} data-testid="reinvest-button" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0030cf] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">
              <Repeat size={13} /> Restake profit
            </button>
          )}
        </StatCard>
        <StatCard icon={Crown} label="Active Vaults" accent={tier.color} testid="stat-active-vaults" delay={0.15}>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{activeStakes.length}</p>
        </StatCard>
      </div>

      {ti?.next && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="tier-progress">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-medium">Progress to {TIER_META[ti.next]?.label}</span>
            <span className="text-slate-500 font-mono">{fmtXRP(s.total_staked, 0)} / {fmtXRP(ti.next_threshold, 0)} XRP</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${ti.progress * 100}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Active Stakes</h2>
          <button onClick={() => navigate("/app/vaults")} data-testid="view-vaults-link" className="text-sm text-[#0030cf] hover:underline">Explore vaults →</button>
        </div>
        {activeStakes.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center" data-testid="no-stakes">
            <Layers className="mx-auto text-slate-300 mb-3" size={30} />
            <p className="text-slate-500 text-sm">No active stakes yet. Deposit XRP and open a vault to start earning.</p>
            <button onClick={() => navigate("/app/vaults")} data-testid="open-first-vault-button" className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">Open a vault</button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="active-stakes-list">
            {activeStakes.map((st) => {
              const meta = TIER_META[st.tier] || TIER_META.flex;
              return (
                <div key={st.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 glow-card shadow-sm" data-testid={`stake-${st.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: meta.badge, border: `1px solid ${meta.border}` }}>
                        <Layers size={18} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{st.vault_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{(st.apy * 100).toFixed(1)}% APY · {st.duration_days ? `${st.duration_days}d lock` : "Flexible"}</p>
                      </div>
                    </div>
                    {st.status === "matured" ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Matured</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#0030cf] border border-blue-200"><Clock size={11} /> Active</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Principal</p>
                      <p className="font-mono font-semibold text-slate-900">{fmtXRP(st.principal)} XRP</p>
                      {rate ? <p className="text-[11px] text-slate-400 font-mono">{xrpToUsdLabel(st.principal, rate, 0)}</p> : null}
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Earned</p>
                      <p className="font-semibold text-emerald-600"><LiveProfit stakes={[st]} offsetRef={serverOffset} className="text-emerald-600" /> <span className="text-xs text-slate-400">XRP</span></p>
                    </div>
                  </div>
                  {st.duration_days > 0 && st.status !== "matured" && (
                    <div className="flex items-center justify-between mt-3 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5"><Clock size={12} /> Unlocks in</span>
                      <Countdown target={st.matures_at} offsetRef={serverOffset} className="font-mono text-sm font-semibold text-[#0030cf] tabular-nums" testid={`countdown-${st.id}`} />
                    </div>
                  )}
                  {st.can_exit && !s.user.locked && (
                    <button onClick={() => setExitStake(st)} data-testid={`stop-stake-${st.id}`} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg py-2 transition-colors">
                      <LogOut size={13} /> Stop stake early
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReinvestDialog open={reinvestOpen} onClose={() => setReinvestOpen(false)} profit={s.profit} onDone={refresh} />
      <ExitStakeDialog stake={exitStake} onClose={() => setExitStake(null)} onDone={refresh} />
    </div>
  );
}
