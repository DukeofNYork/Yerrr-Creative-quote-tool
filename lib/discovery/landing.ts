import type { Presentation } from '@/lib/engine/types';

/** Landing content with every field guaranteed present (defaults from the business). */
export interface ResolvedLanding {
  heroTitle: string;
  subtitle: string;
  description: string;
  receiveBullets: string[];
  estimatedTime: string;
  ctaText: string;
  heroImageUrl?: string;
}

/**
 * Landing is default-on. When a workspace hasn't customized it, generate a clean,
 * professional page from the business name + generic messaging.
 */
export function resolveLanding(presentation: Presentation | undefined, businessName: string): ResolvedLanding {
  const l = presentation?.landing ?? {};
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    // The business name/logo is the wordmark; heroTitle is the headline.
    heroTitle: clean(l.heroTitle) ?? 'Let’s learn about your project.',
    subtitle: clean(l.subtitle) ?? '',
    description:
      clean(l.description) ??
      'Answer a few quick questions and we’ll recommend the right fit and share a rough estimate.',
    receiveBullets: (l.receiveBullets ?? []).filter(b => b && b.trim()),
    estimatedTime: clean(l.estimatedTime) ?? 'About 2 minutes',
    ctaText: clean(l.ctaText) ?? 'Start',
    heroImageUrl: clean(l.heroImageUrl),
  };
}
