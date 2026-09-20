import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const MAX_HEADS = 200;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS head_batches (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(150)  NOT NULL,
      heads      INTEGER       NOT NULL DEFAULT 0,
      due_date   DATE,
      status     VARCHAR(20)   NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
      user_id    INTEGER       NOT NULL,
      created_at TIMESTAMPTZ   DEFAULT NOW()
    )
  `;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const rows = await sql`
    SELECT *, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)::int AS batch_no
    FROM head_batches
    WHERE user_id = ${session.userId}
    ORDER BY created_at ASC, id ASC
  `;

  const headsInUse = rows
    .filter((r: any) => r.status !== 'paid')
    .reduce((sum: number, r: any) => sum + Number(r.heads), 0);

  return NextResponse.json({
    batches: rows,
    max_heads: MAX_HEADS,
    heads_in_use: headsInUse,
    heads_available: MAX_HEADS - headsInUse,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  await ensureTable();

  const { name, heads, due_date, status } = await req.json();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const [row] = await sql`
    INSERT INTO head_batches (name, heads, due_date, status, user_id)
    VALUES (${name}, ${heads || 0}, ${due_date || null}, ${status || 'not_paid'}, ${session.userId})
    RETURNING *
  `;

  await logActivity('created', 'head_batch', row.id, `Added batch record for ${name} (${heads || 0} heads)`, session.userId);
  return NextResponse.json(row, { status: 201 });
}
