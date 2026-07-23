'use client';

import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import type { AnswerValue, Question } from '@/lib/engine/types';
import { money } from '@/lib/discovery/format';
import { useQuestionInput } from '@/lib/discovery/useQuestionInput';
import type { DiscoveryActions, DiscoveryVM, PresentationProps } from '@/lib/discovery/types';

/**
 * Basic — the Foundation Presentation. Clean, modern, fast, mobile-first.
 * A pure view over the discovery view-model. Explicit Continue by default
 * (no auto-advance). Colors come entirely from palette tokens so Basic Dark
 * (later) is the same tree with a different token set; the brand accent applies
 * on top of either.
 */
type Palette = Record<string, string>;

const LIGHT: Palette = {
  '--bl-bg': '#ffffff',
  '--bl-surface': '#ffffff',
  '--bl-fg': '#16181d',
  '--bl-muted': '#5b616e',
  '--bl-border': '#e4e6ea',
  '--bl-accent': '#2563eb',
  '--bl-on-accent': '#ffffff',
};

export default function Basic({ vm, actions }: PresentationProps) {
  const palette: Palette = { ...LIGHT };
  const accent = vm.presentation.brand?.accent;
  if (accent) palette['--bl-accent'] = accent;

  return (
    <div
      style={palette as React.CSSProperties}
      className="flex min-h-screen w-full flex-col"
    >
      <style>{`
        .bl-focus:focus-visible { outline: 2px solid var(--bl-accent); outline-offset: 2px; border-radius: 10px; }
        @keyframes bl-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .bl-reveal { opacity: 0; animation: bl-rise .55s cubic-bezier(.2, .6, .2, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .bl-anim { transition: none !important; }
          .bl-reveal { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {vm.phase === 'unpublished' ? (
        <Centered>This discovery experience isn’t published yet.</Centered>
      ) : !vm.config || vm.phase === 'loading' ? (
        <Centered>Loading…</Centered>
      ) : (
        <Flow vm={vm} actions={actions} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6" style={{ background: 'var(--bl-bg)' }}>
      <p style={{ color: 'var(--bl-muted)', fontSize: 15 }}>{children}</p>
    </div>
  );
}

/* ─────────── Shell (header · progress · main · nav) ─────────── */

function Shell({
  vm,
  titleId,
  title,
  subtitle,
  children,
  footer,
}: {
  vm: DiscoveryVM;
  titleId: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const brand = vm.presentation.brand;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the step heading on every step change (SR announce + keyboard).
  useEffect(() => { headingRef.current?.focus(); }, [vm.stepKey]);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5"
      style={{ background: 'var(--bl-bg)', color: 'var(--bl-fg)' }}
    >
      <header className="flex flex-col gap-1 pt-7 pb-5">
        {brand?.logoUrl ? (
          <img src={brand.logoUrl} alt={vm.businessName} style={{ height: 32, width: 'auto', objectFit: 'contain', alignSelf: 'flex-start' }} />
        ) : (
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.01em' }}>{vm.businessName}</span>
        )}
        {brand?.tagline && (
          <span style={{ color: 'var(--bl-muted)', fontSize: 13 }}>{brand.tagline}</span>
        )}
      </header>

      <Progress step={vm.progress.currentStep} total={vm.progress.totalSteps} pct={vm.progress.pct} />

      <main aria-labelledby={titleId} className="flex flex-1 flex-col pt-6">
        <h1
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          style={{ fontSize: 'clamp(22px, 5.2vw, 27px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-.01em', outline: 'none', margin: 0 }}
        >
          {title}
        </h1>
        {subtitle && <p style={{ color: 'var(--bl-muted)', fontSize: 14, marginTop: 8 }}>{subtitle}</p>}
        <div className="mt-5 flex flex-1 flex-col">{children}</div>
      </main>

      <nav aria-label="Step navigation" className="sticky bottom-0 flex items-center gap-3 py-4" style={{ background: 'var(--bl-bg)' }}>
        {footer}
      </nav>
    </div>
  );
}

function Progress({ step, total, pct }: { step: number; total: number; pct: number }) {
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${step} of ${total}`}
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: 'var(--bl-border)' }}
      >
        <div className="bl-anim h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: 'var(--bl-accent)' }} />
      </div>
      <div style={{ color: 'var(--bl-muted)', fontSize: 12, marginTop: 8 }} className="tabular-nums">
        Step {step} of {total}
      </div>
    </div>
  );
}

/* ─────────── Buttons ─────────── */

function BackButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return <span />;
  return (
    <button
      onClick={onClick}
      className="bl-focus cursor-pointer bg-transparent"
      style={{ border: 'none', padding: '10px 4px', color: 'var(--bl-muted)', fontSize: 14, fontWeight: 500 }}
    >
      ← Back
    </button>
  );
}

function PrimaryButton({ children, onClick, enabled }: { children: React.ReactNode; onClick: () => void; enabled: boolean }) {
  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className="bl-focus bl-anim ml-auto transition-opacity"
      style={{
        cursor: enabled ? 'pointer' : 'not-allowed',
        opacity: enabled ? 1 : 0.45,
        padding: '13px 24px',
        minHeight: 48,
        border: 'none',
        borderRadius: 12,
        background: 'var(--bl-accent)',
        color: 'var(--bl-on-accent)',
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function Nav({ vm, actions, continueLabel, canContinue, onContinue, onSkip }: {
  vm: DiscoveryVM;
  actions: DiscoveryActions;
  continueLabel: string;
  canContinue: boolean;
  onContinue: () => void;
  onSkip?: () => void;
}) {
  return (
    <>
      <BackButton show={vm.canGoBack} onClick={actions.back} />
      {onSkip && (
        <button onClick={onSkip} className="bl-focus cursor-pointer bg-transparent" style={{ border: 'none', color: 'var(--bl-muted)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Skip
        </button>
      )}
      <PrimaryButton enabled={canContinue} onClick={onContinue}>{continueLabel}</PrimaryButton>
    </>
  );
}

/* ─────────── Selectable card ─────────── */

function Card({ role, checked, onClick, label, desc }: {
  role: 'radio' | 'checkbox';
  checked: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className="bl-focus bl-anim cursor-pointer text-left transition-colors"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        minHeight: 52,
        padding: '13px 15px',
        borderRadius: 12,
        border: `1.5px solid ${checked ? 'var(--bl-accent)' : 'var(--bl-border)'}`,
        background: checked ? 'color-mix(in srgb, var(--bl-accent) 7%, var(--bl-surface))' : 'var(--bl-surface)',
        color: 'var(--bl-fg)',
      }}
    >
      <span
        aria-hidden
        style={{
          marginTop: 2,
          width: 18,
          height: 18,
          flex: 'none',
          borderRadius: role === 'radio' ? '50%' : 5,
          border: `2px solid ${checked ? 'var(--bl-accent)' : 'var(--bl-border)'}`,
          background: checked ? 'var(--bl-accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--bl-on-accent)',
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{label}</span>
        {desc && <span style={{ display: 'block', fontSize: 13, color: 'var(--bl-muted)', marginTop: 3, lineHeight: 1.45 }}>{desc}</span>}
      </span>
    </button>
  );
}

/* ─────────── Steps ─────────── */

function Flow({ vm, actions }: PresentationProps) {
  switch (vm.phase) {
    case 'landing':
      return <LandingStep vm={vm} actions={actions} />;
    case 'industry':
      return <ChoiceStep vm={vm} actions={actions} kind="industry" />;
    case 'service':
      return <ChoiceStep vm={vm} actions={actions} kind="service" />;
    case 'questions':
      return vm.current ? <QuestionStep key={vm.current.id} vm={vm} actions={actions} /> : <Centered>…</Centered>;
    case 'result':
      return <ResultStep vm={vm} actions={actions} />;
    case 'contact':
      return <ContactStep vm={vm} actions={actions} />;
    case 'done':
      return <DoneStep vm={vm} actions={actions} />;
    default:
      return <Centered>…</Centered>;
  }
}

function LandingStep({ vm, actions }: PresentationProps) {
  const { landing } = vm;
  const brand = vm.presentation.brand;
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5" style={{ background: 'var(--bl-bg)', color: 'var(--bl-fg)' }}>
      <header className="pt-8 pb-2">
        {brand?.logoUrl
          ? <img src={brand.logoUrl} alt={vm.businessName} style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          : <span style={{ fontWeight: 700, fontSize: 18 }}>{vm.businessName}</span>}
      </header>
      <main className="flex flex-1 flex-col justify-center py-8">
        {landing.heroImageUrl && (
          <img src={landing.heroImageUrl} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 16, marginBottom: 24 }} />
        )}
        <h1 style={{ fontSize: 'clamp(26px, 6.5vw, 34px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-.01em' }}>{landing.heroTitle}</h1>
        {landing.subtitle && <p style={{ fontSize: 17, color: 'var(--bl-fg)', marginTop: 10, lineHeight: 1.4 }}>{landing.subtitle}</p>}
        <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--bl-muted)', marginTop: 12 }}>{landing.description}</p>
        {landing.receiveBullets.length > 0 && (
          <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
            {landing.receiveBullets.map(b => (
              <li key={b} style={{ display: 'flex', gap: 10, fontSize: 15, lineHeight: 1.5 }}>
                <span aria-hidden style={{ color: 'var(--bl-accent)' }}>✓</span><span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ fontSize: 13, color: 'var(--bl-muted)', marginTop: 20 }}>⏱ {landing.estimatedTime}</div>
      </main>
      <div className="sticky bottom-0 py-5" style={{ background: 'var(--bl-bg)' }}>
        <button
          onClick={actions.start}
          className="bl-focus bl-anim w-full"
          style={{ minHeight: 52, borderRadius: 12, border: 'none', background: 'var(--bl-accent)', color: 'var(--bl-on-accent)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
        >
          {landing.ctaText}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ vm, actions }: PresentationProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center px-5 text-center" style={{ background: 'var(--bl-bg)', color: 'var(--bl-fg)' }}>
      <div aria-hidden style={{ fontSize: 40, color: 'var(--bl-accent)' }}>✓</div>
      <h1 style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: 700, marginTop: 12 }}>
        Thanks{vm.contact.name ? `, ${vm.contact.name.split(' ')[0]}` : ''}.
      </h1>
      <p style={{ fontSize: 15, color: 'var(--bl-muted)', marginTop: 10, lineHeight: 1.55, maxWidth: 380 }}>
        We’ve got your details and your recommendation. Someone from {vm.businessName} will follow up shortly to continue the conversation.
      </p>
      <button onClick={actions.restart} className="bl-focus" style={{ marginTop: 24, border: 'none', background: 'transparent', color: 'var(--bl-muted)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
        Start over
      </button>
    </div>
  );
}

function ChoiceStep({ vm, actions, kind }: PresentationProps & { kind: 'industry' | 'service' }) {
  const titleId = useId();
  const options = kind === 'industry' ? vm.industries : vm.services;
  const current = kind === 'industry' ? vm.session.industryId : vm.session.serviceId;
  const [selected, setSelected] = useState<string | undefined>(current);

  const select = (id: string) => {
    setSelected(id);
    if (kind === 'industry') actions.selectIndustry(id);
    else actions.selectService(id);
  };
  const onContinue = () => { if (selected) actions.advance(); };

  return (
    <Shell
      vm={vm}
      titleId={titleId}
      title={kind === 'industry' ? vm.copy.industryPrompt : vm.copy.servicePrompt}
      subtitle="Pick the closest match — you can refine as we go."
      footer={<Nav vm={vm} actions={actions} continueLabel="Continue" canContinue={!!selected} onContinue={onContinue} />}
    >
      <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-2.5">
        {options.map(o => (
          <Card key={o.key} role="radio" checked={selected === o.key} onClick={() => select(o.key)} label={o.label} desc={(o as { desc?: string }).desc} />
        ))}
      </div>
    </Shell>
  );
}

function QuestionStep({ vm, actions }: PresentationProps) {
  const q = vm.current as Question;
  const titleId = useId();
  const { multi, toggleMulti, text, setText, num, setNum } = useQuestionInput(q);
  const [single, setSingle] = useState<AnswerValue>(null);

  let control: React.ReactNode;
  let value: AnswerValue;
  let canContinue: boolean;

  switch (q.type) {
    case 'multiple_choice':
    case 'dropdown':
      value = single;
      canContinue = single !== null || !q.required;
      control = (
        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-2.5">
          {q.options?.map(o => (
            <Card key={o.value} role="radio" checked={single === o.value} onClick={() => setSingle(o.value)} label={o.label} desc={o.description} />
          ))}
        </div>
      );
      break;

    case 'yes_no':
      value = single;
      canContinue = single !== null || !q.required;
      control = (
        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-2.5">
          <Card role="radio" checked={single === true} onClick={() => setSingle(true)} label="Yes" />
          <Card role="radio" checked={single === false} onClick={() => setSingle(false)} label="No" />
        </div>
      );
      break;

    case 'multi_select':
      value = multi;
      canContinue = multi.length > 0 || !q.required;
      control = (
        <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2.5">
          {q.options?.map(o => (
            <Card key={o.value} role="checkbox" checked={multi.includes(o.value)} onClick={() => toggleMulti(o.value)} label={o.label} desc={o.description} />
          ))}
        </div>
      );
      break;

    case 'rating':
      value = num;
      canContinue = num > 0;
      control = (
        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-wrap gap-2.5">
          {[1, 2, 3, 4, 5].map(n => (
            <ScaleButton key={n} n={n} selected={num === n} onClick={() => setNum(n)} />
          ))}
        </div>
      );
      break;

    case 'slider':
    case 'number': {
      const lo = q.min ?? 1;
      const hi = q.max ?? 10;
      value = num;
      canContinue = num >= lo;
      const asCircles = q.type === 'slider' && hi - lo <= 9;
      control = asCircles ? (
        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-wrap gap-2.5">
          {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(n => (
            <ScaleButton key={n} n={n} selected={num === n} onClick={() => setNum(n)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="tabular-nums" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{num}</p>
          {q.type === 'slider' ? (
            <input type="range" min={lo} max={hi} value={num} onChange={e => setNum(Number(e.target.value))} className="bl-focus w-full" style={{ accentColor: 'var(--bl-accent)' }} aria-labelledby={titleId} />
          ) : (
            <NumberInput value={num} min={lo} max={hi} onChange={setNum} labelId={titleId} />
          )}
        </div>
      );
      break;
    }

    case 'date':
      value = text;
      canContinue = !!text || !q.required;
      control = <TextInput type="date" value={text} onChange={setText} labelId={titleId} />;
      break;

    case 'upload':
      value = text;
      canContinue = true;
      control = (
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: 13, color: 'var(--bl-muted)' }}>File uploads arrive later — describe it or paste a link.</p>
          <TextInput value={text} onChange={setText} placeholder="Describe or paste a link" labelId={titleId} />
        </div>
      );
      break;

    default:
      value = typeof text === 'string' ? text.trim() : text;
      canContinue = text.trim().length > 0 || !q.required;
      control = <TextArea value={text} onChange={setText} placeholder="Type your answer" labelId={titleId} />;
  }

  return (
    <Shell
      vm={vm}
      titleId={titleId}
      title={q.text}
      subtitle={q.helpText}
      footer={
        <Nav
          vm={vm}
          actions={actions}
          continueLabel="Continue"
          canContinue={canContinue}
          onContinue={() => actions.answer(q, value)}
          onSkip={!q.required ? () => actions.skip(q) : undefined}
        />
      }
    >
      {control}
    </Shell>
  );
}

function ScaleButton({ n, selected, onClick }: { n: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={String(n)}
      onClick={onClick}
      className="bl-focus bl-anim tabular-nums transition-colors"
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        cursor: 'pointer',
        border: `1.5px solid ${selected ? 'var(--bl-accent)' : 'var(--bl-border)'}`,
        background: selected ? 'var(--bl-accent)' : 'var(--bl-surface)',
        color: selected ? 'var(--bl-on-accent)' : 'var(--bl-fg)',
        fontSize: 16,
        fontWeight: 600,
      }}
    >
      {n}
    </button>
  );
}

/* ─────────── Contact ─────────── */

function ContactStep({ vm, actions }: PresentationProps) {
  const titleId = useId();
  const { contact } = vm;
  const valid = contact.name.trim().length > 1 && /.+@.+\..+/.test(contact.email);
  return (
    <Shell
      vm={vm}
      titleId={titleId}
      title="Ready for the next step?"
      subtitle="Share your details and we’ll prepare a more accurate proposal, answer your questions, and help you schedule a consultation."
      footer={<Nav vm={vm} actions={actions} continueLabel="Send my details" canContinue={valid} onContinue={actions.submitContact} />}
    >
      <div className="flex flex-col gap-4">
        <Labeled label="Your name">
          <TextInput value={contact.name} onChange={v => actions.setContact({ ...contact, name: v })} autoComplete="name" />
        </Labeled>
        <Labeled label="Email">
          <TextInput type="email" value={contact.email} onChange={v => actions.setContact({ ...contact, email: v })} autoComplete="email" />
        </Labeled>
        <Labeled label="Phone (optional)">
          <TextInput type="tel" value={contact.phone} onChange={v => actions.setContact({ ...contact, phone: v })} autoComplete="tel" />
        </Labeled>
      </div>
    </Shell>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--bl-fg)' }}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

/* ─────────── Inputs ─────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1.5px solid var(--bl-border)',
  background: 'var(--bl-surface)',
  color: 'var(--bl-fg)',
  fontSize: 16,
};

function TextInput({ value, onChange, type = 'text', placeholder, autoComplete, id, labelId }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string; id?: string; labelId?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-labelledby={labelId}
      onChange={e => onChange(e.target.value)}
      className="bl-focus"
      style={inputStyle}
    />
  );
}

function NumberInput({ value, min, max, onChange, labelId }: { value: number; min: number; max: number; onChange: (n: number) => void; labelId?: string }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={String(value)}
      aria-labelledby={labelId}
      onChange={e => onChange(Number(e.target.value))}
      className="bl-focus"
      style={{ ...inputStyle, maxWidth: 160 }}
    />
  );
}

function TextArea({ value, onChange, placeholder, labelId }: { value: string; onChange: (v: string) => void; placeholder?: string; labelId?: string }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={4}
      aria-labelledby={labelId}
      onChange={e => onChange(e.target.value)}
      className="bl-focus"
      style={{ ...inputStyle, resize: 'none' }}
    />
  );
}

/* ─────────── Result ─────────── */

function ResultStep({ vm, actions }: PresentationProps) {
  const titleId = useId();
  const r = vm.result;
  if (!r) {
    return (
      <Shell vm={vm} titleId={titleId} title="We couldn’t generate a recommendation" subtitle="Please try again."
        footer={<Nav vm={vm} actions={actions} continueLabel="Start over" canContinue onContinue={actions.restart} />}>
        <p style={{ color: 'var(--bl-muted)', fontSize: 14 }}>Something went wrong preparing your recommendation.</p>
      </Shell>
    );
  }
  const rationale = vm.rationale;
  const chip: React.CSSProperties = { fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)', color: 'var(--bl-fg)' };
  const eyebrow: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: 'var(--bl-muted)', textTransform: 'uppercase' };
  return (
    <Shell
      vm={vm}
      titleId={titleId}
      title={r.package.name}
      subtitle={vm.copy.recommendationLabel}
      footer={<Nav vm={vm} actions={actions} continueLabel="Continue" canContinue onContinue={actions.continueToContact} />}
    >
      <div className="flex flex-col gap-6">
        {/* Staged reveal (Apple, not Vegas): recommendation (the heading, instant)
            → rationale → estimate → what's included. Reduced-motion shows all at once. */}
        {rationale && (
          <div className="bl-reveal" style={{ animationDelay: '.15s', borderRadius: 14, border: '1px solid var(--bl-border)', background: 'color-mix(in srgb, var(--bl-accent) 4%, var(--bl-surface))', padding: 16 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>Why this fits</div>
            <p style={{ fontSize: 15, lineHeight: 1.55 }}>{rationale.summary}</p>
            {rationale.packageDescription && (
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--bl-muted)', marginTop: 8 }}>{rationale.packageDescription}</p>
            )}
            {rationale.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 12 }}>
                {rationale.highlights.map(h => <span key={h} style={chip}>{h}</span>)}
              </div>
            )}
          </div>
        )}

        <div className="bl-reveal" style={{ animationDelay: '.5s' }}>
          <div className="tabular-nums" style={{ fontSize: 'clamp(30px, 8vw, 40px)', fontWeight: 700, letterSpacing: '-.01em' }}>
            {money(r.estimate.min)} <span style={{ color: 'var(--bl-muted)' }}>–</span> {money(r.estimate.max)}
          </div>
          <div style={{ ...eyebrow, marginTop: 2 }}>{vm.copy.estimateLabel}</div>
        </div>

        <div className="bl-reveal" style={{ animationDelay: '.85s' }}>
          <div style={{ ...eyebrow, marginBottom: 10 }}>What’s included</div>
          <ul className="flex flex-col gap-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {r.deliverables.map(d => (
              <li key={d} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
                <span aria-hidden style={{ color: 'var(--bl-accent)' }}>✓</span><span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}
