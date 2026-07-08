'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { btnPrimary, inputCls } from '@/components/admin/ui';

export default function AdminSignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/admin/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, code }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok && body.ok) {
      router.replace('/admin');
      router.refresh();
    } else {
      setError(body.error ?? 'Signup failed.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Admin</p>
        <h1 className="font-display mt-2 text-2xl font-medium">Create an account</h1>
        <p className="mt-1 text-sm text-muted">
          Use the signup code you were given to create your own workspace.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          autoFocus
          autoComplete="username"
          className={inputCls}
          placeholder="Email"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          type="text"
          autoComplete="off"
          className={inputCls}
          placeholder="Signup code"
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        {error && <p className="text-sm text-rec">{error}</p>}
        <button type="submit" className={btnPrimary} disabled={submitting || !username || !password || !code}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/admin/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
