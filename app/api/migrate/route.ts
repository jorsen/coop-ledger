import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/migrate  — run once to add delivery_fee_per_bag and update prices
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`ALTER TABLE feed_prices ADD COLUMN IF NOT EXISTS delivery_fee_per_bag DECIMAL(12,2) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_application DATE`;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;

  await sql`
    INSERT INTO settings (key, value) VALUES ('delivery_fee', '80')
    ON CONFLICT (key) DO NOTHING
  `;

  await sql`
    INSERT INTO feed_prices (feed_type_id, price_per_bag, delivery_fee_per_bag, effective_date)
    SELECT id, 1625, 70, '2026-01-01'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
    SELECT id, 1595, 70, '2026-01-01'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
    SELECT id, 1575, 70, '2026-01-01'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
    SELECT id, 1635, 80, '2026-03-11'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
    SELECT id, 1605, 80, '2026-03-11'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
    SELECT id, 1585, 80, '2026-03-11'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
    SELECT id, 1735, 80, '2026-03-23'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
    SELECT id, 1705, 80, '2026-03-23'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
    SELECT id, 1685, 80, '2026-03-23'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
    SELECT id, 1785, 80, '2026-04-24'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
    SELECT id, 1755, 80, '2026-04-24'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
    SELECT id, 1735, 80, '2026-04-24'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'
    ON CONFLICT (feed_type_id, effective_date) DO UPDATE
      SET price_per_bag = EXCLUDED.price_per_bag,
          delivery_fee_per_bag = EXCLUDED.delivery_fee_per_bag
  `;

  return NextResponse.json({ ok: true, message: 'Migration complete' });
}
