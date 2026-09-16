import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Layers, ArrowDownToLine, ArrowUpFromLine, Receipt, Lock, ShieldCheck } from "lucide-react";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/vaults", label: "Vaults", icon: Layers, testid: "nav-vaults" },
  { to: "/app/deposit", label: "Deposit", icon: ArrowDownToLine, testid: "nav-deposit" },
  { to: "/app/withdraw", label: "Withdraw", icon: ArrowUpFromLine, testid: "nav-withdraw" },
  { to: "/app/history", label: "History", icon: Receipt, testid: "nav-history" },
];

export function AppShell() {
  const { user, lock } = useAuth();
  const navigate = useNavigate();

  const onLock = () => {
    lock();
    navigate("/unlock");
  };

  return (
    <div className="min-h-screen bg-[#07090E] bg-radial-blue">
      {/* Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D111A]/85 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size={32} />
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                data-testid="nav-admin-link"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <ShieldCheck size={14} /> Admin
              </NavLink>
            )}
            <button
              onClick={onLock}
              data-testid="lock-session-button"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/70 text-slate-200 border border-white/10 hover:border-white/20 transition-colors"
            >
              <Lock size={14} /> Lock
            </button>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:block border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid + "-desktop"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "text-white border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`
                }
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#07090E]/95 border-t border-white/10 safe-bottom">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-blue-400" : "text-slate-500"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
