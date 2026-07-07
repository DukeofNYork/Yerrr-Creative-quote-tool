import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/store';
import { validateConfig } from '@/lib/engine/validate';
import type { BusinessConfig } from '@/lib/engine/types';

export async function GET() {
  return NextResponse.json(await readConfig());
}

export async function PUT(req: Request) {
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
  await writeConfig(config);
  return NextResponse.json({ ok: true });
}
