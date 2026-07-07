'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BusinessConfig } from '@/lib/engine/types';
import CatalogPanel from '@/components/admin/CatalogPanel';
import QuestionsPanel from '@/components/admin/QuestionsPanel';
import PackagesPanel from '@/components/admin/PackagesPanel';
import RulesPanel from '@/components/admin/RulesPanel';
import LeadsPanel from '@/components/admin/LeadsPanel';
import { btnPrimary } from '@/components/admin/ui';

const TABS = [
  { id: 'catalog', label: 'Industries & services' },
  { id: 'questions', label: 'Questions' },
  { id: 'packages', label: 'Packages & estimates' },
  { id: 'rules', label: 'Business intelligence' },
  { id: 'leads', label: 'Leads' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [tab, setTab] = useState<TabId>('questions');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  const update = (c: BusinessConfig) => {
    setConfig(c);
    setDirty(true);
    setSavedFlash(false);
  };

  async function save() {
    if (!config) return;
    setSaving(true);
    setErrors([]);
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const body = await res.json();
    setSaving(false);
    if (body.ok) {
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } else {
      setErrors(body.errors ?? ['Save failed.']);
    }
  }

  if (!config) {
    return <main className="p-10 text-muted">Loading…</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col gap-1 border-b border-line px-4 py-6 md:w-60 md:border-r md:border-b-0">
        <Link href="/" className="mb-4 flex items-center gap-2 px-3 text-xs font-medium tracking-widest text-muted uppercase">
          <span className="inline-block h-2 w-2 rounded-full bg-rec" />
          {config.business.name}
        </Link>
        <div className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-ink text-surface' : 'text-ink-soft hover:bg-line/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 md:mt-auto">
          <Link href="/discover" className="px-3 text-sm text-muted underline underline-offset-4" target="_blank">
            Preview customer flow ↗
          </Link>
          <button className={btnPrimary} disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : savedFlash ? 'Saved ✓' : dirty ? 'Save changes' : 'All changes saved'}
          </button>
        </div>
      </aside>

      {/* Content */}
      <section className="flex-1 px-4 py-8 md:px-10">
        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-rec/40 bg-rec/5 p-4">
            <p className="mb-1 text-sm font-medium text-rec">Fix these before saving:</p>
            <ul className="list-inside list-disc text-sm text-rec">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
        {tab === 'catalog' && <CatalogPanel config={config} update={update} />}
        {tab === 'questions' && <QuestionsPanel config={config} update={update} />}
        {tab === 'packages' && <PackagesPanel config={config} update={update} />}
        {tab === 'rules' && <RulesPanel config={config} update={update} />}
        {tab === 'leads' && <LeadsPanel />}
      </section>
    </main>
  );
}
