import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { PinInput } from "@/components/PinInput";
import { Logo } from "@/components/Logo";
import { decryptPhrase } from "@/lib/crypto";
import { Fingerprint, Loader2 } from "lucide-react";

export default function Unlock() {
  const { getVault, hasVault, login, beginSession, logout, apiError } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const vault = getVault();

  useEffect(() => {
    if (!hasVault()) navigate("/create", { replace: true });
  }, [hasVault, navigate]);

  const unlock = async (value) => {
    const code = value || pin;
    if (code.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const phrase = await decryptPhrase(vault.enc, code);
      const data = await login(vault.username, phrase);
      beginSession();
      toast.success("Wallet unlocked.");
      navigate(data.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (err) {
      setError("Incorrect PIN. Try again.");
      setPin("");
      if (err?.response) toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!vault) return null;

  return (
    <div className="min-h-screen bg-[#07090E] bg-radial-blue flex flex-col">
      <header className="px-4 sm:px-6 h-16 flex items-center max-w-6xl mx-auto w-full">
        <Logo size={32} />
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#121824] border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
            <Fingerprint className="text-blue-400" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1.5 mb-8">
            Unlock <span className="text-blue-400 font-mono">@{vault.username}</span> with your PIN
          </p>

          <PinInput value={pin} onChange={setPin} onComplete={unlock} testid="unlock-pin" />

          {error && <p className="text-sm text-red-400 mt-4" data-testid="unlock-error">{error}</p>}

          <button
            disabled={loading || pin.length !== 4}
            onClick={() => unlock()}
            data-testid="unlock-button"
            className="w-full mt-8 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl glow-blue transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Unlock"}
          </button>

          <div className="flex items-center justify-between mt-6 text-sm">
            <button onClick={() => navigate("/recover")} data-testid="use-phrase-link" className="text-blue-400 hover:underline">
              Use recovery phrase
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              data-testid="forget-wallet-link"
              className="text-slate-500 hover:text-red-400"
            >
              Forget wallet
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
