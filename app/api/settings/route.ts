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
  const { error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const rows = await sql`SELECT key, value FROM settings`;
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return NextResponse.json(out);
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const body = await req.json() as Record<string, string | number>;
  for (const [key, value] of Object.entries(body)) {
    await sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${String(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  }
  return NextResponse.json({ ok: true });
}
