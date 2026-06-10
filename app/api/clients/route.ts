import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const clients = await sql`
    SELECT
      c.*,
      COUNT(t.id)::int AS transaction_count,
      lb.batch_number        AS current_batch_number,
      lb.heads               AS current_heads,
      lb.date_of_application AS current_date_of_application,
      lb.date_of_hauling     AS current_date_of_hauling
    FROM clients c
    LEFT JOIN transactions t ON t.client_id = c.id
    LEFT JOIN LATERAL (
      SELECT b.batch_number, b.heads, b.date_of_application, b.date_of_hauling
      FROM batches b
      WHERE b.client_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 1
    ) lb ON true
    GROUP BY c.id, lb.batch_number, lb.heads, lb.date_of_application, lb.date_of_hauling
    ORDER BY c.name ASC
  `;

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { name, batch_number, status, heads, allocation, date_of_hauling, date_of_application } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Ensure new columns exist (safe on Neon — idempotent)
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_hauling DATE`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_application DATE`;

  // Insert with a temporary code, then update to the zero-padded id
  const [inserted] = await sql`
    INSERT INTO clients (client_code, name, batch_number, status, heads, allocation, date_of_hauling, date_of_application)
    VALUES ('TMP', ${name}, ${batch_number || '1'}, ${status || 'active'}, ${heads || 0}, ${allocation || 0},
      ${date_of_hauling || null}, ${date_of_application || null})
    RETURNING id
  `;

  const autoCode = String(inserted.id).padStart(3, '0');

  const [client] = await sql`
    UPDATE clients SET client_code = ${autoCode} WHERE id = ${inserted.id} RETURNING *
  `;

  return NextResponse.json(client, { status: 201 });
}
