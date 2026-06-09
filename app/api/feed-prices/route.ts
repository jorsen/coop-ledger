import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { feed_type_id, price_per_bag, delivery_fee_per_bag, effective_date } = await req.json();

  if (!feed_type_id || !price_per_bag || !effective_date) {
    return NextResponse.json(
      { error: 'feed_type_id, price_per_bag, and effective_date are required' },
      { status: 400 }
    );
  }

  const [row] = await sql`
    INSERT INTO feed_prices (feed_type_id, price_per_bag, delivery_fee_per_bag, effective_date)
    VALUES (${feed_type_id}, ${price_per_bag}, ${delivery_fee_per_bag ?? 0}, ${effective_date})
    ON CONFLICT (feed_type_id, effective_date)
    DO UPDATE SET price_per_bag = EXCLUDED.price_per_bag,
                  delivery_fee_per_bag = EXCLUDED.delivery_fee_per_bag
    RETURNING *
  `;

  return NextResponse.json(row, { status: 201 });
}
