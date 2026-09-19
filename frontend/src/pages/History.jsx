import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, apiError, downloadTransactions } from "@/lib/api";
import { usePrice } from "@/context/PriceContext";
import { fmtXRP, fmtDate, xrpToUsdLabel } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Layers, Sparkles, Settings2, Receipt, LogOut, CheckCircle2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

const TYPE_META = {
  deposit: { label: "Deposit", icon: ArrowDownToLine, color: "#059669", sign: "+" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpFromLine, color: "#D97706", sign: "-" },
  stake: { label: "Stake", icon: Layers, color: "#0030cf", sign: "-" },
  early_exit: { label: "Early exit", icon: LogOut, color: "#DC2626", sign: "+" },
  stake_closed: { label: "Stake completed", icon: CheckCircle2, color: "#059669", sign: "+" },
  reinvest: { label: "Restake", icon: Sparkles, color: "#7C3AED", sign: "" },
  profit: { label: "Profit bonus", icon: Sparkles, color: "#059669", sign: "+" },
  adjustment: { label: "Adjustment", icon: Settings2, color: "#64748B", sign: "" },
};

const STATUS_META = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function History() {
  const [txns, setTxns] = useState(null);
  const [busy, setBusy] = useState("");
  const { rate } = usePrice();

  const load = useCallback(() => {
    api.get("/transactions").then(({ data }) => setTxns(data.transactions)).catch(() => setTxns([]));
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("xp-refresh", handler);
    return () => window.removeEventListener("xp-refresh", handler);
  }, [load]);

  const exportTxns = async (fmt) => {
    setBusy(fmt);
    try {
      await downloadTransactions(fmt);
      toast.success(`${fmt.toUpperCase()} downloaded`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy("");
    }
  };

  const hasTxns = Array.isArray(txns) && txns.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        {hasTxns && (
          <div className="flex gap-2">
            <button onClick={() => exportTxns("csv")} disabled={!!busy} data-testid="history-export-csv" className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-800 text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
              {busy === "csv" ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} className="text-emerald-600" />} CSV
            </button>
            <button onClick={() => exportTxns("pdf")} disabled={!!busy} data-testid="history-export-pdf" className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-800 text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
              {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} className="text-red-600" />} PDF
            </button>
          </div>
        )}
      </div>

      {txns === null ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : txns.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center" data-testid="no-transactions">
          <Receipt className="mx-auto text-slate-300 mb-3" size={30} />
          <p className="text-slate-500 text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="transactions-list">
          {txns.map((t, i) => {
            const meta = TYPE_META[t.type] || TYPE_META.adjustment;
            const Icon = meta.icon;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" data-testid={`txn-${t.id}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}14`, border: `1px solid ${meta.color}33` }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium text-sm">{meta.label}</p>
                  <p className="text-xs text-slate-400">{fmtDate(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-sm" style={{ color: meta.sign === "+" ? "#059669" : meta.sign === "-" ? "#0F172A" : "#64748B" }}>
                    {meta.sign}{fmtXRP(t.amount)} <span className="text-xs text-slate-400">XRP</span>
                  </p>
                  {rate ? <p className="text-[11px] text-slate-400 font-mono">{xrpToUsdLabel(t.amount, rate, 2)}</p> : null}
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_META[t.status] || STATUS_META.completed}`}>{t.status}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
