'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BusinessConfig } from '@/lib/engine/types';
import CatalogPanel from '@/components/admin/CatalogPanel';
import QuestionsPanel from '@/components/admin/QuestionsPanel';
import PackagesPanel from '@/components/admin/PackagesPanel';
import RulesPanel from '@/components/admin/RulesPanel';
import LeadsPanel from '@/components/admin/LeadsPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import { btnPrimary } from '@/components/admin/ui';

const BASE_TABS = [
  { id: 'catalog', label: 'Industries & services' },
  { id: 'questions', label: 'Questions' },
  { id: 'packages', label: 'Packages & estimates' },
  { id: 'rules', label: 'Business intelligence' },
  { id: 'leads', label: 'Leads' },
] as const;

const OWNER_EXTRA_TAB = { id: 'users', label: 'Users' } as const;

type TabId =
  | (typeof BASE_TABS)[number]['id']
  | typeof OWNER_EXTRA_TAB.id;

interface Me {
  id: string;
  username: string;
  role: 'owner' | 'user';
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [tab, setTab] = useState<TabId>('questions');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [workspace, setWorkspace] = useState<{ workspaceId: string; slug: string; publishedAt: string | null } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedFlash, setPublishedFlash] = useState(false);

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.json())
      .then(body => {
        if (body?.ok) setMe(body.user);
      });
    fetch('/api/config')
      .then(r => r.json())
      .then(body => {
        setConfig(body.config ?? body);
        if (body.workspace) setWorkspace(body.workspace);
      });
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

  async function publish() {
    setPublishing(true);
    const res = await fetch('/api/config/publish', { method: 'POST' });
    const body = await res.json();
    setPublishing(false);
    if (body.ok) {
      setWorkspace(w => (w ? { ...w, publishedAt: body.publishedAt } : w));
      setPublishedFlash(true);
      setTimeout(() => setPublishedFlash(false), 2500);
    }
  }

  if (!config) {
    return <main className="p-10 text-muted">Loading…</main>;
  }

  const tabs = me?.role === 'owner' ? [...BASE_TABS, OWNER_EXTRA_TAB] : BASE_TABS;
  const previewHref = '/discover?preview=1';
  const liveHref = workspace?.publishedAt ? `/d/${workspace.slug}` : null;
  const liveUrl =
    liveHref && typeof window !== 'undefined' ? `${window.location.origin}${liveHref}` : liveHref ?? '';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col gap-1 border-b border-line px-4 py-6 md:w-60 md:border-r md:border-b-0">
        <Link href="/" className="mb-4 flex items-center gap-2 px-3 text-xs font-medium tracking-widest text-muted uppercase">
          <span className="inline-block h-2 w-2 rounded-full bg-rec" />
          {config.business.name}
        </Link>
        <div className="flex gap-1 overflow-x-auto md:flex-col">
          {tabs.map(t => (
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
          <Link href={previewHref} className="px-3 text-sm text-muted underline underline-offset-4" target="_blank">
            Preview draft ↗
          </Link>
          {liveHref && (
            <Link href={liveHref} className="px-3 text-sm text-muted underline underline-offset-4" target="_blank">
              View live experience ↗
            </Link>
          )}
          <button className={btnPrimary} disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : savedFlash ? 'Saved ✓' : dirty ? 'Save changes' : 'All changes saved'}
          </button>
          <button
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line/40 disabled:opacity-50"
            disabled={dirty || publishing}
            onClick={publish}
            title={dirty ? 'Save your changes before publishing' : undefined}
          >
            {publishing ? 'Publishing…' : publishedFlash ? 'Published ✓' : workspace?.publishedAt ? 'Publish changes' : 'Publish'}
          </button>
          {me && (
            <div className="px-3 pt-2 text-xs text-muted">
              <div>Signed in as</div>
              <div className="mt-0.5 truncate text-ink">{me.username}</div>
              <div className="mt-0.5 uppercase tracking-widest">{me.role}</div>
            </div>
          )}
          <button onClick={signOut} className="px-3 text-left text-sm text-muted underline underline-offset-4">
            Sign out
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
        {liveHref && tab !== 'leads' && tab !== 'users' && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="mb-1 font-medium">Your published discovery link:</p>
            <div className="flex flex-wrap items-center gap-2 text-muted">
              <code className="rounded bg-line/40 px-2 py-1 text-ink">{liveUrl}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(liveUrl)}
                className="underline underline-offset-4 hover:text-ink"
              >
                Copy
              </button>
              <Link href={liveHref} target="_blank" className="underline underline-offset-4 hover:text-ink">
                Open ↗
              </Link>
            </div>
          </div>
        )}
        {!liveHref && tab !== 'leads' && tab !== 'users' && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            Publish your workspace to get a shareable discovery link.
          </div>
        )}
        {tab === 'catalog' && <CatalogPanel config={config} update={update} />}
        {tab === 'questions' && <QuestionsPanel config={config} update={update} />}
        {tab === 'packages' && <PackagesPanel config={config} update={update} />}
        {tab === 'rules' && <RulesPanel config={config} update={update} />}
        {tab === 'leads' && <LeadsPanel />}
        {tab === 'users' && me?.role === 'owner' && <UsersPanel />}
      </section>
    </main>
  );
}
