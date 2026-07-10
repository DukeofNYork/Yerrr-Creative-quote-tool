import type {
  AnswerValue, BusinessConfig, DiscoveryResult, Presentation, Question, SessionAnswers,
} from '@/lib/engine/types';
import type { ResolvedCopy } from './copy';
import type { Note } from './notes';

export type DiscoveryPhase =
  | 'loading' | 'unpublished' | 'industry' | 'service' | 'questions' | 'contact' | 'result';

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
  businessName: string;
  current: Question | null;              // active question (questions phase)
  session: SessionAnswers;
  industries: { key: string; label: string }[];
  services: { key: string; label: string; desc?: string }[];
  contact: Contact;
  result: DiscoveryResult | null;
  progress: { currentStep: number; totalSteps: number; pct: number };
  canGoBack: boolean;
  notes: Note[];
  stepKey: string;
  isPreview: boolean;
}

export interface DiscoveryActions {
  selectIndustry: (id: string) => void;  // set industry (no phase change)
  selectService: (id: string) => void;   // set service (no phase change)
  advance: () => void;                    // industry→service, service→questions
  answer: (q: Question, v: AnswerValue) => void;
  skip: (q: Question) => void;
  back: () => void;
  restart: () => void;
  setContact: (c: Contact) => void;
  submitContact: () => void;             // generate result + capture lead
}

export interface PresentationProps {
  vm: DiscoveryVM;
  actions: DiscoveryActions;
}
