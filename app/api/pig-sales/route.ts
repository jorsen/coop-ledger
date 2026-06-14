import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pig_sales (
      id           SERIAL PRIMARY KEY,
      batch_id     INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      weight_kg    DECIMAL(8,2) NOT NULL,
      price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 170,
      label        VARCHAR(200),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  await ensureTable();
  const batchId = req.nextUrl.searchParams.get('batch_id');
  if (!batchId) return NextResponse.json({ error: 'batch_id required' }, { status: 400 });
  const rows = await sql`SELECT * FROM pig_sales WHERE batch_id = ${batchId} ORDER BY created_at ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const { batch_id, weight_kg, price_per_kg, label } = await req.json();
  if (!batch_id || weight_kg == null) {
    return NextResponse.json({ error: 'batch_id and weight_kg are required' }, { status: 400 });
  }

  const pricePerKg = price_per_kg ?? 270;
  const [row] = await sql`
    INSERT INTO pig_sales (batch_id, weight_kg, price_per_kg, label)
    VALUES (${batch_id}, ${weight_kg}, ${pricePerKg}, ${label || null})
    RETURNING *
  `;
  await logActivity('created', 'pig_sale', row.id, `Added pig sale ${weight_kg}kg @ ₱${pricePerKg}/kg for batch #${batch_id}`);
  return NextResponse.json(row, { status: 201 });
}
