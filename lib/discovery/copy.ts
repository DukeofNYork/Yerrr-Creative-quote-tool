import type { Presentation } from '@/lib/engine/types';

/** Resolved, always-present copy strings read by every presentation. */
export interface ResolvedCopy {
  industryPrompt: string;
  servicePrompt: string;
  contactPrompt: string;
  recommendationLabel: string;
  estimateLabel: string;
  nextStepsLabel: string;
  roleNoun: string;
}

/**
 * Defaults intentionally match the current hardcoded Creative Studio strings so
 * existing configs (no copy overrides) render identically. Presentations may add
 * their own additional fixed copy; these are the configurable ones.
 */
export const DEFAULT_COPY: ResolvedCopy = {
  industryPrompt: 'What kind of business are you looking for?',
  servicePrompt: 'What can we help you create?',
  contactPrompt: 'Where should we send your recommendation?',
  recommendationLabel: 'OUR RECOMMENDATION',
  estimateLabel: 'ESTIMATED INVESTMENT',
  nextStepsLabel: 'NEXT STEPS',
  roleNoun: 'producer',
};

/** Merge configured overrides over the defaults, ignoring empty/undefined values. */
export function resolveCopy(presentation?: Presentation): ResolvedCopy {
  const overrides = presentation?.copy ?? {};
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined && v !== ''),
  );
  return { ...DEFAULT_COPY, ...defined };
}
