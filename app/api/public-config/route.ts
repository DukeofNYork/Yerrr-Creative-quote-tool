import { NextResponse } from 'next/server';
import {
  OWNER_USER_ID,
  findUserById,
  getWorkspaceByOwner,
  getWorkspaceBySlug,
  readPublishedConfig,
} from '@/lib/store';

// Published config must reflect a Publish immediately — never cache this read.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } as const;

/**
 * Public: returns the PUBLISHED config for a workspace. Resolution order:
 *   ?slug=<slug>   → that workspace (canonical /d/{slug} path)
 *   ?u=<userId>    → that user's workspace (back-compat for /discover?u=)
 *   (none)         → the owner workspace (bare /discover)
 * 404 if the workspace is unknown or has never been published.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const u = url.searchParams.get('u');

  let workspaceId: string | undefined;
  if (slug) {
    const ws = await getWorkspaceBySlug(slug);
    if (!ws) return NextResponse.json({ ok: false, error: 'workspace not found' }, { status: 404, headers: NO_STORE });
    workspaceId = ws.workspaceId;
  } else if (u && u !== OWNER_USER_ID) {
    const user = await findUserById(u);
    if (!user) return NextResponse.json({ ok: false, error: 'workspace not found' }, { status: 404, headers: NO_STORE });
    workspaceId = (await getWorkspaceByOwner(user.id)).workspaceId;
  } else {
    workspaceId = (await getWorkspaceByOwner(OWNER_USER_ID)).workspaceId;
  }

  const config = await readPublishedConfig(workspaceId);
  if (!config) return NextResponse.json({ ok: false, error: 'not_published' }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ ok: true, config, workspaceId }, { headers: NO_STORE });
}
