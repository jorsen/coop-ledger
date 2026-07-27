import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { requireAdmin } from '@/lib/auth';
import { sessionOptions, SessionData } from '@/lib/session';
import { sql } from '@/lib/db';

// Lets a super admin switch which account's data they're viewing/editing,
// without logging out. session.adminUserId/adminUsername stay fixed to the
// admin's real account so they can always switch back.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const [target] = await sql`SELECT id, username FROM users WHERE id = ${userId}`;
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.userId = target.id;
  session.username = target.username;
  await session.save();

  return NextResponse.json({ success: true, username: target.username });
}
