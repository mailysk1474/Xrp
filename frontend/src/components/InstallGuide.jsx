import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Share, Plus, MoreVertical, Download, Check, Apple, Smartphone } from "lucide-react";

const IOS_STEPS = [
  { icon: Apple, title: "Open in Safari", text: "The install option only appears in Apple's Safari browser." },
  { icon: Share, title: "Tap the Share button", text: "It's the square with an up-arrow in the toolbar." },
  { icon: Plus, title: "Add to Home Screen", text: "Scroll the share sheet and tap \u201cAdd to Home Screen\u201d." },
  { icon: Check, title: "Tap Add", text: "Confirm and the XamanProtocol icon lands on your home screen." },
];

const ANDROID_STEPS = [
  { icon: Smartphone, title: "Open in Chrome", text: "Use Chrome (or your default browser) on your phone." },
  { icon: MoreVertical, title: "Open the menu", text: "Tap the three-dot menu in the top-right corner." },
  { icon: Download, title: "Install app", text: "Choose \u201cInstall app\u201d or \u201cAdd to Home screen\u201d." },
  { icon: Check, title: "Confirm Install", text: "Tap Install and the app is added like a native app." },
];

function StepList({ steps }) {
  return (
    <ol className="space-y-3 mt-1">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <s.icon size={16} className="text-[#0030cf]" />
              <p className="text-sm font-semibold text-slate-900">{s.title}</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function InstallGuide({ triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid="install-guide-trigger" className={triggerClassName || "text-xs font-medium text-[#0030cf] hover:underline"}>
        How to install
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md" data-testid="install-guide-dialog">
          <DialogHeader>
            <DialogTitle className="text-xl">Add XamanProtocol to your Home Screen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">Install it like a native app — full-screen, with its own icon. Pick your device:</p>
          <Tabs defaultValue="ios" className="mt-2">
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full grid grid-cols-2">
              <TabsTrigger value="ios" data-testid="guide-tab-ios" className="data-[state=active]:bg-white data-[state=active]:text-[#0030cf] rounded-lg text-slate-600 font-semibold"><Apple size={15} className="mr-1.5" /> iPhone / iPad</TabsTrigger>
              <TabsTrigger value="android" data-testid="guide-tab-android" className="data-[state=active]:bg-white data-[state=active]:text-[#0030cf] rounded-lg text-slate-600 font-semibold"><Smartphone size={15} className="mr-1.5" /> Android</TabsTrigger>
            </TabsList>
            <TabsContent value="ios" className="mt-4"><StepList steps={IOS_STEPS} /></TabsContent>
            <TabsContent value="android" className="mt-4"><StepList steps={ANDROID_STEPS} /></TabsContent>
          </Tabs>
          <button onClick={() => setOpen(false)} data-testid="install-guide-close" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">Got it</button>
        </DialogContent>
      </Dialog>
    </>
  );
}
