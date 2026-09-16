import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export function AuthLayout({ children, back = "/", maxWidth = "max-w-md" }) {
  return (
    <div className="min-h-screen bg-white bg-radial-blue flex flex-col">
      <header className="px-4 sm:px-6 h-16 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Logo size={32} />
        <Link
          to={back}
          data-testid="auth-back-link"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </Link>
      </header>
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-6">
        <div className={`w-full ${maxWidth}`}>{children}</div>
      </div>
    </div>
  );
}
