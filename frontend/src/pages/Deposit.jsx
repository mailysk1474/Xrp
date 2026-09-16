import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { Copy, Check, Info, Loader2, ArrowDownToLine } from "lucide-react";

function CopyRow({ label, value, testid }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    toast.success(`${label} copied.`);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{label}</p>
      <div className="flex items-center justify-between gap-3 mt-1.5">
        <span className="font-mono text-sm text-slate-900 break-all" data-testid={testid}>{value}</span>
        <button onClick={copy} data-testid={`copy-${testid}`} className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors">
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
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
        <h1 className="text-2xl font-bold text-slate-900">Deposit XRP</h1>
        <p className="text-sm text-slate-500 mt-1">Send XRP to the address below, then submit your deposit for confirmation.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900 font-semibold"><ArrowDownToLine size={18} className="text-blue-600" /> Your XRP deposit details</div>
        {info ? (
          <>
            <div className="flex flex-col items-center gap-3 py-2" data-testid="deposit-qr">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <QRCodeSVG
                  value={`${info.address}?dt=${info.destination_tag}`}
                  size={168}
                  level="M"
                  fgColor="#0F172A"
                  bgColor="#FFFFFF"
                />
              </div>
              <p className="text-xs text-slate-400">Scan to send XRP (includes destination tag)</p>
            </div>
            <CopyRow label="Hot Wallet Address" value={info.address} testid="deposit-address" />
            <CopyRow label="Destination Tag (required)" value={info.destination_tag} testid="deposit-tag" />
          </>
        ) : (
          <div className="h-24 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        )}
        <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
          <Info className="text-amber-600 shrink-0 mt-0.5" size={17} />
          <p className="text-xs text-amber-700">You <b>must</b> include the Destination Tag or your deposit may be lost. XRP only. Credited after admin confirmation.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <p className="text-slate-900 font-semibold">Notify us of your deposit</p>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Amount sent (XRP)</label>
          <input data-testid="deposit-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 outline-none font-mono transition-all" placeholder="0.00" />
        </div>
        <button onClick={submit} disabled={submitting || locked} data-testid="submit-deposit-button" className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl glow-blue transition-all">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : "Submit deposit for confirmation"}
        </button>
        {locked && <p className="text-xs text-red-500 text-center">Your wallet is locked — deposits disabled.</p>}
      </motion.div>
    </div>
  );
}
