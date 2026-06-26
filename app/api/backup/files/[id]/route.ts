import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const [file] = await sql`SELECT filename, data FROM backup_files WHERE id = ${params.id}`;
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return new NextResponse(JSON.stringify(file.data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  await sql`DELETE FROM backup_files WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
