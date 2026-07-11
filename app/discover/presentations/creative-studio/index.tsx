'use client';

import { useMemo, useState } from 'react';
import type { AnswerValue, DiscoveryResult, Question, QuestionOption } from '@/lib/engine/types';
import { DeskScene, DeskFrame } from '../../DeskScene';
import { money, pad } from '@/lib/discovery/format';
import { AUTO_ADVANCE_MS } from '@/lib/discovery/constants';
import { useQuestionInput } from '@/lib/discovery/useQuestionInput';
import type { Note } from '@/lib/discovery/notes';
import type { ResolvedCopy } from '@/lib/discovery/copy';
import type { ResolvedLanding } from '@/lib/discovery/landing';
import type { Rationale } from '@/lib/discovery/rationale';
import type { PresentationProps } from '@/lib/discovery/types';

const mono = 'ui-monospace, Menlo, monospace';

/**
 * Creative Studio — the flagship immersive notebook experience.
 * A pure view over the discovery view-model; contains no business logic.
 */
export default function CreativeStudio({ vm, actions }: PresentationProps) {
  if (vm.phase === 'unpublished') {
    return <Stage><CenterMessage>This discovery experience isn’t published yet.</CenterMessage></Stage>;
  }
  if (!vm.config || vm.phase === 'loading') {
    return <Stage><CenterMessage>Loading…</CenterMessage></Stage>;
  }

  const { phase, session, current, contact, result, rationale, notes, progress, canGoBack, stepKey, copy, businessName, landing } = vm;
  const showHeader = phase !== 'landing' && phase !== 'done';

  return (
    <Stage>
      <Notebook business={businessName} notes={notes} showNextSteps={phase === 'result' || phase === 'contact'}>
        {showHeader && (
          <RightPageHeader
            counter={`${pad(progress.currentStep)} / ${pad(progress.totalSteps)}`}
            progressPct={progress.pct}
            canGoBack={canGoBack}
            onBack={actions.back}
          />
        )}
        <div key={stepKey} className="page-in flex min-h-0 flex-1 flex-col">
          {phase === 'landing' && <LandingStep landing={landing} onStart={actions.start} />}

          {phase === 'industry' && (
            <ChoiceStep
              title={copy.industryPrompt}
              prompt="Pick the closest match to get started."
              options={vm.industries.map(i => ({ key: i.key, label: i.label }))}
              onPick={id => { actions.selectIndustry(id); setTimeout(actions.advance, AUTO_ADVANCE_MS); }}
              selected={session.industryId}
            />
          )}

          {phase === 'service' && (
            <ChoiceStep
              title={copy.servicePrompt}
              prompt="Choose whichever feels closest — we'll refine together."
              options={vm.services}
              onPick={id => { actions.selectService(id); setTimeout(actions.advance, AUTO_ADVANCE_MS); }}
              selected={session.serviceId}
            />
          )}

          {phase === 'questions' && current && (
            <QuestionStep
              key={current.id}
              q={current}
              onAnswer={v => actions.answer(current, v)}
              onSkip={!current.required ? () => actions.skip(current) : undefined}
            />
          )}

          {phase === 'result' && (
            <ResultStep result={result} rationale={rationale} copy={copy} onContinue={actions.continueToContact} />
          )}

          {phase === 'contact' && (
            <ContactStep contact={contact} setContact={actions.setContact} onSubmit={actions.submitContact} />
          )}

          {phase === 'done' && (
            <DoneStep businessName={businessName} name={contact.name} onRestart={actions.restart} />
          )}
        </div>
      </Notebook>
    </Stage>
  );
}

function LandingStep({ landing, onStart }: { landing: ResolvedLanding; onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="font-display" style={{ fontWeight: 600, fontSize: 'clamp(24px, 5.5vw, 30px)', lineHeight: 1.12, color: 'var(--ink)', margin: '8px 0 0' }}>
        {landing.heroTitle}
      </h2>
      {landing.subtitle && (
        <p className="font-display" style={{ fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', marginTop: 8 }}>{landing.subtitle}</p>
      )}
      <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>{landing.description}</p>
      {landing.receiveBullets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16 }}>
          {landing.receiveBullets.map(b => (
            <div key={b} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.45, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--muted)' }}>—</span><span>{b}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)', marginTop: 16 }}>
        ⏱ {landing.estimatedTime.toUpperCase()}
      </div>
      <div className="mt-auto pt-5">
        <ContinueButton enabled onClick={onStart}>{landing.ctaText}</ContinueButton>
      </div>
    </div>
  );
}

function DoneStep({ businessName, name, onRestart }: { businessName: string; name: string; onRestart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.18em', color: 'var(--rec)' }}>● THANK YOU</div>
      <h2 className="font-display" style={{ fontWeight: 600, fontSize: 'clamp(22px, 5vw, 28px)', color: 'var(--ink)', margin: '10px 0 0' }}>
        Thanks{name ? `, ${name.split(' ')[0]}` : ''}.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
        We’ve got your details and your recommendation. Someone from {businessName} will follow up shortly to continue the conversation.
      </p>
      <button onClick={onRestart} className="mt-4 self-start cursor-pointer border-0 bg-transparent p-0 underline" style={{ fontFamily: 'inherit', fontSize: 12, color: 'var(--muted)' }}>
        Start over
      </button>
    </div>
  );
}

/* ─────────── Layout: desk stage ─────────── */

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="desk-wood relative min-h-screen w-full overflow-hidden">
      <DeskScene />
      <DeskFrame />
      <div className="relative flex min-h-screen items-center justify-center p-3 md:p-10">
        {children}
      </div>
    </main>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-ink bg-paper px-6 py-4" style={{ boxShadow: '16px 18px 0 rgba(96,53,16,.4)' }}>
      <p className="text-muted">{children}</p>
    </div>
  );
}

/* ─────────── Notebook ─────────── */

function Notebook({
  business,
  notes,
  showNextSteps,
  children,
}: {
  business: string;
  notes: Note[];
  showNextSteps: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="notebook-shell relative flex w-full max-w-[800px] flex-col overflow-hidden rounded-md border-2 border-ink bg-paper md:h-[598px] md:min-h-0 md:flex-row">
      <LeftPage business={business} notes={notes} showNextSteps={showNextSteps} />
      <div aria-hidden className="hidden w-[2px] shrink-0 md:block" style={{ background: 'rgba(26,22,17,.25)' }} />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-paper px-6 py-6 md:px-9 md:py-7">
        {children}
      </div>
    </div>
  );
}

function LeftPage({ business, notes, showNextSteps }: { business: string; notes: Note[]; showNextSteps: boolean }) {
  const sessionLabel = useMemo(() => {
    const d = new Date();
    return `SESSION · ${d.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
  }, []);
  return (
    <div className="notebook-lines hidden flex-1 flex-col overflow-hidden bg-paper px-8 py-7 md:flex" style={{ minWidth: 0 }}>
      <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--muted)' }}>
        {business.toUpperCase()} — PROJECT NOTES
      </div>
      <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--faint)', marginTop: 6 }}>
        {sessionLabel}
      </div>
      {notes.length === 0 && (
        <div className="font-display" style={{ fontStyle: 'italic', fontSize: '15px', color: 'var(--faint)', marginTop: 28 }}>
          Your choices will be noted here as we plan.
        </div>
      )}
      {notes.map((n, i) => (
        <div key={`${n.k}-${i}`} style={{ marginTop: 17 }}>
          <div style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--muted)' }}>{n.k}</div>
          <div className="font-display" style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--ink)', marginTop: 2, lineHeight: 1.35 }}>
            {n.v}
          </div>
        </div>
      ))}
      {showNextSteps && (
        <div style={{ marginTop: 26, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--muted)' }}>
            NEXT STEPS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontSize: '12.5px', lineHeight: 1.45, color: 'var(--ink)' }}>
            {['We review these notes together', 'A producer calls within one business day', 'You receive the full proposal and dates'].map((t, i) => (
              <div key={t} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontFamily: mono, color: 'var(--muted)' }}>{pad(i + 1)}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RightPageHeader({
  counter,
  progressPct,
  canGoBack,
  onBack,
}: {
  counter: string;
  progressPct: number;
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="rec-dot inline-block h-[9px] w-[9px] rounded-full" style={{ background: 'var(--rec)' }} />
        <span style={{ fontFamily: mono, fontSize: '10.5px', letterSpacing: '.16em', color: 'var(--rec)' }}>REC</span>
        <span className="flex-1" />
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '.12em', color: 'var(--muted)' }} className="tabular-nums">
          {counter}
        </span>
      </div>
      <div className="mt-3 mb-1 h-[2px] overflow-hidden rounded-[1px]" style={{ background: 'var(--line)' }}>
        <div className="h-full transition-[width] duration-500 ease-out" style={{ background: 'var(--rec)', width: `${progressPct}%` }} />
      </div>
      <div className="h-5">
        {canGoBack && (
          <button onClick={onBack} className="cursor-pointer border-0 bg-transparent p-0 text-muted transition hover:text-ink" style={{ fontSize: '12px' }}>
            ← Back
          </button>
        )}
      </div>
    </>
  );
}

/* ─────────── Step content ─────────── */

function StepTitle({ title, prompt }: { title: string; prompt?: string }) {
  return (
    <>
      <h2 className="font-display" style={{ fontWeight: 600, fontSize: 'clamp(21px, 4.6vw, 26px)', lineHeight: 1.16, color: 'var(--ink)', margin: '10px 0 6px' }}>
        {title}
      </h2>
      {prompt && <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 14px' }}>{prompt}</p>}
    </>
  );
}

function ChoiceStep({
  title,
  prompt,
  options,
  onPick,
  selected,
}: {
  title: string;
  prompt?: string;
  options: { key: string; label: string; desc?: string }[];
  onPick: (key: string) => void;
  selected?: string;
}) {
  return (
    <>
      <StepTitle title={title} prompt={prompt} />
      <div className="flex flex-col gap-1.5">
        {options.map(o => (
          <ChoiceRow key={o.key} label={o.label} desc={o.desc} selected={selected === o.key} onClick={() => onPick(o.key)} />
        ))}
      </div>
    </>
  );
}

function ChoiceRow({
  label,
  desc,
  selected,
  onClick,
}: {
  label: string;
  desc?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer text-left transition-[transform] active:translate-y-px"
      style={{
        display: 'block',
        width: '100%',
        padding: '11px 14px',
        borderRadius: '4px',
        border: selected ? '2px solid var(--ink)' : '2px solid transparent',
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        boxShadow: selected ? '3px 3px 0 rgba(26,22,17,.18)' : 'inset 0 -1px 0 var(--line)',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: '15px', fontWeight: 600, display: 'block' }}>{label}</span>
      {desc && (
        <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 400, color: selected ? '#C9C1B4' : 'var(--muted)', marginTop: 2 }}>
          {desc}
        </span>
      )}
    </button>
  );
}

function hasPreview(o: QuestionOption): boolean {
  return !!(o.description?.trim() || (o.previewBullets && o.previewBullets.some(b => b.trim())));
}

function ExpandableChoiceRow({
  option,
  selected,
  expanded,
  onToggle,
  onSelect,
}: {
  option: QuestionOption;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const active = selected || expanded;
  const softColor = selected ? '#C9C1B4' : 'var(--muted)';
  return (
    <div
      style={{
        borderRadius: 4,
        border: active ? '2px solid var(--ink)' : '2px solid transparent',
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        boxShadow: active ? '3px 3px 0 rgba(26,22,17,.18)' : 'inset 0 -1px 0 var(--line)',
        overflow: 'hidden',
        transition: 'border-color .15s ease',
      }}
    >
      <button
        onClick={onToggle}
        className="cursor-pointer text-left transition-[transform] active:translate-y-px"
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'transparent', color: 'inherit', border: 'none', fontFamily: 'inherit' }}
        aria-expanded={expanded}
      >
        <span style={{ flex: 1, fontSize: '15px', fontWeight: 600 }}>{option.label}</span>
        <span style={{ fontFamily: mono, fontSize: '13px', opacity: 0.55 }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {option.description && (
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '4px 0 0', color: softColor }}>{option.description}</p>
          )}
          {option.previewBullets && option.previewBullets.some(b => b.trim()) && (
            <>
              {option.previewTitle && (
                <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: softColor, marginTop: 14, marginBottom: 6, textTransform: 'uppercase' }}>
                  {option.previewTitle}
                </div>
              )}
              <ul style={{ margin: option.previewTitle ? 0 : '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {option.previewBullets.filter(b => b.trim()).map((b, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: '13px', lineHeight: 1.45 }}>
                    <span style={{ color: softColor }}>—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            onClick={onSelect}
            className="cursor-pointer transition-[transform] active:translate-y-px"
            style={{ marginTop: 14, padding: '9px 18px', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: selected ? 'var(--paper)' : 'var(--ink)', color: selected ? 'var(--ink)' : 'var(--paper)', boxShadow: '3px 3px 0 rgba(26,22,17,.2)' }}
          >
            Select this
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────── Question renderer ─────────── */

function QuestionStep({ q, onAnswer, onSkip }: {
  q: Question;
  onAnswer: (v: AnswerValue) => void;
  onSkip?: () => void;
}) {
  return (
    <>
      <StepTitle title={q.text} prompt={q.helpText} />
      <QuestionInput q={q} onAnswer={onAnswer} />
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-2 self-start cursor-pointer border-0 bg-transparent p-0 text-muted underline underline-offset-4 transition hover:text-ink"
          style={{ fontSize: '12px' }}
        >
          Skip this question
        </button>
      )}
    </>
  );
}

function QuestionInput({ q, onAnswer }: { q: Question; onAnswer: (v: AnswerValue) => void }) {
  const { multi, toggleMulti, text, setText, num, setNum } = useQuestionInput(q);
  const [selected, setSelected] = useState<string | number | boolean | null>(null);
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  const pickAuto = (v: AnswerValue, marker: string | number | boolean) => {
    setSelected(marker);
    window.setTimeout(() => onAnswer(v), AUTO_ADVANCE_MS);
  };

  switch (q.type) {
    case 'multiple_choice':
    case 'dropdown':
      return (
        <div className="flex flex-col gap-1.5">
          {q.options?.map(o => (
            hasPreview(o) ? (
              <ExpandableChoiceRow
                key={o.value}
                option={o}
                selected={selected === o.value}
                expanded={expandedValue === o.value}
                onToggle={() => setExpandedValue(v => (v === o.value ? null : o.value))}
                onSelect={() => pickAuto(o.value, o.value)}
              />
            ) : (
              <ChoiceRow key={o.value} label={o.label} selected={selected === o.value} onClick={() => pickAuto(o.value, o.value)} />
            )
          ))}
        </div>
      );

    case 'yes_no':
      return (
        <div className="flex flex-col gap-1.5">
          <ChoiceRow label="Yes" selected={selected === true} onClick={() => pickAuto(true, true)} />
          <ChoiceRow label="No" selected={selected === false} onClick={() => pickAuto(false, false)} />
        </div>
      );

    case 'multi_select':
      return (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.options?.map(o => (
              <CheckboxChip key={o.value} label={o.label} checked={multi.includes(o.value)} onClick={() => toggleMulti(o.value)} />
            ))}
          </div>
          <StepFooter caption="Select at least one" enabled={multi.length > 0 || !q.required} onContinue={() => onAnswer(multi)} />
        </>
      );

    case 'rating':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <DayCircle key={n} n={n} selected={selected === n} onClick={() => pickAuto(n, n)} />
            ))}
          </div>
        </div>
      );

    case 'slider':
    case 'number': {
      const lo = q.min ?? 1;
      const hi = q.max ?? 10;
      const asCircles = q.type === 'slider' && hi - lo <= 9;
      if (asCircles) {
        const nums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
        return (
          <>
            <div className="flex flex-wrap gap-[7px]">
              {nums.map(n => (
                <DayCircle key={n} n={n} selected={num === n} onClick={() => setNum(n)} />
              ))}
            </div>
            <div className="font-display mt-3" style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--muted)' }}>
              {num > 0 ? `${num}${labelSuffix(q)}` : 'Tap a number'}
            </div>
            <StepFooter enabled={num > 0} onContinue={() => onAnswer(num)} />
          </>
        );
      }
      return (
        <div className="flex flex-col gap-5">
          <p className="font-display text-center tabular-nums" style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1 }}>
            {num}
          </p>
          {q.type === 'slider' ? (
            <input type="range" min={lo} max={hi} value={num} onChange={e => setNum(Number(e.target.value))} className="w-full" style={{ accentColor: 'var(--ink)' }} />
          ) : (
            <UnderlineInput type="number" value={String(num)} onChange={v => setNum(Number(v))} placeholder="" />
          )}
          <StepFooter enabled onContinue={() => onAnswer(num)} />
        </div>
      );
    }

    case 'date':
      return (
        <>
          <UnderlineInput type="date" value={text} onChange={setText} placeholder="" />
          <StepFooter enabled={!!text || !q.required} onContinue={() => onAnswer(text)} />
        </>
      );

    case 'upload':
      return (
        <>
          <p className="mb-2" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            File uploads arrive in a later version — you can describe it instead.
          </p>
          <UnderlineInput value={text} onChange={setText} placeholder="Describe or paste a link" />
          <StepFooter enabled onContinue={() => onAnswer(text)} />
        </>
      );

    default:
      return (
        <>
          <UnderlineTextarea value={text} onChange={setText} placeholder="Type your answer" />
          <StepFooter enabled={text.trim().length > 0 || !q.required} onContinue={() => onAnswer(text.trim())} />
        </>
      );
  }
}

function labelSuffix(q: Question): string {
  // "shoot days" etc. — best-effort suffix from id (Creative Studio only)
  if (/day/i.test(q.id) || /day/i.test(q.text)) return q.max && q.max > 1 ? ' shoot days' : '';
  return '';
}

function CheckboxChip({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer transition-[transform] active:translate-y-px"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '11px 12px',
        borderRadius: '4px',
        border: checked ? '2px solid var(--ink)' : '2px solid transparent',
        background: checked ? 'var(--ink)' : 'transparent',
        color: checked ? 'var(--paper)' : 'var(--ink)',
        boxShadow: checked ? '3px 3px 0 rgba(26,22,17,.18)' : 'inset 0 -1px 0 var(--line)',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: '13.5px',
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 19,
          height: 19,
          flex: 'none',
          boxSizing: 'border-box',
          border: `2px solid ${checked ? 'var(--paper)' : 'var(--ink)'}`,
          borderRadius: 2,
          background: 'transparent',
          color: checked ? 'var(--paper)' : 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  );
}

function DayCircle({ n, selected, onClick }: { n: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer tabular-nums transition-[transform] active:translate-y-px"
      style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        border: selected ? '2px solid var(--ink)' : '2px solid transparent',
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        boxShadow: selected ? '3px 3px 0 rgba(26,22,17,.18)' : 'inset 0 0 0 1px var(--line)',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 600,
        padding: 0,
      }}
    >
      {n}
    </button>
  );
}

function StepFooter({ enabled, onContinue, caption }: { enabled: boolean; onContinue: () => void; caption?: string }) {
  return (
    <div className="mt-auto flex items-center gap-3.5 pt-4">
      <ContinueButton enabled={enabled} onClick={onContinue}>Continue</ContinueButton>
      {caption && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{caption}</span>}
    </div>
  );
}

function ContinueButton({ enabled, onClick, children }: { enabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className={enabled ? 'cursor-pointer' : 'cursor-default'}
      style={{
        padding: '13px 26px',
        border: 'none',
        borderRadius: 3,
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '.01em',
        background: enabled ? 'var(--ink)' : 'var(--line)',
        color: enabled ? 'var(--paper)' : 'var(--muted)',
        boxShadow: enabled ? '4px 4px 0 rgba(26,22,17,.2)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

/* ─────────── Contact ─────────── */

function ContactStep({
  contact,
  setContact,
  onSubmit,
}: {
  contact: { name: string; email: string; phone: string };
  setContact: (c: { name: string; email: string; phone: string }) => void;
  onSubmit: () => void;
}) {
  const valid = contact.name.trim().length > 1 && /.+@.+\..+/.test(contact.email);
  return (
    <>
      <StepTitle title="Ready for the next step?" prompt="Share your details and we’ll prepare a proposal, answer questions, and help you schedule a consultation." />
      <div className="flex flex-col gap-1">
        <FieldLabel>YOUR NAME</FieldLabel>
        <UnderlineInput value={contact.name} onChange={v => setContact({ ...contact, name: v })} placeholder="" />
        <div className="h-4" />
        <FieldLabel>EMAIL</FieldLabel>
        <UnderlineInput type="email" value={contact.email} onChange={v => setContact({ ...contact, email: v })} placeholder="" />
        <div className="h-4" />
        <FieldLabel>PHONE (OPTIONAL)</FieldLabel>
        <UnderlineInput type="tel" value={contact.phone} onChange={v => setContact({ ...contact, phone: v })} placeholder="" />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3.5 pt-4">
        <ContinueButton enabled={valid} onClick={onSubmit}>Send my details</ContinueButton>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No spam — just next steps.</span>
      </div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--muted)' }}>{children}</label>
  );
}

function UnderlineInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="focus:outline-none"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '10px 2px',
        border: 'none',
        borderBottom: '2px solid var(--line)',
        background: 'transparent',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: '18px',
        color: 'var(--ink)',
        margin: '2px 0',
      }}
      onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--ink)'; }}
      onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--line)'; }}
    />
  );
}

function UnderlineTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="focus:outline-none"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '10px 2px',
        border: 'none',
        borderBottom: '2px solid var(--line)',
        background: 'transparent',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: '18px',
        color: 'var(--ink)',
        resize: 'none',
      }}
    />
  );
}

/* ─────────── Result ─────────── */

function ResultStep({
  result,
  rationale,
  copy,
  onContinue,
}: {
  result: DiscoveryResult | null;
  rationale: Rationale | null;
  copy: ResolvedCopy;
  onContinue: () => void;
}) {
  if (!result) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>We couldn’t generate a recommendation. Please start over.</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.18em', color: 'var(--muted)', margin: '8px 0 4px' }}>
        {copy.recommendationLabel}
      </div>
      <h2 className="font-display" style={{ fontWeight: 600, fontSize: 'clamp(22px, 5vw, 27px)', lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}>
        {result.package.name}
      </h2>
      <div className="font-display tabular-nums" style={{ fontWeight: 600, fontSize: 'clamp(28px, 7vw, 38px)', letterSpacing: '-.01em', color: 'var(--ink)', margin: '12px 0 2px' }}>
        {money(result.estimate.min)} <span style={{ color: 'var(--muted)' }}>–</span> {money(result.estimate.max)}
      </div>
      <div style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--muted)' }}>
        {copy.estimateLabel}
      </div>

      {rationale && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--muted)', marginBottom: 6 }}>WHY THIS FITS</div>
          <p className="font-display" style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: 'var(--ink)' }}>{rationale.summary}</p>
          {rationale.packageDescription && (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{rationale.packageDescription}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-[7px] overflow-auto">
        {result.deliverables.map(d => (
          <div key={d} style={{ display: 'flex', gap: 10, fontSize: '13px', lineHeight: 1.45, color: 'var(--ink)' }}>
            <span style={{ color: 'var(--muted)' }}>—</span>
            <span>{d}</span>
          </div>
        ))}
      </div>
      <div className="pt-4">
        <ContinueButton enabled onClick={onContinue}>Ready for the next step?</ContinueButton>
      </div>
    </div>
  );
}
