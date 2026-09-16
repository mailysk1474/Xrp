import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const VAULTS = [
  { n: "XRP Flex", apy: "5.2%", term: "Flexible", tier: "All members" },
  { n: "VIP Silver", apy: "19.2%", term: "30 days", tier: "Silver+" },
  { n: "VIP Gold", apy: "38.4%", term: "45 days", tier: "Gold+" },
  { n: "VIP Platinum", apy: "83.6%", term: "60 days", tier: "Platinum+" },
  { n: "VIP Diamond", apy: "156%", term: "90 days", tier: "Diamond" },
];

const SECTIONS = [
  {
    h: "1. Abstract",
    p: "XamanProtocol is a private, invite-only VIP staking platform built for XRP holders who demand a security-first, non-custodial experience. Members generate a self-custodied wallet, stake into curated vaults, and earn continuously accruing yield — all from an installable, app-like interface.",
  },
  {
    h: "2. Custody Model",
    p: "Each member's identity is a self-generated 12-word recovery phrase, encrypted on-device behind a PIN. The phrase never leaves the device unencrypted. Staking balances and accrued profit are platform-managed, off-chain figures confirmed by the protocol treasury. This hybrid model combines the sovereignty of self-custody with the flexibility of a managed yield desk.",
  },
  {
    h: "3. Authentication",
    p: "There are no emails or passwords. Registration requires a first name, last name, and a unique username. On creation, a fresh wallet phrase is revealed once — the member must save it. Daily access uses a PIN (or device biometric); recovery on any device uses the 12-word phrase. If the phrase is lost, the account cannot be recovered.",
  },
  {
    h: "4. Yield & Accrual",
    p: "Each vault carries a fixed APY. Profit accrues continuously, computed per second against staked principal, and is displayed live on the member dashboard. Fixed-term vaults mature at their stated duration, after which principal and yield are withdrawable. An automated server engine advances accrual; the protocol may also apply manual yield adjustments.",
  },
  {
    h: "5. Deposits & Withdrawals",
    p: "Deposits are made in XRP to a hot-wallet address paired with a member-unique destination tag, and are credited after administrative confirmation. Withdrawals are requested in-app and settled through manual approval to protect against fraud and ensure treasury integrity.",
  },
  {
    h: "6. Security & Enforcement",
    p: "The database is the single source of truth. All account state is rendered live and enforced server-side — locked or restricted accounts are rejected immediately, even via direct API calls. Sensitive endpoints are never cached, and administrative changes propagate in real time over WebSocket.",
  },
  {
    h: "7. Roadmap (Phase 2)",
    p: "Future releases introduce the YIELD token, on-platform governance, the Apex Cohort program (212 seats scored by a composite metric), and advanced portfolio analytics.",
  },
];

export default function Whitepaper() {
  return (
    <div className="min-h-screen bg-[#07090E] text-white bg-radial-blue">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D111A]/85 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size={32} />
          <Link to="/" data-testid="whitepaper-back" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
            <ShieldCheck size={13} /> Protocol Whitepaper · v1.0
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">XamanProtocol Whitepaper</h1>
          <p className="text-slate-400 mt-4 text-lg leading-relaxed">A private, non-custodial VIP staking protocol for XRP — engineered for security, transparency, and live yield.</p>
        </motion.div>

        <div className="my-10 rounded-2xl border border-white/10 bg-[#121824] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10"><h2 className="font-semibold">Vault Schedule</h2></div>
          <div className="divide-y divide-white/5">
            {VAULTS.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="font-medium text-white">{v.n}</span>
                <span className="text-slate-500 hidden sm:inline">{v.tier}</span>
                <span className="text-slate-400">{v.term}</span>
                <span className="font-mono font-bold text-blue-400">{v.apy}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s, i) => (
            <motion.section key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-xl font-semibold text-white">{s.h}</h2>
              <p className="text-slate-400 mt-2.5 leading-relaxed">{s.p}</p>
            </motion.section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0F1830] to-[#0B1220] p-8 text-center">
          <h3 className="text-2xl font-bold">Ready to join?</h3>
          <p className="text-slate-400 mt-2">Create your non-custodial VIP wallet in under a minute.</p>
          <Link to="/create" data-testid="whitepaper-cta" className="inline-flex items-center gap-2 mt-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl glow-blue transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
