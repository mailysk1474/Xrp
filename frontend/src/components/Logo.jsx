import { Link } from "react-router-dom";

export function Logo({ size = 34, withText = true, className = "" }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`} data-testid="brand-logo">
      <img
        src="/icon-512.png"
        alt="XamanProtocol"
        width={size}
        height={size}
        className="object-contain group-hover:opacity-80 transition-opacity"
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
