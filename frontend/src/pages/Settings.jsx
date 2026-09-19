import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, apiError, downloadTransactions } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Switch } from "@/components/ui/switch";
import { ensureNotifyPermission, notifyEnabled } from "@/lib/notify";
import {
  User, Mail, Copy, KeyRound, Bell, Download, Loader2, Save, Check, Eye, EyeOff,
  FileText, FileSpreadsheet,
} from "lucide-react";

const inputCls =
  "w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-4 py-3 text-slate-900 outline-none transition-all";

function Card({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-[#0030cf]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {desc && <p className="text-sm text-slate-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ProfileCard() {
  const { user, refresh } = useAuth();
  const [first, setFirst] = useState(user?.first_name || "");
  const [last, setLast] = useState(user?.last_name || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync when server user data loads/changes (initial render may precede /state).
  useEffect(() => {
    setFirst(user?.first_name || "");
    setLast(user?.last_name || "");
  }, [user?.first_name, user?.last_name]);

  const dirty = first !== (user?.first_name || "") || last !== (user?.last_name || "");

  const save = async () => {
    if (!first.trim() || !last.trim()) return toast.error("First and last name are required.");
    setSaving(true);
    try {
      await api.post("/auth/update-profile", { first_name: first, last_name: last });
      await refresh();
      toast.success("Profile updated");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || "");
      setCopied(true);
      toast.success("Email copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card icon={User} title="Profile" desc="Your name and account email.">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">First name</label>
          <input data-testid="settings-first-name" value={first} onChange={(e) => setFirst(e.target.value)} className={`${inputCls} mt-1.5`} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last name</label>
          <input data-testid="settings-last-name" value={last} onChange={(e) => setLast(e.target.value)} className={`${inputCls} mt-1.5`} />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
        <div className="mt-1.5 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Mail size={16} className="text-slate-400 shrink-0" />
          <span data-testid="settings-email" className="flex-1 text-slate-900 font-mono text-sm truncate">{user?.email || "—"}</span>
          {user?.email && (
            <button onClick={copyEmail} data-testid="settings-copy-email" className="flex items-center gap-1 text-xs font-medium text-[#0030cf] hover:underline shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {user?.username && <p className="text-xs text-slate-400 mt-1.5">Username: @{user.username}</p>}
      </div>

      <button onClick={save} disabled={!dirty || saving} data-testid="settings-save-profile" className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes
      </button>
    </Card>
  );
}

function PasswordCard() {
  const { user } = useAuth();
  const hasPassword = user?.has_password;
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    if (next !== confirm) return toast.error("New passwords do not match.");
    setSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: hasPassword ? cur : undefined, new_password: next });
      toast.success(hasPassword ? "Password changed" : "Password set");
      setCur(""); setNext(""); setConfirm("");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon={KeyRound} title={hasPassword ? "Change password" : "Set a password"} desc="Used to log in with your email.">
      <div className="space-y-3">
        {hasPassword && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current password</label>
            <input data-testid="settings-current-password" type={show ? "text" : "password"} value={cur} onChange={(e) => setCur(e.target.value)} className={`${inputCls} mt-1.5`} />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">New password</label>
          <div className="relative mt-1.5">
            <input data-testid="settings-new-password" type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} className={`${inputCls} pr-12`} placeholder="At least 8 characters" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm new password</label>
          <input data-testid="settings-confirm-password" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputCls} mt-1.5`} />
        </div>
      </div>
      <button onClick={save} disabled={saving || !next || !confirm || (hasPassword && !cur)} data-testid="settings-save-password" className="mt-5 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} {hasPassword ? "Update password" : "Set password"}
      </button>
    </Card>
  );
}

const NOTIF_ROWS = [
  { key: "matured", label: "Stake matured", desc: "When a locked stake completes and returns to your balance." },
  { key: "deposit", label: "Deposit confirmed", desc: "When an incoming XRP deposit is credited." },
  { key: "withdrawal", label: "Withdrawal approved", desc: "When a withdrawal request is approved." },
  { key: "restake", label: "Auto-restake", desc: "When profit is automatically restaked into a vault." },
];

function NotificationsCard() {
  const { user, refresh } = useAuth();
  const base = user?.notify_prefs || { matured: true, deposit: true, withdrawal: true, restake: true };
  const [prefs, setPrefs] = useState(base);
  const [saving, setSaving] = useState(false);
  const [granted, setGranted] = useState(notifyEnabled());

  // Re-sync only when the server-side prefs actually change (not on every refresh).
  const serverKey = JSON.stringify(user?.notify_prefs || {});
  useEffect(() => {
    if (user?.notify_prefs) setPrefs(user.notify_prefs);
  }, [serverKey]);

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/notifications/prefs", prefs);
      await refresh();
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const enableBrowser = () => {
    ensureNotifyPermission();
    setTimeout(() => setGranted(notifyEnabled()), 800);
  };

  return (
    <Card icon={Bell} title="Notifications" desc="Choose which browser alerts you want to receive.">
      {!granted && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-700">Browser notifications are off. Enable them to get real-time alerts.</p>
          <button onClick={enableBrowser} data-testid="settings-enable-browser-notif" className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors">Enable</button>
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {NOTIF_ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{r.label}</p>
              <p className="text-xs text-slate-500">{r.desc}</p>
            </div>
            <Switch checked={!!prefs[r.key]} onCheckedChange={() => toggle(r.key)} data-testid={`settings-notif-${r.key}`} />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} data-testid="settings-save-notifs" className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save preferences
      </button>
    </Card>
  );
}

function ExportCard() {
  const [busy, setBusy] = useState("");

  const run = async (fmt) => {
    setBusy(fmt);
    try {
      await downloadTransactions(fmt);
      toast.success(`${fmt.toUpperCase()} downloaded`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <Card icon={Download} title="Export your data" desc="Download your full transaction history.">
      <div className="flex flex-wrap gap-3">
        <button onClick={() => run("csv")} disabled={!!busy} data-testid="settings-export-csv" className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-400 text-slate-800 font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
          {busy === "csv" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} className="text-emerald-600" />} Download CSV
        </button>
        <button onClick={() => run("pdf")} disabled={!!busy} data-testid="settings-export-pdf" className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-400 text-slate-800 font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
          {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="text-red-600" />} Download PDF
        </button>
      </div>
    </Card>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl" data-testid="settings-page">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <ProfileCard />
      <PasswordCard />
      <NotificationsCard />
      <ExportCard />
    </div>
  );
}
