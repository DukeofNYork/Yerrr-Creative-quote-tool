import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { OWNER_USER_ID, findUserById, readConfig, writeConfig } from '@/lib/store';
import { validateConfig } from '@/lib/engine/validate';
import type { BusinessConfig } from '@/lib/engine/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceParam = url.searchParams.get('u');

  if (workspaceParam && workspaceParam !== OWNER_USER_ID) {
    const target = await findUserById(workspaceParam);
    if (!target) {
      return NextResponse.json({ ok: false, error: 'workspace not found' }, { status: 404 });
    }
    return NextResponse.json(await readConfig(target.id));
  }

  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const userId = session?.userId ?? OWNER_USER_ID;
  return NextResponse.json(await readConfig(userId));
}

export async function PUT(req: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, errors: ['Not signed in.'] }, { status: 401 });
  }

  let config: BusinessConfig;
  try {
    config = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errors: ['Request body is not valid JSON.'] }, { status: 400 });
  }
  const errors = validateConfig(config);
  if (errors.length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }
  await writeConfig(config, session.userId);
  return NextResponse.json({ ok: true });
}
