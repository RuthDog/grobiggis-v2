self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function safePushHref(value) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  if (/[\u0000-\u001f]/u.test(trimmed)) return "/";
  return trimmed;
}

function notificationPayloadFromPush(event) {
  if (!event.data) return null;

  try {
    const payload = event.data.json();
    if (!payload || payload.version !== 1 || payload.type !== "test") return null;
    if (typeof payload.title !== "string" || typeof payload.body !== "string") return null;
    const title = payload.title.trim();
    const body = payload.body.trim();
    if (!title || !body) return null;
    return {
      title,
      options: {
        body,
        data: {
          href: safePushHref(payload.href),
        },
        tag: "grobiggis-test",
      },
    };
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  const notification = notificationPayloadFromPush(event);
  if (!notification) return;

  event.waitUntil(self.registration.showNotification(notification.title, notification.options));
});

async function focusOrOpenGrobiggis(href) {
  const targetHref = safePushHref(href);
  const targetUrl = new URL(targetHref, self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of windows) {
    if (client.url === targetUrl && "focus" in client) {
      return client.focus();
    }
  }

  return self.clients.openWindow(targetHref);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusOrOpenGrobiggis(event.notification.data?.href));
});
