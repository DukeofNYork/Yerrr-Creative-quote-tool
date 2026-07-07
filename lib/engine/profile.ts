import type { BusinessConfig, SessionAnswers } from './types';

/**
 * Client Profile Engine.
 * Reads indicator answers (business size, timeline, quality expectations, etc.),
 * converts them to weighted points, and buckets the total into a tier.
 * Never asks "what's your budget?" — it infers positioning.
 */
export function computeProfile(config: BusinessConfig, session: SessionAnswers) {
  let score = 0;
  for (const ind of config.profile.indicators) {
    const answer = session.answers[ind.questionId];
    if (answer === undefined || answer === null) continue;
    const values = Array.isArray(answer) ? answer : [answer];
    for (const v of values) {
      const pts = ind.pointsByValue[String(v)];
      if (pts !== undefined) score += pts * ind.weight;
    }
  }
  // Highest tier whose minScore we meet (tiers sorted ascending in config)
  const tiers = config.profile.tiers;
  let tier = tiers[0];
  for (const t of tiers) if (score >= t.minScore) tier = t;
  return { tierId: tier.id, tierLabel: tier.label, score };
}

/**
 * Project complexity score: sum of complexity points on chosen options,
 * multiplied by each question's weight. Drives base package selection.
 */
export function computeComplexity(config: BusinessConfig, session: SessionAnswers): number {
  let score = 0;
  for (const q of config.questions) {
    const answer = session.answers[q.id];
    if (answer === undefined || answer === null || !q.options) continue;
    const values = Array.isArray(answer) ? answer : [answer];
    for (const v of values) {
      const opt = q.options.find(o => o.value === v);
      if (opt?.complexity) score += opt.complexity * (q.weight ?? 1);
    }
  }
  return score;
}
