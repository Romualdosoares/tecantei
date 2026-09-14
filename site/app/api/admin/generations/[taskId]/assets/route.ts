import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const SIGNED_URL_SECONDS = 10 * 60;
const idSchema = z.string().uuid();
const requestSchema = z.object({
  reason: z.string().trim().min(8).max(300),
});

type MusicVersion = {
  id: string;
  origin: "original" | "adjustment";
  status: string;
  title: string | null;
  duration_seconds: number | null;
  preview_object_key: string | null;
  full_audio_object_key: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const taskId = idSchema.safeParse((await context.params).taskId);
  if (!taskId.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const identity = await getAdminIdentity();
    if (!identity) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const admin = createSupabaseAdminClient();
    const { data: task, error: taskError } = await admin
      .from("generation_tasks")
      .select("id, order_id, status")
      .eq("id", taskId.data)
      .maybeSingle();
    if (taskError) throw taskError;
    if (!task) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const { data: outputs, error: outputError } = await admin
      .from("generation_outputs")
      .select("version_id, storage_status")
      .eq("generation_task_id", task.id)
      .eq("storage_status", "stored");
    if (outputError) throw outputError;

    const versionIds = [...new Set((outputs ?? []).map((output) => output.version_id))];
    let versions: MusicVersion[] = [];
    if (versionIds.length > 0) {
      const { data, error } = await admin
        .from("music_versions")
        .select("id, origin, status, title, duration_seconds, preview_object_key, full_audio_object_key")
        .eq("order_id", task.order_id)
        .eq("status", "ready")
        .in("id", versionIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      versions = (data ?? []) as MusicVersion[];
    }

    const bucket = admin.storage.from(getSupabaseAudioBucket());
    const assets = await Promise.all(versions.map(async (version) => {
      const expectedPreviewKey = `orders/${task.order_id}/versions/${version.id}/preview.mp3`;
      const expectedFullKey = `orders/${task.order_id}/versions/${version.id}/full.mp3`;
      const previewKey = version.preview_object_key === expectedPreviewKey ? expectedPreviewKey : null;
      const fullKey = version.full_audio_object_key === expectedFullKey ? expectedFullKey : null;
      const baseName = `te-cantei-${version.id.slice(0, 8)}`;

      const [preview, previewDownload, fullDownload] = await Promise.all([
        previewKey ? bucket.createSignedUrl(previewKey, SIGNED_URL_SECONDS) : Promise.resolve({ data: null, error: null }),
        previewKey ? bucket.createSignedUrl(previewKey, SIGNED_URL_SECONDS, { download: `${baseName}-previa.mp3` }) : Promise.resolve({ data: null, error: null }),
        fullKey ? bucket.createSignedUrl(fullKey, SIGNED_URL_SECONDS, { download: `${baseName}-completa.mp3` }) : Promise.resolve({ data: null, error: null }),
      ]);

      if (preview.error || previewDownload.error || fullDownload.error) {
        throw preview.error ?? previewDownload.error ?? fullDownload.error;
      }

      return {
        versionId: version.id,
        label: version.origin === "adjustment" ? "Ajuste" : "Original",
        title: version.title?.trim() || `Música ${version.origin === "adjustment" ? "ajustada" : "original"}`,
        durationSeconds: version.duration_seconds,
        previewUrl: preview.data?.signedUrl ?? null,
        previewDownloadUrl: previewDownload.data?.signedUrl ?? null,
        fullDownloadUrl: fullDownload.data?.signedUrl ?? null,
      };
    }));

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      actor_id: identity.id,
      action: "access_generation_audio",
      target_type: "generation_task",
      target_id: task.id,
      reason: input.data.reason,
      metadata: {
        order_id: task.order_id,
        asset_count: assets.length,
        preview_count: assets.filter((asset) => asset.previewUrl).length,
        full_count: assets.filter((asset) => asset.fullDownloadUrl).length,
      },
    });
    if (auditError) throw auditError;

    return NextResponse.json(
      { assets, expiresIn: SIGNED_URL_SECONDS },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "audio_access_failed" }, { status: 503, headers: NO_STORE });
  }
}
