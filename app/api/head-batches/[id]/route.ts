import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { name, heads, due_date, status } = await req.json();

  const [updated] = await sql`
    UPDATE head_batches
    SET name = ${name}, heads = ${heads || 0}, due_date = ${due_date || null}, status = ${status || 'not_paid'}
    WHERE id = ${params.id} AND user_id = ${session.userId}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logActivity('updated', 'head_batch', updated.id, `Updated batch record for ${updated.name}`, session.userId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT name FROM head_batches WHERE id = ${params.id} AND user_id = ${session.userId}`;
  await sql`DELETE FROM head_batches WHERE id = ${params.id} AND user_id = ${session.userId}`;
  if (existing) await logActivity('deleted', 'head_batch', Number(params.id), `Deleted batch record for ${existing.name}`, session.userId);
  return NextResponse.json({ success: true });
}
