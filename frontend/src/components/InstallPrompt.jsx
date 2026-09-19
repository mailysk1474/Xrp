import { useEffect, useState } from "react";
import { Download, X, Share, Plus, MoreVertical } from "lucide-react";
import { InstallGuide } from "@/components/InstallGuide";

const DISMISS_KEY = "xp_install_dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent || "");
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // "chrome" | "ios" | "android" | "generic"

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (sessionStorage.getItem(DISMISS_KEY)) return; // dismissed this session

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setMode("chrome"); // one-tap install available (Android/desktop Chrome & Edge)
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Once the app is actually installed, hide the banner immediately.
    const installed = () => {
      sessionStorage.setItem(DISMISS_KEY, "1");
      setMode(null);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", installed);

    // If no one-tap prompt is offered shortly, fall back to manual instructions
    // ONLY on platforms that cannot auto-install (iOS Safari, unsupported browsers).
    const timer = setTimeout(() => {
      setMode((m) => {
        if (m) return m; // already got the one-tap prompt
        if (isIOS()) return "ios";
        if (isAndroid()) return "android";
        return "generic";
      });
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
      clearTimeout(timer);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    dismiss();
    setDeferred(null);
  };

  const instructions = {
    ios: (
      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
        Tap <Share size={13} className="inline text-[#0030cf]" /> Share, then
        <span className="font-medium text-slate-700">&quot;Add to Home Screen&quot;</span>
        <Plus size={13} className="inline text-[#0030cf]" />
      </p>
    ),
    android: (
      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
        Open the <MoreVertical size={13} className="inline text-[#0030cf]" /> menu, then
        <span className="font-medium text-slate-700">&quot;Install app&quot;</span>
      </p>
    ),
    generic: (
      <p className="text-xs text-slate-500">
        Open your browser menu and choose <span className="font-medium text-slate-700">&quot;Install&quot;</span> or <span className="font-medium text-slate-700">&quot;Add to Home Screen&quot;</span>.
      </p>
    ),
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center gap-3"
      data-testid="install-prompt"
    >
      <img src="/icon-512.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
        {mode === "chrome" ? (
          <p className="text-xs text-slate-500">One tap to install — it&apos;ll appear on your home screen.</p>
        ) : (
          <>
            {instructions[mode]}
            <InstallGuide />
          </>
        )}
      </div>
      {mode === "chrome" && (
        <button
          onClick={install}
          data-testid="install-accept-button"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
        >
          <Download size={15} /> Install
        </button>
      )}
      <button onClick={dismiss} data-testid="install-dismiss-button" className="text-slate-400 hover:text-slate-700 p-1 shrink-0">
        <X size={18} />
      </button>
    </div>
  );
}
