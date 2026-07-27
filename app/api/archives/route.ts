import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;

  try {
    const rows = await sql`
      SELECT
        b.id,
        b.batch_number,
        b.status,
        b.heads,
        b.date_of_application,
        b.date_of_hauling,
        b.maturity_date,
        b.notes,
        b.batch_date,
        b.created_at,
        c.id            AS client_id,
        c.name          AS client_name,
        c.client_code,
        COUNT(t.id)::int                  AS transaction_count,
        COALESCE(SUM(t.bags), 0)          AS total_bags,
        COALESCE(SUM(t.debit), 0)         AS total_debit
      FROM batches b
      JOIN clients c ON c.id = b.client_id
      LEFT JOIN transactions t ON t.batch_id = b.id
      WHERE LOWER(TRIM(COALESCE(b.status, 'active'))) = 'paid' AND b.user_id = ${session.userId}
      GROUP BY b.id, c.id
      ORDER BY b.batch_date DESC, b.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/archives error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
