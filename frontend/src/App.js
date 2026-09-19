import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PriceProvider } from "@/context/PriceContext";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/InstallPrompt";

import Landing from "@/pages/Landing";
import Whitepaper from "@/pages/Whitepaper";
import CreateWallet from "@/pages/CreateWallet";
import Login from "@/pages/Login";
import Recover from "@/pages/Recover";
import Unlock from "@/pages/Unlock";
import Dashboard from "@/pages/Dashboard";
import VaultsPage from "@/pages/VaultsPage";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import { AppShell } from "@/components/AppShell";

function Protected({ children, adminOnly = false }) {
  const { isAuthed, hasVault, user, ready } = useAuth();
  if (!isAuthed()) {
    return <Navigate to={hasVault() ? "/unlock" : "/login"} replace />;
  }
  if (adminOnly) {
    if (!ready) return <FullLoader />;
    if (user && user.role !== "admin") return <Navigate to="/app" replace />;
  }
  return children;
}

function FullLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/whitepaper" element={<Whitepaper />} />
      <Route path="/create" element={<CreateWallet />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recover" element={<Recover />} />
      <Route path="/unlock" element={<Unlock />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="vaults" element={<VaultsPage />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="withdraw" element={<Withdraw />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <Admin />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <PriceProvider>
            <AppRoutes />
            <InstallPrompt />
            <Toaster position="top-center" theme="light" richColors />
          </PriceProvider>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
