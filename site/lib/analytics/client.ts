"use client";

export type AnalyticsEvent =
  | "page_view"
  | "cta_create_music"
  | "funnel_step"
  | "checkout_open"
  | "purchase_confirmed";

export function trackAnalyticsEvent(
  eventType: AnalyticsEvent,
  metadata: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, path: window.location.pathname, sessionId, metadata }),
    keepalive: true,
  }).catch(() => undefined);
}

function getSessionId() {
  const key = "te-cantei-analytics-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

