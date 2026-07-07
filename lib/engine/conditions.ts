import type { Condition, SessionAnswers } from './types';

/** Extra context available to business rules (not to question branching) */
export interface RuleContext {
  profileTierId?: string;
  complexityScore?: number;
}

export function evaluate(
  cond: Condition,
  session: SessionAnswers,
  ctx: RuleContext = {}
): boolean {
  if (cond.all) return cond.all.every(c => evaluate(c, session, ctx));
  if (cond.any) return cond.any.some(c => evaluate(c, session, ctx));
  if (cond.not) return !evaluate(cond.not, session, ctx);

  const { questionId, op, value } = cond;

  // Context-based operators
  if (op === 'profileTier') return ctx.profileTierId === value;
  if (op === 'complexityGte') return (ctx.complexityScore ?? 0) >= Number(value);
  if (op === 'complexityLte') return (ctx.complexityScore ?? 0) <= Number(value);

  if (!questionId || !op) return false;

  // Special pseudo-questions so conditions can branch on industry/service
  const answer =
    questionId === '$industry' ? session.industryId :
    questionId === '$service' ? session.serviceId :
    session.answers[questionId];

  switch (op) {
    case 'answered': return answer !== undefined && answer !== null && answer !== '';
    case 'eq':       return answer === value;
    case 'neq':      return answer !== value;
    case 'in':       return Array.isArray(value) && value.includes(answer as never);
    case 'includes': return Array.isArray(answer) && (answer as unknown[]).includes(value);
    case 'gte':      return typeof answer === 'number' && answer >= Number(value);
    case 'lte':      return typeof answer === 'number' && answer <= Number(value);
    default:         return false;
  }
}
