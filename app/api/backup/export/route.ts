import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;

  // Ensure backup_files table exists
  await sql`CREATE TABLE IF NOT EXISTS backup_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    size_bytes INTEGER,
    data JSONB NOT NULL
  )`;

  const [clients, batches, transactions, feedTypes, feedPrices, settings, expenses, pigSales, activityLogs] =
    await Promise.all([
      sql`SELECT * FROM clients ORDER BY id`,
      sql`SELECT * FROM batches ORDER BY id`,
      sql`SELECT * FROM transactions ORDER BY id`,
      sql`SELECT * FROM feed_types ORDER BY id`,
      sql`SELECT * FROM feed_prices ORDER BY id`,
      sql`SELECT * FROM settings ORDER BY key`,
      sql`SELECT * FROM expenses ORDER BY id`.catch(() => []),
      sql`SELECT * FROM pig_sales ORDER BY id`.catch(() => []),
      sql`SELECT * FROM activity_logs ORDER BY id`.catch(() => []),
    ]);

  const backup = {
    version: '1.0',
    app: 'coop-ledger',
    exported_at: new Date().toISOString(),
    tables: {
      clients,
      batches,
      transactions,
      feed_types: feedTypes,
      feed_prices: feedPrices,
      settings,
      expenses,
      pig_sales: pigSales,
      activity_logs: activityLogs,
    },
  };

  const json = JSON.stringify(backup);
  const sizeBytes = Buffer.byteLength(json, 'utf8');
  const filename = `coop-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const [saved] = await sql`
    INSERT INTO backup_files (filename, size_bytes, data)
    VALUES (${filename}, ${sizeBytes}, ${backup}::jsonb)
    RETURNING id, filename, created_at, size_bytes
  `;

  return NextResponse.json(saved);
}
