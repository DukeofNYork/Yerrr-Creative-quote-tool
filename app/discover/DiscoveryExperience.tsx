'use client';

import { useDiscoveryController } from '@/lib/discovery/useDiscoveryController';
import CreativeStudio from './presentations/creative-studio';

/**
 * The render seam: run the one shared controller, then pick a presentation from
 * the resolved style. Every presentation receives the same (vm, actions) — there
 * is exactly one flow and one engine path underneath.
 */
export default function DiscoveryExperience({ slug, preview }: { slug?: string; preview?: boolean } = {}) {
  const { vm, actions } = useDiscoveryController({ slug, preview });

  switch (vm.presentation.style) {
    case 'creative-studio':
      return <CreativeStudio vm={vm} actions={actions} />;
    // 'basic-light' | 'basic-dark' | 'trades' | 'premium' | 'healthcare' land in later steps.
    default:
      // Until a style has a renderer, fall back to the only built experience.
      return <CreativeStudio vm={vm} actions={actions} />;
  }
}
