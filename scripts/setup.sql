-- Feed Cooperative Ledger — database setup
-- Run this in your Neon SQL editor before starting the app

CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  client_code VARCHAR(20)    UNIQUE NOT NULL,
  name        VARCHAR(100)   NOT NULL,
  loan_number VARCHAR(20)    DEFAULT '1',
  status      VARCHAR(20)    DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  heads       INTEGER        DEFAULT 0,
  allocation  DECIMAL(12,2)  DEFAULT 0,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id             SERIAL PRIMARY KEY,
  client_id      INTEGER        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date           DATE           NOT NULL,
  feed_type      VARCHAR(100)   DEFAULT '',
  bags           INTEGER        DEFAULT 0,
  debit          DECIMAL(12,2)  DEFAULT 0,
  credit         DECIMAL(12,2)  DEFAULT 0,
  notes          TEXT           DEFAULT '',
  sales_invoice  VARCHAR(50)    DEFAULT '',
  created_at     TIMESTAMPTZ    DEFAULT NOW()
);

-- Add sales_invoice to existing tables if running on an existing DB
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sales_invoice VARCHAR(50) DEFAULT '';

-- Batch groups — a batch groups a set of transactions (e.g. one delivery run)
CREATE TABLE IF NOT EXISTS batches (
  id           SERIAL PRIMARY KEY,
  batch_number VARCHAR(20)  UNIQUE NOT NULL,
  batch_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT         DEFAULT '',
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Add batch_id to transactions (nullable — existing rows stay unassigned)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;

-- Feed types and price history
-- Prices are time-based: changing a price does NOT affect saved transaction debits.

CREATE TABLE IF NOT EXISTS feed_types (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_prices (
  id             SERIAL PRIMARY KEY,
  feed_type_id   INTEGER        NOT NULL REFERENCES feed_types(id) ON DELETE CASCADE,
  price_per_bag  DECIMAL(12,2)  NOT NULL,
  effective_date DATE           NOT NULL,
  created_at     TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(feed_type_id, effective_date)
);

-- Seed feed types
INSERT INTO feed_types (name) VALUES
  ('STARTER LUNTIAN 50KLS'),
  ('STARGROW LUNTIAN 50KLS'),
  ('GROWER LUNTIAN 50KLS'),
  ('FINISHER LUNTIAN 50KLS'),
  ('PRE-STARTER LUNTIAN 50KLS')
ON CONFLICT (name) DO NOTHING;

-- Seed price history (year 2026)
INSERT INTO feed_prices (feed_type_id, price_per_bag, effective_date)
SELECT id, 1555, '2026-01-01'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
SELECT id, 1525, '2026-01-01'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
SELECT id, 1505, '2026-01-01'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
SELECT id, 1555, '2026-03-10'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
SELECT id, 1525, '2026-03-10'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
SELECT id, 1505, '2026-03-10'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
SELECT id, 1555, '2026-03-11'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
SELECT id, 1525, '2026-03-11'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
SELECT id, 1505, '2026-03-11'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
SELECT id, 1655, '2026-03-23'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
SELECT id, 1625, '2026-03-23'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
SELECT id, 1605, '2026-03-23'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'   UNION ALL
SELECT id, 1705, '2026-04-24'::date FROM feed_types WHERE name = 'STARTER LUNTIAN 50KLS'  UNION ALL
SELECT id, 1675, '2026-04-24'::date FROM feed_types WHERE name = 'STARGROW LUNTIAN 50KLS' UNION ALL
SELECT id, 1655, '2026-04-24'::date FROM feed_types WHERE name = 'GROWER LUNTIAN 50KLS'
ON CONFLICT (feed_type_id, effective_date) DO UPDATE SET price_per_bag = EXCLUDED.price_per_bag;
