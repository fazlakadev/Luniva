import type { PoolClient } from "pg";
import { db } from "@/lib/db";

type ActivityInput = {
  entityType: string;
  entityId?: string | null;
  action: string;
  summary: string;
  actor?: string | null;
};

export async function logActivity(input: ActivityInput, client?: PoolClient) {
  const runner = client ?? db;
  await runner.query(
    `INSERT INTO activity_log (entity_type, entity_id, action, summary, actor)
     VALUES ($1,$2,$3,$4,$5)`,
    [input.entityType, input.entityId ?? null, input.action, input.summary.slice(0, 500), input.actor ?? null],
  );
}

export async function getRecentActivity(limit = 8) {
  const result = await db.query(
    `SELECT id, entity_type, entity_id, action, summary, actor, created_at
     FROM activity_log ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows;
}
