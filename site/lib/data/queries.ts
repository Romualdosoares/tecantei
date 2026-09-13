export const ORDER_FOR_OWNER_SQL = `
  SELECT
    id,
    owner_id AS ownerId,
    status,
    occasion,
    recipient_name AS recipientName,
    pronunciation,
    story,
    style,
    adjustment_status AS adjustmentStatus,
    preview_expires_at AS previewExpiresAt,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM orders
  WHERE id = ?1 AND owner_id = ?2
  LIMIT 1
`;

export const LIST_ORDERS_FOR_OWNER_SQL = `
  SELECT
    id,
    status,
    occasion,
    recipient_name AS recipientName,
    style,
    adjustment_status AS adjustmentStatus,
    preview_expires_at AS previewExpiresAt,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM orders
  WHERE owner_id = ?1
  ORDER BY updated_at DESC, id DESC
`;

export const SELECT_VERSION_FOR_OWNER_SQL = `
  INSERT INTO order_selections (order_id, version_id, selected_at)
  SELECT o.id, mv.id, CURRENT_TIMESTAMP
  FROM orders AS o
  INNER JOIN music_versions AS mv ON mv.order_id = o.id
  WHERE o.id = ?1
    AND o.owner_id = ?2
    AND mv.id = ?3
    AND mv.status = 'ready'
    AND o.status IN ('preview_ready', 'payment_pending')
  ON CONFLICT(order_id) DO UPDATE SET
    version_id = excluded.version_id,
    selected_at = excluded.selected_at
`;

export const PREVIEW_FOR_OWNER_SQL = `
  SELECT
    mv.id AS versionId,
    mv.preview_object_key AS objectKey,
    o.preview_expires_at AS expiresAt
  FROM orders AS o
  INNER JOIN music_versions AS mv ON mv.order_id = o.id
  WHERE o.id = ?1
    AND o.owner_id = ?2
    AND mv.id = ?3
    AND mv.status = 'ready'
    AND mv.preview_object_key IS NOT NULL
    AND o.preview_expires_at IS NOT NULL
    AND datetime(o.preview_expires_at) > CURRENT_TIMESTAMP
  LIMIT 1
`;

export const FULL_AUDIO_FOR_OWNER_SQL = `
  SELECT
    d.version_id AS versionId,
    d.full_audio_object_key AS objectKey
  FROM orders AS o
  INNER JOIN order_selections AS os ON os.order_id = o.id
  INNER JOIN deliveries AS d
    ON d.order_id = o.id
   AND d.version_id = os.version_id
  WHERE o.id = ?1
    AND o.owner_id = ?2
    AND o.status IN ('paid', 'delivered')
    AND d.revoked_at IS NULL
  LIMIT 1
`;

export const RESERVE_ADJUSTMENT_UPDATE_SQL = `
  UPDATE orders
  SET adjustment_status = 'reserved', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND owner_id = ?2
    AND adjustment_status = 'available'
    AND EXISTS (
      SELECT 1
      FROM music_versions AS mv
      WHERE mv.id = ?4
        AND mv.order_id = orders.id
        AND mv.status = 'ready'
    )
`;

export const RESERVE_ADJUSTMENT_INSERT_SQL = `
  INSERT INTO adjustment_requests (
    id,
    order_id,
    source_version_id,
    status,
    customer_notes
  )
  SELECT ?3, o.id, mv.id, 'reserved', ?5
  FROM orders AS o
  INNER JOIN music_versions AS mv ON mv.order_id = o.id
  WHERE o.id = ?1
    AND o.owner_id = ?2
    AND mv.id = ?4
    AND mv.status = 'ready'
    AND o.adjustment_status = 'reserved'
`;

export const INSERT_PAYMENT_EVENT_SQL = `
  INSERT OR IGNORE INTO payment_events (
    id,
    payment_intent_id,
    provider,
    external_event_id,
    event_type,
    payload_hash,
    occurred_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
`;
