import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  await sql`DELETE FROM feed_prices WHERE id = ${params.id} AND user_id = ${session.userId}`;
  return NextResponse.json({ success: true });
}
