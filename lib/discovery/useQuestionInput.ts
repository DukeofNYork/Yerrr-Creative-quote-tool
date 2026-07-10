'use client';

import { useState } from 'react';
import type { Question } from '@/lib/engine/types';

/**
 * Headless per-question input state, shared by every presentation so the ANSWER
 * VALUE a question produces is identical regardless of how it is rendered.
 *
 * Presentations own their own controls and their own submit timing (Creative
 * Studio auto-advances single selects; Basic Light uses an explicit Continue).
 * Single-choice / yes_no need no state here — their value is the clicked option.
 */
export function useQuestionInput(q: Question) {
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [num, setNum] = useState<number>(q.min ?? 0);

  const toggleMulti = (v: string) =>
    setMulti(m => (m.includes(v) ? m.filter(x => x !== v) : [...m, v]));

  return { multi, setMulti, toggleMulti, text, setText, num, setNum };
}
