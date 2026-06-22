import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {

  const [stats, recent] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*) FROM clients WHERE status = 'active')::int  AS active_clients,
        (SELECT COUNT(*) FROM transactions)::int                     AS total_transactions,
        (SELECT COALESCE(SUM(debit), 0) FROM transactions)           AS total_debit,
        (SELECT COALESCE(SUM(bags), 0)  FROM transactions)::int      AS total_bags
    `,
    sql`
      SELECT
        t.id,
        t.date,
        t.feed_type,
        t.bags,
        t.debit,
        t.credit,
        CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag,
        c.name AS client_name
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `,
  ]);

  return NextResponse.json({ stats: stats[0], recent });
}
