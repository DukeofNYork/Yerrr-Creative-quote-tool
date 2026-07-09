import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import {
  appendLead,
  getWorkspaceById,
  getWorkspaceByOwner,
  readLeads,
  readLeadsByWorkspace,
  type Lead,
} from '@/lib/store';

export async function GET() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // Owner is the platform super-admin → sees every workspace's leads.
  if (s.role === 'owner') return NextResponse.json(await readLeads());

  const ws = await getWorkspaceByOwner(s.userId);
  return NextResponse.json(await readLeadsByWorkspace(ws.workspaceId));
}

/** Public discovery submission. Tags the lead with a validated workspaceId. */
export async function POST(req: Request) {
  const body = (await req.json()) as Omit<Lead, 'id' | 'createdAt'>;

  let workspaceId = body.workspaceId;
  let workspaceUserId: string | undefined;
  if (workspaceId) {
    const ws = await getWorkspaceById(workspaceId);
    if (!ws) workspaceId = undefined;      // unknown workspace → drop the tag
    else workspaceUserId = ws.ownerUserId; // keep owner attribution for continuity
  }

  const lead: Lead = {
    ...body,
    workspaceId,
    workspaceUserId,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await appendLead(lead);
  return NextResponse.json({ ok: true, id: lead.id });
}
