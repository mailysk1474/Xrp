import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { fmtXRP, fmtDate, TIER_META } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, ArrowDownToLine, ArrowUpFromLine, ScrollText, Lock, Search,
  Loader2, Check, X, Crown, Plus, Minus, Sliders, LayoutDashboard, Layers, Mail, Copy, Wallet, Clock, TrendingUp,
} from "lucide-react";

const TIERS = ["auto", "starter", "silver", "gold", "platinum", "diamond"];

export default function Admin() {
  const { lock } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("users");
  const onLock = () => { lock(); navigate("/unlock"); };

  return (
    <div className="min-h-screen bg-[#F7F9FC] bg-radial-blue">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200 safe-top safe-x">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#0030cf] border border-blue-200">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/app")} data-testid="admin-goto-app" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"><LayoutDashboard size={14} /> App</button>
            <button onClick={onLock} data-testid="admin-lock-button" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"><Lock size={14} /> Lock</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-5">Control Center</h1>
        <StatsHeader />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl flex-wrap h-auto">
            <TabsTrigger value="users" data-testid="admin-tab-users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><Users size={15} className="mr-1.5" /> Users</TabsTrigger>
            <TabsTrigger value="deposits" data-testid="admin-tab-deposits" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><ArrowDownToLine size={15} className="mr-1.5" /> Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="admin-tab-withdrawals" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><ArrowUpFromLine size={15} className="mr-1.5" /> Withdrawals</TabsTrigger>
            <TabsTrigger value="vaults" data-testid="admin-tab-vaults" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><Layers size={15} className="mr-1.5" /> Vaults</TabsTrigger>
            <TabsTrigger value="profit" data-testid="admin-tab-profit" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><TrendingUp size={15} className="mr-1.5" /> Profit Log</TabsTrigger>
            <TabsTrigger value="audit" data-testid="admin-tab-audit" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg text-slate-600"><ScrollText size={15} className="mr-1.5" /> Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-5"><UsersTab /></TabsContent>
          <TabsContent value="deposits" className="mt-5"><DepositsTab /></TabsContent>
          <TabsContent value="withdrawals" className="mt-5"><WithdrawalsTab /></TabsContent>
          <TabsContent value="vaults" className="mt-5"><VaultsTab /></TabsContent>
          <TabsContent value="profit" className="mt-5"><ProfitLogTab /></TabsContent>
          <TabsContent value="audit" className="mt-5"><AuditTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function useRefreshOn(load) {
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("xp-refresh", h);
    return () => window.removeEventListener("xp-refresh", h);
  }, [load]);
}

const STAT_ACCENTS = {
  blue: "bg-blue-50 text-[#0030cf] border-blue-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
};

function StatCard({ icon: Icon, label, value, sub, accent = "blue", badge, testid }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${STAT_ACCENTS[accent]}`}>
          <Icon size={16} />
        </div>
        {badge > 0 ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">{badge}</span>
        ) : null}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-3 font-mono tabular-nums leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1.5">{label}</p>
      {sub ? <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{sub}</p> : null}
    </div>
  );
}

function StatsHeader() {
  const [s, setS] = useState(null);
  const load = useCallback(() => {
    api.get("/admin/stats").then(({ data }) => setS(data)).catch(() => {});
  }, []);
  useRefreshOn(load);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-testid="admin-stats">
      <StatCard testid="stat-total-users" icon={Users} accent="blue" label="Total users" value={s ? s.total_users : "—"} />
      <StatCard testid="stat-aum" icon={Wallet} accent="violet" label="XRP under management" value={s ? fmtXRP(s.aum, 0) : "—"} sub={s ? `${fmtXRP(s.total_balance, 0)} bal · ${fmtXRP(s.total_staked, 0)} staked` : ""} />
      <StatCard testid="stat-pending-deposits" icon={ArrowDownToLine} accent="emerald" label="Pending deposits" value={s ? s.pending_deposits : "—"} badge={s ? s.pending_deposits : 0} />
      <StatCard testid="stat-pending-withdrawals" icon={ArrowUpFromLine} accent="amber" label="Pending withdrawals" value={s ? s.pending_withdrawals : "—"} badge={s ? s.pending_withdrawals : 0} />
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/users").then(({ data }) => setUsers(data.users)).catch((e) => toast.error(apiError(e)));
  }, []);
  useRefreshOn(load);

  const filtered = (users || []).filter((u) =>
    !q ||
    u.username.includes(q.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(q.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="admin-user-search" placeholder="Search by name, @username or email…" className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-slate-900 outline-none transition-colors" />
      </div>

      {users === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0030cf]" /></div>
      ) : (
        <div className="space-y-2.5" data-testid="admin-users-list">
          {filtered.map((u) => {
            const meta = TIER_META[u.tier] || TIER_META.starter;
            return (
              <button key={u.id} onClick={() => setSelectedId(u.id)} data-testid={`admin-user-row-${u.username}`} className="w-full flex items-center gap-3 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-left transition-colors shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0030cf] font-semibold uppercase">{u.first_name?.[0] || u.username[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium truncate">{u.first_name} {u.last_name} <span className="text-slate-400 font-mono text-sm">@{u.username}</span></p>
                  {u.email && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate mt-0.5" data-testid={`admin-user-email-${u.username}`}>
                      <Mail size={11} className="text-slate-400 shrink-0" /> <span className="truncate">{u.email}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.badge, color: meta.color }}>{meta.label}</span>
                    {u.locked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Locked</span>}
                    {u.withdrawals_disabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">W-Disabled</span>}
                    {u.role === "admin" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0030cf] border border-blue-200">Admin</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1" data-testid={`admin-user-lastlogin-${u.username}`}>
                    <Clock size={10} className="shrink-0" /> {u.last_login ? `Last login ${fmtDate(u.last_login)}` : "Never logged in"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-slate-900 text-sm">{fmtXRP(u.balance)} XRP</p>
                  <p className="text-xs text-slate-400">staked {fmtXRP(u.total_staked, 0)}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-slate-400 py-8">No users found.</p>}
        </div>
      )}

      <UserDetailDialog userId={selectedId} onClose={() => setSelectedId(null)} onChange={load} />
    </div>
  );
}

function UserDetailDialog({ userId, onClose, onChange }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [balDelta, setBalDelta] = useState("");
  const [profitDelta, setProfitDelta] = useState("");

  const load = useCallback(() => {
    if (!userId) return;
    api.get(`/admin/users/${userId}`).then(({ data }) => setDetail(data)).catch((e) => toast.error(apiError(e)));
  }, [userId]);

  useEffect(() => { setDetail(null); setBalDelta(""); setProfitDelta(""); load(); }, [userId, load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("xp-refresh", h);
    return () => window.removeEventListener("xp-refresh", h);
  }, [load]);

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); if (msg) toast.success(msg); await load(); onChange(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const u = detail?.user;
  const tierMeta = detail ? (TIER_META[detail.tier] || TIER_META.starter) : TIER_META.starter;
  const insetInput = "bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono outline-none focus:border-blue-500";

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar" data-testid="admin-user-detail">
        <DialogHeader>
          <DialogTitle className="text-xl">{u ? `${u.first_name} ${u.last_name}` : "User"} <span className="text-slate-400 font-mono text-base">@{u?.username}</span></DialogTitle>
          {u?.email && (
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(u.email); toast.success("Email copied"); }}
              data-testid="admin-detail-email"
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0030cf] transition-colors"
              title="Click to copy"
            >
              <Mail size={13} className="text-slate-400" /> {u.email} <Copy size={12} className="opacity-60" />
            </button>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400" data-testid="admin-detail-lastlogin">
            <Clock size={12} /> {u?.last_login ? `Last login ${fmtDate(u.last_login)}` : "Never logged in"}
          </p>
        </DialogHeader>

        {!detail ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#0030cf]" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Balance" value={`${fmtXRP(detail.balance)}`} />
              <Stat label="Staked" value={`${fmtXRP(detail.total_staked)}`} />
              <Stat label="Profit" value={`${fmtXRP(detail.profit)}`} color="#059669" />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0030cf] mb-2">Credit / Adjust balance</p>
              <div className="flex gap-2">
                <input type="number" value={balDelta} onChange={(e) => setBalDelta(e.target.value)} data-testid="admin-balance-input" placeholder="Amount" className={`flex-1 ${insetInput}`} />
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-balance`, { amount: Math.abs(parseFloat(balDelta) || 0) }), "Balance credited")} data-testid="admin-credit-button" className="px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1"><Plus size={14} /></button>
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-balance`, { amount: -Math.abs(parseFloat(balDelta) || 0) }), "Balance debited")} data-testid="admin-debit-button" className="px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center gap-1"><Minus size={14} /></button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0030cf] mb-2">Add profit bonus</p>
              <div className="flex gap-2">
                <input type="number" value={profitDelta} onChange={(e) => setProfitDelta(e.target.value)} data-testid="admin-profit-input" placeholder="Amount" className={`flex-1 ${insetInput}`} />
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-profit`, { amount: parseFloat(profitDelta) || 0 }), "Profit adjusted")} data-testid="admin-profit-button" className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">Apply</button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2"><Crown size={16} style={{ color: tierMeta.color }} /> <span className="text-sm text-slate-700">VIP Tier</span></div>
              <Select value={u?.tier_override || "auto"} onValueChange={(v) => act(() => api.post(`/admin/users/${userId}/tier`, { tier: v }), "Tier updated")}>
                <SelectTrigger className="w-36 bg-white border-slate-300 text-slate-900" data-testid="admin-tier-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t === "auto" ? "Auto (by staked)" : t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Lock size={16} className="text-red-500" /> <span className="text-sm text-slate-700">Lock account</span></div>
                <Switch checked={!!u?.locked} onCheckedChange={(v) => act(() => api.post(`/admin/users/${userId}/lock`, { value: v }), v ? "Account locked" : "Account unlocked")} data-testid="admin-lock-switch" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ArrowUpFromLine size={16} className="text-amber-600" /> <span className="text-sm text-slate-700">Disable withdrawals</span></div>
                <Switch checked={!!u?.withdrawals_disabled} onCheckedChange={(v) => act(() => api.post(`/admin/users/${userId}/withdrawals`, { value: v }), v ? "Withdrawals disabled" : "Withdrawals enabled")} data-testid="admin-withdrawals-switch" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent activity</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {(detail.transactions || []).slice(0, 12).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="capitalize text-slate-700">{t.type} <span className="text-slate-400 text-xs">{fmtDate(t.created_at)}</span></span>
                    <span className="font-mono text-slate-800">{fmtXRP(t.amount)} <span className={`text-xs ${t.status === "pending" ? "text-amber-600" : t.status === "rejected" ? "text-red-500" : "text-emerald-600"}`}>{t.status}</span></span>
                  </div>
                ))}
                {(!detail.transactions || detail.transactions.length === 0) && <p className="text-sm text-slate-400">No activity.</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, color = "#0F172A" }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="font-mono font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

function DepositsTab() {
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get("/admin/deposits").then(({ data }) => setItems(data.deposits)).catch(() => setItems([])), []);
  useRefreshOn(load);
  const act = async (id, action) => {
    try { await api.post(`/admin/deposits/${id}/${action}`); toast.success(action === "confirm" ? "Deposit confirmed & credited." : "Deposit rejected."); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  return <Queue items={items} empty="No pending deposits." testidPrefix="deposit" onConfirm={(id) => act(id, "confirm")} onReject={(id) => act(id, "reject")} confirmLabel="Confirm & credit" showTag />;
}

function WithdrawalsTab() {
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get("/admin/withdrawals").then(({ data }) => setItems(data.withdrawals)).catch(() => setItems([])), []);
  useRefreshOn(load);
  const act = async (id, action) => {
    try { await api.post(`/admin/withdrawals/${id}/${action}`); toast.success(action === "approve" ? "Withdrawal approved." : "Withdrawal rejected & refunded."); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  return <Queue items={items} empty="No pending withdrawals." testidPrefix="withdrawal" onConfirm={(id) => act(id, "approve")} onReject={(id) => act(id, "reject")} confirmLabel="Approve" />;
}

function Queue({ items, empty, onConfirm, onReject, confirmLabel, testidPrefix, showTag }) {
  if (items === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0030cf]" /></div>;
  if (items.length === 0) return <p className="text-center text-slate-400 py-12" data-testid={`${testidPrefix}-empty`}>{empty}</p>;
  return (
    <div className="space-y-2.5" data-testid={`${testidPrefix}-queue`}>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" data-testid={`${testidPrefix}-item-${it.id}`}>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-medium">@{it.username}</p>
            <p className="text-xs text-slate-400">{fmtDate(it.created_at)}{showTag && it.destination_tag ? ` · tag ${it.destination_tag}` : ""}</p>
          </div>
          <p className="font-mono font-semibold text-slate-900">{fmtXRP(it.amount)} XRP</p>
          <div className="flex gap-2">
            <button onClick={() => onConfirm(it.id)} data-testid={`${testidPrefix}-approve-${it.id}`} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"><Check size={14} /> {confirmLabel}</button>
            <button onClick={() => onReject(it.id)} data-testid={`${testidPrefix}-reject-${it.id}`} className="p-2 rounded-lg bg-red-600/90 hover:bg-red-500 text-white"><X size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState(null);
  const load = useCallback(() => api.get("/admin/audit").then(({ data }) => setLogs(data.audit)).catch(() => setLogs([])), []);
  useRefreshOn(load);
  if (logs === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0030cf]" /></div>;
  if (logs.length === 0) return <p className="text-center text-slate-400 py-12">No admin actions logged yet.</p>;
  return (
    <div className="space-y-2" data-testid="admin-audit-list">
      {logs.map((l) => (
        <div key={l.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm">
          <Sliders size={15} className="text-[#0030cf] shrink-0" />
          <span className="text-slate-700"><b className="text-slate-900">{l.admin_username}</b> · <span className="font-mono text-[#0030cf]">{l.action}</span> {l.detail?.amount != null && <span className="font-mono">({l.detail.amount})</span>}</span>
          <span className="ml-auto text-xs text-slate-400">{fmtDate(l.created_at)}</span>
        </div>
      ))}
    </div>
  );
}


function ProfitLogTab() {
  const [logs, setLogs] = useState(null);
  const load = useCallback(() => api.get("/admin/profit-log").then(({ data }) => setLogs(data.log)).catch(() => setLogs([])), []);
  useRefreshOn(load);
  if (logs === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0030cf]" /></div>;
  if (logs.length === 0) return <p className="text-center text-slate-400 py-12">No manual profit has been added yet.</p>;
  const totalAdded = logs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  return (
    <div className="space-y-2" data-testid="admin-profit-log">
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm">
        <span className="text-slate-500">Total manual profit applied</span>
        <span className={`font-mono font-bold ${totalAdded >= 0 ? "text-emerald-600" : "text-red-600"}`}>{totalAdded >= 0 ? "+" : ""}{fmtXRP(totalAdded)} XRP</span>
      </div>
      {logs.map((l) => {
        const amt = Number(l.amount) || 0;
        const positive = amt >= 0;
        return (
          <div key={l.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm" data-testid={`profit-log-row-${l.id}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {positive ? <Plus size={15} /> : <Minus size={15} />}
            </div>
            <div className="min-w-0">
              <p className="text-slate-900 font-medium truncate">{l.user_name}{l.user_email ? <span className="text-slate-400 font-normal"> · {l.user_email}</span> : null}</p>
              <p className="text-xs text-slate-400">by <b className="text-slate-600">{l.admin_username}</b> · {fmtDate(l.created_at)}</p>
            </div>
            <span className={`ml-auto font-mono font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>{positive ? "+" : ""}{fmtXRP(amt)} XRP</span>
          </div>
        );
      })}
    </div>
  );
}


function VaultsTab() {
  const [vaults, setVaults] = useState(null);
  const [edits, setEdits] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(() => {
    api.get("/vaults").then(({ data }) => {
      setVaults(data.vaults);
      const init = {};
      data.vaults.forEach((v) => {
        init[v.key] = {
          fee: ((v.early_exit_fee ?? 0.10) * 100).toString(),
          slip: ((v.slippage ?? 0.02) * 100).toString(),
        };
      });
      setEdits(init);
    }).catch((e) => { setVaults([]); toast.error(apiError(e)); });
  }, []);
  useRefreshOn(load);

  const setField = (key, field, val) => {
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  };

  const save = async (key) => {
    const e = edits[key] || {};
    const fee = parseFloat(e.fee);
    const slip = parseFloat(e.slip);
    if (isNaN(fee) || fee < 0 || fee > 100) return toast.error("Early exit fee must be 0–100%.");
    if (isNaN(slip) || slip < 0 || slip > 100) return toast.error("Slippage must be 0–100%.");
    if (fee + slip > 100) return toast.error("Fee + slippage can't exceed 100%.");
    setSavingKey(key);
    try {
      await api.put(`/admin/vaults/${key}`, { early_exit_fee: fee / 100, slippage: slip / 100 });
      toast.success("Vault terms updated.");
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSavingKey(null);
    }
  };

  if (vaults === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0030cf]" /></div>;

  return (
    <div className="space-y-3" data-testid="admin-vaults-list">
      <p className="text-sm text-slate-500">Set the early exit fee and slippage applied when a member stops a locked stake before maturity. Changes apply to all active stakes in that vault.</p>
      {vaults.map((v) => {
        const meta = TIER_META[v.tier] || TIER_META.flex;
        const e = edits[v.key] || { fee: "", slip: "" };
        return (
          <div key={v.key} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm" data-testid={`admin-vault-${v.key}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                <div>
                  <p className="font-semibold text-slate-900">{v.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{(v.apy * 100).toFixed(2)}% total · {v.duration_days ? `${v.duration_days}d lock` : "Flexible"} · Min {fmtXRP(v.min_amount, 0)} XRP</p>
                </div>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Early exit fee %</label>
                  <input type="number" step="0.1" value={e.fee} onChange={(ev) => setField(v.key, "fee", ev.target.value)} data-testid={`vault-fee-${v.key}`} className="w-24 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 font-mono text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Slippage %</label>
                  <input type="number" step="0.1" value={e.slip} onChange={(ev) => setField(v.key, "slip", ev.target.value)} data-testid={`vault-slip-${v.key}`} className="w-24 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 font-mono text-sm outline-none" />
                </div>
                <button onClick={() => save(v.key)} disabled={savingKey === v.key} data-testid={`vault-save-${v.key}`} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  {savingKey === v.key ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Save
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
