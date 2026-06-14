import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id         SERIAL PRIMARY KEY,
      batch_id   INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      item       VARCHAR(200) NOT NULL,
      quantity   DECIMAL(10,2) DEFAULT 1,
      price      DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const batchId = req.nextUrl.searchParams.get('batch_id');
  if (!batchId) return NextResponse.json({ error: 'batch_id required' }, { status: 400 });

  const rows = await sql`
    SELECT * FROM expenses WHERE batch_id = ${batchId} ORDER BY created_at ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id         SERIAL PRIMARY KEY,
      batch_id   INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      item       VARCHAR(200) NOT NULL,
      quantity   DECIMAL(10,2) DEFAULT 1,
      price      DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const { batch_id, item, quantity, price } = await req.json();
  if (!batch_id || !item || price == null) {
    return NextResponse.json({ error: 'batch_id, item and price are required' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO expenses (batch_id, item, quantity, price)
    VALUES (${batch_id}, ${item}, ${quantity ?? 1}, ${price})
    RETURNING *
  `;
  await logActivity('created', 'expense', row.id, `Added expense "${item}" × ${quantity ?? 1} to batch #${batch_id}`);
  return NextResponse.json(row, { status: 201 });
}
