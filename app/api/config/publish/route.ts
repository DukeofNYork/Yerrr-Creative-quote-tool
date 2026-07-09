import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { getWorkspaceById, getWorkspaceByOwner, publishWorkspace } from '@/lib/store';

/** Promote the session workspace's draft config to published (Build → Publish). */
export async function POST() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const ws = await getWorkspaceByOwner(s.userId);
  await publishWorkspace(ws.workspaceId);
  const updated = await getWorkspaceById(ws.workspaceId);
  return NextResponse.json({ ok: true, slug: ws.slug, publishedAt: updated?.publishedAt ?? null });
}
