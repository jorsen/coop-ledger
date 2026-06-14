import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { weight_kg, price_per_kg, label } = await req.json();
  const [updated] = await sql`
    UPDATE pig_sales
    SET weight_kg = ${weight_kg}, price_per_kg = ${price_per_kg}, label = ${label || null}
    WHERE id = ${params.id}
    RETURNING *
  `;
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logActivity('updated', 'pig_sale', updated.id, `Updated pig sale #${updated.id}: ${updated.weight_kg}kg @ ₱${updated.price_per_kg}/kg`);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [existing] = await sql`SELECT * FROM pig_sales WHERE id = ${params.id}`;
  await sql`DELETE FROM pig_sales WHERE id = ${params.id}`;
  if (existing) await logActivity('deleted', 'pig_sale', Number(params.id), `Deleted pig sale ${existing.weight_kg}kg from batch #${existing.batch_id}`);
  return NextResponse.json({ success: true });
}
