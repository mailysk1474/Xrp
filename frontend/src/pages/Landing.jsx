import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ShieldCheck, KeyRound, Fingerprint, Layers, TrendingUp, Smartphone,
  Lock, Eye, ArrowRight, Download, CheckCircle2, Wallet, Crown, Clock,
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Receipt, Sparkles, LockKeyhole,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const FEATURES = [
  { icon: KeyRound, title: "Self-generated wallet", text: "A fresh 12-word wallet is created for you on sign-up. No email, no password — you hold the keys, always." },
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
  { icon: Wallet, title: "Create your wallet", text: "Register with a unique username and save your 12-word recovery phrase — it's shown only once." },
  { icon: Fingerprint, title: "Set a PIN", text: "Encrypt your phrase locally and unlock instantly every time you return." },
  { icon: Layers, title: "Stake into a vault", text: "Deposit XRP and choose a VIP vault matched to your tier and time horizon." },
  { icon: TrendingUp, title: "Earn live yield", text: "Profit accrues continuously and becomes withdrawable at maturity." },
];

const SECURITY = [
  { icon: KeyRound, title: "You own the keys", text: "A 12-word recovery phrase is generated on your device — no custodian ever holds your login." },
  { icon: LockKeyhole, title: "Encrypted on-device", text: "Your phrase is sealed with AES-256 behind your PIN and never stored in plain text." },
  { icon: Fingerprint, title: "PIN & biometric access", text: "Unlock with a passcode or your device's fingerprint / Face ID for daily convenience." },
  { icon: ShieldCheck, title: "No email, no password", text: "Nothing to phish, nothing to leak. Recovery on any device uses only your phrase." },
];

const FAQS = [
  { q: "Is XamanProtocol custodial?", a: "Your 12-word phrase is your wallet identity and never leaves your device unencrypted. Staking balances are platform-managed figures, confirmed by our team when you deposit." },
  { q: "What happens if I lose my recovery phrase?", a: "There is no recovery. The phrase is the only way to access your wallet — store it offline and never share it. This is by design for a security-first, non-custodial model." },
  { q: "How is my profit calculated?", a: "Each vault has a fixed APY. Profit accrues continuously by the second based on your staked amount and is shown live on your dashboard." },
  { q: "How do deposits and withdrawals work?", a: "Deposit XRP to your unique address with a destination tag; your balance is credited once the deposit is confirmed. Withdrawals are requested in-app and approved before payout." },
  { q: "Which coins are supported?", a: "XamanProtocol is XRP-first. Additional assets can be added by the protocol over time." },
  { q: "Do I need to install anything?", a: "No — it runs in your browser. For the best experience you can add it to your home screen and launch it full-screen like a native app." },
];

/* Faithful mini version of the real user dashboard */
function PhoneMock() {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative mx-auto w-[300px] animate-float">
      <div className="rounded-[2.8rem] border-[7px] border-slate-900 bg-slate-900 p-1.5 shadow-2xl" style={{ boxShadow: "0 40px 80px -24px rgba(37,99,235,0.4)" }}>
        <div className="rounded-[2.1rem] overflow-hidden bg-[#F7F9FC] border border-slate-200">
          {/* status + top bar */}
          <div className="bg-white border-b border-slate-100">
            <div className="h-5 flex items-center justify-center"><div className="w-16 h-1 rounded-full bg-slate-200" /></div>
            <div className="flex items-center justify-between px-3.5 pb-2.5">
              <div className="flex items-center gap-1.5">
                <img src="/icon-512.png" alt="" className="w-5 h-5 rounded-md" />
                <span className="text-[11px] font-bold text-slate-900">Xaman<span className="text-blue-600">Protocol</span></span>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-slate-500 border border-slate-200 rounded-md px-1.5 py-0.5"><Lock size={8} /> Lock</div>
            </div>
          </div>

          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] text-slate-400">Welcome back,</p>
                <p className="text-[12px] font-bold text-slate-900 leading-tight">Ada Lovelace</p>
              </div>
              <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200"><Crown size={8} /> Diamond</span>
            </div>

            {/* balance hero */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-3.5">
              <p className="text-[8px] text-blue-100 uppercase tracking-wider">Available Balance</p>
              <p className="font-mono text-[22px] font-bold text-white leading-tight mt-0.5">128,450.<span className="text-blue-200 text-base">00</span> <span className="text-[10px] text-blue-200">XRP</span></p>
              <div className="flex items-center gap-1 mt-1 text-[9px]">
                <TrendingUp size={9} className="text-emerald-300" />
                <span className="text-blue-100">Live yield</span>
                <span className="font-mono text-white">312.884201</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                <div className="bg-white rounded-lg text-center py-1.5 text-blue-700 text-[9px] font-semibold">Deposit</div>
                <div className="bg-blue-500/40 border border-white/30 rounded-lg text-center py-1.5 text-white text-[9px] font-semibold">Withdraw</div>
              </div>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-white border border-slate-200 rounded-xl p-2">
                <p className="text-[7px] text-slate-400 uppercase">Staked</p>
                <p className="font-mono text-[11px] font-bold text-slate-900">100k</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-2">
                <p className="text-[7px] text-slate-400 uppercase">Profit</p>
                <p className="font-mono text-[11px] font-bold text-emerald-600">312.8</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-2">
                <p className="text-[7px] text-slate-400 uppercase">Vaults</p>
                <p className="font-mono text-[11px] font-bold text-slate-900">2</p>
              </div>
            </div>

            {/* active stake */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center"><Layers size={11} className="text-purple-600" /></div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-900 leading-none">VIP Diamond</p>
                    <p className="text-[8px] text-slate-400 font-mono">156% APY · 90d lock</p>
                  </div>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">Active</span>
              </div>
              <div className="flex items-center justify-between mt-2 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-[8px] text-slate-500 flex items-center gap-1"><Clock size={8} /> Unlocks in</span>
                <span className="font-mono text-[9px] font-semibold text-blue-600">62d 4h 11m</span>
              </div>
            </div>
          </div>

          {/* bottom nav */}
          <div className="grid grid-cols-5 border-t border-slate-200 bg-white/95">
            {[{ i: LayoutDashboard, a: true }, { i: Layers }, { i: ArrowDownToLine }, { i: ArrowUpFromLine }, { i: Receipt }].map((n, k) => (
              <div key={k} className={`flex justify-center py-2 ${n.a ? "text-blue-600" : "text-slate-300"}`}><n.i size={15} /></div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
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
              Your VIP staking wallet, <span className="text-blue-600">self-custody</span> in your pocket.
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="text-lg text-slate-500 mt-6 max-w-lg leading-relaxed">
              Generate a private wallet in seconds, stake XRP into premium vaults, and watch your yield accrue live — secured by a PIN only you control.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3 mt-8">
              <Link to="/create" data-testid="hero-get-started" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl glow-blue transition-all active:scale-95">
                <Wallet size={18} /> Create your wallet
              </Link>
              <Link to="/recover" data-testid="hero-login" className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-6 py-3.5 rounded-xl transition-colors">
                <Download size={18} /> I have a phrase
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-5 mt-8 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> No email required</span>
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
              <p className="text-3xl sm:text-4xl font-bold font-mono text-blue-600 tabular-nums">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Why XamanProtocol</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Everything a VIP wallet should be.</h2>
          <p className="text-slate-500 mt-4 leading-relaxed">Built for members who want the sovereignty of self-custody with the simplicity of a modern app — and yield that works around the clock.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i % 3} className="bg-white border border-slate-200 rounded-2xl p-6 glow-card shadow-sm" data-testid={`feature-card-${i}`}>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-blue-600" />
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

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Four steps to live yield.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          {STEPS.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="relative">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                <s.icon size={22} className="text-blue-600" />
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
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Security first</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-slate-900">Your keys. Your crypto. Uncompromised.</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">XamanProtocol is built on a simple principle: only you should be able to access your wallet. There's no password to steal and no account to hijack — just a phrase that lives with you.</p>
            <Link to="/whitepaper" className="inline-flex items-center gap-2 mt-6 text-blue-600 font-semibold hover:underline">Read the whitepaper <ArrowRight size={16} /></Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SECURITY.map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <s.icon size={20} className="text-blue-600 mb-3" />
                <h3 className="font-semibold text-slate-900 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Self custody CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <Eye className="mx-auto text-blue-600 mb-5" size={34} />
          <h2 className="text-3xl sm:text-5xl font-bold max-w-3xl mx-auto leading-tight text-slate-900">Self-custody in your pocket. Only you hold the keys.</h2>
          <p className="text-slate-500 mt-5 max-w-xl mx-auto">Install XamanProtocol to your home screen and access your VIP vaults like a native app — anywhere, anytime.</p>
          <Link to="/create" data-testid="cta-create" className="inline-flex items-center gap-2 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl glow-blue transition-all active:scale-95">
            <Wallet size={18} /> Create my wallet
          </Link>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
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
          <a href="mailto:support@xamanprotocol.app" data-testid="support-cta" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-6 py-3 rounded-xl transition-colors">Contact support</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={28} />
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/whitepaper" className="hover:text-slate-900">Whitepaper</Link>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#vaults" className="hover:text-slate-900">Vaults</a>
            <a href="#security" className="hover:text-slate-900">Security</a>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} XamanProtocol. Non-custodial. XRP-first.</p>
        </div>
      </footer>
    </div>
  );
}
