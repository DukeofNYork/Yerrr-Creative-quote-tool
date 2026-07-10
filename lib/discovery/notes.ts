import type { AnswerValue, BusinessConfig, Question, SessionAnswers } from '@/lib/engine/types';
import { visibleQuestions } from '@/lib/engine/flow';

export type Note = { k: string; v: string };

/** The running list of the customer's choices (Creative Studio's notebook page). */
export function buildNotes(config: BusinessConfig, session: SessionAnswers): Note[] {
  const notes: Note[] = [];
  if (config.industries.length > 1 && session.industryId) {
    const ind = config.industries.find(i => i.id === session.industryId);
    if (ind) notes.push({ k: 'BUSINESS', v: ind.name });
  }
  if (session.serviceId) {
    const svc = config.services.find(s => s.id === session.serviceId);
    if (svc) notes.push({ k: 'SERVICE', v: svc.name });
  }
  const visible = visibleQuestions(config, session);
  for (const q of visible) {
    if (!(q.id in session.answers)) continue;
    const v = session.answers[q.id];
    if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    const label = formatAnswer(q, v);
    if (!label) continue;
    notes.push({ k: noteKey(q), v: label });
  }
  return notes;
}

function noteKey(q: Question): string {
  return q.id.replace(/[_-]+/g, ' ').toUpperCase();
}

export function formatAnswer(q: Question, v: AnswerValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(val => optionLabel(q, val) ?? val).join(', ');
  if (typeof v === 'number') return String(v);
  const opt = optionLabel(q, v);
  return opt ?? String(v);
}

function optionLabel(q: Question, value: string): string | undefined {
  return q.options?.find(o => o.value === value)?.label;
}
