// Browser push notification helpers (Web Notifications API).
export function ensureNotifyPermission() {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch((e) => console.debug("notify permission request failed", e));
    }
  } catch (e) {
    console.debug("notifications unsupported", e);
  }
}

export function notifyEnabled() {
  return "Notification" in window && Notification.permission === "granted";
}

export function pushNotify(title, body) {
  try {
    if (notifyEnabled()) {
      new Notification(title, { body, icon: "/icon-512.png", badge: "/icon-512.png" });
    }
  } catch (e) {
    console.debug("pushNotify failed", e);
  }
}
