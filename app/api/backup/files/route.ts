import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await sql`CREATE TABLE IF NOT EXISTS backup_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    size_bytes INTEGER,
    data JSONB NOT NULL
  )`;

  const files = await sql`SELECT id, filename, created_at, size_bytes FROM backup_files WHERE user_id = ${session.userId} ORDER BY created_at DESC`;
  return NextResponse.json(files);
}
