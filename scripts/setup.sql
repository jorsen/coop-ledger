-- Feed Cooperative Ledger — database setup
-- Run this in your Neon SQL editor before starting the app

CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  client_code VARCHAR(20)    UNIQUE NOT NULL,
  name        VARCHAR(100)   NOT NULL,
  batch_number VARCHAR(20)   DEFAULT '1',
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

-- Rename loan_number to batch_number on existing DBs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='loan_number') THEN
    ALTER TABLE clients RENAME COLUMN loan_number TO batch_number;
  END IF;
END $$;

-- Add client_id to batches on existing DBs
ALTER TABLE batches ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;

-- Batch groups — a batch groups a set of transactions per caretaker
CREATE TABLE IF NOT EXISTS batches (
  id           SERIAL PRIMARY KEY,
  batch_number VARCHAR(20)  UNIQUE NOT NULL,
  client_id    INTEGER      REFERENCES clients(id) ON DELETE CASCADE,
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
  id                   SERIAL PRIMARY KEY,
  feed_type_id         INTEGER        NOT NULL REFERENCES feed_types(id) ON DELETE CASCADE,
  price_per_bag        DECIMAL(12,2)  NOT NULL,
  delivery_fee_per_bag DECIMAL(12,2)  NOT NULL DEFAULT 0,
  effective_date       DATE           NOT NULL,
  created_at           TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(feed_type_id, effective_date)
);

-- Add delivery_fee_per_bag to existing DBs
ALTER TABLE feed_prices ADD COLUMN IF NOT EXISTS delivery_fee_per_bag DECIMAL(12,2) NOT NULL DEFAULT 0;

-- App-wide settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
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
-- price_per_bag = sale price, delivery_fee_per_bag = fee per sack
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
      delivery_fee_per_bag = EXCLUDED.delivery_fee_per_bag;
