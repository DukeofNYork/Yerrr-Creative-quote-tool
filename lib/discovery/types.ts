import type {
  AnswerValue, BusinessConfig, DiscoveryResult, Presentation, Question, SessionAnswers,
} from '@/lib/engine/types';
import type { ResolvedCopy } from './copy';
import type { ResolvedLanding } from './landing';
import type { Rationale } from './rationale';
import type { Note } from './notes';

export type DiscoveryPhase =
  | 'loading' | 'unpublished'
  | 'landing'                                  // entry: professional landing page
  | 'industry' | 'service' | 'questions'
  | 'result'                                    // value-first: recommendation + estimate (no gate)
  | 'contact'                                   // "Ready for the next step?" — continuation, not a gate
  | 'done';                                     // confirmation after contact submit

export interface Contact { name: string; email: string; phone: string }

/**
 * The presentation-agnostic view-model. Every presentation renders from this and
 * only this — no engine calls, no business logic in the view layer.
 */
export interface DiscoveryVM {
  phase: DiscoveryPhase;
  config: BusinessConfig | null;         // null while loading
  presentation: Presentation;            // resolved (defaults to creative-studio while loading)
  copy: ResolvedCopy;
  landing: ResolvedLanding;              // resolved landing content (defaults from business name)
  businessName: string;
  current: Question | null;              // active question (questions phase)
  session: SessionAnswers;
  industries: { key: string; label: string }[];
  services: { key: string; label: string; desc?: string }[];
  contact: Contact;
  result: DiscoveryResult | null;
  rationale: Rationale | null;           // "why this fits" — present once a result exists
  progress: { currentStep: number; totalSteps: number; pct: number };
  canGoBack: boolean;
  notes: Note[];
  stepKey: string;
  isPreview: boolean;
}

export interface DiscoveryActions {
  start: () => void;                      // landing → first question step
  selectIndustry: (id: string) => void;
  selectService: (id: string) => void;
  advance: () => void;                    // industry→service, service→questions
  answer: (q: Question, v: AnswerValue) => void;
  skip: (q: Question) => void;
  continueToContact: () => void;          // result → contact (the "Ready for the next step?" CTA)
  back: () => void;
  restart: () => void;
  setContact: (c: Contact) => void;
  submitContact: () => void;              // capture the lead → done (value already delivered)
}

export interface PresentationProps {
  vm: DiscoveryVM;
  actions: DiscoveryActions;
}
