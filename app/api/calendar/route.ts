import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const rows = await sql`
    SELECT
      b.id          AS batch_id,
      b.batch_number,
      b.date_of_hauling,
      b.heads,
      c.id          AS client_id,
      c.name        AS client_name,
      c.client_code
    FROM batches b
    JOIN clients c ON c.id = b.client_id
    WHERE b.date_of_hauling IS NOT NULL AND b.user_id = ${session.userId}
    ORDER BY b.date_of_hauling ASC, c.name ASC
  `;
  return NextResponse.json(rows);
}
