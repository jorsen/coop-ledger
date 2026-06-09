import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get('client_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const search = searchParams.get('search');

  let transactions;

  if (clientId) {
    transactions = await sql`
      SELECT t.*, c.name AS client_name,
        CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE t.client_id = ${clientId}
      ORDER BY t.date DESC, t.created_at DESC
    `;
  } else if (from || to || search) {
    transactions = await sql`
      SELECT t.*, c.name AS client_name,
        CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE (${from}::date IS NULL OR t.date >= ${from}::date)
        AND (${to}::date   IS NULL OR t.date <= ${to}::date)
        AND (${search} IS NULL OR ${search} = '' OR c.name ILIKE ${'%' + (search ?? '') + '%'})
      ORDER BY t.date DESC, t.created_at DESC
    `;
  } else {
    transactions = await sql`
      SELECT t.*, c.name AS client_name,
        CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      ORDER BY t.date DESC, t.created_at DESC
    `;
  }

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { client_id, date, feed_type, bags, debit, credit, notes } = await req.json();

  if (!client_id || !date) {
    return NextResponse.json({ error: 'client_id and date are required' }, { status: 400 });
  }

  const [tx] = await sql`
    INSERT INTO transactions (client_id, date, feed_type, bags, debit, credit, notes)
    VALUES (${client_id}, ${date}, ${feed_type || ''}, ${bags || 0}, ${debit || 0}, ${credit || 0}, ${notes || ''})
    RETURNING *
  `;

  return NextResponse.json(tx, { status: 201 });
}
