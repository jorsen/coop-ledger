import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { sessionOptions, SessionData } from '@/lib/session';
import { sql } from '@/lib/db';
import { ensureUserSchema } from '@/lib/ensure-user-schema';

export async function POST(req: NextRequest) {
  await ensureUserSchema();

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 401 });
  }

  const [user] = await sql`SELECT id, username, password_hash, is_admin FROM users WHERE username = ${username}`;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.isLoggedIn = true;
  session.userId = user.id;
  session.username = user.username;
  if (user.is_admin) {
    session.isAdmin = true;
    session.adminUserId = user.id;
    session.adminUsername = user.username;
  } else {
    session.isAdmin = false;
    session.adminUserId = undefined;
    session.adminUsername = undefined;
  }
  await session.save();

  return NextResponse.json({ success: true });
}
