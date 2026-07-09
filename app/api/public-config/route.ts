import { NextResponse } from 'next/server';
import {
  OWNER_USER_ID,
  findUserById,
  getWorkspaceByOwner,
  getWorkspaceBySlug,
  readPublishedConfig,
} from '@/lib/store';

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
    if (!ws) return NextResponse.json({ ok: false, error: 'workspace not found' }, { status: 404 });
    workspaceId = ws.workspaceId;
  } else if (u && u !== OWNER_USER_ID) {
    const user = await findUserById(u);
    if (!user) return NextResponse.json({ ok: false, error: 'workspace not found' }, { status: 404 });
    workspaceId = (await getWorkspaceByOwner(user.id)).workspaceId;
  } else {
    workspaceId = (await getWorkspaceByOwner(OWNER_USER_ID)).workspaceId;
  }

  const config = await readPublishedConfig(workspaceId);
  if (!config) return NextResponse.json({ ok: false, error: 'not_published' }, { status: 404 });
  return NextResponse.json({ ok: true, config, workspaceId });
}
