import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { findUserById, OWNER_USER_ID } from '@/lib/store';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (session.role === 'owner') {
    return NextResponse.json({
      ok: true,
      user: {
        id: OWNER_USER_ID,
        username: process.env.ADMIN_USERNAME ?? 'owner',
        role: 'owner' as const,
      },
    });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: 'user' as const,
      createdAt: user.createdAt,
    },
  });
}
