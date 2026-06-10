import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const clientId = req.nextUrl.searchParams.get('client_id');

  try {
    const batches = clientId
      ? await sql`
          SELECT
            b.*,
            COUNT(t.id)::int          AS transaction_count,
            COALESCE(SUM(t.bags), 0)  AS total_bags,
            COALESCE(SUM(t.debit), 0) AS total_debit
          FROM batches b
          LEFT JOIN transactions t ON t.batch_id = b.id
          WHERE b.client_id = ${clientId}
          GROUP BY b.id
          ORDER BY b.batch_date DESC, b.created_at DESC
        `
      : await sql`
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
    const { batch_date, notes, client_id, batch_number, date_of_application, date_of_hauling, heads, allocation } = await req.json();

    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_application DATE`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS heads INTEGER`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS allocation DECIMAL(12,2)`;

    const [inserted] = await sql`
      INSERT INTO batches (batch_number, client_id, batch_date, notes, date_of_application, date_of_hauling, heads, allocation)
      VALUES ('TMP', ${client_id || null}, ${batch_date || new Date().toISOString().split('T')[0]}, ${notes || ''},
        ${date_of_application || null}, ${date_of_hauling || null},
        ${heads ? Number(heads) : null}, ${allocation ? Number(allocation) : null})
      RETURNING id
    `;

    const batchNumber = batch_number?.trim() || `BT-${String(inserted.id).padStart(3, '0')}`;
    const [batch] = await sql`
      UPDATE batches SET batch_number = ${batchNumber} WHERE id = ${inserted.id} RETURNING *
    `;

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    console.error('POST /api/batches error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
