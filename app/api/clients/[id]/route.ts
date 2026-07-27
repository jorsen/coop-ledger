import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [client] = await sql`SELECT * FROM clients WHERE id = ${params.id} AND user_id = ${session.userId}`;
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
          AND ft.user_id = ${session.userId}
          AND fp.effective_date <= t.date
        ORDER BY fp.effective_date DESC LIMIT 1
      ), (SELECT value::numeric FROM settings WHERE key = 'delivery_fee' AND user_id = ${session.userId} LIMIT 1), 0) * t.bags AS delivery_fee
    FROM transactions t
    LEFT JOIN batches b ON b.id = t.batch_id
    WHERE t.client_id = ${params.id} AND t.user_id = ${session.userId}
    ORDER BY t.date ASC, t.created_at ASC
  `;

  return NextResponse.json({ ...client, transactions });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
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
    WHERE id = ${params.id} AND user_id = ${session.userId}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Ensure batch columns exist, then sync dates to the latest batch
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_application DATE`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS heads INTEGER`;
  await sql`
    UPDATE batches
    SET
      date_of_application = ${date_of_application || null},
      date_of_hauling     = ${date_of_hauling || null},
      heads               = ${heads ? Number(heads) : null}
    WHERE id = (
      SELECT id FROM batches WHERE client_id = ${params.id} AND user_id = ${session.userId} ORDER BY created_at DESC LIMIT 1
    )
  `;

  await logActivity('updated', 'caretaker', updated.id, `Updated caretaker ${updated.name} (${updated.client_code})`, session.userId);
  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();

  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_updated BOOLEAN DEFAULT FALSE`;

  const [updated] = await sql`
    UPDATE clients
    SET is_updated = ${body.is_updated ?? false}, updated_at = NOW()
    WHERE id = ${params.id} AND user_id = ${session.userId}
    RETURNING id, is_updated
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT name, client_code FROM clients WHERE id = ${params.id} AND user_id = ${session.userId}`;
  await sql`DELETE FROM clients WHERE id = ${params.id} AND user_id = ${session.userId}`;
  if (existing) await logActivity('deleted', 'caretaker', Number(params.id), `Deleted caretaker ${existing.name} (${existing.client_code})`, session.userId);
  return NextResponse.json({ success: true });
}
