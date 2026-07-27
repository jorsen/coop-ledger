import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth';
import { sql, rawQuery } from '@/lib/db';

// Reverse FK-dependency order, so child rows are gone before their parents.
const DELETE_ORDER = [
  'activity_logs', 'backup_files', 'pig_sales', 'expenses', 'transactions',
  'feed_prices', 'batches', 'clients', 'feed_types', 'settings',
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { password } = await req.json();
  if (!password || String(password).length < 4) {
    return NextResponse.json({ error: 'password must be at least 4 characters' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [updated] = await sql`
    UPDATE users SET password_hash = ${passwordHash} WHERE id = ${params.id}
    RETURNING id, username
  `;
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  if (Number(params.id) === session.adminUserId) {
    return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 });
  }

  const [existing] = await sql`SELECT username FROM users WHERE id = ${params.id}`;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  for (const table of DELETE_ORDER) {
    await rawQuery(`DELETE FROM "${table}" WHERE user_id = $1`, [params.id]);
  }
  await sql`DELETE FROM users WHERE id = ${params.id}`;

  return NextResponse.json({ success: true });
}
