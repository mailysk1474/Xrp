import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center gap-3"
      data-testid="install-prompt"
    >
      <img src="/icon-512.png" alt="" className="w-11 h-11 rounded-xl" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
        <p className="text-xs text-slate-500">Install XamanProtocol for a native app feel.</p>
      </div>
      <button
        onClick={install}
        data-testid="install-accept-button"
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        <Download size={15} /> Install
      </button>
      <button onClick={() => setShow(false)} data-testid="install-dismiss-button" className="text-slate-400 hover:text-slate-700 p-1">
        <X size={18} />
      </button>
    </div>
  );
}
