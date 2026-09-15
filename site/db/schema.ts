import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  authSubject: text("auth_subject").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  displayName: text("display_name"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  uniqueIndex("idx_accounts_auth_subject").on(table.authSubject),
  uniqueIndex("idx_accounts_email").on(table.emailNormalized),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["draft", "lyrics_review", "lyrics_approved", "generating", "preview_ready", "payment_pending", "paid", "delivered", "cancelled"] }).notNull().default("draft"),
  occasion: text("occasion").notNull(),
  recipientName: text("recipient_name").notNull(),
  pronunciation: text("pronunciation"),
  story: text("story").notNull(),
  style: text("style").notNull(),
  adjustmentStatus: text("adjustment_status", { enum: ["unavailable", "available", "reserved", "completed"] }).notNull().default("unavailable"),
  previewExpiresAt: text("preview_expires_at"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  index("idx_orders_owner_updated").on(table.ownerId, table.updatedAt),
  index("idx_orders_open_status").on(table.status),
  check("orders_status_check", sql`${table.status} in ('draft','lyrics_review','lyrics_approved','generating','preview_ready','payment_pending','paid','delivered','cancelled')`),
  check("orders_adjustment_status_check", sql`${table.adjustmentStatus} in ('unavailable','available','reserved','completed')`),
]);

export const lyrics = sqliteTable("lyrics", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["source", "proposed", "approved"] }).notNull(),
  revision: integer("revision").notNull(),
  content: text("content").notNull(),
  createdAt: timestamps.createdAt,
}, (table) => [
  uniqueIndex("idx_lyrics_order_kind_revision").on(table.orderId, table.kind, table.revision),
  index("idx_lyrics_order_created").on(table.orderId, table.createdAt),
  check("lyrics_kind_check", sql`${table.kind} in ('source','proposed','approved')`),
]);

export const musicVersions = sqliteTable("music_versions", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  approvedLyricId: text("approved_lyric_id").notNull().references(() => lyrics.id),
  origin: text("origin", { enum: ["original", "adjustment"] }).notNull(),
  status: text("status", { enum: ["queued", "generating", "ready", "failed"] }).notNull().default("queued"),
  title: text("title"),
  durationSeconds: integer("duration_seconds"),
  providerAudioId: text("provider_audio_id"),
  fullAudioObjectKey: text("full_audio_object_key"),
  previewObjectKey: text("preview_object_key"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  index("idx_music_versions_order_created").on(table.orderId, table.createdAt),
  uniqueIndex("idx_music_versions_provider_audio").on(table.providerAudioId),
  check("music_versions_origin_check", sql`${table.origin} in ('original','adjustment')`),
  check("music_versions_status_check", sql`${table.status} in ('queued','generating','ready','failed')`),
]);

export const generationTasks = sqliteTable("generation_tasks", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  approvedLyricId: text("approved_lyric_id").references(() => lyrics.id),
  versionId: text("version_id").references(() => musicVersions.id),
  requestKey: text("request_key").notNull(),
  provider: text("provider").notNull().default("kie.ai"),
  model: text("model").notNull(),
  externalTaskId: text("external_task_id"),
  status: text("status", { enum: ["created", "submitted", "processing", "reconciling", "succeeded", "failed"] }).notNull().default("created"),
  errorCode: text("error_code"),
  acceptedAt: text("accepted_at"),
  completedAt: text("completed_at"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  uniqueIndex("idx_generation_tasks_request_key").on(table.requestKey),
  uniqueIndex("idx_generation_tasks_external").on(table.provider, table.externalTaskId),
  index("idx_generation_tasks_order_created").on(table.orderId, table.createdAt),
  check("generation_tasks_status_check", sql`${table.status} in ('created','submitted','processing','reconciling','succeeded','failed')`),
]);

export const generationOutputs = sqliteTable("generation_outputs", {
  id: text("id").primaryKey(),
  generationTaskId: text("generation_task_id").notNull().references(() => generationTasks.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => musicVersions.id, { onDelete: "cascade" }),
  providerAudioId: text("provider_audio_id").notNull(),
  sourceAudioUrl: text("source_audio_url").notNull(),
  storageStatus: text("storage_status", { enum: ["pending", "stored", "failed"] }).notNull().default("pending"),
  storageAttempts: integer("storage_attempts").notNull().default(0),
  lastErrorCode: text("last_error_code"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  uniqueIndex("idx_generation_outputs_version").on(table.versionId),
  uniqueIndex("idx_generation_outputs_task_audio").on(table.generationTaskId, table.providerAudioId),
  index("idx_generation_outputs_storage_status").on(table.storageStatus, table.updatedAt),
  check("generation_outputs_storage_status_check", sql`${table.storageStatus} in ('pending','stored','failed')`),
]);

export const adjustmentRequests = sqliteTable("adjustment_requests", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sourceVersionId: text("source_version_id").notNull().references(() => musicVersions.id),
  resultVersionId: text("result_version_id").references(() => musicVersions.id),
  status: text("status", { enum: ["reserved", "processing", "completed", "technical_failure", "reconciling"] }).notNull().default("reserved"),
  customerNotes: text("customer_notes").notNull(),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  uniqueIndex("idx_adjustment_requests_order").on(table.orderId),
  check("adjustment_requests_status_check", sql`${table.status} in ('reserved','processing','completed','technical_failure','reconciling')`),
]);

export const orderSelections = sqliteTable("order_selections", {
  orderId: text("order_id").primaryKey().references(() => orders.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => musicVersions.id),
  selectedAt: text("selected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentIntents = sqliteTable("payment_intents", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => musicVersions.id),
  provider: text("provider").notNull(),
  externalPaymentId: text("external_payment_id"),
  amountCents: integer("amount_cents").notNull().default(1990),
  currency: text("currency").notNull().default("BRL"),
  status: text("status", { enum: ["created", "pending", "confirmed", "failed", "cancelled", "refunded"] }).notNull().default("created"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  uniqueIndex("idx_payment_intents_external").on(table.provider, table.externalPaymentId),
  index("idx_payment_intents_order_created").on(table.orderId, table.createdAt),
  check("payment_intents_amount_check", sql`${table.amountCents} > 0`),
  check("payment_intents_status_check", sql`${table.status} in ('created','pending','confirmed','failed','cancelled','refunded')`),
]);

export const paymentEvents = sqliteTable("payment_events", {
  id: text("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull().references(() => paymentIntents.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  externalEventId: text("external_event_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadHash: text("payload_hash").notNull(),
  occurredAt: text("occurred_at").notNull(),
  processedAt: text("processed_at"),
  createdAt: timestamps.createdAt,
}, (table) => [
  uniqueIndex("idx_payment_events_provider_event").on(table.provider, table.externalEventId),
  index("idx_payment_events_intent_created").on(table.paymentIntentId, table.createdAt),
]);

export const deliveries = sqliteTable("deliveries", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => musicVersions.id),
  fullAudioObjectKey: text("full_audio_object_key").notNull(),
  shareTokenHash: text("share_token_hash").notNull(),
  revokedAt: text("revoked_at"),
  createdAt: timestamps.createdAt,
}, (table) => [
  uniqueIndex("idx_deliveries_order").on(table.orderId),
  uniqueIndex("idx_deliveries_share_token").on(table.shareTokenHash),
]);

export const homeShowcase = sqliteTable("home_showcase", {
  orderId: text("order_id").primaryKey().references(() => orders.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => musicVersions.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamps.createdAt,
}, (table) => [
  uniqueIndex("idx_home_showcase_position").on(table.position),
  check("home_showcase_position_check", sql`${table.position} between 1 and 6`),
]);

export const costEvents = sqliteTable("cost_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  generationTaskId: text("generation_task_id").references(() => generationTasks.id),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  creditsMillis: integer("credits_millis").notNull(),
  usdMicros: integer("usd_micros"),
  status: text("status", { enum: ["estimated", "confirmed", "refunded", "reconciling"] }).notNull(),
  createdAt: timestamps.createdAt,
}, (table) => [
  index("idx_cost_events_order_created").on(table.orderId, table.createdAt),
  check("cost_events_status_check", sql`${table.status} in ('estimated','confirmed','refunded','reconciling')`),
  check("cost_events_credits_check", sql`${table.creditsMillis} >= 0`),
]);

export const supportAuditLog = sqliteTable("support_audit_log", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  actorSubject: text("actor_subject").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamps.createdAt,
}, (table) => [
  index("idx_support_audit_order_created").on(table.orderId, table.createdAt),
]);
