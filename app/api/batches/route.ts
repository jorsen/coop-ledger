import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const batches = await sql`
      SELECT
        b.*,
        COUNT(t.id)::int          AS transaction_count,
        COALESCE(SUM(t.bags), 0)  AS total_bags,
        COALESCE(SUM(t.debit), 0) AS total_debit
      FROM batches b
      LEFT JOIN transactions t ON t.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.batch_date DESC, b.created_at DESC
    `;
    return NextResponse.json(batches);
  } catch (err) {
    console.error('GET /api/batches error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { batch_date, notes } = await req.json();

    const [inserted] = await sql`
      INSERT INTO batches (batch_number, batch_date, notes)
      VALUES ('TMP', ${batch_date || new Date().toISOString().split('T')[0]}, ${notes || ''})
      RETURNING id
    `;

    const batchNumber = `BT-${String(inserted.id).padStart(3, '0')}`;
    const [batch] = await sql`
      UPDATE batches SET batch_number = ${batchNumber} WHERE id = ${inserted.id} RETURNING *
    `;

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    console.error('POST /api/batches error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
