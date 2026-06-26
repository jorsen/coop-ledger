import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [client] = await sql`SELECT * FROM clients WHERE id = ${params.id}`;
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await sql`
    SELECT t.*,
      CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag,
      b.batch_number AS batch_no,
      COALESCE((
        SELECT fp.delivery_fee_per_bag
        FROM feed_prices fp
        JOIN feed_types ft ON ft.id = fp.feed_type_id
        WHERE LOWER(ft.name) = LOWER(t.feed_type)
          AND fp.effective_date <= t.date
        ORDER BY fp.effective_date DESC LIMIT 1
      ), (SELECT value::numeric FROM settings WHERE key = 'delivery_fee' LIMIT 1), 0) * t.bags AS delivery_fee
    FROM transactions t
    LEFT JOIN batches b ON b.id = t.batch_id
    WHERE t.client_id = ${params.id}
    ORDER BY t.date ASC, t.created_at ASC
  `;

  return NextResponse.json({ ...client, transactions });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { client_code, name, batch_number, status, heads, allocation, date_of_hauling, date_of_application, notes, is_updated } = await req.json();

  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_application DATE`;
  await sql`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check`;
  await sql`ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active','inactive','paid','completed','on-going'))`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_updated BOOLEAN DEFAULT FALSE`;

  const [updated] = await sql`
    UPDATE clients
    SET
      client_code          = ${client_code},
      name                 = ${name},
      batch_number         = ${batch_number},
      status               = ${status},
      heads                = ${heads},
      allocation           = ${allocation},
      date_of_hauling      = ${date_of_hauling || null},
      date_of_application  = ${date_of_application || null},
      notes                = ${notes || null},
      is_updated           = ${is_updated ?? false},
      updated_at           = NOW()
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logActivity('updated', 'caretaker', updated.id, `Updated caretaker ${updated.name} (${updated.client_code})`);
  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();

  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_updated BOOLEAN DEFAULT FALSE`;

  const [updated] = await sql`
    UPDATE clients
    SET is_updated = ${body.is_updated ?? false}, updated_at = NOW()
    WHERE id = ${params.id}
    RETURNING id, is_updated
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT name, client_code FROM clients WHERE id = ${params.id}`;
  await sql`DELETE FROM clients WHERE id = ${params.id}`;
  if (existing) await logActivity('deleted', 'caretaker', Number(params.id), `Deleted caretaker ${existing.name} (${existing.client_code})`);
  return NextResponse.json({ success: true });
}
