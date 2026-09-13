import {
  APPROVE_LATEST_PROPOSED_LYRIC_SQL,
  CREATE_DRAFT_ORDER_SQL,
  CREATE_SOURCE_LYRIC_SQL,
  INSERT_BRIEFING_REVISION_SQL,
  INSERT_PROPOSED_LYRIC_SQL,
  LATEST_LYRICS_FOR_OWNER_SQL,
  MARK_LYRICS_APPROVED_SQL,
  MARK_LYRICS_REVIEW_SQL,
  UPDATE_BRIEFING_FOR_OWNER_SQL,
} from "./lyrics-queries";

export type BriefingInput = {
  occasion: string;
  recipientName: string;
  pronunciation?: string | null;
  story: string;
  style: string;
};

export type LyricSnapshot = {
  id: string;
  kind: "source" | "proposed" | "approved";
  revision: number;
  content: string;
  createdAt: string;
};

function normalizeBriefing(input: BriefingInput) {
  const normalized = {
    occasion: input.occasion.trim(),
    recipientName: input.recipientName.trim(),
    pronunciation: input.pronunciation?.trim() || null,
    story: input.story.trim(),
    style: input.style.trim(),
  };

  if (!normalized.occasion || normalized.occasion.length > 80) {
    throw new Error("A ocasião deve ter entre 1 e 80 caracteres.");
  }
  if (!normalized.recipientName || normalized.recipientName.length > 120) {
    throw new Error("O nome deve ter entre 1 e 120 caracteres.");
  }
  if (normalized.pronunciation && normalized.pronunciation.length > 300) {
    throw new Error("A pronúncia deve ter no máximo 300 caracteres.");
  }
  if (normalized.story.length < 200 || normalized.story.length > 4_000) {
    throw new Error("A história deve ter entre 200 e 4.000 caracteres.");
  }
  if (!normalized.style || normalized.style.length > 120) {
    throw new Error("O estilo deve ter entre 1 e 120 caracteres.");
  }

  return normalized;
}

function normalizeLyric(content: string) {
  const normalized = content.trim();
  if (!normalized || normalized.length > 5_000) {
    throw new Error("A letra deve ter entre 1 e 5.000 caracteres.");
  }
  return normalized;
}

export async function createDraftOrderForOwner(
  db: D1Database,
  input: BriefingInput & {
    ownerId: string;
    orderId: string;
    sourceLyricId: string;
  },
) {
  const briefing = normalizeBriefing(input);
  const order = db
    .prepare(CREATE_DRAFT_ORDER_SQL)
    .bind(
      input.orderId,
      input.ownerId,
      briefing.occasion,
      briefing.recipientName,
      briefing.pronunciation,
      briefing.story,
      briefing.style,
    );
  const source = db
    .prepare(CREATE_SOURCE_LYRIC_SQL)
    .bind(input.sourceLyricId, input.orderId, input.ownerId, briefing.story);

  try {
    const [createdOrder, createdSource] = await db.batch([order, source]);
    return createdOrder.meta.changes === 1 && createdSource.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function reviseBriefingForOwner(
  db: D1Database,
  input: BriefingInput & {
    ownerId: string;
    orderId: string;
    sourceLyricId: string;
  },
) {
  const briefing = normalizeBriefing(input);
  const snapshot = db
    .prepare(INSERT_BRIEFING_REVISION_SQL)
    .bind(input.sourceLyricId, input.orderId, input.ownerId, briefing.story);
  const update = db
    .prepare(UPDATE_BRIEFING_FOR_OWNER_SQL)
    .bind(
      input.orderId,
      input.ownerId,
      briefing.occasion,
      briefing.recipientName,
      briefing.pronunciation,
      briefing.story,
      briefing.style,
      input.sourceLyricId,
    );

  try {
    const [createdSnapshot, updatedOrder] = await db.batch([snapshot, update]);
    return createdSnapshot.meta.changes === 1 && updatedOrder.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function saveProposedLyricForOwner(
  db: D1Database,
  input: {
    ownerId: string;
    orderId: string;
    lyricId: string;
    content: string;
  },
) {
  const content = normalizeLyric(input.content);
  const lyric = db
    .prepare(INSERT_PROPOSED_LYRIC_SQL)
    .bind(input.lyricId, input.orderId, input.ownerId, content);
  const status = db
    .prepare(MARK_LYRICS_REVIEW_SQL)
    .bind(input.orderId, input.ownerId, input.lyricId);

  try {
    const [createdLyric, updatedOrder] = await db.batch([lyric, status]);
    return createdLyric.meta.changes === 1 && updatedOrder.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function approveLatestLyricForOwner(
  db: D1Database,
  input: {
    ownerId: string;
    orderId: string;
    proposedLyricId: string;
    approvedLyricId: string;
  },
) {
  const approval = db
    .prepare(APPROVE_LATEST_PROPOSED_LYRIC_SQL)
    .bind(
      input.approvedLyricId,
      input.orderId,
      input.ownerId,
      input.proposedLyricId,
    );
  const status = db
    .prepare(MARK_LYRICS_APPROVED_SQL)
    .bind(input.orderId, input.ownerId, input.approvedLyricId);

  try {
    const [createdApproval, updatedOrder] = await db.batch([approval, status]);
    return createdApproval.meta.changes === 1 && updatedOrder.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function getLatestLyricsForOwner(
  db: D1Database,
  ownerId: string,
  orderId: string,
) {
  const result = await db
    .prepare(LATEST_LYRICS_FOR_OWNER_SQL)
    .bind(orderId, ownerId)
    .all<LyricSnapshot>();
  return result.results;
}
