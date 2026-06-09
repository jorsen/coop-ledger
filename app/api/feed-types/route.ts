import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const feedTypes = await sql`
    SELECT
      ft.*,
      fp.price_per_bag AS current_price,
      fp.effective_date AS price_date
    FROM feed_types ft
    LEFT JOIN LATERAL (
      SELECT price_per_bag, effective_date
      FROM feed_prices
      WHERE feed_type_id = ft.id
      ORDER BY effective_date DESC
      LIMIT 1
    ) fp ON true
    WHERE ft.active = true
    ORDER BY ft.name ASC
  `;

  return NextResponse.json(feedTypes);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const [feedType] = await sql`
    INSERT INTO feed_types (name) VALUES (${name}) RETURNING *
  `;

  return NextResponse.json(feedType, { status: 201 });
}
