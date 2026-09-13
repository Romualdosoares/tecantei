export const CREATE_DRAFT_ORDER_SQL = `
  INSERT INTO orders (
    id,
    owner_id,
    status,
    occasion,
    recipient_name,
    pronunciation,
    story,
    style
  )
  SELECT ?1, a.id, 'draft', ?3, ?4, ?5, ?6, ?7
  FROM accounts AS a
  WHERE a.id = ?2
`;

export const CREATE_SOURCE_LYRIC_SQL = `
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  SELECT ?1, o.id, 'source', 1, ?4
  FROM orders AS o
  WHERE o.id = ?2 AND o.owner_id = ?3
`;

export const INSERT_BRIEFING_REVISION_SQL = `
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  SELECT
    ?1,
    o.id,
    'source',
    COALESCE(MAX(previous.revision), 0) + 1,
    ?4
  FROM orders AS o
  LEFT JOIN lyrics AS previous
    ON previous.order_id = o.id
   AND previous.kind = 'source'
  WHERE o.id = ?2
    AND o.owner_id = ?3
    AND o.status IN ('draft', 'lyrics_review', 'lyrics_approved')
  GROUP BY o.id
`;

export const UPDATE_BRIEFING_FOR_OWNER_SQL = `
  UPDATE orders
  SET
    occasion = ?3,
    recipient_name = ?4,
    pronunciation = ?5,
    story = ?6,
    style = ?7,
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND owner_id = ?2
    AND status IN ('draft', 'lyrics_review', 'lyrics_approved')
    AND EXISTS (
      SELECT 1
      FROM lyrics
      WHERE lyrics.id = ?8
        AND lyrics.order_id = orders.id
        AND lyrics.kind = 'source'
    )
`;

export const INSERT_PROPOSED_LYRIC_SQL = `
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  SELECT
    ?1,
    o.id,
    'proposed',
    COALESCE(MAX(previous.revision), 0) + 1,
    ?4
  FROM orders AS o
  LEFT JOIN lyrics AS previous
    ON previous.order_id = o.id
   AND previous.kind = 'proposed'
  WHERE o.id = ?2
    AND o.owner_id = ?3
    AND o.status IN ('draft', 'lyrics_review', 'lyrics_approved')
  GROUP BY o.id
`;

export const MARK_LYRICS_REVIEW_SQL = `
  UPDATE orders
  SET status = 'lyrics_review', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND owner_id = ?2
    AND status IN ('draft', 'lyrics_review', 'lyrics_approved')
    AND EXISTS (
      SELECT 1
      FROM lyrics
      WHERE lyrics.id = ?3
        AND lyrics.order_id = orders.id
        AND lyrics.kind = 'proposed'
    )
`;

export const APPROVE_LATEST_PROPOSED_LYRIC_SQL = `
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  SELECT
    ?1,
    o.id,
    'approved',
    COALESCE((
      SELECT MAX(approved.revision)
      FROM lyrics AS approved
      WHERE approved.order_id = o.id
        AND approved.kind = 'approved'
    ), 0) + 1,
    proposed.content
  FROM orders AS o
  INNER JOIN lyrics AS proposed
    ON proposed.order_id = o.id
   AND proposed.id = ?4
   AND proposed.kind = 'proposed'
  WHERE o.id = ?2
    AND o.owner_id = ?3
    AND o.status = 'lyrics_review'
    AND proposed.revision = (
      SELECT MAX(latest.revision)
      FROM lyrics AS latest
      WHERE latest.order_id = o.id
        AND latest.kind = 'proposed'
    )
`;

export const MARK_LYRICS_APPROVED_SQL = `
  UPDATE orders
  SET status = 'lyrics_approved', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND owner_id = ?2
    AND status = 'lyrics_review'
    AND EXISTS (
      SELECT 1
      FROM lyrics
      WHERE lyrics.id = ?3
        AND lyrics.order_id = orders.id
        AND lyrics.kind = 'approved'
    )
`;

export const LATEST_LYRICS_FOR_OWNER_SQL = `
  SELECT id, kind, revision, content, created_at AS createdAt
  FROM lyrics AS candidate
  WHERE candidate.order_id = ?1
    AND EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.id = candidate.order_id
        AND orders.owner_id = ?2
    )
    AND candidate.revision = (
      SELECT MAX(latest.revision)
      FROM lyrics AS latest
      WHERE latest.order_id = candidate.order_id
        AND latest.kind = candidate.kind
    )
  ORDER BY CASE kind
    WHEN 'source' THEN 1
    WHEN 'proposed' THEN 2
    WHEN 'approved' THEN 3
  END
`;
