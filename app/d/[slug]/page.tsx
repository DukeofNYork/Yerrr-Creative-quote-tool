'use client';

import { useParams } from 'next/navigation';
import DiscoverPage from '@/app/discover/page';

/**
 * Canonical public discovery URL: /d/{slug}.
 * Renders the discovery experience against the workspace's PUBLISHED config.
 */
export default function SlugDiscover() {
  const params = useParams<{ slug: string }>();
  const raw = params?.slug;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  return <DiscoverPage slug={slug} />;
}
