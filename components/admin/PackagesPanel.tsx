'use client';

import { useState } from 'react';
import type { BusinessConfig, Package } from '@/lib/engine/types';
import {
  btnDanger, btnGhost, Card, CheckboxGroup, Field, inputCls, PanelHeader, slugify, StringListEditor,
} from './ui';

export default function PackagesPanel({
  config, update,
}: { config: BusinessConfig; update: (c: BusinessConfig) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const setPkg = (id: string, patch: Partial<Package>) =>
    update({ ...config, packages: config.packages.map(p => (p.id === id ? { ...p, ...patch } : p)) });

  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div>
      <PanelHeader
        title="Packages & estimate ranges"
        sub="The engine recommends the highest package whose complexity threshold the project meets."
        action={
          <button
            className={btnGhost}
            onClick={() => {
              const p: Package = {
                id: slugify(`package ${Date.now() % 10000}`),
                name: 'New package',
                description: '',
                deliverables: [],
                serviceIds: config.services.map(s => s.id),
                baseRange: { min: 1000, max: 2000 },
                complexityMin: 0,
                nextSteps: [],
              };
              update({ ...config, packages: [...config.packages, p] });
              setOpenId(p.id);
            }}
          >
            + Add package
          </button>
        }
      />
      <div className="flex flex-col gap-3">
        {[...config.packages].sort((a, b) => a.complexityMin - b.complexityMin).map(p => (
          <Card key={p.id}>
            <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {money(p.baseRange.min)} – {money(p.baseRange.max)} · complexity ≥ {p.complexityMin}
                </p>
              </div>
              <span className="text-muted">{openId === p.id ? '−' : '+'}</span>
            </button>

            {openId === p.id && (
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <input className={inputCls} value={p.name} onChange={e => setPkg(p.id, { name: e.target.value })} />
                  </Field>
                  <Field label="Minimum complexity score" hint="The project score needed to qualify for this package.">
                    <input className={inputCls} type="number" value={p.complexityMin} onChange={e => setPkg(p.id, { complexityMin: Number(e.target.value) })} />
                  </Field>
                </div>
                <Field label="Description">
                  <input className={inputCls} value={p.description} onChange={e => setPkg(p.id, { description: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Base range — low ($)">
                    <input className={inputCls} type="number" value={p.baseRange.min} onChange={e => setPkg(p.id, { baseRange: { ...p.baseRange, min: Number(e.target.value) } })} />
                  </Field>
                  <Field label="Base range — high ($)">
                    <input className={inputCls} type="number" value={p.baseRange.max} onChange={e => setPkg(p.id, { baseRange: { ...p.baseRange, max: Number(e.target.value) } })} />
                  </Field>
                </div>
                <Field label="Applies to services">
                  <CheckboxGroup
                    options={config.services.map(s => ({ id: s.id, label: s.name }))}
                    selected={p.serviceIds}
                    onChange={ids => setPkg(p.id, { serviceIds: ids })}
                  />
                </Field>
                <Field label="Deliverables">
                  <StringListEditor items={p.deliverables} onChange={deliverables => setPkg(p.id, { deliverables })} placeholder="e.g. 1 hero video + 3 social cutdowns" />
                </Field>
                <Field label="Next steps">
                  <StringListEditor items={p.nextSteps} onChange={nextSteps => setPkg(p.id, { nextSteps })} placeholder="e.g. Book a 20-minute discovery call" />
                </Field>
                <button className={`${btnDanger} self-start`} onClick={() => update({ ...config, packages: config.packages.filter(x => x.id !== p.id) })}>
                  Delete package
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
