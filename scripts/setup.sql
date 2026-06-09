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
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date        DATE           NOT NULL,
  feed_type   VARCHAR(100)   DEFAULT '',
  bags        INTEGER        DEFAULT 0,
  debit       DECIMAL(12,2)  DEFAULT 0,
  credit      DECIMAL(12,2)  DEFAULT 0,
  notes       TEXT           DEFAULT '',
  created_at  TIMESTAMPTZ    DEFAULT NOW()
);
