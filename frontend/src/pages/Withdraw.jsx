import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { fmtXRP } from "@/lib/format";
import { Loader2, ArrowUpFromLine, AlertTriangle } from "lucide-react";

export default function Withdraw() {
  const { serverState, refresh } = useAuth();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const balance = serverState?.balance ?? 0;
  const disabled = serverState?.user?.withdrawals_disabled;
  const locked = serverState?.user?.locked;
  const blocked = disabled || locked;

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.");
    if (amt > balance) return toast.error("Insufficient available balance.");
    setSubmitting(true);
    try {
      await api.post("/withdraw", { amount: amt });
      toast.success("Withdrawal requested. Pending admin approval.");
      setAmount("");
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw XRP</h1>
        <p className="text-sm text-slate-400 mt-1">Request a withdrawal. Each request is manually approved by an admin.</p>
      </div>

      {blocked && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/30 p-4" data-testid="withdraw-blocked-banner">
          <AlertTriangle className="text-red-400 shrink-0" size={20} />
          <p className="text-sm text-red-200">
            {locked ? "Your wallet is locked. Withdrawals are disabled." : "Withdrawals are currently disabled for your account."}
          </p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121824] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between bg-[#0B0E17] rounded-xl px-4 py-3">
          <span className="text-sm text-slate-400">Available balance</span>
          <span className="font-mono font-semibold text-white" data-testid="withdraw-available">{fmtXRP(balance)} XRP</span>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Amount (XRP)</label>
          <div className="relative mt-1.5">
            <input
              data-testid="withdraw-amount-input"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={blocked}
              className="w-full bg-[#0B0E17] border border-white/15 focus:border-blue-500 rounded-xl px-4 py-3 pr-16 text-white outline-none font-mono disabled:opacity-50 transition-colors"
              placeholder="0.00"
            />
            <button
              onClick={() => setAmount(String(balance))}
              disabled={blocked}
              data-testid="withdraw-max-button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={submitting || blocked}
          data-testid="submit-withdraw-button"
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl glow-blue transition-all"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <><ArrowUpFromLine size={17} /> Request withdrawal</>}
        </button>
      </motion.div>
    </div>
  );
}
