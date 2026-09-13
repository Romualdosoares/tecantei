export const INSERT_MUSIC_VERSION_FROM_TASK_SQL = `
  INSERT OR IGNORE INTO music_versions (
    id,
    order_id,
    approved_lyric_id,
    origin,
    status,
    title,
    duration_seconds,
    provider_audio_id
  )
  SELECT
    ?1,
    task.order_id,
    task.approved_lyric_id,
    ?6,
    'generating',
    ?3,
    CAST(round(?4) AS INTEGER),
    ?5
  FROM generation_tasks AS task
  WHERE task.id = ?2
    AND task.approved_lyric_id IS NOT NULL
    AND task.status IN ('submitted', 'processing', 'reconciling', 'succeeded')
`;

export const UPSERT_GENERATION_OUTPUT_SQL = `
  INSERT INTO generation_outputs (
    id,
    generation_task_id,
    version_id,
    provider_audio_id,
    source_audio_url,
    storage_status
  )
  SELECT
    ?1,
    task.id,
    version.id,
    ?3,
    ?4,
    'pending'
  FROM generation_tasks AS task
  INNER JOIN music_versions AS version
    ON version.order_id = task.order_id
   AND version.provider_audio_id = ?3
  WHERE task.id = ?2
  ON CONFLICT(generation_task_id, provider_audio_id) DO UPDATE SET
    source_audio_url = CASE
      WHEN generation_outputs.storage_status = 'stored'
        THEN generation_outputs.source_audio_url
      ELSE excluded.source_audio_url
    END,
    updated_at = CURRENT_TIMESTAMP
`;

export const MARK_GENERATION_TASK_SUCCEEDED_SQL = `
  UPDATE generation_tasks
  SET
    status = 'succeeded',
    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND status IN ('submitted', 'processing', 'reconciling', 'succeeded')
    AND EXISTS (
      SELECT 1
      FROM generation_outputs
      WHERE generation_outputs.generation_task_id = generation_tasks.id
    )
`;

export const PENDING_GENERATION_OUTPUTS_SQL = `
  SELECT
    output.id,
    output.version_id AS versionId,
    version.order_id AS orderId,
    output.provider_audio_id AS providerAudioId,
    output.source_audio_url AS sourceAudioUrl,
    output.storage_attempts AS storageAttempts
  FROM generation_outputs AS output
  INNER JOIN music_versions AS version ON version.id = output.version_id
  WHERE output.storage_status IN ('pending', 'failed')
    AND output.storage_attempts < ?1
  ORDER BY output.updated_at ASC, output.id ASC
  LIMIT ?2
`;

export const MARK_GENERATION_OUTPUT_STORED_SQL = `
  UPDATE generation_outputs
  SET
    storage_status = 'stored',
    storage_attempts = storage_attempts + 1,
    last_error_code = NULL,
    source_audio_url = '',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND storage_status IN ('pending', 'failed')
`;

export const ATTACH_FULL_AUDIO_OBJECT_SQL = `
  UPDATE music_versions
  SET full_audio_object_key = ?2, updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    SELECT version_id
    FROM generation_outputs
    WHERE id = ?1 AND storage_status = 'stored'
  )
`;

export const MARK_GENERATION_OUTPUT_FAILED_SQL = `
  UPDATE generation_outputs
  SET
    storage_status = 'failed',
    storage_attempts = storage_attempts + 1,
    last_error_code = ?2,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND storage_status != 'stored'
`;

export const MARK_VERSION_PREVIEW_READY_SQL = `
  UPDATE music_versions
  SET
    preview_object_key = ?2,
    status = 'ready',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?1
    AND status = 'generating'
    AND full_audio_object_key IS NOT NULL
    AND preview_object_key IS NULL
`;

export const MARK_ORDER_PREVIEW_READY_SQL = `
  UPDATE orders
  SET
    status = 'preview_ready',
    preview_expires_at = COALESCE(
      preview_expires_at,
      strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+14 days')
    ),
    adjustment_status = CASE
      WHEN adjustment_status = 'unavailable'
       AND EXISTS (
         SELECT 1
         FROM music_versions
         WHERE music_versions.order_id = orders.id
           AND music_versions.origin = 'original'
           AND music_versions.status = 'ready'
       )
        THEN 'available'
      ELSE adjustment_status
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    SELECT order_id
    FROM music_versions
    WHERE id = ?1
      AND status = 'ready'
      AND preview_object_key IS NOT NULL
  )
    AND status IN ('generating', 'preview_ready')
`;
