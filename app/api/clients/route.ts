import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const clients = await sql`
    SELECT
      c.*,
      COUNT(t.id)::int AS transaction_count
    FROM clients c
    LEFT JOIN transactions t ON t.client_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `;

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { name, batch_number, status, heads, allocation } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Insert with a temporary code, then update to the zero-padded id
  const [inserted] = await sql`
    INSERT INTO clients (client_code, name, batch_number, status, heads, allocation)
    VALUES ('TMP', ${name}, ${batch_number || '1'}, ${status || 'active'}, ${heads || 0}, ${allocation || 0})
    RETURNING id
  `;

  const autoCode = String(inserted.id).padStart(3, '0');

  const [client] = await sql`
    UPDATE clients SET client_code = ${autoCode} WHERE id = ${inserted.id} RETURNING *
  `;

  return NextResponse.json(client, { status: 201 });
}
