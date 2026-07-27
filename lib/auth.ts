import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from './session';
import { NextResponse } from 'next/server';
import { ensureUserSchema } from './ensure-user-schema';

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireAuth(): Promise<
  { session: Awaited<ReturnType<typeof getSession>> & { userId: number }; error: null } |
  { session: null; error: NextResponse }
> {
  await ensureUserSchema();
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session: session as typeof session & { userId: number }, error: null };
}

export async function requireAdmin(): Promise<
  { session: Awaited<ReturnType<typeof getSession>> & { userId: number }; error: null } |
  { session: null; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;
  if (!result.session.isAdmin) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
