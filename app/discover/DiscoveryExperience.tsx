'use client';

import { useDiscoveryController } from '@/lib/discovery/useDiscoveryController';
import CreativeStudio from './presentations/creative-studio';
import Basic from './presentations/basic';

/**
 * The render seam: run the one shared controller, then pick a presentation from
 * the resolved style. Every presentation receives the same (vm, actions) — there
 * is exactly one flow and one engine path underneath.
 */
export default function DiscoveryExperience({ slug, preview }: { slug?: string; preview?: boolean } = {}) {
  const { vm, actions } = useDiscoveryController({ slug, preview });

  switch (vm.presentation.style) {
    case 'basic-light':
      return <Basic vm={vm} actions={actions} />;
    case 'creative-studio':
      return <CreativeStudio vm={vm} actions={actions} />;
    // 'basic-dark' | 'trades' | 'premium' | 'healthcare' land in later steps.
    default:
      // Until a style has a renderer, fall back to the flagship experience.
      return <CreativeStudio vm={vm} actions={actions} />;
  }
}
