import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, hashPassword, signSession } from '@/lib/auth';
import { createUser, findUserByUsername, OWNER_USER_ID } from '@/lib/store';

function shortId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function POST(req: Request) {
  const expectedCode = process.env.ADMIN_SIGNUP_CODE;
  if (!expectedCode) {
    return NextResponse.json(
      { ok: false, error: 'Signup is disabled — ADMIN_SIGNUP_CODE is not configured.' },
      { status: 503 },
    );
  }

  const { username, password, code } = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || typeof password !== 'string' || typeof code !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing fields.' }, { status: 400 });
  }
  if (code !== expectedCode) {
    return NextResponse.json({ ok: false, error: 'Invalid signup code.' }, { status: 401 });
  }

  const trimmedUser = username.trim();
  if (!/^\S+@\S+\.\S+$/.test(trimmedUser)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const ownerUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  if (ownerUser && trimmedUser.toLowerCase() === ownerUser) {
    return NextResponse.json({ ok: false, error: 'That email is reserved.' }, { status: 409 });
  }
  if (trimmedUser.toLowerCase() === OWNER_USER_ID) {
    return NextResponse.json({ ok: false, error: 'That email is reserved.' }, { status: 409 });
  }
  if (await findUserByUsername(trimmedUser)) {
    return NextResponse.json({ ok: false, error: 'An account with that email already exists.' }, { status: 409 });
  }

  const user = {
    id: shortId(),
    username: trimmedUser,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await createUser(user);

  const token = await signSession({ userId: user.id, role: 'user' });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
