import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, rawQuery } from '@/lib/db';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = session.userId;

  const [clients, batches, transactions, feedTypes, feedPrices, settings, expenses, pigSales, activityLogs] =
    await Promise.all([
      sql`SELECT * FROM clients WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT * FROM batches WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT * FROM feed_types WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT * FROM feed_prices WHERE user_id = ${userId} ORDER BY id`,
      sql`SELECT * FROM settings WHERE user_id = ${userId} ORDER BY key`,
      sql`SELECT * FROM expenses WHERE user_id = ${userId} ORDER BY id`.catch(() => []),
      sql`SELECT * FROM pig_sales WHERE user_id = ${userId} ORDER BY id`.catch(() => []),
      sql`SELECT * FROM activity_logs WHERE user_id = ${userId} ORDER BY id`.catch(() => []),
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

const TABLES_DELETE_ORDER = [
  'activity_logs', 'pig_sales', 'expenses', 'transactions',
  'feed_prices', 'batches', 'clients', 'feed_types', 'settings',
];

const SEQUENCE_TABLES = [
  'clients', 'batches', 'transactions',
  'feed_types', 'feed_prices', 'expenses', 'pig_sales', 'activity_logs',
];

async function restoreTable(tableName: string, rows: Record<string, unknown>[], userId: number) {
  if (!rows?.length) return;
  try {
    // Force every restored row to belong to the restoring user, regardless
    // of what user_id (if any) is baked into the uploaded backup file.
    const taggedRows: Record<string, unknown>[] = rows.map(row => ({ ...row, user_id: userId }));
    const cols = Object.keys(taggedRows[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');
    // Insert in chunks of 50
    for (let i = 0; i < taggedRows.length; i += 50) {
      const chunk = taggedRows.slice(i, i + 50);
      const placeholders = chunk.map(
        (_, ri) => `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`
      ).join(', ');
      const values = chunk.flatMap(row => cols.map(c => row[c] ?? null));
      await rawQuery(`INSERT INTO "${tableName}" (${colList}) VALUES ${placeholders}`, values);
    }
  } catch (e) {
    console.error(`restore ${tableName}:`, e);
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = session.userId;

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

  // Delete only this user's rows, in reverse FK dependency order —
  // other accounts' data is untouched.
  for (const t of TABLES_DELETE_ORDER) {
    try { await rawQuery(`DELETE FROM "${t}" WHERE user_id = $1`, [userId]); } catch {}
  }

  // Restore in FK dependency order, re-tagged to the restoring user
  await restoreTable('settings',      tables.settings      ?? [], userId);
  await restoreTable('feed_types',    tables.feed_types    ?? [], userId);
  await restoreTable('clients',       tables.clients       ?? [], userId);
  await restoreTable('batches',       tables.batches       ?? [], userId);
  await restoreTable('feed_prices',   tables.feed_prices   ?? [], userId);
  await restoreTable('transactions',  tables.transactions  ?? [], userId);
  await restoreTable('expenses',      tables.expenses      ?? [], userId);
  await restoreTable('pig_sales',     tables.pig_sales     ?? [], userId);
  await restoreTable('activity_logs', tables.activity_logs ?? [], userId);

  // Reset sequences so new inserts don't conflict
  for (const t of SEQUENCE_TABLES) {
    try {
      await rawQuery(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`
      );
    } catch {}
  }

  return NextResponse.json({ success: true, restored_at: new Date().toISOString() });
}
