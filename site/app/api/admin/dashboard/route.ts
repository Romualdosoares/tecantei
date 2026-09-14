import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getApplicationSettings, integrationReadiness } from "@/lib/admin/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store" };

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
});

const rangeSchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "15d", "30d", "custom"]).default("30d"),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export async function GET(request: Request) {
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    const url = new URL(request.url);
    const input = rangeSchema.safeParse({
      range: url.searchParams.get("range") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (!input.success) return NextResponse.json({ error: "invalid_period" }, { status: 400, headers: NO_STORE });
    const period = resolvePeriod(input.data);
    if (!period) return NextResponse.json({ error: "invalid_period" }, { status: 400, headers: NO_STORE });

    const [authUsers, profiles, orders, tasks, payments, periodTasks, periodPayments, costs, events, settings, readiness, audits] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("profiles").select("id, display_name, whatsapp, is_admin, is_support, account_status, created_at, updated_at").order("created_at", { ascending: false }).limit(200),
      admin.from("orders").select("id, owner_id, recipient_name, status, style, created_at, updated_at").order("created_at", { ascending: false }).limit(500),
      admin.from("generation_tasks").select("id, order_id, provider, model, status, error_code, reserved_credits_millis, created_at, updated_at, completed_at").order("created_at", { ascending: false }).limit(500),
      admin.from("payment_intents").select("id, order_id, provider, amount_cents, currency, status, created_at, updated_at").order("created_at", { ascending: false }).limit(500),
      admin.from("generation_tasks").select("status, created_at").gte("created_at", period.fromInstant).lt("created_at", period.untilInstant).limit(10_000),
      admin.from("payment_intents").select("status, amount_cents, updated_at").gte("updated_at", period.fromInstant).lt("updated_at", period.untilInstant).limit(10_000),
      admin.from("cost_events").select("credits_millis, usd_micros, status, created_at").gte("created_at", period.fromInstant).lt("created_at", period.untilInstant).limit(10_000),
      admin.from("analytics_events").select("event_type, session_hash, path, created_at").gte("created_at", period.fromInstant).lt("created_at", period.untilInstant).limit(10_000),
      getApplicationSettings(admin),
      integrationReadiness(admin),
      admin.from("admin_audit_log").select("id, actor_id, action, target_type, target_id, reason, created_at").order("created_at", { ascending: false }).limit(30),
    ]);

    const queryErrors = [profiles.error, orders.error, tasks.error, payments.error, periodTasks.error, periodPayments.error, costs.error, events.error, audits.error];
    if (authUsers.error || queryErrors.some(Boolean)) throw authUsers.error ?? queryErrors.find(Boolean);

    const authById = new Map(authUsers.data.users.map((user) => [user.id, user]));
    const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
    const orderById = new Map((orders.data ?? []).map((order) => [order.id, order]));
    const users = authUsers.data.users.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        displayName: profile?.display_name ?? user.user_metadata?.display_name ?? "",
        whatsapp: profile?.whatsapp ?? user.user_metadata?.whatsapp ?? "",
        role: profile?.is_admin ? "admin" : profile?.is_support ? "support" : "user",
        status: profile?.account_status ?? (user.banned_until ? "suspended" : "active"),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      };
    });
    const paymentRows = payments.data ?? [];
    const taskRows = tasks.data ?? [];
    const eventRows = events.data ?? [];
    const periodPaymentRows = periodPayments.data ?? [];
    const periodTaskRows = periodTasks.data ?? [];
    const confirmed = periodPaymentRows.filter((payment) => payment.status === "confirmed");
    const visitors = new Set(eventRows.filter((event) => event.event_type === "page_view").map((event) => event.session_hash));
    const daySeries = buildDaySeries(period.from, period.to, eventRows, periodPaymentRows);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      period: { range: input.data.range, from: period.from, to: period.to, label: period.label },
      currentAdminId: identity.id,
      metrics: {
        users: authUsers.data.total ?? users.length,
        activeUsers: users.filter((user) => user.status === "active").length,
        visitors: visitors.size,
        pageViews: eventRows.filter((event) => event.event_type === "page_view").length,
        orders: orders.data?.length ?? 0,
        paidOrders: confirmed.length,
        revenueCents: confirmed.reduce((sum, payment) => sum + payment.amount_cents, 0),
        pendingRevenueCents: periodPaymentRows.filter((payment) => payment.status === "pending").reduce((sum, payment) => sum + payment.amount_cents, 0),
        conversionRate: visitors.size ? Number(((confirmed.length / visitors.size) * 100).toFixed(1)) : 0,
        generationSuccessRate: periodTaskRows.length ? Number(((periodTaskRows.filter((task) => task.status === "succeeded").length / periodTaskRows.length) * 100).toFixed(1)) : 0,
        creditsUsed: (costs.data ?? []).filter((cost) => cost.status !== "refunded").reduce((sum, cost) => sum + Number(cost.credits_millis ?? 0), 0) / 1_000,
      },
      series: daySeries,
      users,
      generations: taskRows.slice(0, 100).map((task) => {
        const order = orderById.get(task.order_id);
        return {
          ...task,
          recipientName: order?.recipient_name ?? "—",
          ownerEmail: order ? authById.get(order.owner_id)?.email ?? "—" : "—",
        };
      }),
      sales: paymentRows.slice(0, 100).map((payment) => ({
        ...payment,
        recipientName: orderById.get(payment.order_id)?.recipient_name ?? "—",
      })),
      settings,
      readiness,
      audit: audits.data ?? [],
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "admin_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

function buildDaySeries(
  from: string,
  to: string,
  events: Array<{ event_type: string; session_hash: string; created_at: string }>,
  payments: Array<{ status: string; amount_cents: number; updated_at: string }>,
) {
  const rows = new Map<string, { date: string; visits: number; visitors: Set<string>; sales: number; revenueCents: number }>();
  const days = daysBetween(from, to) + 1;
  for (let offset = 0; offset < days; offset += 1) {
    const date = shiftDate(from, offset);
    rows.set(date, { date, visits: 0, visitors: new Set(), sales: 0, revenueCents: 0 });
  }
  for (const event of events) {
    if (event.event_type !== "page_view") continue;
    const row = rows.get(saoPauloDate(event.created_at));
    if (row) { row.visits += 1; row.visitors.add(event.session_hash); }
  }
  for (const payment of payments) {
    if (payment.status !== "confirmed") continue;
    const row = rows.get(saoPauloDate(payment.updated_at));
    if (row) { row.sales += 1; row.revenueCents += payment.amount_cents; }
  }
  return [...rows.values()].map((row) => ({ ...row, visitors: row.visitors.size }));
}

function resolvePeriod(input: z.infer<typeof rangeSchema>) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let from: string;
  let to: string;
  let label: string;

  switch (input.range) {
    case "today": from = today; to = today; label = "Hoje"; break;
    case "yesterday": from = shiftDate(today, -1); to = from; label = "Ontem"; break;
    case "7d": from = shiftDate(today, -6); to = today; label = "Últimos 7 dias"; break;
    case "15d": from = shiftDate(today, -14); to = today; label = "Últimos 15 dias"; break;
    case "30d": from = shiftDate(today, -29); to = today; label = "Últimos 30 dias"; break;
    case "custom": {
      if (!input.from || !input.to) return null;
      from = input.from;
      to = input.to;
      label = `${formatDateLabel(from)} a ${formatDateLabel(to)}`;
      break;
    }
  }
  const span = daysBetween(from, to);
  if (span < 0 || span > 365 || to > today) return null;
  return {
    from,
    to,
    label,
    fromInstant: `${from}T00:00:00-03:00`,
    untilInstant: `${shiftDate(to, 1)}T00:00:00-03:00`,
  };
}

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function saoPauloDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
