// Opens the Smartsupp live chat if its widget is installed.
// The Smartsupp script/key will be added later; until then we fall back to email.
export function openSupportChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  try {
    if (typeof window !== "undefined" && typeof window.smartsupp === "function") {
      window.smartsupp("chat:open");
      return;
    }
  } catch (err) {
    console.debug("smartsupp open failed", err);
  }
  // Fallback until the Smartsupp widget is installed
  window.location.href = "mailto:support@xamanprotocol.app";
}
