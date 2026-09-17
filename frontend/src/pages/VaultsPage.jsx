import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { fmtXRP, TIER_META } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Layers, Lock, Zap, TrendingUp, Loader2, BarChart3 } from "lucide-react";

export default function VaultsPage() {
  const { serverState, refresh } = useAuth();
  const [vaults, setVaults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareAmount, setCompareAmount] = useState(1000);

  useEffect(() => {
    api.get("/vaults").then(({ data }) => setVaults(data.vaults)).catch(() => {});
  }, []);

  const balance = serverState?.balance ?? 0;
  const locked = serverState?.user?.locked;

  const openStake = (v) => {
    if (locked) return toast.error("Your wallet is locked. Staking is disabled.");
    setSelected(v);
    setAmount("");
  };

  const submitStake = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.");
    if (amt < selected.min_amount) return toast.error(`Minimum is ${fmtXRP(selected.min_amount, 0)} XRP.`);
    if (amt > balance) return toast.error("Insufficient balance. Deposit XRP first.");
    setSubmitting(true);
    try {
      await api.post("/stakes", { vault_key: selected.key, amount: amt });
      toast.success(`Staked ${fmtXRP(amt)} XRP into ${selected.name}.`);
      setSelected(null);
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vaults</h1>
          <p className="text-sm text-slate-500 mt-1">Available balance: <span className="text-slate-900 font-mono font-semibold">{fmtXRP(balance)} XRP</span></p>
        </div>
        <button onClick={() => setShowCompare((v) => !v)} data-testid="compare-toggle" className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <BarChart3 size={16} /> {showCompare ? "Hide comparison" : "Compare vaults"}
        </button>
      </div>

      {showCompare && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} data-testid="compare-panel" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-semibold text-slate-900">Vault comparison</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Amount</span>
              <input type="number" value={compareAmount} onChange={(e) => setCompareAmount(Math.max(0, parseFloat(e.target.value) || 0))} data-testid="compare-amount" className="w-32 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1.5 font-mono outline-none" />
              <span className="text-slate-500">XRP</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4 font-semibold">Vault</th>
                  <th className="py-2 px-4 font-semibold">APY</th>
                  <th className="py-2 px-4 font-semibold">Lock</th>
                  <th className="py-2 px-4 font-semibold">Min stake</th>
                  <th className="py-2 px-4 font-semibold">Yield at maturity</th>
                  <th className="py-2 pl-4 font-semibold">Annualized</th>
                </tr>
              </thead>
              <tbody>
                {vaults.map((v) => {
                  const meta = TIER_META[v.tier] || TIER_META.flex;
                  const perYear = compareAmount * v.apy;
                  const termYield = v.duration_days ? perYear * (v.duration_days / 365) : perYear;
                  return (
                    <tr key={v.key} className="border-b border-slate-50 last:border-0" data-testid={`compare-row-${v.key}`}>
                      <td className="py-3 pr-4 font-semibold text-slate-900"><span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: meta.color }} />{v.name}</td>
                      <td className="py-3 px-4 font-mono font-bold" style={{ color: meta.color }}>{(v.apy * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-slate-600">{v.duration_days ? `${v.duration_days} days` : "Flexible"}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{fmtXRP(v.min_amount, 0)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">+{fmtXRP(termYield)}</td>
                      <td className="py-3 pl-4 font-mono text-slate-600">+{fmtXRP(perYear)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Illustrative projections based on each vault's fixed APY. "Yield at maturity" reflects the lock term; flexible vaults show one year.</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="vaults-grid">
        {vaults.map((v, i) => {
          const meta = TIER_META[v.tier] || TIER_META.flex;
          return (
            <motion.div key={v.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }} className="relative flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-6 glow-card shadow-sm" data-testid={`vault-card-${v.key}`}>
              <div className="absolute right-5 top-5">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: meta.badge, color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
              </div>
              <div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: meta.badge, border: `1px solid ${meta.border}` }}>
                  <Layers size={20} style={{ color: meta.color }} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{v.name}</h3>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold font-mono tabular-nums" style={{ color: meta.color }}>{(v.apy * 100).toFixed(1)}%</span>
                  <span className="text-xs text-slate-400 font-semibold">APY</span>
                </div>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">{v.description}</p>
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {v.duration_days ? <><Lock size={13} /> {v.duration_days}-day lock</> : <><Zap size={13} className="text-blue-500" /> Flexible term</>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><TrendingUp size={13} /> Min {fmtXRP(v.min_amount, 0)} XRP</div>
                <button onClick={() => openStake(v)} disabled={!v.enabled} data-testid={`stake-button-${v.key}`} className="w-full mt-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.99]">Stake XRP</button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md" data-testid="stake-dialog">
          <DialogHeader><DialogTitle className="text-xl">Stake into {selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-slate-500">APY</span>
                <span className="font-mono font-bold" style={{ color: (TIER_META[selected.tier] || TIER_META.flex).color }}>{(selected.apy * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-slate-500">Term</span>
                <span className="text-slate-900">{selected.duration_days ? `${selected.duration_days} days` : "Flexible"}</span>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">Amount (XRP)</label>
                <div className="relative mt-1.5">
                  <input data-testid="stake-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 pr-16 text-slate-900 outline-none font-mono transition-all" placeholder={`Min ${fmtXRP(selected.min_amount, 0)}`} />
                  <button onClick={() => setAmount(String(balance))} data-testid="stake-max-button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#0030cf] bg-blue-50 px-2.5 py-1 rounded-lg">MAX</button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Available: {fmtXRP(balance)} XRP</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={submitStake} disabled={submitting} data-testid="confirm-stake-button" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl glow-blue transition-all">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : "Confirm stake"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
