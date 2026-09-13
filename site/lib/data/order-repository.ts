import {
  FULL_AUDIO_FOR_OWNER_SQL,
  INSERT_PAYMENT_EVENT_SQL,
  LIST_ORDERS_FOR_OWNER_SQL,
  ORDER_FOR_OWNER_SQL,
  PREVIEW_FOR_OWNER_SQL,
  RESERVE_ADJUSTMENT_INSERT_SQL,
  RESERVE_ADJUSTMENT_UPDATE_SQL,
  SELECT_VERSION_FOR_OWNER_SQL,
} from "./queries";

export type OwnedOrder = {
  id: string;
  ownerId: string;
  status: string;
  occasion: string;
  recipientName: string;
  pronunciation: string | null;
  story: string;
  style: string;
  adjustmentStatus: string;
  previewExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderSummary = Omit<
  OwnedOrder,
  "ownerId" | "pronunciation" | "story"
>;

export type AuthorizedObject = {
  versionId: string;
  objectKey: string;
  expiresAt?: string;
};

export type PaymentEventInput = {
  id: string;
  paymentIntentId: string;
  provider: string;
  externalEventId: string;
  eventType: string;
  payloadHash: string;
  occurredAt: string;
};

export async function getOrderForOwner(
  db: D1Database,
  ownerId: string,
  orderId: string,
) {
  return db
    .prepare(ORDER_FOR_OWNER_SQL)
    .bind(orderId, ownerId)
    .first<OwnedOrder>();
}

export async function listOrdersForOwner(db: D1Database, ownerId: string) {
  const result = await db
    .prepare(LIST_ORDERS_FOR_OWNER_SQL)
    .bind(ownerId)
    .all<OrderSummary>();

  return result.results;
}

export async function selectVersionForOwner(
  db: D1Database,
  ownerId: string,
  orderId: string,
  versionId: string,
) {
  const result = await db
    .prepare(SELECT_VERSION_FOR_OWNER_SQL)
    .bind(orderId, ownerId, versionId)
    .run();

  return result.meta.changes === 1;
}

export async function getPreviewObjectForOwner(
  db: D1Database,
  ownerId: string,
  orderId: string,
  versionId: string,
) {
  return db
    .prepare(PREVIEW_FOR_OWNER_SQL)
    .bind(orderId, ownerId, versionId)
    .first<AuthorizedObject>();
}

export async function getFullAudioObjectForOwner(
  db: D1Database,
  ownerId: string,
  orderId: string,
) {
  return db
    .prepare(FULL_AUDIO_FOR_OWNER_SQL)
    .bind(orderId, ownerId)
    .first<AuthorizedObject>();
}

export async function reserveAdjustmentForOwner(
  db: D1Database,
  input: {
    ownerId: string;
    orderId: string;
    requestId: string;
    sourceVersionId: string;
    customerNotes: string;
  },
) {
  const update = db
    .prepare(RESERVE_ADJUSTMENT_UPDATE_SQL)
    .bind(input.orderId, input.ownerId, input.requestId, input.sourceVersionId);
  const insert = db
    .prepare(RESERVE_ADJUSTMENT_INSERT_SQL)
    .bind(
      input.orderId,
      input.ownerId,
      input.requestId,
      input.sourceVersionId,
      input.customerNotes,
    );

  try {
    const [reservation, request] = await db.batch([update, insert]);
    return reservation.meta.changes === 1 && request.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function recordPaymentEventOnce(
  db: D1Database,
  event: PaymentEventInput,
) {
  const result = await db
    .prepare(INSERT_PAYMENT_EVENT_SQL)
    .bind(
      event.id,
      event.paymentIntentId,
      event.provider,
      event.externalEventId,
      event.eventType,
      event.payloadHash,
      event.occurredAt,
    )
    .run();

  return result.meta.changes === 1;
}
