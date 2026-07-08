'use client';

import { useEffect, useState } from 'react';
import { Card, PanelHeader } from './ui';

interface UserRow {
  id: string;
  username: string;
  createdAt: string;
  leadCount: number;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(body => setUsers(body.users ?? []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div>
      <PanelHeader
        title="Users"
        sub="Everyone who has signed up with the signup code. Each account has its own workspace."
      />
      {!users ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : users.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No demo accounts yet. Share your signup code and the <span className="font-medium text-ink">/admin/signup</span> URL for people to create one.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map(u => {
            const shareUrl = `${origin}/discover?u=${u.id}`;
            return (
              <Card key={u.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <p className="text-xs text-muted">
                      Signed up {new Date(u.createdAt).toLocaleString()} · {u.leadCount} lead{u.leadCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted underline underline-offset-4 hover:text-ink"
                  >
                    Open their /discover ↗
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>Share link:</span>
                  <code className="rounded bg-line/40 px-2 py-1 text-ink">{shareUrl}</code>
                  <button
                    onClick={() => navigator.clipboard?.writeText(shareUrl)}
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    Copy
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
