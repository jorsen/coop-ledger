import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { client_id, date, feed_type, bags, debit, credit, notes } = await req.json();

  const [updated] = await sql`
    UPDATE transactions
    SET
      client_id = ${client_id},
      date      = ${date},
      feed_type = ${feed_type},
      bags      = ${bags},
      debit     = ${debit},
      credit    = ${credit},
      notes     = ${notes}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`DELETE FROM transactions WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
