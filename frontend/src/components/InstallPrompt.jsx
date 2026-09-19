import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

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
  // iPadOS 13+ reports as Mac; detect touch to catch it
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // "chrome" | "ios"

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (sessionStorage.getItem(DISMISS_KEY)) return; // dismissed this session

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setMode("chrome");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari never fires beforeinstallprompt — show manual instructions.
    let iosTimer;
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        setMode((m) => m || "ios");
      }, 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (iosTimer) clearTimeout(iosTimer);
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

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center gap-3"
      data-testid="install-prompt"
    >
      <img src="/icon-512.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
        {mode === "chrome" ? (
          <p className="text-xs text-slate-500">Install XamanProtocol for a native app feel.</p>
        ) : (
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            Tap <Share size={13} className="inline text-[#0030cf]" /> Share, then
            <span className="font-medium text-slate-700">&quot;Add to Home Screen&quot;</span>
            <Plus size={13} className="inline text-[#0030cf]" />
          </p>
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
