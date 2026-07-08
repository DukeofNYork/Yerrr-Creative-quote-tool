import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { OWNER_USER_ID, appendLead, findUserById, readLeads, type Lead } from '@/lib/store';

export async function GET() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (session.role === 'owner') {
    return NextResponse.json(await readLeads());
  }
  return NextResponse.json(await readLeads(session.userId));
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<Lead, 'id' | 'createdAt'>;

  let workspaceUserId = body.workspaceUserId;
  if (workspaceUserId && workspaceUserId !== OWNER_USER_ID) {
    const user = await findUserById(workspaceUserId);
    if (!user) workspaceUserId = undefined;
  }

  const lead: Lead = {
    ...body,
    workspaceUserId,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await appendLead(lead);
  return NextResponse.json({ ok: true, id: lead.id });
}
