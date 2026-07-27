import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { feed_type_id, price_per_bag, delivery_fee_per_bag, effective_date } = await req.json();

  if (!feed_type_id || !price_per_bag || !effective_date) {
    return NextResponse.json(
      { error: 'feed_type_id, price_per_bag, and effective_date are required' },
      { status: 400 }
    );
  }

  const [feedType] = await sql`SELECT id FROM feed_types WHERE id = ${feed_type_id} AND user_id = ${session.userId}`;
  if (!feedType) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [row] = await sql`
    INSERT INTO feed_prices (feed_type_id, price_per_bag, delivery_fee_per_bag, effective_date, user_id)
    VALUES (${feed_type_id}, ${price_per_bag}, ${delivery_fee_per_bag ?? 0}, ${effective_date}, ${session.userId})
    ON CONFLICT (feed_type_id, effective_date)
    DO UPDATE SET price_per_bag = EXCLUDED.price_per_bag,
                  delivery_fee_per_bag = EXCLUDED.delivery_fee_per_bag
    RETURNING *
  `;

  return NextResponse.json(row, { status: 201 });
}
