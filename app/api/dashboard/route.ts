import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;

  // Link any unassigned transactions to their client's most recent batch
  await sql`
    UPDATE transactions t
    SET batch_id = (
      SELECT b.id FROM batches b
      WHERE b.client_id = t.client_id
      ORDER BY b.created_at DESC LIMIT 1
    )
    WHERE t.batch_id IS NULL AND t.client_id IS NOT NULL
  `;

  const [stats, recent] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*) FROM clients WHERE status = 'active')::int AS active_clients,
        (SELECT COUNT(*) FROM transactions)::int                    AS total_transactions,
        (
          (SELECT COALESCE(SUM(debit), 0) FROM transactions)
          -
          (SELECT COALESCE(SUM(t.debit), 0)
           FROM transactions t
           WHERE t.batch_id IN (
             SELECT id FROM batches WHERE status = 'paid'
           ))
        )                                                           AS total_loan_amount,
        (SELECT COALESCE(SUM(debit), 0) FROM transactions)         AS grand_total_debits,
        (SELECT COALESCE(SUM(t.debit), 0)
         FROM transactions t
         WHERE t.batch_id IN (
           SELECT id FROM batches WHERE status = 'paid'
         ))                                                         AS paid_deducted,
        (SELECT COALESCE(SUM(bags), 0) FROM transactions)::int     AS total_bags,
        (SELECT COALESCE(SUM(
          COALESCE((
            SELECT fp.delivery_fee_per_bag
            FROM feed_prices fp
            JOIN feed_types ft ON ft.id = fp.feed_type_id
            WHERE LOWER(ft.name) = LOWER(t2.feed_type)
              AND fp.effective_date <= t2.date
            ORDER BY fp.effective_date DESC LIMIT 1
          ), (SELECT value::numeric FROM settings WHERE key = 'delivery_fee' LIMIT 1), 0) * t2.bags
        ), 0) FROM transactions t2)                                AS total_delivery_fees
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

  return NextResponse.json({ stats: stats[0], recent }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
