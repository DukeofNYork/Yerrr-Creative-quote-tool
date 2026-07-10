'use client';

import DiscoveryExperience from './DiscoveryExperience';

/**
 * /discover — bare access (owner) and back-compat (?u=, ?preview=1).
 * The controller reads those query params; presentation is chosen by the seam.
 */
export default function DiscoverPage() {
  return <DiscoveryExperience />;
}
