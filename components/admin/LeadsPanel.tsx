'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/store';
import { Card, PanelHeader } from './ui';

export default function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(setLeads);
  }, []);

  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div>
      <PanelHeader title="Leads" sub="Every completed discovery session, newest first." />
      {!leads ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : leads.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No leads yet. Run a discovery session yourself to see one appear here — open <span className="font-medium text-ink">/discover</span> and complete the flow.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map(l => (
            <Card key={l.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">{l.contact.name || 'Unnamed'}</p>
                  <p className="text-sm text-muted">{l.contact.email}{l.contact.phone ? ` · ${l.contact.phone}` : ''}</p>
                </div>
                <p className="text-xs text-muted">{new Date(l.createdAt).toLocaleString()}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span className="text-muted">Package:</span> {l.result.packageName}</span>
                <span className="tabular-nums"><span className="text-muted">Estimate:</span> {money(l.result.estimate.min)} – {money(l.result.estimate.max)}</span>
                <span><span className="text-muted">Profile:</span> {l.result.profile.tierLabel}</span>
                <span className="tabular-nums"><span className="text-muted">Complexity:</span> {l.result.complexityScore}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
