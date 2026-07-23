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

function isAnswered(v: unknown): boolean {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

export function buildRationale(config: BusinessConfig, session: SessionAnswers, result: DiscoveryResult): Rationale {
  // Chips: the customer's actual selections (same derivation the flow trusts).
  const highlights = buildNotes(config, session)
    .filter(n => n.k !== 'BUSINESS' && n.k !== 'SERVICE')
    .map(n => n.v)
    .slice(0, 3);

  // Prose: topic phrases from answered questions that declare a rationaleLabel
  // (e.g. "production quality", "timeline") — always grammatical. When a config
  // hasn't authored labels, fall back to a clean generic lead; the chips still
  // carry the personalization.
  const topics = config.questions
    .filter(q => q.rationaleLabel?.trim() && isAnswered(session.answers[q.id]))
    .map(q => q.rationaleLabel!.trim())
    .slice(0, 3);

  const pkg = result.package.name;
  const summary = topics.length
    ? `Based on your ${humanList(topics)}, we believe the ${pkg} is the best fit for your goals.`
    : `Based on what you shared, we believe the ${pkg} is the best fit for your goals.`;

  return {
    summary,
    highlights,
    packageDescription: result.package.description?.trim() || undefined,
  };
}
