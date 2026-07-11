'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AnswerValue, BusinessConfig, DiscoveryResult, Question, SessionAnswers,
} from '@/lib/engine/types';
import { nextQuestion, progress as engineProgress } from '@/lib/engine/flow';
import { generateResult } from '@/lib/engine/recommend';
import { DEFAULT_PRESENTATION_STYLE, resolvePresentation } from '@/lib/presentation';
import { resolveCopy } from './copy';
import { resolveLanding } from './landing';
import { buildRationale } from './rationale';
import { buildNotes } from './notes';
import type { Contact, DiscoveryActions, DiscoveryPhase, DiscoveryVM } from './types';

/**
 * The single, presentation-agnostic discovery controller. Owns ALL flow state and
 * is the ONLY caller of the engine (nextQuestion / progress / generateResult) and
 * the lead API. Presentations render the view-model and invoke the actions.
 *
 * Journey (value-first): landing → questions → result (recommendation + estimate,
 * NO gate) → contact ("Ready for the next step?") → done. The recommendation is
 * computed on entering `result`; the lead is captured only at contact submit.
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
        // single-industry configs preselect the industry so `start()` can skip it
        if (c.industries.length === 1) setSession(s => ({ ...s, industryId: c.industries[0].id }));
        setConfig(c);
        setPhase('landing'); // default-on landing begins every experience
      })
      .catch(() => setPhase('unpublished'));
  }, [slug, preview]);

  const multiIndustry = (config?.industries.length ?? 0) > 1;

  const current: Question | null = useMemo(() => {
    if (!config || phase !== 'questions') return null;
    return nextQuestion(config, session);
  }, [config, session, phase]);

  // When the last question is answered, compute the recommendation and reveal it.
  useEffect(() => {
    if (phase !== 'questions' || !config || current) return;
    try {
      setResult(generateResult(config, session));
    } catch (e) {
      console.error(e);
      setResult(null);
    }
    setPhase('result');
  }, [phase, config, current, session]);

  // ---- actions ----
  const start = () => setPhase(multiIndustry ? 'industry' : 'service');
  const selectIndustry = (id: string) => setSession(s => ({ ...s, industryId: id }));
  const selectService = (id: string) => setSession(s => ({ ...s, serviceId: id }));
  const advance = () =>
    setPhase(p => (p === 'industry' ? 'service' : p === 'service' ? 'questions' : p));

  const answer = (q: Question, v: AnswerValue) => {
    setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: v } }));
    setAnsweredOrder(o => [...o, q.id]);
  };
  const skip = (q: Question) => answer(q, null);

  const continueToContact = () => setPhase('contact');

  const popLastAnswer = () => {
    const last = answeredOrder[answeredOrder.length - 1];
    setAnsweredOrder(o => o.slice(0, -1));
    setSession(s => {
      const answers = { ...s.answers };
      delete answers[last];
      return { ...s, answers };
    });
  };

  const back = () => {
    if (phase === 'contact') { setPhase('result'); return; }
    if (phase === 'result') {
      if (answeredOrder.length > 0) { popLastAnswer(); setResult(null); setPhase('questions'); }
      else setPhase('service');
      return;
    }
    if (phase === 'questions' && answeredOrder.length > 0) { popLastAnswer(); return; }
    if (phase === 'service') {
      if (multiIndustry) { setSession(s => ({ ...s, industryId: undefined, serviceId: undefined })); setPhase('industry'); }
      else setPhase('landing');
      return;
    }
    if (phase === 'industry') { setPhase('landing'); return; }
  };

  const restart = () => {
    setSession({ answers: {}, industryId: multiIndustry ? undefined : config!.industries[0].id });
    setAnsweredOrder([]);
    setContact({ name: '', email: '', phone: '' });
    setResult(null);
    setPhase('landing');
  };

  const submitContact = () => {
    setPhase('done');
    if (isPreview || !result) return; // value already delivered; capture the lead now
    const finalSession = { ...session, contact };
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        session: finalSession,
        result: {
          estimate: result.estimate,
          profile: result.profile,
          complexityScore: result.complexityScore,
          packageId: result.package.id,
          packageName: result.package.name,
        },
        workspaceId,
      }),
    }).catch(() => {});
  };

  // ---- derived view fields ----
  const presentation = config ? resolvePresentation(config) : { style: DEFAULT_PRESENTATION_STYLE };
  const copy = resolveCopy(config?.presentation);
  const businessName = config?.business.name ?? '';
  const landing = resolveLanding(config?.presentation, businessName);
  const prog = config ? engineProgress(config, session) : { answered: 0, total: 0 };

  const preQuestions = (multiIndustry ? 1 : 0) + 1; // industry + service
  const totalSteps = preQuestions + prog.total + 2; // + result + contact
  const currentStep =
    phase === 'industry' ? 1 :
    phase === 'service' ? preQuestions :
    phase === 'questions' ? preQuestions + Math.min(prog.answered + 1, prog.total) :
    phase === 'result' ? preQuestions + prog.total + 1 :
    phase === 'contact' ? preQuestions + prog.total + 2 :
    /* landing / done / loading / unpublished */ 0;
  const pct = currentStep > 0 && totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  const canGoBack =
    phase === 'contact' ||
    phase === 'result' ||
    (phase === 'questions' && answeredOrder.length > 0) ||
    phase === 'service' ||
    phase === 'industry';

  const notes = config ? buildNotes(config, session) : [];
  const rationale = config && result ? buildRationale(config, session, result) : null;
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
    phase, config, presentation, copy, landing, businessName,
    current, session, industries, services, contact, result, rationale,
    progress: { currentStep, totalSteps, pct },
    canGoBack, notes, stepKey, isPreview,
  };

  const actions: DiscoveryActions = {
    start, selectIndustry, selectService, advance, answer, skip,
    continueToContact, back, restart, setContact, submitContact,
  };

  return { vm, actions };
}
