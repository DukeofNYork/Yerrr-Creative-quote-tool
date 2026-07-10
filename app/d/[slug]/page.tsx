'use client';

import { useParams } from 'next/navigation';
import DiscoveryExperience from '@/app/discover/DiscoveryExperience';

/**
 * Canonical public discovery URL: /d/{slug}.
 * Renders the discovery experience against the workspace's PUBLISHED config.
 */
export default function SlugDiscover() {
  const params = useParams<{ slug: string }>();
  const raw = params?.slug;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  return <DiscoveryExperience slug={slug} />;
}
