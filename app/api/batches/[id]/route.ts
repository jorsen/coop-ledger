import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [batch] = await sql`SELECT * FROM batches WHERE id = ${params.id}`;
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await sql`
    SELECT t.*, c.name AS client_name,
      CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag
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

  const { batch_number, batch_date, notes } = await req.json();

  const [updated] = await sql`
    UPDATE batches
    SET batch_number = ${batch_number},
        batch_date   = ${batch_date},
        notes        = ${notes || ''}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`DELETE FROM batches WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
