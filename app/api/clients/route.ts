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

  const body = await req.json();
  const { client_code, name, loan_number, status, heads, allocation } = body;

  if (!client_code || !name) {
    return NextResponse.json({ error: 'client_code and name are required' }, { status: 400 });
  }

  const [client] = await sql`
    INSERT INTO clients (client_code, name, loan_number, status, heads, allocation)
    VALUES (${client_code}, ${name}, ${loan_number || '1'}, ${status || 'active'}, ${heads || 0}, ${allocation || 0})
    RETURNING *
  `;

  return NextResponse.json(client, { status: 201 });
}
