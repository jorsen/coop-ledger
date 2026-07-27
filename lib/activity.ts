import { sql } from '@/lib/db';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id          SERIAL PRIMARY KEY,
      action      VARCHAR(20)  NOT NULL,
      entity_type VARCHAR(50)  NOT NULL,
      entity_id   INTEGER,
      description TEXT         NOT NULL,
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `;
}

export async function logActivity(
  action: 'created' | 'updated' | 'deleted',
  entityType: string,
  entityId: number | null,
  description: string,
  userId: number
) {
  try {
    await ensureTable();
    await sql`
      INSERT INTO activity_logs (action, entity_type, entity_id, description, user_id)
      VALUES (${action}, ${entityType}, ${entityId}, ${description}, ${userId})
    `;
  } catch (err) {
    console.error('Activity log error:', err);
  }
}
