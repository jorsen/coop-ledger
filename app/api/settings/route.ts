import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const rows = await sql`SELECT key, value FROM settings WHERE user_id = ${session.userId}`;
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return NextResponse.json(out);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const body = await req.json() as Record<string, string | number>;
  for (const [key, value] of Object.entries(body)) {
    await sql`
      INSERT INTO settings (user_id, key, value) VALUES (${session.userId}, ${key}, ${String(value)})
      ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value
    `;
  }
  return NextResponse.json({ ok: true });
}
