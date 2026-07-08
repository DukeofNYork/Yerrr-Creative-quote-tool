import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { readLeads, readUsers } from '@/lib/store';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'owner') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const [users, allLeads] = await Promise.all([readUsers(), readLeads()]);
  const leadCountsByUser = new Map<string, number>();
  for (const lead of allLeads) {
    const owner = lead.workspaceUserId;
    if (!owner) continue;
    leadCountsByUser.set(owner, (leadCountsByUser.get(owner) ?? 0) + 1);
  }

  return NextResponse.json({
    ok: true,
    users: users
      .map(u => ({
        id: u.id,
        username: u.username,
        createdAt: u.createdAt,
        leadCount: leadCountsByUser.get(u.id) ?? 0,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  });
}
