'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AnswerValue, BusinessConfig, DiscoveryResult, Question, SessionAnswers,
} from '@/lib/engine/types';
import { nextQuestion, progress as engineProgress } from '@/lib/engine/flow';
import { generateResult } from '@/lib/engine/recommend';
import { DEFAULT_PRESENTATION_STYLE, resolvePresentation } from '@/lib/presentation';
import { resolveCopy } from './copy';
import { buildNotes } from './notes';
import type { Contact, DiscoveryActions, DiscoveryPhase, DiscoveryVM } from './types';

/**
 * The single, presentation-agnostic discovery controller. It owns ALL flow state
 * and is the ONLY place that calls the engine (nextQuestion / progress /
 * generateResult) and the lead API. Presentations render the returned view-model
 * and invoke the returned actions — they never touch business logic.
 *
 * Behavior is a faithful lift of the original app/discover/page.tsx controller;
 * selection timing (auto-advance vs explicit Continue) is left to presentations.
 */
export function useDiscoveryController(
  { slug, preview }: { slug?: string; preview?: boolean },
): { vm: DiscoveryVM; actions: DiscoveryActions } {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [phase, setPhase] = useState<DiscoveryPhase>('loading');
  const [session, setSession] = useState<SessionAnswers>({ answers: {} });
  const [answeredOrder, setAnsweredOrder] = useState<string[]>([]);
  const [contact, setContact] = useState<Contact>({ name: '', email: '', phone: '' });
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u') ?? undefined;
    const inPreview = preview ?? params.get('preview') === '1';
    setIsPreview(inPreview);

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

  const multiIndustry = (config?.industries.length ?? 0) > 1;

  // ---- actions ----
  const selectIndustry = (id: string) => setSession(s => ({ ...s, industryId: id }));
  const selectService = (id: string) => setSession(s => ({ ...s, serviceId: id }));
  const advance = () =>
    setPhase(p => (p === 'industry' ? 'service' : p === 'service' ? 'questions' : p));

  const answer = (q: Question, v: AnswerValue) => {
    setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: v } }));
    setAnsweredOrder(o => [...o, q.id]);
  };
  const skip = (q: Question) => answer(q, null);

  const back = () => {
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
  };

  const restart = () => {
    setSession({ answers: {}, industryId: multiIndustry ? undefined : config!.industries[0].id });
    setAnsweredOrder([]);
    setContact({ name: '', email: '', phone: '' });
    setResult(null);
    setPhase(multiIndustry ? 'industry' : 'service');
  };

  const submitContact = () => {
    const finalSession = { ...session, contact };
    const r = generateResult(config!, finalSession);
    setResult(r);
    setPhase('result');
    if (isPreview) return; // preview runs the real engine but never records a lead
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
  };

  // ---- derived view fields (faithful to the original page.tsx math) ----
  const presentation = config ? resolvePresentation(config) : { style: DEFAULT_PRESENTATION_STYLE };
  const copy = resolveCopy(config?.presentation);
  const prog = config ? engineProgress(config, session) : { answered: 0, total: 0 };

  const preQuestions = (multiIndustry ? 1 : 0) + 1; // industry + service
  const totalSteps = preQuestions + prog.total + 2; // + contact + result
  const currentStep =
    phase === 'industry' ? 1 :
    phase === 'service' ? preQuestions :
    phase === 'questions' ? preQuestions + Math.min(prog.answered + 1, prog.total) :
    phase === 'contact' ? preQuestions + prog.total + 1 :
    /* result / loading / unpublished */ totalSteps;
  const pct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  const canGoBack =
    phase === 'contact' ||
    (phase === 'questions' && answeredOrder.length > 0) ||
    (phase === 'service' && multiIndustry);

  const notes = config ? buildNotes(config, session) : [];
  const stepKey =
    phase === 'questions' && current ? `q:${current.id}` :
    phase === 'result' && result ? `r:${result.package.id}` :
    `p:${phase}`;

  const industries = config ? config.industries.map(i => ({ key: i.id, label: i.name })) : [];
  const services = config
    ? config.services
        .filter(s => s.industryId === session.industryId)
        .map(s => ({ key: s.id, label: s.name, desc: s.description }))
    : [];

  const vm: DiscoveryVM = {
    phase,
    config,
    presentation,
    copy,
    businessName: config?.business.name ?? '',
    current,
    session,
    industries,
    services,
    contact,
    result,
    progress: { currentStep, totalSteps, pct },
    canGoBack,
    notes,
    stepKey,
    isPreview,
  };

  const actions: DiscoveryActions = {
    selectIndustry, selectService, advance, answer, skip, back, restart, setContact, submitContact,
  };

  return { vm, actions };
}
