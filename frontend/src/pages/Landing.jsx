import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ShieldCheck, KeyRound, Fingerprint, Layers, TrendingUp, Smartphone,
  Lock, Eye, ArrowRight, LogIn, CheckCircle2, Wallet, Crown, Clock,
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Receipt, Sparkles, LockKeyhole,
  Coins, Percent, Timer, ArrowUp, Twitter, Send, Mail, FileText,
} from "lucide-react";
import { openSupportChat } from "@/lib/support";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const FEATURES = [
  { icon: KeyRound, title: "Self-generated wallet", text: "A fresh 12-word wallet is created for you on sign-up, encrypted on your device — you hold the keys, always." },
  { icon: Fingerprint, title: "PIN & biometric unlock", text: "Your recovery phrase is encrypted on your device behind a PIN. Daily access is a single, secure tap." },
  { icon: TrendingUp, title: "Live yield accrual", text: "Watch your profit tick up in real time across every VIP vault — second by second, never static." },
  { icon: Layers, title: "VIP staking vaults", text: "From flexible XRP Flex to the 90-day Diamond vault at 156% APY — rewards scale with your tier." },
  { icon: LockKeyhole, title: "Bank-grade encryption", text: "Your keys are protected with AES-256 encryption and never leave your device in the clear." },
  { icon: Smartphone, title: "Install like an app", text: "Add XamanProtocol to your home screen and open it full-screen like a native mobile wallet." },
];

const STATS = [
  { value: "156%", label: "Max APY" },
  { value: "5", label: "VIP Vaults" },
  { value: "24/7", label: "Live Yield" },
  { value: "AES-256", label: "Encryption" },
];

const STEPS = [
  { icon: Wallet, title: "Create your wallet", text: "Sign up with your email and password, then save your 12-word recovery phrase — it's shown only once." },
  { icon: Fingerprint, title: "Set a PIN", text: "Encrypt your phrase locally and unlock instantly every time you return." },
  { icon: Layers, title: "Stake into a vault", text: "Deposit XRP and choose a VIP vault matched to your tier and time horizon." },
  { icon: TrendingUp, title: "Earn live yield", text: "Profit accrues continuously and becomes withdrawable at maturity." },
];

const SECURITY = [
  { icon: KeyRound, title: "You own the keys", text: "A 12-word recovery phrase is generated on your device — no custodian ever holds your login." },
  { icon: LockKeyhole, title: "Encrypted on-device", text: "Your phrase is sealed with AES-256 behind your PIN and never stored in plain text." },
  { icon: Fingerprint, title: "PIN & biometric access", text: "Unlock with a passcode or your device's fingerprint / Face ID for daily convenience." },
  { icon: ShieldCheck, title: "Non-custodial by design", text: "Your phrase is encrypted on-device behind your PIN. Recover on any device with your email and phrase." },
];

const FAQS = [
  { q: "Is XamanProtocol custodial?", a: "Your 12-word phrase is your wallet identity and never leaves your device unencrypted. Staking balances are platform-managed figures, confirmed by our team when you deposit." },
  { q: "What happens if I lose my recovery phrase?", a: "There is no recovery. The phrase is the only way to access your wallet — store it offline and never share it. This is by design for a security-first, non-custodial model." },
  { q: "How is my profit calculated?", a: "Each vault has a fixed APY. Profit accrues continuously by the second based on your staked amount and is shown live on your dashboard." },
  { q: "How do deposits and withdrawals work?", a: "Deposit XRP to your unique address with a destination tag; your balance is credited once the deposit is confirmed. Withdrawals are requested in-app and approved before payout." },
  { q: "Which coins are supported?", a: "XamanProtocol is XRP-first. Additional assets can be added by the protocol over time." },
  { q: "Do I need to install anything?", a: "No — it runs in your browser. For the best experience you can add it to your home screen and launch it full-screen like a native app." },
];

/* Mac + phone device cluster mirroring the real dashboard */
function MacMock() {
  return (
    <div className="w-full">
      {/* lid / screen */}
      <div className="rounded-t-2xl border-[8px] border-b-0 border-slate-900 bg-slate-900 shadow-2xl" style={{ boxShadow: "0 45px 90px -30px rgba(37,99,235,0.45)" }}>
        <div className="rounded-t-lg overflow-hidden bg-[#F7F9FC]">
          {/* browser chrome */}
          <div className="flex items-center gap-1.5 px-3 h-7 bg-white border-b border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-3 flex items-center gap-1.5 bg-slate-100 rounded-md px-2 py-0.5">
              <Lock size={8} className="text-slate-400" />
              <span className="text-[8px] font-medium text-slate-500">app.xamanprotocol.io</span>
            </div>
          </div>

          {/* dashboard */}
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <img src="/icon-512.png" alt="" className="w-5 h-5 rounded-md" />
                <span className="text-[11px] font-bold text-slate-900">Xaman<span className="text-[#0030cf]">Protocol</span></span>
              </div>
              <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200"><Crown size={8} /> Diamond</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {/* balance hero */}
              <div className="col-span-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-3.5">
                <p className="text-[8px] text-blue-100 uppercase tracking-wider">Available Balance</p>
                <p className="font-mono text-[22px] font-bold text-white leading-tight mt-0.5">128,450.<span className="text-blue-200 text-base">00</span></p>
                <div className="flex items-center gap-1 mt-1 text-[9px]">
                  <TrendingUp size={9} className="text-emerald-300" />
                  <span className="text-blue-100">Live yield</span>
                  <span className="font-mono text-white">312.884201</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  <div className="bg-white rounded-lg text-center py-1.5 text-blue-700 text-[9px] font-semibold">Deposit</div>
                  <div className="bg-slate-900 rounded-lg text-center py-1.5 text-white text-[9px] font-semibold">Withdraw</div>
                </div>
              </div>
              {/* side stats */}
              <div className="col-span-2 flex flex-col gap-2">
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex-1">
                  <p className="text-[7px] text-slate-400 uppercase">Total Staked</p>
                  <p className="font-mono text-[13px] font-bold text-slate-900 mt-0.5">100k <span className="text-[8px] text-slate-400">XRP</span></p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex-1">
                  <p className="text-[7px] text-slate-400 uppercase">Total Profit</p>
                  <p className="font-mono text-[13px] font-bold text-emerald-600 mt-0.5">312.88 <span className="text-[8px] text-slate-400">XRP</span></p>
                </div>
              </div>
            </div>

            {/* active stake row */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 mt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center"><Layers size={11} className="text-purple-600" /></div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-900 leading-none">VIP Diamond</p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">156% APY · 90d lock</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-[8px] text-slate-500 flex items-center gap-1"><Clock size={8} /> Unlocks in</span>
                  <span className="font-mono text-[9px] font-semibold text-[#0030cf]">62d 4h 11m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* base / hinge */}
      <div className="relative">
        <div className="h-2.5 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-md w-[calc(100%+34px)] -ml-[17px] shadow-md" />
        <div className="mx-auto -mt-2.5 w-24 h-2.5 rounded-b-lg bg-slate-500/80" />
      </div>
    </div>
  );
}

function SlimPhone() {
  return (
    <div className="rounded-[2rem] border-[5px] border-slate-900 bg-slate-900 shadow-2xl" style={{ boxShadow: "0 30px 60px -18px rgba(15,23,42,0.5)" }}>
      <div className="rounded-[1.65rem] overflow-hidden bg-[#F7F9FC] flex flex-col">
        {/* notch */}
        <div className="relative bg-white pt-2 pb-1 flex items-center justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-900" />
        </div>
        <div className="px-2.5 pt-2 pb-2.5 space-y-2.5 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[6px] text-slate-400 leading-none">Welcome back,</p>
              <p className="text-[9px] font-bold text-slate-900 leading-tight mt-1">VIP Member</p>
            </div>
            <span className="flex items-center gap-0.5 text-[6px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200"><Crown size={7} /> VIP</span>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-2.5">
            <p className="text-[6px] text-blue-100 uppercase tracking-wide leading-none">Available Balance</p>
            <p className="font-mono text-[13px] font-bold text-white leading-tight mt-1">128,450<span className="text-blue-200 text-[9px]">.00</span></p>
            <div className="flex items-center gap-1 mt-1 text-[6px]">
              <TrendingUp size={7} className="text-emerald-300" />
              <span className="text-blue-100">Live</span>
              <span className="font-mono text-white">+312.88</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <div className="bg-white rounded-md text-center py-1 text-blue-700 text-[7px] font-semibold">Deposit</div>
              <div className="bg-slate-900 rounded-md text-center py-1 text-white text-[7px] font-semibold">Withdraw</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white border border-slate-200 rounded-lg p-1.5">
              <p className="text-[6px] text-slate-400 uppercase leading-none">Staked</p>
              <p className="font-mono text-[9px] font-bold text-slate-900 mt-1">100k</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-1.5">
              <p className="text-[6px] text-slate-400 uppercase leading-none">Profit</p>
              <p className="font-mono text-[9px] font-bold text-emerald-600 mt-1">312.8</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center"><Layers size={9} className="text-purple-600" /></div>
                <div>
                  <p className="text-[8px] font-semibold text-slate-900 leading-none">VIP Diamond</p>
                  <p className="text-[6px] text-slate-400 font-mono mt-0.5">156% APY</p>
                </div>
              </div>
              <span className="text-[6px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0030cf] border border-blue-200">Active</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1.5 py-1 rounded-md bg-blue-50">
              <span className="text-[6px] text-slate-500 flex items-center gap-1"><Clock size={7} /> Unlocks in</span>
              <span className="font-mono text-[7px] font-semibold text-[#0030cf]">62d 4h 11m</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 border-t border-slate-200 bg-white">
          {[{ i: LayoutDashboard, a: true }, { i: Layers }, { i: ArrowDownToLine }, { i: ArrowUpFromLine }, { i: Receipt }].map((n, k) => (
            <div key={k} className={`flex justify-center py-2 ${n.a ? "text-[#0030cf]" : "text-slate-300"}`}><n.i size={11} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Mac (dashboard) + tall phone overlapping in front — scales uniformly across screens */
function PhoneMock() {
  return (
    <div className="w-full flex justify-center lg:justify-end">
      <div className="[zoom:0.6] sm:[zoom:0.82] lg:[zoom:1] relative w-[520px] pt-6 pb-4">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="w-[420px]">
          <MacMock />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }} className="absolute right-0 top-0 w-[172px] animate-float z-10">
          <SlimPhone />
        </motion.div>
      </div>
    </div>
  );
}

const CALC_VAULTS = [
  { key: "xrp_flex", name: "XRP Flex", apy: 0.052 },
  { key: "vip_silver", name: "VIP Silver", apy: 0.192 },
  { key: "vip_gold", name: "VIP Gold", apy: 0.384 },
  { key: "vip_platinum", name: "VIP Platinum", apy: 0.836 },
  { key: "vip_diamond", name: "VIP Diamond", apy: 1.56 },
];

const TIERS_TABLE = [
  { tier: "Starter", min: "0", flagship: "XRP Flex · 5.2%", lock: "Flexible", color: "#64748B" },
  { tier: "Silver", min: "1,000", flagship: "VIP Silver · 19.2%", lock: "30 days", color: "#64748B" },
  { tier: "Gold", min: "5,000", flagship: "VIP Gold · 38.4%", lock: "45 days", color: "#D97706" },
  { tier: "Platinum", min: "25,000", flagship: "VIP Platinum · 83.6%", lock: "60 days", color: "#475569" },
  { tier: "Diamond", min: "100,000", flagship: "VIP Diamond · 156%", lock: "90 days", color: "#9333EA" },
];

const EDU = [
  { icon: Coins, title: "What is staking?", text: "Staking commits your XRP to a vault for a set period. In return the protocol pays you yield — like earning interest, but crypto-native." },
  { icon: Percent, title: "Fixed, transparent APY", text: "Every vault shows its exact annual percentage yield up front. No hidden fees and no moving goalposts — what you see is what you earn." },
  { icon: Timer, title: "Continuous accrual", text: "Your profit is calculated every second against your staked amount, so your balance grows in real time — not once a month." },
  { icon: ShieldCheck, title: "Maturity & withdrawal", text: "Fixed-term vaults unlock at maturity, after which your principal and earned yield become available to withdraw." },
];

function YieldCalculator() {
  const [amount, setAmount] = useState(5000);
  const [vault, setVault] = useState(CALC_VAULTS[3]);
  const [live, setLive] = useState(0);
  const startRef = useRef(Date.now());
  const perYear = amount * vault.apy;
  const perSecond = perYear / (365 * 24 * 3600);

  useEffect(() => { startRef.current = Date.now(); setLive(0); }, [amount, vault]);
  useEffect(() => {
    let raf;
    const tick = () => {
      const el = (Date.now() - startRef.current) / 1000;
      setLive(perSecond * el);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [perSecond]);

  const money = (n, d = 2) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="grid lg:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#0030cf]">Amount to stake (XRP)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} data-testid="calc-amount" className="mt-1.5 w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 font-mono outline-none transition-all" />
        <input type="range" min="100" max="200000" step="100" value={Math.min(amount, 200000)} onChange={(e) => setAmount(parseFloat(e.target.value))} className="w-full mt-4 accent-blue-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0030cf] mt-6 mb-2">Choose a vault</p>
        <div className="flex flex-wrap gap-2">
          {CALC_VAULTS.map((v) => (
            <button key={v.key} onClick={() => setVault(v)} data-testid={`calc-vault-${v.key}`} className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${vault.key === v.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>{v.name} · {(v.apy * 100).toFixed(1)}%</button>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white flex flex-col justify-between">
        <div>
          <p className="text-xs text-blue-100 uppercase tracking-wider">Live projected earnings</p>
          <p className="font-mono text-3xl sm:text-4xl font-bold mt-1 tabular-nums" data-testid="calc-live">{money(live, 6)}</p>
          <p className="text-xs text-blue-200">XRP since you opened this page</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/10 border border-white/20 rounded-xl p-3"><p className="text-[10px] text-blue-100 uppercase">Daily</p><p className="font-mono font-bold">{money(perYear / 365)}</p></div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-3"><p className="text-[10px] text-blue-100 uppercase">Monthly</p><p className="font-mono font-bold">{money(perYear / 12)}</p></div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-3"><p className="text-[10px] text-blue-100 uppercase">Yearly</p><p className="font-mono font-bold">{money(perYear)}</p></div>
        </div>
        <p className="text-[11px] text-blue-200 mt-4">Illustrative only. Yields depend on vault terms and are not guaranteed.</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Nav */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-white/85 border-b border-slate-200" : ""}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size={32} />
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#vaults" className="hover:text-slate-900 transition-colors">Vaults</a>
            <a href="#security" className="hover:text-slate-900 transition-colors">Security</a>
            <Link to="/whitepaper" data-testid="nav-whitepaper" className="hover:text-slate-900 transition-colors">Whitepaper</Link>
          </nav>
          <Link to="/create" data-testid="nav-get-started" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl glow-blue transition-all active:scale-95">
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-radial-blue">
        <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Lock size={13} /> Private · Invite-only · Non-custodial
            </motion.div>
            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
              Your VIP staking wallet, <span className="text-[#0030cf]">self-custody</span> in your pocket.
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="text-lg text-slate-500 mt-6 max-w-lg leading-relaxed">
              Sign up with email in seconds, stake XRP into premium vaults, and watch your yield accrue live — your keys secured by a PIN only you control.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3 mt-8">
              <Link to="/create" data-testid="hero-get-started" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl glow-blue transition-all active:scale-95">
                <Wallet size={18} /> Create your wallet
              </Link>
              <Link to="/login" data-testid="hero-login" className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors">
                <LogIn size={18} /> Log in
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-5 mt-8 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Non-custodial</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Installable PWA</span>
            </motion.div>
          </div>
          <div className="relative"><PhoneMock /></div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-slate-200 bg-[#F7F9FC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold font-mono text-[#0030cf] tabular-nums">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">Why XamanProtocol</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Everything a VIP wallet should be.</h2>
          <p className="text-slate-500 mt-4 leading-relaxed">Built for members who want the sovereignty of self-custody with the simplicity of a modern app — and yield that works around the clock.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i % 3} className="bg-white border border-slate-200 rounded-2xl p-6 glow-card shadow-sm" data-testid={`feature-card-${i}`}>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-[#0030cf]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Highlight block */}
      <section id="vaults" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 sm:p-12 shadow-xl shadow-blue-600/20">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Up to <span className="text-cyan-200">156% APY</span> across VIP vaults.</h2>
              <p className="text-blue-100 mt-4 leading-relaxed">Tiered vaults reward commitment — from flexible XRP Flex to the 90-day Diamond vault. Your VIP tier unlocks automatically as you stake more.</p>
              <Link to="/create" className="inline-flex items-center gap-2 mt-6 bg-white text-blue-700 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl transition-all active:scale-95">
                Start staking <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { n: "XRP Flex", a: "5.2%", t: "Flexible" },
                { n: "VIP Silver", a: "19.2%", t: "30 days" },
                { n: "VIP Gold", a: "38.4%", t: "45 days" },
                { n: "VIP Platinum", a: "83.6%", t: "60 days" },
                { n: "VIP Diamond", a: "156%", t: "90 days" },
                { n: "Live accrual", a: "24/7", t: "Every second" },
              ].map((v, i) => (
                <div key={i} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4">
                  <p className="text-xs text-blue-100">{v.n}</p>
                  <p className="font-mono font-bold text-xl mt-1 text-white">{v.a}</p>
                  <p className="text-[10px] text-blue-200 mt-0.5">{v.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Yield calculator */}
      <section id="calculator" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">Yield calculator</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">See what your XRP could earn.</h2>
          <p className="text-slate-500 mt-4 leading-relaxed">Set an amount, pick a vault, and watch the projected yield update live — figures are illustrative, based on each vault&apos;s fixed APY.</p>
        </div>
        <YieldCalculator />
      </section>

      {/* VIP Tiers */}
      <section id="tiers" className="border-y border-slate-200 bg-[#F7F9FC] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">VIP tiers</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Rewards that scale with you.</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">Your tier unlocks automatically as your total staked XRP grows — and each tier opens a higher-yield vault.</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden sm:grid grid-cols-4 px-6 py-4 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Tier</span><span>Min staked</span><span>Flagship vault</span><span className="text-right">Lock</span>
            </div>
            {TIERS_TABLE.map((t) => (
              <div key={t.tier} className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-4 border-b border-slate-50 last:border-0 items-center">
                <span className="flex items-center gap-2 font-semibold text-slate-900"><Crown size={15} style={{ color: t.color }} /> {t.tier}</span>
                <span className="font-mono text-slate-600">{t.min} XRP</span>
                <span className="text-slate-600 text-sm">{t.flagship}</span>
                <span className="sm:text-right text-slate-500 text-sm">{t.lock}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Four steps to live yield.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          {STEPS.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="relative">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <s.icon size={22} className="text-[#0030cf]" />
              </div>
              <span className="absolute top-0 right-0 font-mono text-4xl font-bold text-slate-100">0{i + 1}</span>
              <h3 className="font-semibold text-lg text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security section */}
      <section id="security" className="border-y border-slate-200 bg-[#F7F9FC] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">Security first</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Your keys. Your crypto. Uncompromised.</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">XamanProtocol is built on a simple principle: only you should be able to access your wallet. Your recovery phrase is generated and encrypted on your device, so your keys stay with you — not on our servers.</p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <a href="/whitepaper.pdf" target="_blank" rel="noreferrer" data-testid="whitepaper-pdf-button" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3 rounded-xl glow-blue transition-all active:scale-95">
                <FileText size={17} /> Read the Whitepaper
              </a>
              <Link to="/whitepaper" className="inline-flex items-center gap-2 text-[#0030cf] font-semibold hover:underline">Overview <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SECURITY.map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <s.icon size={20} className="text-[#0030cf] mb-3" />
                <h3 className="font-semibold text-slate-900 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Education — how yield works */}
      <section id="learn" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0030cf]">Learn</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">How staking yield works.</h2>
          <p className="text-slate-500 mt-4 leading-relaxed">New to staking? Here&apos;s the short version — no jargon, just how your XRP goes to work.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {EDU.map((e, i) => (
            <motion.div key={e.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm glow-card">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <e.icon size={20} className="text-[#0030cf]" />
              </div>
              <h3 className="font-semibold text-slate-900">{e.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{e.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Self custody CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <Eye className="mx-auto text-[#0030cf] mb-5" size={34} />
          <h2 className="text-3xl sm:text-5xl font-bold max-w-3xl mx-auto leading-tight text-slate-900">Self-custody in your pocket. Only you hold the keys.</h2>
          <p className="text-slate-500 mt-5 max-w-xl mx-auto">Install XamanProtocol to your home screen and access your VIP vaults like a native app — anywhere, anytime.</p>
          <Link to="/create" data-testid="cta-create" className="inline-flex items-center gap-2 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl glow-blue transition-all active:scale-95">
            <Wallet size={18} /> Create my wallet
          </Link>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-slate-900">Questions, answered.</h2>
        <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-white border border-slate-200 rounded-2xl px-5 shadow-sm">
              <AccordionTrigger data-testid={`faq-trigger-${i}`} className="text-left text-slate-900 hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-500 leading-relaxed pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Support CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl border border-slate-200 bg-[#F7F9FC] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Need a hand?</h3>
            <p className="text-slate-500 mt-1">Our VIP support team responds within hours, every day.</p>
          </div>
          <button type="button" onClick={openSupportChat} data-testid="support-cta" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-6 py-3 rounded-xl transition-colors">Contact support</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#070A12] text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-12">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <img src="/icon-512.png" alt="XamanProtocol" className="w-9 h-9 rounded-lg ring-1 ring-white/10" />
                <span className="text-lg font-bold text-white">Xaman<span className="text-blue-500">Protocol</span></span>
              </div>
              <p className="mt-4 text-sm leading-relaxed max-w-xs text-slate-400">A private, invite-only, non-custodial VIP staking wallet for XRP. Your keys, your yield — live, in your pocket.</p>
              <div className="flex gap-3 mt-6">
                <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Twitter" data-testid="footer-social-x" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"><Twitter size={16} /></a>
                <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram" data-testid="footer-social-telegram" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"><Send size={16} /></a>
                <a href="mailto:support@xamanprotocol.app" aria-label="Email" data-testid="footer-social-mail" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"><Mail size={16} /></a>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16 lg:gap-20">
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#calculator" className="hover:text-white transition-colors">Yield calculator</a></li>
                <li><a href="#tiers" className="hover:text-white transition-colors">VIP tiers</a></li>
                <li><a href="#vaults" className="hover:text-white transition-colors">Vaults</a></li>
                <li><a href="#how" className="hover:text-white transition-colors">How it works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/whitepaper" className="hover:text-white transition-colors">Whitepaper</Link></li>
                <li><a href="#learn" className="hover:text-white transition-colors">Learn staking</a></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Get started</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/create" data-testid="footer-create" className="hover:text-white transition-colors">Create wallet</Link></li>
                <li><Link to="/recover" className="hover:text-white transition-colors">I have a phrase</Link></li>
                <li><button type="button" onClick={openSupportChat} data-testid="footer-contact-support" className="hover:text-white transition-colors">Contact support</button></li>
              </ul>
            </div>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 max-w-xl text-center sm:text-left">Staking involves risk. Projected yields are illustrative and not guaranteed. XamanProtocol is a private, invite-only platform and does not provide financial advice. © {new Date().getFullYear()} XamanProtocol — Non-custodial · XRP-first.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-testid="footer-back-to-top" className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3.5 py-2.5 transition-colors">
              <ArrowUp size={13} /> Back to top
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
