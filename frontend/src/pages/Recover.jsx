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
  const { login, setVault, beginSession, apiError } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinStage, setPinStage] = useState(0);

  const doLogin = async (e) => {
    e.preventDefault();
    const cleaned = phrase.trim().replace(/\s+/g, " ").toLowerCase();
    if (cleaned.split(" ").length !== 12) {
      toast.error("Recovery phrase must be exactly 12 words.");
      return;
    }
    if (username.trim().length < 3) {
      toast.error("Enter your username.");
      return;
    }
    setLoading(true);
    try {
      const data = await login(username.trim().toLowerCase(), cleaned);
      setPhrase(cleaned);
      setUsername(data.user.username);
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
      setVault(username, enc);
      beginSession();
      toast.success("Wallet restored on this device.");
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout back="/">
      {step === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#121824] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
            <RotateCcw className="text-blue-400" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-white">Log in / Recover</h1>
          <p className="text-sm text-slate-400 mt-2 mb-6">
            Enter your username and 12-word recovery phrase to access your wallet on this device.
          </p>
          <form onSubmit={doLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Username</label>
              <input
                data-testid="recover-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                className="mt-1.5 w-full bg-[#0B0E17] border border-white/15 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none font-mono transition-colors"
                placeholder="ada_vip"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">12-word recovery phrase</label>
              <textarea
                data-testid="recover-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                rows={3}
                className="mt-1.5 w-full bg-[#0B0E17] border border-white/15 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none font-mono text-sm resize-none transition-colors"
                placeholder="word1 word2 word3 ..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="recover-submit-button"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl glow-blue disabled:opacity-60 active:scale-[0.99] transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Access wallet"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">
            No wallet yet?{" "}
            <button onClick={() => navigate("/create")} data-testid="goto-create-link" className="text-blue-400 font-medium hover:underline">
              Create one
            </button>
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#121824] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
        >
          <h1 className="text-2xl font-bold text-white">{pinStage === 0 ? "Set a PIN" : "Confirm PIN"}</h1>
          <p className="text-sm text-slate-400 mt-2 mb-7">Secure this device with a 4-digit PIN.</p>
          {pinStage === 0 ? (
            <PinInput value={pin} onChange={setPin} onComplete={finishPin} testid="setup-pin" />
          ) : (
            <PinInput value={pin2} onChange={setPin2} onComplete={finishPin} testid="confirm-pin" />
          )}
          <button
            disabled={loading || (pinStage === 0 ? pin.length !== 4 : pin2.length !== 4)}
            onClick={finishPin}
            data-testid="recover-pin-continue"
            className="w-full mt-8 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl glow-blue transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : pinStage === 0 ? "Set PIN" : "Enter wallet"}
          </button>
        </motion.div>
      )}
    </AuthLayout>
  );
}
