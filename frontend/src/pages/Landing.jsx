import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  Carousel, CarouselContent, CarouselItem,
} from "@/components/ui/carousel";
import {
  ShieldCheck, KeyRound, Zap, Fingerprint, Layers, TrendingUp,
  Lock, Eye, ArrowRight, Download, Star, CheckCircle2, Wallet, Server,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const FEATURES = [
  { icon: KeyRound, title: "Self-generated wallet", text: "A fresh 12-word wallet is created for you on sign-up. No email, no password — you hold the keys." },
  { icon: Fingerprint, title: "PIN & biometric unlock", text: "Your phrase is encrypted on-device behind a PIN. Daily access is one tap." },
  { icon: TrendingUp, title: "Live yield accrual", text: "Watch profit tick up in real time across every VIP vault, second by second." },
  { icon: Layers, title: "VIP staking vaults", text: "From flexible XRP Flex to 90-day Diamond at 156% APY — tiered by what you stake." },
  { icon: ShieldCheck, title: "Server-enforced security", text: "Every action is validated server-side. No client-only gates, no stale balances." },
  { icon: Zap, title: "Instant admin sync", text: "Account changes propagate live over WebSocket. What you see is always the source of truth." },
];

const STEPS = [
  { icon: Wallet, title: "Create your wallet", text: "Register with a unique username and save your 12-word recovery phrase." },
  { icon: Fingerprint, title: "Set a PIN", text: "Encrypt your phrase locally and unlock instantly on every visit." },
  { icon: Layers, title: "Stake into a vault", text: "Deposit XRP and choose a VIP vault matched to your tier." },
  { icon: TrendingUp, title: "Earn live yield", text: "Profit accrues continuously and is withdrawable at maturity." },
];

const TESTIMONIALS = [
  { name: "M. Serrano", role: "Platinum member", text: "The live accrual counter is addictive. It finally feels like my capital is working every second." },
  { name: "A. Okafor", role: "Diamond member", text: "Setup took under a minute. The self-custody model with a PIN is exactly how a wallet should feel." },
  { name: "L. Petrova", role: "Gold member", text: "Clean, fast, and the security-first approach is obvious. Withdrawals were approved same day." },
  { name: "R. Nakamura", role: "Silver member", text: "Installed it to my home screen and never looked back. Feels like a real native app." },
];

const FAQS = [
  { q: "Is XamanProtocol custodial?", a: "Your 12-word phrase is your wallet identity and never leaves your device unencrypted. Staking balances are platform-managed off-chain numbers, confirmed by our team." },
  { q: "What happens if I lose my recovery phrase?", a: "There is no recovery. The phrase is the only way to access your wallet — store it offline and never share it. This is by design for a security-first, non-custodial model." },
  { q: "How is my profit calculated?", a: "Each vault has a fixed APY. Profit accrues continuously by the second based on your staked principal and is shown live on your dashboard." },
  { q: "How do deposits and withdrawals work?", a: "Deposit XRP to your unique address with a destination tag; balances credit after admin confirmation. Withdrawals are requested in-app and manually approved." },
  { q: "Which coins are supported?", a: "XamanProtocol is XRP-first. Additional assets can be added by the protocol over time." },
];

function PhoneMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: -3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative mx-auto w-[270px] animate-float"
    >
      <div className="rounded-[2.6rem] border border-white/15 bg-[#0B0E17] p-3 shadow-2xl" style={{ boxShadow: "0 0 60px -10px rgba(37,99,235,0.5)" }}>
        <div className="rounded-[2rem] overflow-hidden bg-[#07090E] border border-white/10">
          <div className="h-6 bg-[#0D111A] flex items-center justify-center"><div className="w-16 h-1.5 rounded-full bg-white/10" /></div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] text-slate-500 uppercase tracking-wider">Balance</p></div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">Diamond</span>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#0F1830] to-[#0B1220] border border-blue-500/20 p-4">
              <p className="font-mono text-2xl font-bold text-white">128,450.<span className="text-slate-500 text-lg">00</span></p>
              <p className="text-[10px] text-blue-400 font-semibold">XRP</p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <TrendingUp size={11} className="text-emerald-400" />
                <span className="font-mono text-emerald-400">+312.884201</span>
                <span className="text-emerald-400/60">live</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#121824] border border-white/10 p-3">
                <p className="text-[8px] text-slate-500 uppercase">Diamond</p>
                <p className="font-mono text-purple-300 font-bold text-sm">156% APY</p>
              </div>
              <div className="rounded-xl bg-[#121824] border border-white/10 p-3">
                <p className="text-[8px] text-slate-500 uppercase">Gold</p>
                <p className="font-mono text-amber-400 font-bold text-sm">38.4% APY</p>
              </div>
            </div>
            <div className="rounded-xl bg-blue-600 text-center py-2.5 text-white text-[11px] font-semibold">Deposit XRP</div>
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
    <div className="min-h-screen bg-[#07090E] text-white overflow-x-hidden">
      {/* Nav */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-[#0D111A]/85 border-b border-white/10" : ""}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size={32} />
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#vaults" className="hover:text-white transition-colors">Vaults</a>
            <Link to="/whitepaper" data-testid="nav-whitepaper" className="hover:text-white transition-colors">Whitepaper</Link>
          </nav>
          <Link
            to="/create"
            data-testid="nav-get-started"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl glow-blue transition-all active:scale-95"
          >
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-radial-blue">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
              <Lock size={13} /> Private · Invite-only · Non-custodial
            </motion.div>
            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Your VIP staking wallet, <span className="text-blue-500">self-custody</span> in your pocket.
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="text-lg text-slate-400 mt-6 max-w-lg leading-relaxed">
              Generate a private wallet in seconds, stake XRP into premium vaults, and watch your yield accrue live — secured by a PIN only you control.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3 mt-8">
              <Link to="/create" data-testid="hero-get-started" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl glow-blue transition-all active:scale-95">
                <Wallet size={18} /> Create your wallet
              </Link>
              <Link to="/recover" data-testid="hero-login" className="flex items-center gap-2 bg-slate-800/70 hover:bg-slate-700 border border-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors">
                <Download size={18} /> I have a phrase
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-5 mt-8 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> No email required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> Installable PWA</span>
            </motion.div>
          </div>
          <div className="relative"><PhoneMock /></div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-white/10 bg-[#0D111A]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "Audited protocol" },
            { icon: Server, label: "Server-enforced" },
            { icon: Lock, label: "AES-256 encrypted" },
            { icon: KeyRound, label: "Non-custodial keys" },
          ].map((t, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="flex flex-col items-center gap-2">
              <t.icon size={22} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-300">{t.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-400/90">Why XamanProtocol</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3">Security-first by design, effortless to use.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i % 3} className="bg-[#121824] border border-white/10 rounded-2xl p-6 glow-card" data-testid={`feature-card-${i}`}>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Highlight block */}
      <section id="vaults" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-[#0F1830] to-[#0B1220] p-8 sm:p-12">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold">Up to <span className="text-purple-400">156% APY</span> across VIP vaults.</h2>
              <p className="text-slate-400 mt-4 leading-relaxed">Tiered vaults reward commitment — from flexible XRP Flex to the 90-day Diamond vault. Your VIP tier unlocks as you stake more.</p>
              <Link to="/create" className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl glow-blue transition-all active:scale-95">
                Start staking <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { n: "XRP Flex", a: "5.2%", c: "#38BDF8" },
                { n: "VIP Silver", a: "19.2%", c: "#CBD5E1" },
                { n: "VIP Gold", a: "38.4%", c: "#F59E0B" },
                { n: "VIP Platinum", a: "83.6%", c: "#E2E8F0" },
                { n: "VIP Diamond", a: "156%", c: "#A855F7" },
                { n: "Live accrual", a: "24/7", c: "#10B981" },
              ].map((v, i) => (
                <div key={i} className="bg-[#0B0E17]/70 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-slate-500">{v.n}</p>
                  <p className="font-mono font-bold text-xl mt-1" style={{ color: v.c }}>{v.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-400/90">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3">Four steps to live yield.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          {STEPS.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="relative">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <s.icon size={22} className="text-blue-400" />
              </div>
              <span className="absolute top-0 right-0 font-mono text-4xl font-bold text-white/5">0{i + 1}</span>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-white/10 bg-[#0D111A]/40 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center">Trusted by VIP members.</h2>
          <Carousel opts={{ loop: true, align: "start" }} className="mt-12">
            <CarouselContent>
              {TESTIMONIALS.map((t, i) => (
                <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full bg-[#121824] border border-white/10 rounded-2xl p-6" data-testid={`testimonial-${i}`}>
                    <div className="flex gap-0.5 mb-3">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={14} className="fill-amber-400 text-amber-400" />)}</div>
                    <p className="text-slate-300 leading-relaxed text-sm">"{t.text}"</p>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="font-semibold text-white text-sm">{t.name}</p>
                      <p className="text-xs text-blue-400">{t.role}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      {/* Self custody */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <Eye className="mx-auto text-blue-400 mb-5" size={34} />
          <h2 className="text-3xl sm:text-5xl font-bold max-w-3xl mx-auto leading-tight">Self-custody in your pocket. Only you hold the keys.</h2>
          <p className="text-slate-400 mt-5 max-w-xl mx-auto">Install XamanProtocol to your home screen and access your VIP vaults like a native app — anywhere, anytime.</p>
          <Link to="/create" data-testid="cta-create" className="inline-flex items-center gap-2 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl glow-blue transition-all active:scale-95">
            <Wallet size={18} /> Create my wallet
          </Link>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">Questions, answered.</h2>
        <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-[#121824] border border-white/10 rounded-2xl px-5">
              <AccordionTrigger data-testid={`faq-trigger-${i}`} className="text-left text-white hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-400 leading-relaxed pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Support CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-[#0D111A] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold">Need a hand?</h3>
            <p className="text-slate-400 mt-1">Our VIP support team responds within hours, every day.</p>
          </div>
          <a href="mailto:support@xamanprotocol.app" data-testid="support-cta" className="bg-slate-800/70 hover:bg-slate-700 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-colors">Contact support</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={28} />
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/whitepaper" className="hover:text-white">Whitepaper</Link>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#vaults" className="hover:text-white">Vaults</a>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} XamanProtocol. Non-custodial. XRP-first.</p>
        </div>
      </footer>
    </div>
  );
}
