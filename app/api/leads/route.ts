import { NextResponse } from 'next/server';
import { appendLead, readLeads, type Lead } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await readLeads());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<Lead, 'id' | 'createdAt'>;
  const lead: Lead = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await appendLead(lead);
  return NextResponse.json({ ok: true, id: lead.id });
}
