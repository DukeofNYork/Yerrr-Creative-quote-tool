'use client';

import type { BusinessConfig } from '@/lib/engine/types';
import { btnDanger, btnGhost, Card, Field, inputCls, PanelHeader, slugify } from './ui';

export default function CatalogPanel({
  config, update,
}: { config: BusinessConfig; update: (c: BusinessConfig) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <PanelHeader
          title="Industries"
          sub="Top-level categories a customer chooses first."
          action={
            <button
              className={btnGhost}
              onClick={() => update({
                ...config,
                industries: [...config.industries, { id: slugify(`industry ${config.industries.length + 1}`), name: 'New industry' }],
              })}
            >
              + Add industry
            </button>
          }
        />
        <div className="flex flex-col gap-3">
          {config.industries.map((ind, i) => (
            <Card key={ind.id}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Field label="Name">
                    <input
                      className={inputCls}
                      value={ind.name}
                      onChange={e => update({
                        ...config,
                        industries: config.industries.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      })}
                    />
                  </Field>
                </div>
                <button
                  className={btnDanger}
                  onClick={() => update({ ...config, industries: config.industries.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <PanelHeader
          title="Services"
          sub="What customers can hire you for, within each industry."
          action={
            <button
              className={btnGhost}
              disabled={config.industries.length === 0}
              onClick={() => update({
                ...config,
                services: [...config.services, {
                  id: slugify(`service ${config.services.length + 1}`),
                  industryId: config.industries[0].id,
                  name: 'New service',
                }],
              })}
            >
              + Add service
            </button>
          }
        />
        <div className="flex flex-col gap-3">
          {config.services.map((svc, i) => (
            <Card key={svc.id}>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Name">
                  <input
                    className={inputCls}
                    value={svc.name}
                    onChange={e => update({
                      ...config,
                      services: config.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    })}
                  />
                </Field>
                <Field label="Industry">
                  <select
                    className={inputCls}
                    value={svc.industryId}
                    onChange={e => update({
                      ...config,
                      services: config.services.map((x, j) => (j === i ? { ...x, industryId: e.target.value } : x)),
                    })}
                  >
                    {config.industries.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </Field>
                <button
                  className={btnDanger}
                  onClick={() => update({ ...config, services: config.services.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
              <div className="mt-3">
                <Field label="Description" hint="Shown under the service name in the customer flow.">
                  <input
                    className={inputCls}
                    value={svc.description ?? ''}
                    onChange={e => update({
                      ...config,
                      services: config.services.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                    })}
                  />
                </Field>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
