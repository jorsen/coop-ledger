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

  const [updated] = await sql`
    UPDATE feed_types
    SET name = ${name}, active = ${active}
    WHERE id = ${params.id}
    RETURNING *
  `;

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`UPDATE feed_types SET active = false WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
