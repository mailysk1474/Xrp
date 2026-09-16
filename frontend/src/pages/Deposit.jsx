import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { fmtXRP } from "@/lib/format";
import { Copy, Check, Info, Loader2, QrCode, ArrowDownToLine } from "lucide-react";

function CopyRow({ label, value, testid }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    toast.success(`${label} copied.`);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="bg-[#0B0E17] border border-white/10 rounded-xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400/90">{label}</p>
      <div className="flex items-center justify-between gap-3 mt-1.5">
        <span className="font-mono text-sm text-white break-all" data-testid={testid}>{value}</span>
        <button onClick={copy} data-testid={`copy-${testid}`} className="shrink-0 p-2 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-200 transition-colors">
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function Deposit() {
  const { serverState, refresh } = useAuth();
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const locked = serverState?.user?.locked;

  useEffect(() => {
    api.get("/deposit-info").then(({ data }) => setInfo(data)).catch(() => {});
  }, []);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter the amount you're sending.");
    setSubmitting(true);
    try {
      await api.post("/deposit-claim", { amount: amt });
      toast.success("Deposit submitted. Pending admin confirmation.");
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
        <h1 className="text-2xl font-bold text-white">Deposit XRP</h1>
        <p className="text-sm text-slate-400 mt-1">Send XRP to the address below, then submit your deposit for confirmation.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121824] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold"><ArrowDownToLine size={18} className="text-blue-400" /> Your XRP deposit details</div>
        {info ? (
          <>
            <CopyRow label="Hot Wallet Address" value={info.address} testid="deposit-address" />
            <CopyRow label="Destination Tag (required)" value={info.destination_tag} testid="deposit-tag" />
          </>
        ) : (
          <div className="h-24 flex items-center justify-center"><Loader2 className="animate-spin text-blue-400" /></div>
        )}
        <div className="flex gap-3 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5">
          <Info className="text-amber-400 shrink-0 mt-0.5" size={17} />
          <p className="text-xs text-amber-200/90">
            You <b>must</b> include the Destination Tag or your deposit may be lost. XRP only. Credited after admin confirmation.
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-[#121824] border border-white/10 rounded-2xl p-6 space-y-4">
        <p className="text-white font-semibold">Notify us of your deposit</p>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Amount sent (XRP)</label>
          <input
            data-testid="deposit-amount-input"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 w-full bg-[#0B0E17] border border-white/15 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none font-mono transition-colors"
            placeholder="0.00"
          />
        </div>
        <button
          onClick={submit}
          disabled={submitting || locked}
          data-testid="submit-deposit-button"
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl glow-blue transition-all"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : "Submit deposit for confirmation"}
        </button>
        {locked && <p className="text-xs text-red-400 text-center">Your wallet is locked — deposits disabled.</p>}
      </motion.div>
    </div>
  );
}
