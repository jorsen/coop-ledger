import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from './session';
import { NextResponse } from 'next/server';

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireAuth(): Promise<
  { session: Awaited<ReturnType<typeof getSession>>; error: null } |
  { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, error: null };
}
