import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LiveProfit } from "@/components/LiveProfit";
import { Countdown } from "@/components/Countdown";
import { ensureNotifyPermission } from "@/lib/notify";
import { fmtXRP, TIER_META } from "@/lib/format";
import { motion } from "framer-motion";
import {
  TrendingUp, Layers, ArrowDownToLine, ArrowUpFromLine,
  Lock, Crown, Sparkles, Clock,
} from "lucide-react";

function StatCard({ icon: Icon, label, children, accent = "#2563EB", testid, delay = 0 }) {
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
  const { serverState, user, serverOffset } = useAuth();
  const navigate = useNavigate();

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
        <StatCard icon={Layers} label="Total Staked" accent="#2563EB" testid="stat-total-staked" delay={0.05}>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{fmtXRP(s.total_staked)} <span className="text-sm text-slate-400">XRP</span></p>
        </StatCard>
        <StatCard icon={Sparkles} label="Total Profit" accent="#059669" testid="stat-total-profit" delay={0.1}>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            <LiveProfit stakes={activeStakes} bonus={s.bonus_profit} offsetRef={serverOffset} /> <span className="text-sm text-slate-400">XRP</span>
          </p>
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
          <button onClick={() => navigate("/app/vaults")} data-testid="view-vaults-link" className="text-sm text-blue-600 hover:underline">Explore vaults →</button>
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
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Clock size={11} /> Active</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Principal</p>
                      <p className="font-mono font-semibold text-slate-900">{fmtXRP(st.principal)} XRP</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Earned</p>
                      <p className="font-semibold text-emerald-600"><LiveProfit stakes={[st]} offsetRef={serverOffset} className="text-emerald-600" /> <span className="text-xs text-slate-400">XRP</span></p>
                    </div>
                  </div>
                  {st.duration_days > 0 && st.status !== "matured" && (
                    <div className="flex items-center justify-between mt-3 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5"><Clock size={12} /> Unlocks in</span>
                      <Countdown target={st.matures_at} offsetRef={serverOffset} className="font-mono text-sm font-semibold text-blue-600 tabular-nums" testid={`countdown-${st.id}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
