import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const users = await sql`SELECT id, username, created_at FROM users ORDER BY created_at ASC`;
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }
  if (String(password).length < 4) {
    return NextResponse.json({ error: 'password must be at least 4 characters' }, { status: 400 });
  }

  const [existing] = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing) {
    return NextResponse.json({ error: 'That username is already taken' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (username, password_hash) VALUES (${username}, ${passwordHash})
    RETURNING id, username, created_at
  `;

  return NextResponse.json(user, { status: 201 });
}
