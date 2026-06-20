export interface GenerationRow {
  id: string;
  sessionId?: string;
  prompt: string;
  action: "chat" | "generate";
  reply?: string;
  format?: string;
  productName?: string;
  siteUrl?: string;
  concept?: string;
  caption?: string;
  spec?: unknown;
  assets?: unknown;
  model?: string;
}

export async function insertGeneration(db: D1Database, row: GenerationRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO generations
       (id, session_id, prompt, action, reply, format, product_name, site_url, concept, caption, spec, assets, model, video_url, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      row.id,
      row.sessionId ?? null,
      row.prompt,
      row.action,
      row.reply ?? null,
      row.format ?? null,
      row.productName ?? null,
      row.siteUrl ?? null,
      row.concept ?? null,
      row.caption ?? null,
      row.spec ? JSON.stringify(row.spec) : null,
      row.assets ? JSON.stringify(row.assets) : null,
      row.model ?? null,
      null,
      Date.now(),
    )
    .run();
}

export async function setVideoUrl(db: D1Database, id: string, videoUrl: string): Promise<void> {
  await db.prepare(`UPDATE generations SET video_url = ? WHERE id = ?`).bind(videoUrl, id).run();
}

export interface ThreadRow {
  id: string;
  prompt: string;
  action: string;
  reply: string | null;
  concept: string | null;
  spec: string | null;
  assets: string | null;
  model: string | null;
  video_url: string | null;
  created_at: number;
}

export async function getThread(db: D1Database, sessionId: string, limit = 100): Promise<ThreadRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, prompt, action, reply, concept, spec, assets, model, video_url, created_at
       FROM generations WHERE session_id = ? ORDER BY created_at ASC LIMIT ?`,
    )
    .bind(sessionId, limit)
    .all<ThreadRow>();
  return results;
}

export interface HistoryItem {
  id: string;
  productName: string | null;
  concept: string | null;
  caption: string | null;
  format: string | null;
  videoUrl: string | null;
  createdAt: number;
}

interface HistoryRow {
  id: string;
  product_name: string | null;
  concept: string | null;
  caption: string | null;
  format: string | null;
  video_url: string | null;
  created_at: number;
}

export async function listHistory(
  db: D1Database,
  sessionId: string | null,
  limit = 30,
): Promise<HistoryItem[]> {
  const cols = "id, product_name, concept, caption, format, video_url, created_at";
  const stmt = sessionId
    ? db
        .prepare(
          `SELECT ${cols} FROM generations WHERE action='generate' AND session_id = ? ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(sessionId, limit)
    : db
        .prepare(
          `SELECT ${cols} FROM generations WHERE action='generate' ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(limit);
  const { results } = await stmt.all<HistoryRow>();
  return results.map((r) => ({
    id: r.id,
    productName: r.product_name,
    concept: r.concept,
    caption: r.caption,
    format: r.format,
    videoUrl: r.video_url,
    createdAt: r.created_at,
  }));
}
