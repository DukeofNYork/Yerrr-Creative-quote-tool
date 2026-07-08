'use client';

import { useState } from 'react';
import type { BusinessConfig, Question, QuestionType } from '@/lib/engine/types';
import {
  btnDanger, btnGhost, Card, CheckboxGroup, Field, inputCls, PanelHeader, slugify, StringListEditor,
} from './ui';
import type { QuestionOption } from '@/lib/engine/types';

const TYPES: QuestionType[] = [
  'multiple_choice', 'multi_select', 'yes_no', 'dropdown', 'slider',
  'text', 'number', 'date', 'rating', 'upload',
];
const STAGES = ['goals', 'discovery', 'outcomes', 'timeline', 'qualification'] as const;
const HAS_OPTIONS: QuestionType[] = ['multiple_choice', 'multi_select', 'dropdown'];

export default function QuestionsPanel({
  config, update,
}: { config: BusinessConfig; update: (c: BusinessConfig) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const setQuestion = (id: string, patch: Partial<Question>) =>
    update({ ...config, questions: config.questions.map(q => (q.id === id ? { ...q, ...patch } : q)) });

  const addQuestion = () => {
    const q: Question = {
      id: slugify(`question ${Date.now() % 10000}`),
      type: 'multiple_choice',
      text: 'New question',
      required: true,
      stage: 'discovery',
      order: config.questions.length + 1,
      options: [{ value: 'option_1', label: 'Option 1' }],
    };
    update({ ...config, questions: [...config.questions, q] });
    setOpenId(q.id);
  };

  const sorted = [...config.questions].sort(
    (a, b) => STAGES.indexOf(a.stage as never) - STAGES.indexOf(b.stage as never) || a.order - b.order
  );

  return (
    <div>
      <PanelHeader
        title="Questions"
        sub="What customers are asked, in stage order. Click a question to edit it."
        action={<button className={btnGhost} onClick={addQuestion}>+ Add question</button>}
      />
      <div className="flex flex-col gap-3">
        {sorted.map(q => (
          <Card key={q.id}>
            <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenId(openId === q.id ? null : q.id)}>
              <div>
                <p className="font-medium">{q.text}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {q.stage} · {q.type.replace('_', ' ')} · {q.required ? 'required' : 'optional'}
                  {q.serviceIds?.length ? ` · ${q.serviceIds.join(', ')}` : ''}
                  {q.showIf ? ' · conditional' : ''}
                </p>
              </div>
              <span className="text-muted">{openId === q.id ? '−' : '+'}</span>
            </button>

            {openId === q.id && (
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
                <Field label="Question text">
                  <input className={inputCls} value={q.text} onChange={e => setQuestion(q.id, { text: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Type">
                    <select className={inputCls} value={q.type} onChange={e => setQuestion(q.id, { type: e.target.value as QuestionType })}>
                      {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </Field>
                  <Field label="Stage">
                    <select className={inputCls} value={q.stage} onChange={e => setQuestion(q.id, { stage: e.target.value as Question['stage'] })}>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Order in stage">
                    <input className={inputCls} type="number" value={q.order} onChange={e => setQuestion(q.id, { order: Number(e.target.value) })} />
                  </Field>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={q.required} onChange={e => setQuestion(q.id, { required: e.target.checked })} />
                    Required
                  </label>
                  <Field label="Complexity weight">
                    <input className={`${inputCls} w-24`} type="number" step="0.5" value={q.weight ?? 1} onChange={e => setQuestion(q.id, { weight: Number(e.target.value) })} />
                  </Field>
                </div>

                {HAS_OPTIONS.includes(q.type) && (
                  <Field label="Options" hint="Complexity points feed the project score. Add a description or preview bullets to make the option expandable in the customer flow.">
                    <div className="flex flex-col gap-3">
                      {(q.options ?? []).map((o, i) => {
                        const patch = (next: Partial<QuestionOption>) => {
                          const options = (q.options ?? []).map((x, j) => (j === i ? { ...x, ...next } : x));
                          setQuestion(q.id, { options });
                        };
                        return (
                          <div key={i} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
                            <div className="grid grid-cols-[1fr_90px_32px] gap-2">
                              <input
                                className={inputCls}
                                placeholder="Option label"
                                value={o.label}
                                onChange={e => patch({ label: e.target.value, value: o.value || slugify(e.target.value) })}
                              />
                              <input
                                className={inputCls}
                                type="number"
                                placeholder="Complexity"
                                value={o.complexity ?? 0}
                                onChange={e => patch({ complexity: Number(e.target.value) })}
                              />
                              <button
                                className={btnDanger}
                                aria-label="Remove option"
                                onClick={() => setQuestion(q.id, { options: (q.options ?? []).filter((_, j) => j !== i) })}
                              >
                                ✕
                              </button>
                            </div>
                            <Field label="Expanded description" hint="Optional. Shown when the customer taps to expand this option.">
                              <textarea
                                className={`${inputCls} min-h-20`}
                                placeholder="What does picking this option mean? What will they get?"
                                value={o.description ?? ''}
                                onChange={e => patch({ description: e.target.value || undefined })}
                              />
                            </Field>
                            <Field label="Preview title" hint="Optional. Small heading shown above the preview bullets, e.g. “You'll get”.">
                              <input
                                className={inputCls}
                                placeholder="You'll get"
                                value={o.previewTitle ?? ''}
                                onChange={e => patch({ previewTitle: e.target.value || undefined })}
                              />
                            </Field>
                            <Field label="Preview bullets" hint="Optional. Short bullets that give a taste of what's included.">
                              <StringListEditor
                                items={o.previewBullets ?? []}
                                onChange={items => patch({ previewBullets: items.length ? items : undefined })}
                                placeholder="e.g. Two-hour production block"
                              />
                            </Field>
                          </div>
                        );
                      })}
                      <button
                        className={`${btnGhost} self-start`}
                        onClick={() => setQuestion(q.id, {
                          options: [...(q.options ?? []), { value: slugify(`option ${(q.options?.length ?? 0) + 1}`), label: `Option ${(q.options?.length ?? 0) + 1}` }],
                        })}
                      >
                        + Add option
                      </button>
                    </div>
                  </Field>
                )}

                {(q.type === 'slider' || q.type === 'number') && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Min"><input className={inputCls} type="number" value={q.min ?? 0} onChange={e => setQuestion(q.id, { min: Number(e.target.value) })} /></Field>
                    <Field label="Max"><input className={inputCls} type="number" value={q.max ?? 10} onChange={e => setQuestion(q.id, { max: Number(e.target.value) })} /></Field>
                  </div>
                )}

                <Field label="Show only for services" hint="Leave all unselected to show for every service.">
                  <CheckboxGroup
                    options={config.services.map(s => ({ id: s.id, label: s.name }))}
                    selected={q.serviceIds ?? []}
                    onChange={ids => setQuestion(q.id, { serviceIds: ids.length ? ids : undefined })}
                  />
                </Field>

                <ConditionEditor q={q} config={config} setQuestion={setQuestion} />

                <button className={`${btnDanger} self-start`} onClick={() => update({ ...config, questions: config.questions.filter(x => x.id !== q.id) })}>
                  Delete question
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Simple one-clause condition builder with an advanced JSON escape hatch */
function ConditionEditor({
  q, config, setQuestion,
}: { q: Question; config: BusinessConfig; setQuestion: (id: string, patch: Partial<Question>) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => (q.showIf ? JSON.stringify(q.showIf, null, 2) : ''));
  const [jsonError, setJsonError] = useState('');

  const simple = q.showIf && q.showIf.questionId && q.showIf.op && !q.showIf.all && !q.showIf.any && !q.showIf.not;

  return (
    <Field label="Show only if (branching)" hint="Optional. The question appears only when the condition is true.">
      {!advanced && (simple || !q.showIf) ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
          <select
            className={inputCls}
            value={q.showIf?.questionId ?? ''}
            onChange={e => setQuestion(q.id, {
              showIf: e.target.value ? { questionId: e.target.value, op: q.showIf?.op ?? 'eq', value: q.showIf?.value ?? '' } : undefined,
            })}
          >
            <option value="">Always show</option>
            {config.questions.filter(x => x.id !== q.id).map(x => <option key={x.id} value={x.id}>{x.text}</option>)}
          </select>
          {q.showIf && (
            <>
              <select
                className={inputCls}
                value={q.showIf.op}
                onChange={e => setQuestion(q.id, { showIf: { ...q.showIf!, op: e.target.value as never } })}
              >
                {['eq', 'neq', 'includes', 'gte', 'lte', 'answered'].map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <input
                className={inputCls}
                placeholder="value"
                value={String(q.showIf.value ?? '')}
                onChange={e => {
                  const raw = e.target.value;
                  const value = raw === 'true' ? true : raw === 'false' ? false : raw !== '' && !isNaN(Number(raw)) && ['gte', 'lte'].includes(q.showIf!.op!) ? Number(raw) : raw;
                  setQuestion(q.id, { showIf: { ...q.showIf!, value } });
                }}
              />
            </>
          )}
          <button className={btnGhost} onClick={() => { setAdvanced(true); setJsonDraft(q.showIf ? JSON.stringify(q.showIf, null, 2) : '{\n  "all": []\n}'); }}>
            Advanced
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            className={`${inputCls} min-h-32 font-mono text-xs`}
            value={jsonDraft}
            onChange={e => setJsonDraft(e.target.value)}
          />
          {jsonError && <p className="text-xs text-rec">{jsonError}</p>}
          <div className="flex gap-2">
            <button
              className={btnGhost}
              onClick={() => {
                if (!jsonDraft.trim()) { setQuestion(q.id, { showIf: undefined }); setAdvanced(false); setJsonError(''); return; }
                try {
                  setQuestion(q.id, { showIf: JSON.parse(jsonDraft) });
                  setJsonError('');
                  setAdvanced(false);
                } catch {
                  setJsonError('Not valid JSON — check commas and quotes.');
                }
              }}
            >
              Apply condition
            </button>
            <button className={btnDanger} onClick={() => { setQuestion(q.id, { showIf: undefined }); setAdvanced(false); setJsonError(''); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </Field>
  );
}
