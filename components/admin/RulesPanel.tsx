'use client';

import { useState } from 'react';
import type { BusinessConfig, BusinessRule, RuleEffect } from '@/lib/engine/types';
import { btnDanger, btnGhost, Card, Field, inputCls, PanelHeader, slugify } from './ui';

const EFFECT_TYPES = [
  { type: 'multiply', label: 'Adjust by percentage' },
  { type: 'add', label: 'Add / subtract amount' },
  { type: 'floor', label: 'Minimum estimate' },
  { type: 'ceiling', label: 'Maximum estimate' },
  { type: 'excludePackage', label: 'Never recommend package' },
  { type: 'forcePackage', label: 'Always recommend package' },
  { type: 'addDeliverable', label: 'Add a deliverable' },
  { type: 'addNextStep', label: 'Add a next step' },
] as const;

function describeEffect(e: RuleEffect, config: BusinessConfig): string {
  const pkg = (id: string) => config.packages.find(p => p.id === id)?.name ?? id;
  switch (e.type) {
    case 'multiply': return e.factor >= 1 ? `+${Math.round((e.factor - 1) * 100)}% estimate` : `−${Math.round((1 - e.factor) * 100)}% estimate`;
    case 'add': return e.amount >= 0 ? `+$${e.amount.toLocaleString()}` : `−$${Math.abs(e.amount).toLocaleString()}`;
    case 'floor': return `minimum $${e.amount.toLocaleString()}`;
    case 'ceiling': return `maximum $${e.amount.toLocaleString()}`;
    case 'excludePackage': return `never recommend ${pkg(e.packageId)}`;
    case 'forcePackage': return `always recommend ${pkg(e.packageId)}`;
    case 'addDeliverable': return `adds deliverable`;
    case 'addNextStep': return `adds next step`;
  }
}

export default function RulesPanel({
  config, update,
}: { config: BusinessConfig; update: (c: BusinessConfig) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const setRule = (id: string, patch: Partial<BusinessRule>) =>
    update({ ...config, rules: config.rules.map(r => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <div>
      <PanelHeader
        title="Business intelligence"
        sub="How you think, as rules. Hard limits (minimum/maximum) always win over percentage and dollar adjustments."
        action={
          <button
            className={btnGhost}
            onClick={() => {
              const r: BusinessRule = {
                id: slugify(`rule ${Date.now() % 10000}`),
                label: 'New rule',
                priority: (Math.max(0, ...config.rules.map(x => x.priority)) + 10),
                when: { questionId: config.questions[0]?.id ?? '', op: 'eq', value: '' },
                effect: { type: 'multiply', factor: 1.1 },
              };
              update({ ...config, rules: [...config.rules, r] });
              setOpenId(r.id);
            }}
          >
            + Add rule
          </button>
        }
      />
      <div className="flex flex-col gap-3">
        {[...config.rules].sort((a, b) => a.priority - b.priority).map(r => (
          <Card key={r.id}>
            <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="mt-0.5 text-xs text-muted">{describeEffect(r.effect, config)} · priority {r.priority}</p>
              </div>
              <span className="text-muted">{openId === r.id ? '−' : '+'}</span>
            </button>

            {openId === r.id && (
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <Field label="Rule name" hint="Shown in the audit trail when this rule fires.">
                    <input className={inputCls} value={r.label} onChange={e => setRule(r.id, { label: e.target.value })} />
                  </Field>
                  <Field label="Priority" hint="Lower runs first.">
                    <input className={inputCls} type="number" value={r.priority} onChange={e => setRule(r.id, { priority: Number(e.target.value) })} />
                  </Field>
                </div>

                <WhenEditor rule={r} config={config} setRule={setRule} />
                <EffectEditor rule={r} config={config} setRule={setRule} />

                <button className={`${btnDanger} self-start`} onClick={() => update({ ...config, rules: config.rules.filter(x => x.id !== r.id) })}>
                  Delete rule
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function WhenEditor({
  rule, config, setRule,
}: { rule: BusinessRule; config: BusinessConfig; setRule: (id: string, patch: Partial<BusinessRule>) => void }) {
  const w = rule.when;
  const simple = (w.questionId && w.op && !w.all && !w.any && !w.not) || w.op === 'profileTier' || w.op === 'complexityGte' || w.op === 'complexityLte';
  const [advanced, setAdvanced] = useState(!simple);
  const [draft, setDraft] = useState(() => JSON.stringify(w, null, 2));
  const [err, setErr] = useState('');

  const mode: 'question' | 'profile' | 'complexity' =
    w.op === 'profileTier' ? 'profile' : w.op === 'complexityGte' || w.op === 'complexityLte' ? 'complexity' : 'question';

  if (advanced) {
    return (
      <Field label="When (advanced)" hint="Full condition JSON — supports all / any / not nesting.">
        <textarea className={`${inputCls} min-h-32 font-mono text-xs`} value={draft} onChange={e => setDraft(e.target.value)} />
        {err && <p className="text-xs text-rec">{err}</p>}
        <button
          className={`${btnGhost} self-start`}
          onClick={() => {
            try { setRule(rule.id, { when: JSON.parse(draft) }); setErr(''); setAdvanced(false); }
            catch { setErr('Not valid JSON — check commas and quotes.'); }
          }}
        >
          Apply condition
        </button>
      </Field>
    );
  }

  return (
    <Field label="When">
      <div className="grid gap-2 sm:grid-cols-[130px_1fr_120px_1fr_auto]">
        <select
          className={inputCls}
          value={mode}
          onChange={e => {
            const m = e.target.value;
            if (m === 'profile') setRule(rule.id, { when: { op: 'profileTier', value: config.profile.tiers[0]?.id ?? '' } });
            else if (m === 'complexity') setRule(rule.id, { when: { op: 'complexityGte', value: 10 } });
            else setRule(rule.id, { when: { questionId: config.questions[0]?.id ?? '', op: 'eq', value: '' } });
          }}
        >
          <option value="question">Answer</option>
          <option value="profile">Client profile</option>
          <option value="complexity">Complexity</option>
        </select>

        {mode === 'question' && (
          <>
            <select className={inputCls} value={w.questionId ?? ''} onChange={e => setRule(rule.id, { when: { ...w, questionId: e.target.value } })}>
              {config.questions.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}
            </select>
            <select className={inputCls} value={w.op ?? 'eq'} onChange={e => setRule(rule.id, { when: { ...w, op: e.target.value as never } })}>
              {['eq', 'neq', 'includes', 'gte', 'lte', 'answered'].map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <ValueInput rule={rule} config={config} setRule={setRule} />
          </>
        )}

        {mode === 'profile' && (
          <select className={`${inputCls} sm:col-span-3`} value={String(w.value)} onChange={e => setRule(rule.id, { when: { ...w, value: e.target.value } })}>
            {config.profile.tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        )}

        {mode === 'complexity' && (
          <>
            <select className={`${inputCls} sm:col-span-2`} value={w.op} onChange={e => setRule(rule.id, { when: { ...w, op: e.target.value as never } })}>
              <option value="complexityGte">is at least</option>
              <option value="complexityLte">is at most</option>
            </select>
            <input className={inputCls} type="number" value={Number(w.value)} onChange={e => setRule(rule.id, { when: { ...w, value: Number(e.target.value) } })} />
          </>
        )}

        <button className={btnGhost} onClick={() => { setDraft(JSON.stringify(w, null, 2)); setAdvanced(true); }}>Advanced</button>
      </div>
    </Field>
  );
}

/** Value input that offers a dropdown of the selected question's options when available */
function ValueInput({
  rule, config, setRule,
}: { rule: BusinessRule; config: BusinessConfig; setRule: (id: string, patch: Partial<BusinessRule>) => void }) {
  const w = rule.when;
  const q = config.questions.find(x => x.id === w.questionId);
  if (q?.type === 'yes_no') {
    return (
      <select className={inputCls} value={String(w.value)} onChange={e => setRule(rule.id, { when: { ...w, value: e.target.value === 'true' } })}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (q?.options?.length && w.op !== 'gte' && w.op !== 'lte') {
    return (
      <select className={inputCls} value={String(w.value ?? '')} onChange={e => setRule(rule.id, { when: { ...w, value: e.target.value } })}>
        <option value="">Choose…</option>
        {q.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      className={inputCls}
      placeholder="value"
      value={String(w.value ?? '')}
      onChange={e => {
        const raw = e.target.value;
        const value = ['gte', 'lte'].includes(w.op ?? '') && raw !== '' && !isNaN(Number(raw)) ? Number(raw) : raw;
        setRule(rule.id, { when: { ...w, value } });
      }}
    />
  );
}

function EffectEditor({
  rule, config, setRule,
}: { rule: BusinessRule; config: BusinessConfig; setRule: (id: string, patch: Partial<BusinessRule>) => void }) {
  const e = rule.effect;

  const changeType = (type: RuleEffect['type']) => {
    const defaults: Record<RuleEffect['type'], RuleEffect> = {
      multiply: { type: 'multiply', factor: 1.1 },
      add: { type: 'add', amount: 500 },
      floor: { type: 'floor', amount: 5000 },
      ceiling: { type: 'ceiling', amount: 50000 },
      excludePackage: { type: 'excludePackage', packageId: config.packages[0]?.id ?? '' },
      forcePackage: { type: 'forcePackage', packageId: config.packages[0]?.id ?? '' },
      addDeliverable: { type: 'addDeliverable', text: '' },
      addNextStep: { type: 'addNextStep', text: '' },
    };
    setRule(rule.id, { effect: defaults[type] });
  };

  return (
    <Field label="Then">
      <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
        <select className={inputCls} value={e.type} onChange={ev => changeType(ev.target.value as RuleEffect['type'])}>
          {EFFECT_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>

        {e.type === 'multiply' && (
          <div className="flex items-center gap-2">
            <input
              className={`${inputCls} w-28`}
              type="number"
              value={Math.round((e.factor - 1) * 100)}
              onChange={ev => setRule(rule.id, { effect: { type: 'multiply', factor: 1 + Number(ev.target.value) / 100 } })}
            />
            <span className="text-sm text-muted">% (negative for a discount)</span>
          </div>
        )}
        {(e.type === 'add' || e.type === 'floor' || e.type === 'ceiling') && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">$</span>
            <input
              className={`${inputCls} w-36`}
              type="number"
              value={e.amount}
              onChange={ev => setRule(rule.id, { effect: { ...e, amount: Number(ev.target.value) } as RuleEffect })}
            />
          </div>
        )}
        {(e.type === 'excludePackage' || e.type === 'forcePackage') && (
          <select
            className={inputCls}
            value={e.packageId}
            onChange={ev => setRule(rule.id, { effect: { ...e, packageId: ev.target.value } as RuleEffect })}
          >
            {config.packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {(e.type === 'addDeliverable' || e.type === 'addNextStep') && (
          <input
            className={inputCls}
            placeholder="Text to add"
            value={e.text}
            onChange={ev => setRule(rule.id, { effect: { ...e, text: ev.target.value } as RuleEffect })}
          />
        )}
      </div>
    </Field>
  );
}
