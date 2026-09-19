import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { PinInput } from "@/components/PinInput";
import { encryptPhrase } from "@/lib/crypto";
import { Loader2, RotateCcw } from "lucide-react";

export default function Recover() {
  const { recover, setVault, beginSession, apiError } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinStage, setPinStage] = useState(0);

  const doLogin = async (e) => {
    e.preventDefault();
    const cleaned = phrase.trim().replace(/\s+/g, " ").toLowerCase();
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    if (!emailOk) {
      toast.error("Enter your account email.");
      return;
    }
    if (cleaned.split(" ").length !== 12) {
      toast.error("Recovery phrase must be exactly 12 words.");
      return;
    }
    setLoading(true);
    try {
      const data = await recover(email.trim().toLowerCase(), cleaned);
      setPhrase(cleaned);
      setUsername(data.user.username);
      setEmail(data.user.email);
      if (data.user.role === "admin") {
        beginSession();
        toast.success("Welcome back, admin.");
        navigate("/admin");
        return;
      }
      setStep(1);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const finishPin = async () => {
    if (pinStage === 0) {
      if (pin.length !== 4) return;
      setPinStage(1);
      return;
    }
    if (pin2 !== pin) {
      toast.error("PINs do not match.");
      setPin2("");
      return;
    }
    setLoading(true);
    try {
      const enc = await encryptPhrase(phrase, pin);
      setVault(username, enc, email);
      beginSession();
      toast.success("Wallet restored on this device.");
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all";

  return (
    <AuthLayout back="/">
      {step === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-5">
            <RotateCcw className="text-[#0030cf]" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recover with phrase</h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">Enter your account email and 12-word recovery phrase to restore your wallet on this device.</p>
          <form onSubmit={doLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">Email</label>
              <input data-testid="recover-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">12-word recovery phrase</label>
              <textarea data-testid="recover-phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} rows={3} className={`${inputCls} font-mono text-sm resize-none`} placeholder="word1 word2 word3 ..." />
            </div>
            <button type="submit" disabled={loading} data-testid="recover-submit-button" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl glow-blue disabled:opacity-60 active:scale-[0.99] transition-all">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Access wallet"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">
            Prefer password?{" "}
            <button onClick={() => navigate("/login")} data-testid="goto-login-link" className="text-[#0030cf] font-medium hover:underline">Log in</button>
          </p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">{pinStage === 0 ? "Set a PIN" : "Confirm PIN"}</h1>
          <p className="text-sm text-slate-500 mt-2 mb-7">Secure this device with a 4-digit PIN.</p>
          {pinStage === 0 ? <PinInput value={pin} onChange={setPin} onComplete={finishPin} testid="setup-pin" /> : <PinInput value={pin2} onChange={setPin2} onComplete={finishPin} testid="confirm-pin" />}
          <button disabled={loading || (pinStage === 0 ? pin.length !== 4 : pin2.length !== 4)} onClick={finishPin} data-testid="recover-pin-continue" className="w-full mt-8 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl glow-blue transition-all">
            {loading ? <Loader2 className="animate-spin" size={18} /> : pinStage === 0 ? "Set PIN" : "Enter wallet"}
          </button>
        </motion.div>
      )}
    </AuthLayout>
  );
}
