import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifyPassword } from '@/lib/auth';
import { findUserByUsername, OWNER_USER_ID } from '@/lib/store';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Incorrect username or password.' }, { status: 401 });
}

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({ username: '', password: '' }));
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return unauthorized();
  }
  const trimmedUser = username.trim().toLowerCase();

  const ownerUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const ownerPass = process.env.ADMIN_PASSWORD;
  if (ownerUser && ownerPass && trimmedUser === ownerUser && password === ownerPass) {
    const token = await signSession({ userId: OWNER_USER_ID, role: 'owner' });
    const res = NextResponse.json({ ok: true, role: 'owner' });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  }

  const user = await findUserByUsername(trimmedUser);
  if (!user) return unauthorized();
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return unauthorized();

  const token = await signSession({ userId: user.id, role: 'user' });
  const res = NextResponse.json({ ok: true, role: 'user' });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
