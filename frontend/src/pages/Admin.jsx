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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, ArrowDownToLine, ArrowUpFromLine, ScrollText, Lock, Search,
  Loader2, Check, X, Crown, Plus, Minus, Sliders, LayoutDashboard,
} from "lucide-react";

const TIERS = ["auto", "starter", "silver", "gold", "platinum", "diamond"];

export default function Admin() {
  const { user, lock } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("users");

  const onLock = () => { lock(); navigate("/unlock"); };

  return (
    <div className="min-h-screen bg-[#07090E] bg-radial-blue">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D111A]/85 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/app")} data-testid="admin-goto-app" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/70 text-slate-200 border border-white/10 hover:border-white/20">
              <LayoutDashboard size={14} /> App
            </button>
            <button onClick={onLock} data-testid="admin-lock-button" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/70 text-slate-200 border border-white/10 hover:border-white/20">
              <Lock size={14} /> Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-white mb-5">Control Center</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-[#121824] border border-white/10 p-1 rounded-xl flex-wrap h-auto">
            <TabsTrigger value="users" data-testid="admin-tab-users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"><Users size={15} className="mr-1.5" /> Users</TabsTrigger>
            <TabsTrigger value="deposits" data-testid="admin-tab-deposits" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"><ArrowDownToLine size={15} className="mr-1.5" /> Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="admin-tab-withdrawals" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"><ArrowUpFromLine size={15} className="mr-1.5" /> Withdrawals</TabsTrigger>
            <TabsTrigger value="audit" data-testid="admin-tab-audit" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"><ScrollText size={15} className="mr-1.5" /> Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-5"><UsersTab /></TabsContent>
          <TabsContent value="deposits" className="mt-5"><DepositsTab /></TabsContent>
          <TabsContent value="withdrawals" className="mt-5"><WithdrawalsTab /></TabsContent>
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

function UsersTab() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/users").then(({ data }) => setUsers(data.users)).catch((e) => toast.error(apiError(e)));
  }, []);
  useRefreshOn(load);

  const filtered = (users || []).filter((u) =>
    !q || u.username.includes(q.toLowerCase()) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="admin-user-search"
          placeholder="Search users…"
          className="w-full bg-[#121824] border border-white/10 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-white outline-none transition-colors"
        />
      </div>

      {users === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-400" /></div>
      ) : (
        <div className="space-y-2.5" data-testid="admin-users-list">
          {filtered.map((u) => {
            const meta = TIER_META[u.tier] || TIER_META.starter;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                data-testid={`admin-user-row-${u.username}`}
                className="w-full flex items-center gap-3 bg-[#121824] border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold uppercase">
                  {u.first_name?.[0] || u.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{u.first_name} {u.last_name} <span className="text-slate-500 font-mono text-sm">@{u.username}</span></p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.badge, color: meta.color }}>{meta.label}</span>
                    {u.locked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Locked</span>}
                    {u.withdrawals_disabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">W-Disabled</span>}
                    {u.role === "admin" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Admin</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-white text-sm">{fmtXRP(u.balance)} XRP</p>
                  <p className="text-xs text-slate-500">staked {fmtXRP(u.total_staked, 0)}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-slate-500 py-8">No users found.</p>}
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

  useEffect(() => {
    setDetail(null);
    setBalDelta("");
    setProfitDelta("");
    load();
  }, [userId, load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("xp-refresh", h);
    return () => window.removeEventListener("xp-refresh", h);
  }, [load]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.success(msg);
      await load();
      onChange();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const u = detail?.user;
  const tierMeta = detail ? (TIER_META[detail.tier] || TIER_META.starter) : TIER_META.starter;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#101622] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar" data-testid="admin-user-detail">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {u ? `${u.first_name} ${u.last_name}` : "User"} <span className="text-slate-500 font-mono text-base">@{u?.username}</span>
          </DialogTitle>
        </DialogHeader>

        {!detail ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Balance" value={`${fmtXRP(detail.balance)}`} />
              <Stat label="Staked" value={`${fmtXRP(detail.total_staked)}`} />
              <Stat label="Profit" value={`${fmtXRP(detail.profit)}`} color="#10B981" />
            </div>

            {/* Balance adjust */}
            <div className="bg-[#0B0E17] rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/90 mb-2">Credit / Adjust balance</p>
              <div className="flex gap-2">
                <input type="number" value={balDelta} onChange={(e) => setBalDelta(e.target.value)} data-testid="admin-balance-input" placeholder="Amount" className="flex-1 bg-[#121824] border border-white/15 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-blue-500" />
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-balance`, { amount: Math.abs(parseFloat(balDelta) || 0) }), "Balance credited")} data-testid="admin-credit-button" className="px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1"><Plus size={14} /></button>
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-balance`, { amount: -Math.abs(parseFloat(balDelta) || 0) }), "Balance debited")} data-testid="admin-debit-button" className="px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center gap-1"><Minus size={14} /></button>
              </div>
            </div>

            {/* Profit adjust */}
            <div className="bg-[#0B0E17] rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/90 mb-2">Add profit bonus</p>
              <div className="flex gap-2">
                <input type="number" value={profitDelta} onChange={(e) => setProfitDelta(e.target.value)} data-testid="admin-profit-input" placeholder="Amount" className="flex-1 bg-[#121824] border border-white/15 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-blue-500" />
                <button disabled={busy} onClick={() => act(() => api.post(`/admin/users/${userId}/adjust-profit`, { amount: parseFloat(profitDelta) || 0 }), "Profit adjusted")} data-testid="admin-profit-button" className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">Apply</button>
              </div>
            </div>

            {/* Tier */}
            <div className="bg-[#0B0E17] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Crown size={16} style={{ color: tierMeta.color }} /> <span className="text-sm text-slate-300">VIP Tier</span></div>
              <Select value={u?.tier_override || "auto"} onValueChange={(v) => act(() => api.post(`/admin/users/${userId}/tier`, { tier: v }), "Tier updated")}>
                <SelectTrigger className="w-36 bg-[#121824] border-white/15 text-white" data-testid="admin-tier-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#101622] border-white/10 text-white">
                  {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t === "auto" ? "Auto (by staked)" : t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="bg-[#0B0E17] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Lock size={16} className="text-red-400" /> <span className="text-sm text-slate-300">Lock account</span></div>
                <Switch checked={!!u?.locked} onCheckedChange={(v) => act(() => api.post(`/admin/users/${userId}/lock`, { value: v }), v ? "Account locked" : "Account unlocked")} data-testid="admin-lock-switch" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ArrowUpFromLine size={16} className="text-amber-400" /> <span className="text-sm text-slate-300">Disable withdrawals</span></div>
                <Switch checked={!!u?.withdrawals_disabled} onCheckedChange={(v) => act(() => api.post(`/admin/users/${userId}/withdrawals`, { value: v }), v ? "Withdrawals disabled" : "Withdrawals enabled")} data-testid="admin-withdrawals-switch" />
              </div>
            </div>

            {/* Recent txns */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Recent activity</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {(detail.transactions || []).slice(0, 12).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-[#0B0E17] rounded-lg px-3 py-2">
                    <span className="capitalize text-slate-300">{t.type} <span className="text-slate-600 text-xs">{fmtDate(t.created_at)}</span></span>
                    <span className="font-mono text-slate-200">{fmtXRP(t.amount)} <span className={`text-xs ${t.status === "pending" ? "text-amber-400" : t.status === "rejected" ? "text-red-400" : "text-emerald-400"}`}>{t.status}</span></span>
                  </div>
                ))}
                {(!detail.transactions || detail.transactions.length === 0) && <p className="text-sm text-slate-600">No activity.</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, color = "#fff" }) {
  return (
    <div className="bg-[#0B0E17] rounded-xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

function DepositsTab() {
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get("/admin/deposits").then(({ data }) => setItems(data.deposits)).catch(() => setItems([])), []);
  useRefreshOn(load);
  const act = async (id, action) => {
    try {
      await api.post(`/admin/deposits/${id}/${action}`);
      toast.success(action === "confirm" ? "Deposit confirmed & credited." : "Deposit rejected.");
      load();
    } catch (e) { toast.error(apiError(e)); }
  };
  return <Queue items={items} empty="No pending deposits." testidPrefix="deposit" onConfirm={(id) => act(id, "confirm")} onReject={(id) => act(id, "reject")} confirmLabel="Confirm & credit" showTag />;
}

function WithdrawalsTab() {
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get("/admin/withdrawals").then(({ data }) => setItems(data.withdrawals)).catch(() => setItems([])), []);
  useRefreshOn(load);
  const act = async (id, action) => {
    try {
      await api.post(`/admin/withdrawals/${id}/${action}`);
      toast.success(action === "approve" ? "Withdrawal approved." : "Withdrawal rejected & refunded.");
      load();
    } catch (e) { toast.error(apiError(e)); }
  };
  return <Queue items={items} empty="No pending withdrawals." testidPrefix="withdrawal" onConfirm={(id) => act(id, "approve")} onReject={(id) => act(id, "reject")} confirmLabel="Approve" />;
}

function Queue({ items, empty, onConfirm, onReject, confirmLabel, testidPrefix, showTag }) {
  if (items === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-400" /></div>;
  if (items.length === 0) return <p className="text-center text-slate-500 py-12" data-testid={`${testidPrefix}-empty`}>{empty}</p>;
  return (
    <div className="space-y-2.5" data-testid={`${testidPrefix}-queue`}>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-3 bg-[#121824] border border-white/10 rounded-2xl p-4" data-testid={`${testidPrefix}-item-${it.id}`}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">@{it.username}</p>
            <p className="text-xs text-slate-500">{fmtDate(it.created_at)}{showTag && it.destination_tag ? ` · tag ${it.destination_tag}` : ""}</p>
          </div>
          <p className="font-mono font-semibold text-white">{fmtXRP(it.amount)} XRP</p>
          <div className="flex gap-2">
            <button onClick={() => onConfirm(it.id)} data-testid={`${testidPrefix}-approve-${it.id}`} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"><Check size={14} /> {confirmLabel}</button>
            <button onClick={() => onReject(it.id)} data-testid={`${testidPrefix}-reject-${it.id}`} className="p-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white"><X size={14} /></button>
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
  if (logs === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-400" /></div>;
  if (logs.length === 0) return <p className="text-center text-slate-500 py-12">No admin actions logged yet.</p>;
  return (
    <div className="space-y-2" data-testid="admin-audit-list">
      {logs.map((l) => (
        <div key={l.id} className="flex items-center gap-3 bg-[#121824] border border-white/10 rounded-xl px-4 py-3 text-sm">
          <Sliders size={15} className="text-blue-400 shrink-0" />
          <span className="text-slate-300"><b className="text-white">{l.admin_username}</b> · <span className="font-mono text-blue-300">{l.action}</span> {l.detail?.amount != null && <span className="font-mono">({l.detail.amount})</span>}</span>
          <span className="ml-auto text-xs text-slate-600">{fmtDate(l.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
