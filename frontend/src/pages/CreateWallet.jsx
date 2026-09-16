import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { PinInput } from "@/components/PinInput";
import { encryptPhrase } from "@/lib/crypto";
import { Copy, Check, ShieldAlert, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

export default function CreateWallet() {
  const { register, setVault, beginSession, apiError } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [username, setUsername] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinStage, setPinStage] = useState(0);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || form.username.trim().length < 3) {
      toast.error("Fill in your name and a username (3+ chars).");
      return;
    }
    setLoading(true);
    try {
      const data = await register(form);
      setPhrase(data.phrase);
      setUsername(data.user.username);
      setStep(1);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const copyPhrase = async () => {
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    setRevealed(true);
    toast.success("Recovery phrase copied. Store it somewhere safe.");
    setTimeout(() => setCopied(false), 2000);
  };

  const finishPin = async () => {
    if (pinStage === 0) {
      if (pin.length !== 4) return;
      setPinStage(1);
      return;
    }
    if (pin2 !== pin) {
      toast.error("PINs do not match. Try again.");
      setPin2("");
      return;
    }
    setLoading(true);
    try {
      const enc = await encryptPhrase(phrase, pin);
      setVault(username, enc);
      beginSession();
      toast.success("Wallet secured. Welcome to XamanProtocol.");
      navigate("/app");
    } catch (err) {
      toast.error("Could not secure wallet. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all";
  const words = phrase ? phrase.split(" ") : [];

  return (
    <AuthLayout back="/">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-5">
              <KeyRound className="text-blue-600" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Create your wallet</h1>
            <p className="text-sm text-slate-500 mt-2 mb-6">Private VIP access. We'll generate a fresh 12-word wallet for you — no email, no password.</p>
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">First name</label>
                  <input data-testid="register-first-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputCls} placeholder="Ada" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Last name</label>
                  <input data-testid="register-last-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputCls} placeholder="Lovelace" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Username</label>
                <input data-testid="register-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })} className={`${inputCls} font-mono`} placeholder="ada_vip" />
                <p className="text-xs text-slate-400 mt-1.5">Must be unique. This is how you log in with your phrase.</p>
              </div>
              <button type="submit" disabled={loading} data-testid="register-submit-button" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl glow-blue disabled:opacity-60 active:scale-[0.99] transition-all">
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Generate my wallet"}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-5">
              Already have a phrase?{" "}
              <button onClick={() => navigate("/recover")} data-testid="goto-recover-link" className="text-blue-600 font-medium hover:underline">Recover / log in</button>
            </p>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-slate-900">Your recovery phrase</h1>
            <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 border border-red-200 p-4">
              <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700">These 12 words are the <b>only</b> way to access your wallet. Write them down and store them offline. <b>If you lose them, your account is gone forever</b> — there is no reset.</p>
            </div>
            <div className="relative mt-5">
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 ${revealed ? "" : "blur-md select-none"}`} data-testid="recovery-phrase-grid">
                {words.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-xs text-slate-400 font-mono w-4">{i + 1}</span>
                    <span className="font-mono text-sm text-slate-900">{w}</span>
                  </div>
                ))}
              </div>
              {!revealed && (
                <button onClick={() => setRevealed(true)} data-testid="reveal-phrase-button" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-900">
                  <Eye size={26} className="text-blue-600" />
                  <span className="text-sm font-medium">Tap to reveal</span>
                </button>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={copyPhrase} data-testid="copy-phrase-button" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium py-3 rounded-xl transition-colors">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />} {copied ? "Copied" : "Copy phrase"}
              </button>
              <button onClick={() => setRevealed(!revealed)} data-testid="toggle-phrase-visibility" className="px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors">
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <label className="flex items-start gap-3 mt-5 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="confirm-saved-checkbox" className="mt-0.5 w-5 h-5 accent-blue-600" />
              <span className="text-sm text-slate-700">I have safely saved my 12-word recovery phrase.</span>
            </label>
            <button disabled={!confirmed} onClick={() => setStep(2)} data-testid="phrase-continue-button" className="w-full mt-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl glow-blue active:scale-[0.99] transition-all">Continue</button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="pin" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-5">
              <ShieldAlert className="text-blue-600" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{pinStage === 0 ? "Set a PIN" : "Confirm your PIN"}</h1>
            <p className="text-sm text-slate-500 mt-2 mb-7">{pinStage === 0 ? "Your phrase is encrypted on this device behind this PIN." : "Enter your PIN again to confirm."}</p>
            {pinStage === 0 ? <PinInput value={pin} onChange={setPin} onComplete={finishPin} testid="setup-pin" /> : <PinInput value={pin2} onChange={setPin2} onComplete={finishPin} testid="confirm-pin" />}
            <button disabled={loading || (pinStage === 0 ? pin.length !== 4 : pin2.length !== 4)} onClick={finishPin} data-testid="pin-continue-button" className="w-full mt-8 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl glow-blue active:scale-[0.99] transition-all">
              {loading ? <Loader2 className="animate-spin" size={18} /> : pinStage === 0 ? "Set PIN" : "Enter wallet"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
