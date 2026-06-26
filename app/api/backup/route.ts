import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

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

  const filename = `coop-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

async function resetSequence(table: string, column = 'id') {
  try {
    await sql.unsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE((SELECT MAX(${column}) FROM ${table}), 0) + 1, false)`
    );
  } catch {}
}

async function restoreTable(table: string, rows: Record<string, unknown>[]) {
  if (!rows?.length) return;
  try {
    await sql.unsafe(`DELETE FROM ${table}`);
    // Insert in chunks of 50 to avoid query size limits
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      await sql`INSERT INTO ${sql(table)} ${sql(chunk)}`;
    }
  } catch (e) {
    console.error(`restore ${table}:`, e);
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  let backup: any;
  try {
    backup = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (backup?.app !== 'coop-ledger' || !backup?.tables) {
    return NextResponse.json({ error: 'Invalid backup file. Make sure you upload a coop-ledger backup.' }, { status: 400 });
  }

  const { tables } = backup;

  // Delete in reverse FK dependency order
  for (const t of ['activity_logs', 'pig_sales', 'expenses', 'transactions', 'feed_prices', 'batches', 'clients', 'feed_types', 'settings']) {
    try { await sql.unsafe(`DELETE FROM ${t}`); } catch {}
  }

  // Restore in FK dependency order
  await restoreTable('settings',      tables.settings      ?? []);
  await restoreTable('feed_types',    tables.feed_types    ?? []);
  await restoreTable('clients',       tables.clients       ?? []);
  await restoreTable('batches',       tables.batches       ?? []);
  await restoreTable('feed_prices',   tables.feed_prices   ?? []);
  await restoreTable('transactions',  tables.transactions  ?? []);
  await restoreTable('expenses',      tables.expenses      ?? []);
  await restoreTable('pig_sales',     tables.pig_sales     ?? []);
  await restoreTable('activity_logs', tables.activity_logs ?? []);

  // Reset auto-increment sequences
  await Promise.all([
    resetSequence('clients'),
    resetSequence('batches'),
    resetSequence('transactions'),
    resetSequence('feed_types'),
    resetSequence('feed_prices'),
    resetSequence('expenses'),
    resetSequence('pig_sales'),
    resetSequence('activity_logs'),
  ]);

  return NextResponse.json({ success: true, restored_at: new Date().toISOString() });
}
