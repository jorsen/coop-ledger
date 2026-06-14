import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT item, batch_id FROM expenses WHERE id = ${params.id}`;
  await sql`DELETE FROM expenses WHERE id = ${params.id}`;
  if (existing) await logActivity('deleted', 'expense', Number(params.id), `Deleted expense "${existing.item}" from batch #${existing.batch_id}`);
  return NextResponse.json({ success: true });
}
