import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [client] = await sql`SELECT * FROM clients WHERE id = ${params.id}`;
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await sql`
    SELECT t.*,
      CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag,
      b.batch_number AS batch_no
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

  const { client_code, name, batch_number, status, heads, allocation } = await req.json();

  const [updated] = await sql`
    UPDATE clients
    SET
      client_code  = ${client_code},
      name         = ${name},
      batch_number  = ${batch_number},
      status       = ${status},
      heads        = ${heads},
      allocation   = ${allocation},
      updated_at   = NOW()
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`DELETE FROM clients WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
