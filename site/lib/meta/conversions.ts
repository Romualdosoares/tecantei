type MetaPageViewInput = {
  eventId: string;
  userAgent: string | null;
  clientIp: string | null;
};

const pixelId = process.env.META_CAPI_PIXEL_ID ?? "1080024137940742";
const graphVersion = process.env.META_CAPI_GRAPH_VERSION ?? "v25.0";
const eventSourceUrl = "https://www.tecantei.site/";

export async function sendMetaPageView({ eventId, userAgent, clientIp }: MetaPageViewInput) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) return;

  const userData: Record<string, string> = {};
  if (userAgent) userData.client_user_agent = userAgent;
  if (clientIp) userData.client_ip_address = clientIp;

  try {
    await fetch(`https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: userData,
        }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Tracking cannot delay or interrupt access to the Home.
  }
}
