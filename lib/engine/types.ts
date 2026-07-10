/**
 * Discovery Engine — Core Schema
 * ------------------------------
 * Everything a business configures lives in one BusinessConfig object.
 * The engine knows nothing about any industry. It only executes this schema.
 */

// ---------- Conditions (the no-code logic primitive) ----------
// Every piece of branching, rule-triggering, and package-matching uses this
// one condition format. One evaluator, used everywhere.

export type Operator =
  | 'eq'        // answer equals value
  | 'neq'       // answer does not equal value
  | 'in'        // answer is one of value[] 
  | 'includes'  // multi-select answer includes value
  | 'gte'       // number/rating/slider >= value
  | 'lte'       // number/rating/slider <= value
  | 'answered'  // question was answered at all
  | 'profileTier'    // client profile tier equals value (rules only)
  | 'complexityGte'  // complexity score >= value (rules only)
  | 'complexityLte'; // complexity score <= value (rules only)

export interface Condition {
  // Leaf condition
  questionId?: string;
  op?: Operator;
  value?: unknown;
  // Composite conditions (nestable)
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
}

// ---------- Catalog: industries & services ----------

export interface Industry {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  industryId: string;
  name: string;
  description?: string;
}

// ---------- Questions ----------

export type QuestionType =
  | 'multiple_choice' | 'multi_select' | 'yes_no' | 'dropdown'
  | 'slider' | 'text' | 'number' | 'date' | 'rating' | 'upload';

export interface QuestionOption {
  value: string;
  label: string;
  /** Points this answer contributes to project complexity (scored questions) */
  complexity?: number;
  /** Longer copy shown when the option expands in the customer flow */
  description?: string;
  /** Optional heading for the preview bullet list (e.g. "You'll get") */
  previewTitle?: string;
  /** Bullet list shown alongside the description in the expanded card */
  previewBullets?: string[];
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  helpText?: string;
  required: boolean;
  order: number;
  /** Where this question appears in the flow */
  stage: 'goals' | 'discovery' | 'outcomes' | 'timeline' | 'qualification' | 'contact';
  /** Scope: show only for these industries/services. Empty = global. */
  industryIds?: string[];
  serviceIds?: string[];
  /** Conditional visibility — the branching logic */
  showIf?: Condition;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  /** Multiplier applied to this question's complexity points */
  weight?: number;
}

// ---------- Client Profile Engine ----------
// Infers budget positioning from indicator answers instead of asking directly.

export interface ProfileIndicator {
  questionId: string;
  weight: number;
  /** Maps answer values to profile points */
  pointsByValue: Record<string, number>;
}

export interface ProfileTier {
  id: string;           // e.g. 'entry' | 'professional' | 'premium' | 'enterprise'
  label: string;
  minScore: number;     // inclusive lower bound; highest matching tier wins
}

export interface ProfileConfig {
  indicators: ProfileIndicator[];
  tiers: ProfileTier[]; // must be sorted by minScore ascending in config
}

// ---------- Packages & estimates ----------

export interface Package {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  serviceIds: string[];       // which services this package applies to
  baseRange: { min: number; max: number };
  /** Complexity band this package targets; highest matching band wins */
  complexityMin: number;
  nextSteps: string[];
}

// ---------- Business Intelligence (rules pipeline) ----------

export type RuleEffect =
  | { type: 'multiply'; factor: number }          // scale the estimate range
  | { type: 'add'; amount: number }               // flat adjustment (can be negative = discount)
  | { type: 'floor'; amount: number }             // minimum estimate (hard constraint)
  | { type: 'ceiling'; amount: number }           // maximum estimate (hard constraint)
  | { type: 'excludePackage'; packageId: string } // never recommend this package
  | { type: 'forcePackage'; packageId: string }   // always recommend this package
  | { type: 'addDeliverable'; text: string }      // append to recommendation
  | { type: 'addNextStep'; text: string };

export interface BusinessRule {
  id: string;
  label: string;          // human-readable, shown in the audit trail
  when: Condition;
  effect: RuleEffect;
  priority: number;       // lower runs first within its phase
}

// ---------- Presentation layer (how the experience LOOKS and SOUNDS) ----------
// IMPORTANT: the engine NEVER reads any of this. It is consumed only by the
// customer-facing presentation components. It lives here purely because it is an
// optional field on BusinessConfig. Changing it can never change engine behavior.

/** The V1 Presentation Styles. Each is a first-class, opinionated experience. */
export type PresentationStyle =
  | 'basic-light'      // Foundation Presentation — the platform default (built later)
  | 'basic-dark'       // same experience as basic-light, dark palette only
  | 'creative-studio'  // flagship immersive notebook experience
  | 'trades'           // blueprint-inspired, built around planning a job
  | 'premium'          // elegant, minimal, luxury consultation
  | 'healthcare';      // calm, trustworthy, clean

/** Per-workspace visual identity. All optional — each style supplies defaults. */
export interface PresentationBrand {
  accent?: string;    // hex brand color
  logoUrl?: string;   // absolute URL or data URI; omit → wordmark from business.name
  tagline?: string;
}

/** Per-workspace copy overrides. Every field falls back to a style default. */
export interface PresentationCopy {
  industryPrompt?: string;
  servicePrompt?: string;
  contactPrompt?: string;
  recommendationLabel?: string;
  estimateLabel?: string;
  nextStepsLabel?: string;
  /** Who follows up with the customer — replaces any hardcoded role noun. */
  roleNoun?: string;
}

export interface Presentation {
  style: PresentationStyle;
  brand?: PresentationBrand;
  copy?: PresentationCopy;
}

// ---------- Top-level config ----------

export interface BusinessConfig {
  business: { id: string; name: string };
  industries: Industry[];
  services: Service[];
  questions: Question[];
  profile: ProfileConfig;
  packages: Package[];
  rules: BusinessRule[];
  /** Rounding for estimate ranges, e.g. 50 → $7,450 not $7,437 */
  roundTo: number;
  /**
   * Presentation layer — how the flow looks and sounds. NEVER read by the engine.
   * Absent → the temporary default (creative-studio) until Basic Light ships.
   */
  presentation?: Presentation;
}

// ---------- Runtime types ----------

export type AnswerValue = string | string[] | number | boolean | null;

export interface SessionAnswers {
  industryId?: string;
  serviceId?: string;
  answers: Record<string, AnswerValue>;
  contact?: { name?: string; email?: string; phone?: string };
}

export interface AppliedRule {
  ruleId: string;
  label: string;
  effect: RuleEffect;
}

export interface DiscoveryResult {
  profile: { tierId: string; tierLabel: string; score: number };
  complexityScore: number;
  package: Package;
  deliverables: string[];
  estimate: { min: number; max: number };
  nextSteps: string[];
  /** Full audit trail — every rule that fired and what it did */
  appliedRules: AppliedRule[];
}
