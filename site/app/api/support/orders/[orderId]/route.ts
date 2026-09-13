import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const inputSchema = z.object({ reason: z.string().trim().min(8).max(300) });
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401, headers: NO_STORE });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_support")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!profile?.is_support) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, owner_id, status, occasion, recipient_name, style, adjustment_status, preview_expires_at, created_at, updated_at")
      .eq("id", orderId.data)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const [tasks, outputs, versions, adjustments, selections, payments, deliveries, costs] = await Promise.all([
      admin.from("generation_tasks").select("id, provider, model, external_task_id, status, error_code, accepted_at, completed_at, created_at, updated_at").eq("order_id", order.id).order("created_at"),
      admin.from("generation_outputs").select("id, generation_task_id, version_id, storage_status, storage_attempts, last_error_code, created_at, updated_at").in("generation_task_id", await taskIdsForOrder(admin, order.id)).order("created_at"),
      admin.from("music_versions").select("id, origin, status, title, duration_seconds, created_at, updated_at").eq("order_id", order.id).order("created_at"),
      admin.from("adjustment_requests").select("id, source_version_id, generation_task_id, status, created_at, updated_at").eq("order_id", order.id).order("created_at"),
      admin.from("order_selections").select("version_id, selected_at").eq("order_id", order.id),
      admin.from("payment_intents").select("id, version_id, provider, external_payment_id, amount_cents, currency, status, expires_at, created_at, updated_at").eq("order_id", order.id).order("created_at"),
      admin.from("deliveries").select("id, version_id, first_accessed_at, share_enabled_at, revoked_at, created_at").eq("order_id", order.id),
      admin.from("cost_events").select("id, generation_task_id, provider, operation, credits_millis, usd_micros, status, created_at").eq("order_id", order.id).order("created_at"),
    ]);

    for (const result of [tasks, outputs, versions, adjustments, selections, payments, deliveries, costs]) {
      if (result.error) throw result.error;
    }

    const { error: auditError } = await admin.from("support_audit_log").insert({
      order_id: order.id,
      actor_subject: authData.user.id,
      action: "view_order_diagnostics",
      reason: input.data.reason,
    });
    if (auditError) throw auditError;

    const snapshot = {
      order,
      generationTasks: tasks.data ?? [],
      generationOutputs: outputs.data ?? [],
      versions: versions.data ?? [],
      adjustments: adjustments.data ?? [],
      selections: selections.data ?? [],
      payments: payments.data ?? [],
      deliveries: deliveries.data ?? [],
      costs: costs.data ?? [],
    };

    return NextResponse.json(
      {
        ...snapshot,
        recommendations: buildRecommendations(snapshot),
        auditedAt: new Date().toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "support_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

async function taskIdsForOrder(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  orderId: string,
) {
  const { data, error } = await admin
    .from("generation_tasks")
    .select("id")
    .eq("order_id", orderId);
  if (error) throw error;
  const ids = (data ?? []).map((task) => task.id);
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function buildRecommendations(snapshot: {
  order: { status: string };
  generationTasks: Array<{ status: string }>;
  generationOutputs: Array<{ storage_status: string }>;
  payments: Array<{ status: string; provider: string; expires_at?: string | null }>;
}) {
  const recommendations: string[] = [];
  if (snapshot.generationTasks.some((task) => task.status === "reconciling")) {
    recommendations.push("Confirmar a tarefa no fornecedor antes de qualquer novo envio.");
  }
  if (snapshot.generationOutputs.some((output) => output.storage_status === "failed")) {
    recommendations.push("Revisar o erro do arquivo e executar novamente o worker autenticado.");
  }
  if (snapshot.order.status === "payment_pending" || snapshot.payments.some((payment) => payment.status === "pending")) {
    recommendations.push("Consultar o provedor de pagamento; não liberar o áudio manualmente pelo retorno do navegador.");
  }
  if (snapshot.payments.some((payment) => payment.status === "pending" && payment.expires_at && Date.parse(payment.expires_at) <= Date.now())) {
    recommendations.push("Há um Pix localmente expirado; conciliar no provedor antes de permitir uma nova cobrança.");
  }
  if (snapshot.payments.some((payment) => payment.status === "refunded")) {
    recommendations.push("Há pagamento reembolsado; revisar a entrega sem revogá-la automaticamente.");
  }
  if (snapshot.payments.some((payment) => payment.status === "failed" || payment.status === "cancelled")) {
    recommendations.push("A cobrança inativa não deve ser reutilizada; uma nova tentativa precisa de outra chave idempotente.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Nenhuma condição crítica automática foi encontrada; revisar a linha do tempo antes de agir.");
  }
  return recommendations;
}
