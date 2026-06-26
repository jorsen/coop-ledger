import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS pig_price_per_kg DECIMAL(10,2) DEFAULT 170`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;
  await sql`ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_status_check`;
  await sql`ALTER TABLE batches ADD CONSTRAINT batches_status_check CHECK (status IN ('active','inactive','paid','completed','on-going'))`;

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
    const { batch_date, notes, client_id, batch_number, date_of_application, date_of_hauling, maturity_date, heads, allocation, status } = await req.json();

    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_application DATE`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS maturity_date DATE`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS heads INTEGER`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS allocation DECIMAL(12,2)`;
    await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;

    const dateVal = batch_date || new Date().toISOString().split('T')[0];
    const statusVal = status || 'active';

    let batch;
    if (batch_number?.trim()) {
      const [b] = await sql`
        INSERT INTO batches (batch_number, client_id, batch_date, notes, date_of_application, date_of_hauling, maturity_date, heads, allocation, status)
        VALUES (${batch_number.trim()}, ${client_id || null}, ${dateVal}, ${notes || ''},
          ${date_of_application || null}, ${date_of_hauling || null}, ${maturity_date || null},
          ${heads ? Number(heads) : null}, ${allocation ? Number(allocation) : null}, ${statusVal})
        RETURNING *
      `;
      batch = b;
    } else {
      const tmpName = `__TMP__${Date.now()}`;
      const [inserted] = await sql`
        INSERT INTO batches (batch_number, client_id, batch_date, notes, date_of_application, date_of_hauling, maturity_date, heads, allocation, status)
        VALUES (${tmpName}, ${client_id || null}, ${dateVal}, ${notes || ''},
          ${date_of_application || null}, ${date_of_hauling || null}, ${maturity_date || null},
          ${heads ? Number(heads) : null}, ${allocation ? Number(allocation) : null}, ${statusVal})
        RETURNING id
      `;
      const autoNumber = `BT-${String(inserted.id).padStart(3, '0')}`;
      const [b] = await sql`UPDATE batches SET batch_number = ${autoNumber} WHERE id = ${inserted.id} RETURNING *`;
      batch = b;
    }

    const [cl] = client_id ? await sql`SELECT name FROM clients WHERE id = ${client_id}` : [null];
    await logActivity('created', 'batch', batch.id, `Created batch ${batch.batch_number}${cl ? ` for ${cl.name}` : ''}`);
    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    console.error('POST /api/batches error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
