// Lightweight browser-notification helpers.
// Actions inside the OS notification need a Service Worker; we keep it simple
// here and surface the actionable choice via an in-app modal once the tab
// is focused again. The OS notification's job is to GET the user back.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }
  return Notification.permission;
}

export function showSessionCompleteNotification(opts: {
  minutes: number;
  label?: string;
}): Notification | null {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return null;
  }
  const body = `You completed ${opts.minutes} minute${
    opts.minutes === 1 ? "" : "s"
  } on:\n${opts.label?.trim() || "Untitled session"}`;
  try {
    const n = new Notification("Session Complete", {
      body,
      tag: "dotdotdone-session-complete",
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
}
