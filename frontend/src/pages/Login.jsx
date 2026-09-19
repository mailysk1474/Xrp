import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, beginSession, apiError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    if (!emailOk) return toast.error("Enter a valid email address.");
    if (!password) return toast.error("Enter your password.");
    setLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      beginSession();
      toast.success("Welcome back.");
      navigate(data.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all";

  return (
    <AuthLayout back="/">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-5">
          <LogIn className="text-[#0030cf]" size={22} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">Access your wallet with your email and password.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">Email</label>
            <input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="ada@example.com" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">Password</label>
            <div className="relative">
              <input data-testid="login-password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-12`} placeholder="Your password" />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-400 hover:text-slate-700">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} data-testid="login-submit-button" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl glow-blue disabled:opacity-60 active:scale-[0.99] transition-all">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Log in"}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5 text-sm">
          <button onClick={() => navigate("/create")} data-testid="goto-create-link" className="text-[#0030cf] font-medium hover:underline">Create account</button>
          <button onClick={() => navigate("/recover")} data-testid="goto-recover-link" className="text-slate-500 hover:text-slate-900">Use recovery phrase</button>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
