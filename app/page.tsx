import Link from 'next/link';
import { readConfig } from '@/lib/store';

export default async function Home() {
  const config = await readConfig();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="step-in mb-6 flex items-center gap-2.5 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
        <span className="rec-dot inline-block h-2 w-2 rounded-full bg-rec" />
        Discovery Engine
      </p>
      <h1 className="font-display step-in text-[2.6rem] leading-[1.1] font-medium">
        {config.business.name}
      </h1>
      <p className="step-in-1 mt-4 leading-relaxed text-ink-soft">
        One platform, two doors. Customers walk through discovery — you decide how it thinks.
      </p>
      <div className="step-in-1 mt-10 flex flex-col gap-3">
        <Link
          href="/discover"
          className="rounded-2xl bg-ink px-5 py-4 text-center font-medium text-surface transition hover:opacity-90"
        >
          Start a discovery session
        </Link>
        <Link
          href="/admin"
          className="rounded-2xl border border-line bg-surface px-5 py-4 text-center font-medium transition hover:border-ink"
        >
          Open the admin
        </Link>
      </div>
    </main>
  );
}
