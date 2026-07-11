import type { BusinessConfig, DiscoveryResult, SessionAnswers } from '@/lib/engine/types';
import { buildNotes } from './notes';

/**
 * The "why this recommendation fits you" — a deterministic consultation-style
 * rationale. Composed ONLY from:
 *   - the customer's own answers (their selections)
 *   - the recommended package/service
 *   - the business owner's configured package description
 *
 * It NEVER exposes rule logic, scoring, calculations, or pricing internals — the
 * customer should simply understand why this fits them. No AI; pure templating.
 */
export interface Rationale {
  /** A consultation-tone summary sentence. */
  summary: string;
  /** The customer's key selections, for a "based on your answers" chip row. */
  highlights: string[];
  /** The owner-authored package positioning, shown as the "why it fits" detail. */
  packageDescription?: string;
}

function humanList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function buildRationale(config: BusinessConfig, session: SessionAnswers, result: DiscoveryResult): Rationale {
  // Reuse the same note derivation the flow already trusts; drop the meta rows.
  const highlights = buildNotes(config, session)
    .filter(n => n.k !== 'BUSINESS' && n.k !== 'SERVICE')
    .map(n => n.v)
    .slice(0, 3);

  const pkg = result.package.name;
  const summary = highlights.length
    ? `Based on your ${humanList(highlights.map(h => h.toLowerCase()))}, we recommend the ${pkg} as the strongest fit for your goals.`
    : `We recommend the ${pkg} as the strongest fit for what you shared.`;

  return {
    summary,
    highlights,
    packageDescription: result.package.description?.trim() || undefined,
  };
}
