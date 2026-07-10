'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnswerValue, BusinessConfig, DiscoveryResult, Question, QuestionOption, SessionAnswers,
} from '@/lib/engine/types';
import { nextQuestion, progress, visibleQuestions } from '@/lib/engine/flow';
import { generateResult } from '@/lib/engine/recommend';
import { DeskScene, DeskFrame } from './DeskScene';

type Phase = 'loading' | 'unpublished' | 'industry' | 'service' | 'questions' | 'contact' | 'result';
type Note = { k: string; v: string };

const money = (n: number) => `$${n.toLocaleString()}`;
const pad = (n: number) => String(n).padStart(2, '0');
const AUTO_ADVANCE_MS = 280;

const mono = 'ui-monospace, Menlo, monospace';

export default function DiscoverPage({ slug, preview }: { slug?: string; preview?: boolean } = {}) {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<SessionAnswers>({ answers: {} });
  const [answeredOrder, setAnsweredOrder] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u') ?? undefined;
    const inPreview = preview ?? params.get('preview') === '1';
    setIsPreview(inPreview);

    // Preview → editor's DRAFT (auth). Otherwise the PUBLISHED config for the
    // workspace, resolved by slug (canonical), ?u= (back-compat), or owner.
    const configUrl =
      inPreview ? '/api/config' :
      slug ? `/api/public-config?slug=${encodeURIComponent(slug)}` :
      u ? `/api/public-config?u=${encodeURIComponent(u)}` :
      '/api/public-config';

    fetch(configUrl, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('unavailable'))))
      .then((body: { config: BusinessConfig; workspaceId?: string; workspace?: { workspaceId: string } }) => {
        const c = body.config;
        setWorkspaceId(body.workspaceId ?? body.workspace?.workspaceId);
        setConfig(c);
        if (c.industries.length === 1) {
          setSession(s => ({ ...s, industryId: c.industries[0].id }));
          setPhase('service');
        } else {
          setPhase('industry');
        }
      })
      .catch(() => setPhase('unpublished'));
  }, [slug, preview]);

  const current: Question | null = useMemo(() => {
    if (!config || phase !== 'questions') return null;
    return nextQuestion(config, session);
  }, [config, session, phase]);

  useEffect(() => {
    if (phase === 'questions' && config && !current) setPhase('contact');
  }, [phase, config, current]);

  if (phase === 'unpublished') {
    return <Stage><CenterMessage>This discovery experience isn’t published yet.</CenterMessage></Stage>;
  }
  if (!config || phase === 'loading') {
    return <Stage><CenterMessage>Loading…</CenterMessage></Stage>;
  }

  const multiIndustry = config.industries.length > 1;
  const prog = progress(config, session);

  // Counter = fixed frame + engine question progress
  const preQuestions = (multiIndustry ? 1 : 0) + 1; // industry + service
  const totalSteps = preQuestions + prog.total + 2; // + contact + result
  const currentStep =
    phase === 'industry' ? 1 :
    phase === 'service' ? preQuestions :
    phase === 'questions' ? preQuestions + Math.min(prog.answered + 1, prog.total) :
    phase === 'contact' ? preQuestions + prog.total + 1 :
    /* result */ totalSteps;
  const pct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  const notes = buildNotes(config, session);
  const canGoBack =
    phase === 'contact' ||
    (phase === 'questions' && answeredOrder.length > 0) ||
    (phase === 'service' && multiIndustry);

  function answer(q: Question, value: AnswerValue) {
    setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: value } }));
    setAnsweredOrder(o => [...o, q.id]);
  }

  function goBack() {
    if (phase === 'contact') {
      if (answeredOrder.length > 0) { setPhase('questions'); return; }
      setPhase('service');
      return;
    }
    if (phase === 'questions' && answeredOrder.length > 0) {
      const last = answeredOrder[answeredOrder.length - 1];
      setAnsweredOrder(o => o.slice(0, -1));
      setSession(s => {
        const answers = { ...s.answers };
        delete answers[last];
        return { ...s, answers };
      });
      return;
    }
    if (phase === 'service' && multiIndustry) {
      setSession(s => ({ ...s, industryId: undefined, serviceId: undefined }));
      setPhase('industry');
      return;
    }
  }

  function reset() {
    setSession({ answers: {}, industryId: multiIndustry ? undefined : config!.industries[0].id });
    setAnsweredOrder([]);
    setContact({ name: '', email: '', phone: '' });
    setResult(null);
    setPhase(multiIndustry ? 'industry' : 'service');
  }

  async function finish() {
    const finalSession = { ...session, contact };
    const r = generateResult(config!, finalSession);
    setResult(r);
    setPhase('result');
    // Preview runs the real engine but never records a lead.
    if (isPreview) return;
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        session: finalSession,
        result: {
          estimate: r.estimate,
          profile: r.profile,
          complexityScore: r.complexityScore,
          packageId: r.package.id,
          packageName: r.package.name,
        },
        workspaceId,
      }),
    }).catch(() => {});
  }

  const stepKey =
    phase === 'questions' && current ? `q:${current.id}` :
    phase === 'result' && result ? `r:${result.package.id}` :
    `p:${phase}`;

  return (
    <Stage>
      <Notebook
        business={config.business.name}
        notes={notes}
        showNextSteps={phase === 'result'}
      >
        <RightPageHeader
          counter={`${pad(currentStep)} / ${pad(totalSteps)}`}
          progressPct={pct}
          canGoBack={canGoBack}
          onBack={goBack}
        />
        <div key={stepKey} className="page-in flex min-h-0 flex-1 flex-col">
          {phase === 'industry' && (
            <ChoiceStep
              title="What kind of business are you looking for?"
              prompt="Pick the closest match to get started."
              options={config.industries.map(i => ({ key: i.id, label: i.name }))}
              onPick={id => {
                setSession(s => ({ ...s, industryId: id }));
                setTimeout(() => setPhase('service'), AUTO_ADVANCE_MS);
              }}
              selected={session.industryId}
            />
          )}

          {phase === 'service' && (
            <ChoiceStep
              title="What can we help you create?"
              prompt="Choose whichever feels closest — we'll refine together."
              options={config.services
                .filter(s => s.industryId === session.industryId)
                .map(s => ({ key: s.id, label: s.name, desc: s.description }))}
              onPick={id => {
                setSession(s => ({ ...s, serviceId: id }));
                setTimeout(() => setPhase('questions'), AUTO_ADVANCE_MS);
              }}
              selected={session.serviceId}
            />
          )}

          {phase === 'questions' && current && (
            <QuestionStep
              key={current.id}
              q={current}
              onAnswer={v => answer(current, v)}
              onSkip={!current.required ? () => answer(current, null) : undefined}
            />
          )}

          {phase === 'contact' && (
            <ContactStep
              contact={contact}
              setContact={setContact}
              onSubmit={finish}
            />
          )}

          {phase === 'result' && result && (
            <ResultStep result={result} email={contact.email} onRestart={reset} />
          )}
        </div>
      </Notebook>
    </Stage>
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
    <div
      className="notebook-shell relative flex w-full max-w-[800px] flex-col overflow-hidden rounded-md border-2 border-ink bg-paper md:h-[598px] md:min-h-0 md:flex-row"
    >
      {/* Left page: notes — desktop only */}
      <LeftPage business={business} notes={notes} showNextSteps={showNextSteps} />
      {/* Spine */}
      <div aria-hidden className="hidden w-[2px] shrink-0 md:block" style={{ background: 'rgba(26,22,17,.25)' }} />
      {/* Right page: interactive */}
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
    <div
      className="notebook-lines hidden flex-1 flex-col overflow-hidden bg-paper px-8 py-7 md:flex"
      style={{ minWidth: 0 }}
    >
      <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--muted)' }}>
        {business.toUpperCase()} — PROJECT NOTES
      </div>
      <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--faint)', marginTop: 6 }}>
        {sessionLabel}
      </div>
      {notes.length === 0 && (
        <div
          className="font-display"
          style={{ fontStyle: 'italic', fontSize: '15px', color: 'var(--faint)', marginTop: 28 }}
        >
          Your choices will be noted here as we plan.
        </div>
      )}
      {notes.map((n, i) => (
        <div key={`${n.k}-${i}`} style={{ marginTop: 17 }}>
          <div style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--muted)' }}>
            {n.k}
          </div>
          <div
            className="font-display"
            style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--ink)', marginTop: 2, lineHeight: 1.35 }}
          >
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
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{ background: 'var(--rec)', width: `${progressPct}%` }}
        />
      </div>
      <div className="h-5">
        {canGoBack && (
          <button
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 text-muted transition hover:text-ink"
            style={{ fontSize: '12px' }}
          >
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
      <h2
        className="font-display"
        style={{ fontWeight: 600, fontSize: 'clamp(21px, 4.6vw, 26px)', lineHeight: 1.16, color: 'var(--ink)', margin: '10px 0 6px' }}
      >
        {title}
      </h2>
      {prompt && (
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 14px' }}>{prompt}</p>
      )}
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
          <ChoiceRow
            key={o.key}
            label={o.label}
            desc={o.desc}
            selected={selected === o.key}
            onClick={() => onPick(o.key)}
          />
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
        borderRadius: selected ? '4px' : '4px',
        border: selected ? '2px solid var(--ink)' : '2px solid transparent',
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        boxShadow: selected ? '3px 3px 0 rgba(26,22,17,.18)' : 'inset 0 -1px 0 var(--line)',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: '15px', fontWeight: 600, display: 'block' }}>{label}</span>
      {desc && (
        <span
          style={{
            display: 'block',
            fontSize: '12.5px',
            fontWeight: 400,
            color: selected ? '#C9C1B4' : 'var(--muted)',
            marginTop: 2,
          }}
        >
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '11px 14px',
          background: 'transparent',
          color: 'inherit',
          border: 'none',
          fontFamily: 'inherit',
        }}
        aria-expanded={expanded}
      >
        <span style={{ flex: 1, fontSize: '15px', fontWeight: 600 }}>{option.label}</span>
        <span style={{ fontFamily: mono, fontSize: '13px', opacity: 0.55 }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {option.description && (
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '4px 0 0', color: softColor }}>
              {option.description}
            </p>
          )}
          {option.previewBullets && option.previewBullets.some(b => b.trim()) && (
            <>
              {option.previewTitle && (
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: '10px',
                    letterSpacing: '.16em',
                    color: softColor,
                    marginTop: 14,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
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
            style={{
              marginTop: 14,
              padding: '9px 18px',
              border: 'none',
              borderRadius: 3,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              background: selected ? 'var(--paper)' : 'var(--ink)',
              color: selected ? 'var(--ink)' : 'var(--paper)',
              boxShadow: '3px 3px 0 rgba(26,22,17,.2)',
            }}
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
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [num, setNum] = useState<number>(q.min ?? 0);
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
              <ChoiceRow
                key={o.value}
                label={o.label}
                selected={selected === o.value}
                onClick={() => pickAuto(o.value, o.value)}
              />
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
              <CheckboxChip
                key={o.value}
                label={o.label}
                checked={multi.includes(o.value)}
                onClick={() =>
                  setMulti(m => (m.includes(o.value) ? m.filter(v => v !== o.value) : [...m, o.value]))
                }
              />
            ))}
          </div>
          <StepFooter
            caption="Select at least one"
            enabled={multi.length > 0 || !q.required}
            onContinue={() => onAnswer(multi)}
          />
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
            <div
              className="font-display mt-3"
              style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--muted)' }}
            >
              {num > 0 ? `${num}${labelSuffix(q)}` : 'Tap a number'}
            </div>
            <StepFooter
              enabled={num > 0}
              onContinue={() => onAnswer(num)}
            />
          </>
        );
      }
      return (
        <div className="flex flex-col gap-5">
          <p
            className="font-display text-center tabular-nums"
            style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1 }}
          >
            {num}
          </p>
          {q.type === 'slider' ? (
            <input
              type="range"
              min={lo}
              max={hi}
              value={num}
              onChange={e => setNum(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--ink)' }}
            />
          ) : (
            <UnderlineInput
              type="number"
              value={String(num)}
              onChange={v => setNum(Number(v))}
              placeholder=""
            />
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
          <UnderlineInput
            value={text}
            onChange={setText}
            placeholder="Describe or paste a link"
          />
          <StepFooter enabled onContinue={() => onAnswer(text)} />
        </>
      );

    default:
      return (
        <>
          <UnderlineTextarea value={text} onChange={setText} placeholder="Type your answer" />
          <StepFooter
            enabled={text.trim().length > 0 || !q.required}
            onContinue={() => onAnswer(text.trim())}
          />
        </>
      );
  }
}

function labelSuffix(q: Question): string {
  // "shoot days" etc. — best-effort suffix from id
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

function StepFooter({
  enabled,
  onContinue,
  caption,
}: {
  enabled: boolean;
  onContinue: () => void;
  caption?: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-3.5 pt-4">
      <ContinueButton enabled={enabled} onClick={onContinue}>
        Continue
      </ContinueButton>
      {caption && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{caption}</span>}
    </div>
  );
}

function ContinueButton({
  enabled,
  onClick,
  children,
}: {
  enabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
      <StepTitle
        title="Where should we send your recommendation?"
        prompt="We'll write up the plan and send it over."
      />
      <div className="flex flex-col gap-1">
        <FieldLabel>YOUR NAME</FieldLabel>
        <UnderlineInput
          value={contact.name}
          onChange={v => setContact({ ...contact, name: v })}
          placeholder=""
        />
        <div className="h-4" />
        <FieldLabel>EMAIL</FieldLabel>
        <UnderlineInput
          type="email"
          value={contact.email}
          onChange={v => setContact({ ...contact, email: v })}
          placeholder=""
        />
        <div className="h-4" />
        <FieldLabel>PHONE (OPTIONAL)</FieldLabel>
        <UnderlineInput
          type="tel"
          value={contact.phone}
          onChange={v => setContact({ ...contact, phone: v })}
          placeholder=""
        />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3.5 pt-4">
        <ContinueButton enabled={valid} onClick={onSubmit}>
          See my recommendation
        </ContinueButton>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>One thoughtful email. No spam.</span>
      </div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.16em', color: 'var(--muted)' }}>
      {children}
    </label>
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
      onFocus={e => {
        e.currentTarget.style.borderBottomColor = 'var(--ink)';
      }}
      onBlur={e => {
        e.currentTarget.style.borderBottomColor = 'var(--line)';
      }}
    />
  );
}

function UnderlineTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
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
  email,
  onRestart,
}: {
  result: DiscoveryResult;
  email: string;
  onRestart: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '.18em', color: 'var(--muted)', margin: '10px 0 4px' }}
      >
        OUR RECOMMENDATION
      </div>
      <h2
        className="font-display"
        style={{ fontWeight: 600, fontSize: 'clamp(24px, 5.5vw, 29px)', lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}
      >
        {result.package.name}
      </h2>
      <div
        className="font-display tabular-nums"
        style={{ fontWeight: 600, fontSize: 'clamp(32px, 8vw, 42px)', letterSpacing: '-.01em', color: 'var(--ink)', margin: '14px 0 2px' }}
      >
        {money(result.estimate.min)} <span style={{ color: 'var(--muted)' }}>–</span> {money(result.estimate.max)}
      </div>
      <div
        style={{ fontFamily: mono, fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--muted)' }}
      >
        ESTIMATED INVESTMENT
      </div>
      <div style={{ height: 1, background: 'var(--line)', margin: '16px 0 12px' }} />
      <div className="flex min-h-0 flex-1 flex-col gap-[7px] overflow-auto">
        {result.deliverables.map(d => (
          <div key={d} style={{ display: 'flex', gap: 10, fontSize: '13px', lineHeight: 1.45, color: 'var(--ink)' }}>
            <span style={{ color: 'var(--muted)' }}>—</span>
            <span>{d}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 pt-3">
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          We&apos;ll email the full plan to {email || 'you'}.
        </span>
        <button
          onClick={onRestart}
          className="cursor-pointer border-0 bg-transparent p-0 underline"
          style={{ fontFamily: 'inherit', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/* ─────────── Notes derivation ─────────── */

function buildNotes(config: BusinessConfig, session: SessionAnswers): Note[] {
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

function formatAnswer(q: Question, v: AnswerValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    return v.map(val => optionLabel(q, val) ?? val).join(', ');
  }
  if (typeof v === 'number') return String(v);
  const opt = optionLabel(q, v);
  return opt ?? String(v);
}

function optionLabel(q: Question, value: string): string | undefined {
  return q.options?.find(o => o.value === value)?.label;
}
