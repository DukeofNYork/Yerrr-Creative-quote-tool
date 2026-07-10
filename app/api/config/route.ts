import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { getWorkspaceByOwner, readDraftConfig, writeDraftConfig } from '@/lib/store';
import { validateConfig } from '@/lib/engine/validate';
import type { BusinessConfig } from '@/lib/engine/types';

// Draft config drives the admin editor + Preview — always read fresh.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } as const;

async function session() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Admin / preview: returns the session workspace's DRAFT config + workspace meta. */
export async function GET() {
  const s = await session();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const ws = await getWorkspaceByOwner(s.userId);
  const config = await readDraftConfig(ws.workspaceId);
  return NextResponse.json({
    ok: true,
    config,
    workspace: { workspaceId: ws.workspaceId, slug: ws.slug, publishedAt: ws.publishedAt ?? null },
  }, { headers: NO_STORE });
}

/** Admin save: writes the session workspace's DRAFT config (does not publish). */
export async function PUT(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ ok: false, errors: ['Not signed in.'] }, { status: 401 });

  let config: BusinessConfig;
  try {
    config = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errors: ['Request body is not valid JSON.'] }, { status: 400 });
  }
  const errors = validateConfig(config);
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const ws = await getWorkspaceByOwner(s.userId);
  await writeDraftConfig(ws.workspaceId, config);
  return NextResponse.json({ ok: true });
}
