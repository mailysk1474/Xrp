import { Link } from "react-router-dom";

export function Logo({ size = 34, withText = true, className = "" }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`} data-testid="brand-logo">
      <img
        src="/icon-512.png"
        alt="XamanProtocol"
        width={size}
        height={size}
        className="rounded-[10px] ring-1 ring-slate-200 group-hover:ring-blue-400/50 transition-all"
        style={{ width: size, height: size }}
      />
      {withText && (
        <span className="text-[17px] font-bold tracking-tight text-slate-900">
          Xaman<span className="text-[#0030cf]">Protocol</span>
        </span>
      )}
    </Link>
  );
}
