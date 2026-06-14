import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
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

    const limit  = Number(req.nextUrl.searchParams.get('limit')  ?? 50);
    const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0);

    const logs = await sql`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM activity_logs`;

    return NextResponse.json({ logs, total: count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
