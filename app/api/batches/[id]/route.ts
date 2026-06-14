import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS pig_price_per_kg DECIMAL(10,2) DEFAULT 270`;

  const [batch] = await sql`
    SELECT b.*,
      c.name        AS client_name,
      c.client_code AS client_code,
      c.heads       AS client_heads,
      c.allocation  AS client_allocation
    FROM batches b
    LEFT JOIN clients c ON c.id = b.client_id
    WHERE b.id = ${params.id}
  `;
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await sql`
    SELECT t.*, c.name AS client_name,
      CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag,
      COALESCE((
        SELECT fp.delivery_fee_per_bag
        FROM feed_prices fp
        JOIN feed_types ft ON ft.id = fp.feed_type_id
        WHERE LOWER(ft.name) = LOWER(t.feed_type)
          AND fp.effective_date <= t.date
        ORDER BY fp.effective_date DESC LIMIT 1
      ), (SELECT value::numeric FROM settings WHERE key = 'delivery_fee' LIMIT 1), 0) * t.bags AS delivery_fee
    FROM transactions t
    JOIN clients c ON c.id = t.client_id
    WHERE t.batch_id = ${params.id}
    ORDER BY t.date ASC, t.created_at ASC
  `;

  return NextResponse.json({ ...batch, transactions });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { batch_number, batch_date, notes, date_of_application, date_of_hauling, maturity_date, heads, allocation } = await req.json();

  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_application DATE`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS maturity_date DATE`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS heads INTEGER`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS allocation DECIMAL(12,2)`;

  const [updated] = await sql`
    UPDATE batches
    SET batch_number        = ${batch_number},
        batch_date          = COALESCE(${batch_date || null}::date, batch_date),
        notes               = ${notes || ''},
        date_of_application = ${date_of_application || null},
        date_of_hauling     = ${date_of_hauling || null},
        maturity_date       = ${maturity_date || null},
        heads               = ${heads ? Number(heads) : null},
        allocation          = ${allocation ? Number(allocation) : null}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logActivity('updated', 'batch', updated.id, `Updated batch ${updated.batch_number}`);
  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS pig_price_per_kg DECIMAL(10,2) DEFAULT 270`;

  const { pig_price_per_kg } = await req.json();
  const [updated] = await sql`
    UPDATE batches SET pig_price_per_kg = ${pig_price_per_kg}
    WHERE id = ${params.id}
    RETURNING id, pig_price_per_kg
  `;
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT b.batch_number, c.name AS client_name FROM batches b LEFT JOIN clients c ON c.id = b.client_id WHERE b.id = ${params.id}`;
  await sql`DELETE FROM batches WHERE id = ${params.id}`;
  if (existing) await logActivity('deleted', 'batch', Number(params.id), `Deleted batch ${existing.batch_number}${existing.client_name ? ` (${existing.client_name})` : ''}`);
  return NextResponse.json({ success: true });
}
