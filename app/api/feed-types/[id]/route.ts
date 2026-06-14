import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const prices = await sql`
    SELECT * FROM feed_prices
    WHERE feed_type_id = ${params.id}
    ORDER BY effective_date DESC
  `;

  return NextResponse.json(prices);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { name, active } = await req.json();

  const [existing] = await sql`SELECT name FROM feed_types WHERE id = ${params.id}`;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [updated] = await sql`
    UPDATE feed_types
    SET name = ${name}, active = ${active}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (existing.name.trim() !== name.trim()) {
    await sql`UPDATE transactions SET feed_type = ${name} WHERE LOWER(TRIM(feed_type)) = LOWER(TRIM(${existing.name}))`;
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`UPDATE feed_types SET active = false WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
