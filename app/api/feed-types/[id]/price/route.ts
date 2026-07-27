import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

// GET /api/feed-types/[id]/price?date=YYYY-MM-DD
// Returns the price effective on the given date (or today if omitted)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [row] = await sql`
    SELECT price_per_bag, delivery_fee_per_bag, effective_date
    FROM feed_prices
    WHERE feed_type_id = ${params.id}
      AND user_id = ${session.userId}
      AND effective_date <= ${date}::date
    ORDER BY effective_date DESC
    LIMIT 1
  `;

  if (!row) return NextResponse.json({ price_per_bag: null, effective_date: null });
  return NextResponse.json(row);
}
