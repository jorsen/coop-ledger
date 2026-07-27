import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return NextResponse.json({ isLoggedIn: session.isLoggedIn === true, username: session.username ?? null });
}
