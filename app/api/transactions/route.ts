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

  let transactions = await sql`
    SELECT t.*, c.name AS client_name,
      CASE WHEN t.bags > 0 THEN ROUND(t.debit / t.bags, 2) ELSE NULL END AS price_per_bag,
      0 AS delivery_fee
    FROM transactions t
    JOIN clients c ON c.id = t.client_id
    ORDER BY t.date DESC, t.created_at DESC
  `;

  if (clientId) transactions = transactions.filter((t) => String(t.client_id) === clientId);
  if (from)     transactions = transactions.filter((t) => t.date >= from);
  if (to)       transactions = transactions.filter((t) => t.date <= to);
  if (search) {
    const q = search.toLowerCase();
    transactions = transactions.filter((t) => t.client_name.toLowerCase().includes(q));
  }

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { client_id, date, feed_type, bags, debit, credit, notes, batch_id } = await req.json();

  if (!client_id || !date) {
    return NextResponse.json({ error: 'client_id and date are required' }, { status: 400 });
  }

  const resolvedBatchId = batch_id || null;

  const [tx] = await sql`
    INSERT INTO transactions (client_id, date, feed_type, bags, debit, credit, notes, batch_id)
    VALUES (
      ${client_id}, ${date}, ${feed_type || ''}, ${bags || 0}, ${debit || 0}, ${credit || 0},
      ${notes || ''}, ${resolvedBatchId}
    )
    RETURNING *
  `;

  return NextResponse.json(tx, { status: 201 });
}
