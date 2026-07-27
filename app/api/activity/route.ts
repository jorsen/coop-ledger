import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
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

    // Admin sees every account's activity, not just whichever one they're
    // currently "viewing as" — this is the whole point of an audit log.
    const logs = await sql`
      SELECT al.*, u.username
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM activity_logs`;

    return NextResponse.json({ logs, total: count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
