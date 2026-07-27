import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return POST();
}

export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = session.userId;

  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;

  // Link any unassigned transactions to their client's most recent batch
  await sql`
    UPDATE transactions t
    SET batch_id = (
      SELECT b.id FROM batches b
      WHERE b.client_id = t.client_id AND b.user_id = ${userId}
      ORDER BY b.created_at DESC LIMIT 1
    )
    WHERE t.batch_id IS NULL AND t.client_id IS NOT NULL AND t.user_id = ${userId}
  `;

  const [stats, recent] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*) FROM clients WHERE status = 'active' AND user_id = ${userId})::int AS active_clients,
        (SELECT COUNT(*) FROM transactions WHERE user_id = ${userId})::int                    AS total_transactions,
        (SELECT COALESCE(SUM(t.debit), 0)
         FROM transactions t
         LEFT JOIN batches b ON b.id = t.batch_id
         WHERE LOWER(TRIM(COALESCE(b.status, 'active'))) != 'paid' AND t.user_id = ${userId}
        )                                                           AS total_loan_amount,
        (SELECT COALESCE(SUM(debit), 0) FROM transactions WHERE user_id = ${userId})         AS grand_total_debits,
        (SELECT COALESCE(SUM(t.debit), 0)
         FROM transactions t
         LEFT JOIN batches b ON b.id = t.batch_id
         WHERE LOWER(TRIM(COALESCE(b.status, 'active'))) = 'paid' AND t.user_id = ${userId}
        )                                                           AS paid_deducted,
        (SELECT COUNT(*)::int FROM batches WHERE LOWER(TRIM(status)) = 'paid' AND user_id = ${userId}) AS paid_batch_count,
        (SELECT STRING_AGG(b.batch_number || ' (' || COALESCE(c.name,'?') || ')', ', ')
         FROM batches b LEFT JOIN clients c ON c.id = b.client_id
         WHERE LOWER(TRIM(b.status)) = 'paid' AND b.user_id = ${userId}) AS paid_batch_names,
        (SELECT COALESCE(SUM(bags), 0) FROM transactions WHERE user_id = ${userId})::int     AS total_bags,
        (SELECT COALESCE(SUM(
          COALESCE((
            SELECT fp.delivery_fee_per_bag
            FROM feed_prices fp
            JOIN feed_types ft ON ft.id = fp.feed_type_id
            WHERE LOWER(ft.name) = LOWER(t2.feed_type)
              AND ft.user_id = ${userId}
              AND fp.effective_date <= t2.date
            ORDER BY fp.effective_date DESC LIMIT 1
          ), (SELECT value::numeric FROM settings WHERE key = 'delivery_fee' AND user_id = ${userId} LIMIT 1), 0) * t2.bags
        ), 0) FROM transactions t2 WHERE t2.user_id = ${userId})                                AS total_delivery_fees
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
      WHERE t.user_id = ${userId}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `,
  ]);

  return NextResponse.json({ stats: stats[0], recent }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
