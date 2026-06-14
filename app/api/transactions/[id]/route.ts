import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { client_id, date, feed_type, bags, debit, credit, notes, batch_id, sales_invoice } = await req.json();

  const [updated] = await sql`
    UPDATE transactions
    SET
      client_id     = ${client_id},
      date          = ${date},
      feed_type     = ${feed_type},
      bags          = ${bags},
      debit         = ${debit},
      credit        = ${credit},
      notes         = ${notes},
      batch_id      = ${batch_id || null},
      sales_invoice = ${sales_invoice || ''}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [cl] = await sql`SELECT name FROM clients WHERE id = ${updated.client_id}`;
  await logActivity('updated', 'transaction', updated.id, `Updated transaction for ${cl?.name ?? 'unknown'}: ${updated.feed_type || 'feed'} × ${updated.bags} bags`);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT t.*, c.name AS client_name FROM transactions t LEFT JOIN clients c ON c.id = t.client_id WHERE t.id = ${params.id}`;
  await sql`DELETE FROM transactions WHERE id = ${params.id}`;
  if (existing) await logActivity('deleted', 'transaction', Number(params.id), `Deleted transaction for ${existing.client_name ?? 'unknown'}: ${existing.feed_type || 'feed'} × ${existing.bags} bags`);
  return NextResponse.json({ success: true });
}
