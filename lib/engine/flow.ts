import type { BusinessConfig, Question, SessionAnswers } from './types';
import { evaluate } from './conditions';

const STAGE_ORDER = ['goals', 'discovery', 'outcomes', 'timeline', 'qualification', 'contact'] as const;

/**
 * All questions currently visible for this session, in order.
 * Visibility = scope match (industry/service) + showIf condition.
 * Because this is recomputed from answers every time, changing an earlier
 * answer automatically re-branches the rest of the flow.
 */
export function visibleQuestions(config: BusinessConfig, session: SessionAnswers): Question[] {
  return config.questions
    .filter(q => {
      if (q.industryIds?.length && (!session.industryId || !q.industryIds.includes(session.industryId))) return false;
      if (q.serviceIds?.length && (!session.serviceId || !q.serviceIds.includes(session.serviceId))) return false;
      if (q.showIf && !evaluate(q.showIf, session)) return false;
      return true;
    })
    .sort((a, b) =>
      STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.order - b.order
    );
}

/** The next unanswered visible question, or null when discovery is complete. */
export function nextQuestion(config: BusinessConfig, session: SessionAnswers): Question | null {
  for (const q of visibleQuestions(config, session)) {
    const answer = session.answers[q.id];
    const unanswered = answer === undefined || answer === null || answer === '';
    if (unanswered && q.required) return q;
    if (unanswered && !q.required && !(q.id in session.answers)) return q; // offer optional once
  }
  return null;
}

export function isComplete(config: BusinessConfig, session: SessionAnswers): boolean {
  return !!session.industryId && !!session.serviceId && nextQuestion(config, session) === null;
}

/** Progress for the frontend's progress bar. */
export function progress(config: BusinessConfig, session: SessionAnswers): { answered: number; total: number } {
  const visible = visibleQuestions(config, session);
  const answered = visible.filter(q => q.id in session.answers).length;
  return { answered, total: visible.length };
}
