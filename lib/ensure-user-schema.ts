import bcrypt from 'bcryptjs';
import { sql, rawQuery } from './db';

const USER_SCOPED_TABLES = [
  'clients',
  'batches',
  'transactions',
  'expenses',
  'pig_sales',
  'feed_types',
  'feed_prices',
  'settings',
  'activity_logs',
  'backup_files',
];

let ensured = false;

// Idempotent — safe to call on every request. Creates the users table,
// seeds the joysussane account, adds user_id to every data table, and
// backfills existing rows to joysussane so old data keeps working.
export async function ensureUserSchema() {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const [existingJoysussane] = await sql`SELECT id FROM users WHERE username = 'joysussane'`;
  let joysussaneId = existingJoysussane?.id as number | undefined;

  if (!joysussaneId) {
    const passwordHash = await bcrypt.hash('joysussane', 10);
    const [inserted] = await sql`
      INSERT INTO users (username, password_hash) VALUES ('joysussane', ${passwordHash})
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `;
    joysussaneId = inserted?.id;
    if (!joysussaneId) {
      const [row] = await sql`SELECT id FROM users WHERE username = 'joysussane'`;
      joysussaneId = row.id;
    }
  }

  for (const table of USER_SCOPED_TABLES) {
    await rawQuery(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);
  }

  // settings' primary key was just (key) — widen it to (user_id, key)
  await sql`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey`;
  await sql`UPDATE settings SET user_id = ${joysussaneId} WHERE user_id IS NULL`;
  await sql`ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (user_id, key)`;

  for (const table of USER_SCOPED_TABLES) {
    if (table === 'settings') continue;
    await rawQuery(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [joysussaneId]);
  }

  // feed_types.name and batches.batch_number were globally UNIQUE — widen
  // both to be unique per-user instead, so two accounts can each have
  // their own "STARTER 50KLS" / batch "1" without colliding.
  await sql`ALTER TABLE feed_types DROP CONSTRAINT IF EXISTS feed_types_name_key`;
  await sql`ALTER TABLE feed_types DROP CONSTRAINT IF EXISTS feed_types_user_id_name_key`;
  await sql`ALTER TABLE feed_types ADD CONSTRAINT feed_types_user_id_name_key UNIQUE (user_id, name)`;

  await sql`ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_batch_number_key`;
  await sql`ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_user_id_batch_number_key`;
  await sql`ALTER TABLE batches ADD CONSTRAINT batches_user_id_batch_number_key UNIQUE (user_id, batch_number)`;

  ensured = true;
}
