/**
 * Characterization tests — ENGINE MECHANICS (hand-computed invariants).
 *
 * These lock the *intended* behavior of the engine using tiny synthetic
 * configs where every number can be verified by eye. They exist to make any
 * refactor that changes engine behavior fail loudly.
 *
 * DO NOT "fix" a failing assertion by editing the expected value to match new
 * output. A failure here means engine behavior changed — decide on purpose
 * whether that change is intended before touching these numbers.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluate,
  computeComplexity,
  computeProfile,
  generateResult,
  visibleQuestions,
  nextQuestion,
  isComplete,
  progress,
} from '../index';
import type {
  BusinessConfig,
  Condition,
  Package,
  Question,
  BusinessRule,
  SessionAnswers,
} from '../types';

// ---------- builders ----------

function baseConfig(over: Partial<BusinessConfig> = {}): BusinessConfig {
  return {
    business: { id: 'b', name: 'B' },
    industries: [{ id: 'i1', name: 'I1' }],
    services: [{ id: 's1', industryId: 'i1', name: 'S1' }],
    questions: [],
    profile: { indicators: [], tiers: [{ id: 'entry', label: 'Entry', minScore: 0 }] },
    packages: [],
    rules: [],
    roundTo: 1,
    ...over,
  };
}

function pkg(over: Partial<Package> & { id: string }): Package {
  return {
    name: over.id,
    description: '',
    deliverables: [],
    serviceIds: ['s1'],
    baseRange: { min: 100, max: 200 },
    complexityMin: 0,
    nextSteps: [],
    ...over,
  };
}

function rule(id: string, when: Condition, effect: BusinessRule['effect'], priority = 10): BusinessRule {
  return { id, label: id, when, effect, priority };
}

const ALWAYS: Condition = { op: 'complexityGte', value: 0 }; // complexity >= 0 is always true
const sess = (over: Partial<SessionAnswers> = {}): SessionAnswers => ({
  industryId: 'i1',
  serviceId: 's1',
  answers: {},
  ...over,
});

// ================= evaluate() =================

describe('evaluate — leaf operators', () => {
  const s = sess({ answers: { q: 'a', n: 5, multi: ['x', 'y'] } });

  it('eq / neq', () => {
    expect(evaluate({ questionId: 'q', op: 'eq', value: 'a' }, s)).toBe(true);
    expect(evaluate({ questionId: 'q', op: 'eq', value: 'b' }, s)).toBe(false);
    expect(evaluate({ questionId: 'q', op: 'neq', value: 'b' }, s)).toBe(true);
    expect(evaluate({ questionId: 'q', op: 'neq', value: 'a' }, s)).toBe(false);
  });

  it('in — answer is one of value[]', () => {
    expect(evaluate({ questionId: 'q', op: 'in', value: ['a', 'z'] }, s)).toBe(true);
    expect(evaluate({ questionId: 'q', op: 'in', value: ['z'] }, s)).toBe(false);
  });

  it('includes — multi-select answer contains value', () => {
    expect(evaluate({ questionId: 'multi', op: 'includes', value: 'x' }, s)).toBe(true);
    expect(evaluate({ questionId: 'multi', op: 'includes', value: 'nope' }, s)).toBe(false);
  });

  it('gte / lte — numeric only', () => {
    expect(evaluate({ questionId: 'n', op: 'gte', value: 5 }, s)).toBe(true);
    expect(evaluate({ questionId: 'n', op: 'gte', value: 6 }, s)).toBe(false);
    expect(evaluate({ questionId: 'n', op: 'lte', value: 5 }, s)).toBe(true);
    expect(evaluate({ questionId: 'n', op: 'lte', value: 4 }, s)).toBe(false);
    // non-numeric answer never satisfies gte/lte
    expect(evaluate({ questionId: 'q', op: 'gte', value: 0 }, s)).toBe(false);
  });

  it('answered — present and non-empty', () => {
    expect(evaluate({ questionId: 'q', op: 'answered' }, s)).toBe(true);
    expect(evaluate({ questionId: 'missing', op: 'answered' }, s)).toBe(false);
    expect(evaluate({ questionId: 'empty', op: 'answered' }, sess({ answers: { empty: '' } }))).toBe(false);
  });

  it('missing questionId or op → false; unknown handled safely', () => {
    expect(evaluate({ op: 'eq', value: 'a' }, s)).toBe(false);
    expect(evaluate({ questionId: 'q' }, s)).toBe(false);
  });
});

describe('evaluate — composites (nestable)', () => {
  const s = sess({ answers: { a: 1, b: 2 } });
  it('all / any / not', () => {
    expect(evaluate({ all: [
      { questionId: 'a', op: 'eq', value: 1 },
      { questionId: 'b', op: 'eq', value: 2 },
    ] }, s)).toBe(true);
    expect(evaluate({ all: [
      { questionId: 'a', op: 'eq', value: 1 },
      { questionId: 'b', op: 'eq', value: 99 },
    ] }, s)).toBe(false);
    expect(evaluate({ any: [
      { questionId: 'a', op: 'eq', value: 99 },
      { questionId: 'b', op: 'eq', value: 2 },
    ] }, s)).toBe(true);
    expect(evaluate({ not: { questionId: 'a', op: 'eq', value: 1 } }, s)).toBe(false);
  });

  it('deeply nested all/any/not', () => {
    const cond: Condition = { all: [
      { questionId: 'a', op: 'eq', value: 1 },
      { not: { any: [
        { questionId: 'b', op: 'eq', value: 3 },
        { questionId: 'b', op: 'eq', value: 4 },
      ] } },
    ] };
    expect(evaluate(cond, s)).toBe(true);
  });
});

describe('evaluate — pseudo-questions and rule context', () => {
  const s = sess({ industryId: 'i1', serviceId: 's1', answers: {} });
  it('$industry / $service branch on selection', () => {
    expect(evaluate({ questionId: '$industry', op: 'eq', value: 'i1' }, s)).toBe(true);
    expect(evaluate({ questionId: '$service', op: 'eq', value: 's1' }, s)).toBe(true);
    expect(evaluate({ questionId: '$service', op: 'eq', value: 'other' }, s)).toBe(false);
  });
  it('profileTier / complexityGte / complexityLte use ctx', () => {
    expect(evaluate({ op: 'profileTier', value: 'premium' }, s, { profileTierId: 'premium' })).toBe(true);
    expect(evaluate({ op: 'profileTier', value: 'premium' }, s, { profileTierId: 'entry' })).toBe(false);
    expect(evaluate({ op: 'complexityGte', value: 10 }, s, { complexityScore: 10 })).toBe(true);
    expect(evaluate({ op: 'complexityGte', value: 11 }, s, { complexityScore: 10 })).toBe(false);
    expect(evaluate({ op: 'complexityLte', value: 10 }, s, { complexityScore: 10 })).toBe(true);
    // missing complexity in ctx defaults to 0
    expect(evaluate({ op: 'complexityGte', value: 0 }, s)).toBe(true);
    expect(evaluate({ op: 'complexityGte', value: 1 }, s)).toBe(false);
  });
});

// ================= computeComplexity() =================

describe('computeComplexity', () => {
  const questions: Question[] = [
    { id: 'q1', type: 'multiple_choice', text: '', required: true, order: 1, stage: 'goals',
      options: [
        { value: 'low', label: 'low', complexity: 1 },
        { value: 'high', label: 'high', complexity: 5 },
      ] },
    { id: 'q2', type: 'multi_select', text: '', required: true, order: 2, stage: 'discovery', weight: 2,
      options: [
        { value: 'a', label: 'a', complexity: 3 },
        { value: 'b', label: 'b', complexity: 4 },
      ] },
  ];
  const config = baseConfig({ questions });

  it('sums option complexity, applies question weight, and handles multi-select', () => {
    // q1 high = 5*1; q2 [a,b] = (3+4)*2 = 14 → 19
    expect(computeComplexity(config, sess({ answers: { q1: 'high', q2: ['a', 'b'] } }))).toBe(19);
  });
  it('unanswered and option-less answers contribute 0', () => {
    expect(computeComplexity(config, sess({ answers: {} }))).toBe(0);
    expect(computeComplexity(config, sess({ answers: { q1: 'unknown_value' } }))).toBe(0);
  });
});

// ================= computeProfile() =================

describe('computeProfile', () => {
  const config = baseConfig({
    questions: [
      { id: 'size', type: 'multiple_choice', text: '', required: true, order: 1, stage: 'goals' },
      { id: 'quality', type: 'multiple_choice', text: '', required: true, order: 2, stage: 'outcomes' },
    ],
    profile: {
      indicators: [
        { questionId: 'size', weight: 3, pointsByValue: { small: 1, big: 4 } },
        { questionId: 'quality', weight: 2, pointsByValue: { basic: 0, premium: 5 } },
      ],
      tiers: [
        { id: 'entry', label: 'Entry', minScore: 0 },
        { id: 'pro', label: 'Pro', minScore: 8 },
        { id: 'premium', label: 'Premium', minScore: 14 },
      ],
    },
  });

  it('weights points and buckets into the highest qualifying tier', () => {
    // big=4*3=12, premium=5*2=10 → 22 → premium (>=14)
    expect(computeProfile(config, sess({ answers: { size: 'big', quality: 'premium' } }))).toEqual(
      { tierId: 'premium', tierLabel: 'Premium', score: 22 });
    // small=1*3=3, basic=0 → 3 → entry (<8)
    expect(computeProfile(config, sess({ answers: { size: 'small', quality: 'basic' } }))).toEqual(
      { tierId: 'entry', tierLabel: 'Entry', score: 3 });
    // small=3, premium=10 → 13 → pro (>=8, <14)
    expect(computeProfile(config, sess({ answers: { size: 'small', quality: 'premium' } })).tierId).toBe('pro');
  });

  it('empty answers → entry tier, score 0', () => {
    expect(computeProfile(config, sess({ answers: {} }))).toEqual(
      { tierId: 'entry', tierLabel: 'Entry', score: 0 });
  });
});

// ================= generateResult() — estimate pipeline =================

describe('generateResult — estimate pipeline order & math', () => {
  it('applies multiply BEFORE add (base 100/200 → *2 → +50 = 250/450)', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p', baseRange: { min: 100, max: 200 } })],
      rules: [
        rule('m', ALWAYS, { type: 'multiply', factor: 2 }, 1),
        rule('a', ALWAYS, { type: 'add', amount: 50 }, 2),
      ],
    });
    expect(generateResult(config, sess()).estimate).toEqual({ min: 250, max: 450 });
  });

  it('floor: min=max(min,amount), max=max(max, amount*1.1)', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p', baseRange: { min: 100, max: 200 } })],
      rules: [rule('f', ALWAYS, { type: 'floor', amount: 500 }, 1)],
    });
    // min=max(100,500)=500; max=max(200,550)=550
    expect(generateResult(config, sess()).estimate).toEqual({ min: 500, max: 550 });
  });

  it('ceiling: max=min(max,amount), then min clamped down to max', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p', baseRange: { min: 100, max: 200 } })],
      rules: [rule('c', ALWAYS, { type: 'ceiling', amount: 80 }, 1)],
    });
    // max=min(200,80)=80; min=min(100,80)=80
    expect(generateResult(config, sess()).estimate).toEqual({ min: 80, max: 80 });
  });

  it('rounds to config.roundTo', () => {
    const config = baseConfig({
      roundTo: 50,
      packages: [pkg({ id: 'p', baseRange: { min: 117, max: 233 } })],
    });
    // round(117)->100, round(233)->250
    expect(generateResult(config, sess()).estimate).toEqual({ min: 100, max: 250 });
  });

  it('negative add acts as a discount', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p', baseRange: { min: 1500, max: 2500 } })],
      rules: [rule('d', ALWAYS, { type: 'add', amount: -500 }, 1)],
    });
    expect(generateResult(config, sess()).estimate).toEqual({ min: 1000, max: 2000 });
  });
});

describe('generateResult — package selection', () => {
  const packages = [
    pkg({ id: 'low', complexityMin: 0, baseRange: { min: 100, max: 200 } }),
    pkg({ id: 'mid', complexityMin: 6, baseRange: { min: 500, max: 800 } }),
    pkg({ id: 'high', complexityMin: 12, baseRange: { min: 1500, max: 2500 } }),
  ];
  const withComplexity = (score: number): BusinessConfig => baseConfig({
    packages,
    questions: [{ id: 'c', type: 'number', text: '', required: true, order: 1, stage: 'goals',
      options: [{ value: 'v', label: 'v', complexity: score }] }],
  });
  const answerC = sess({ answers: { c: 'v' } });

  it('picks the highest complexity band the project qualifies for', () => {
    expect(generateResult(withComplexity(0), answerC).package.id).toBe('low');
    expect(generateResult(withComplexity(7), answerC).package.id).toBe('mid');
    expect(generateResult(withComplexity(20), answerC).package.id).toBe('high');
  });

  it('forcePackage overrides band selection', () => {
    const config = baseConfig({ packages,
      rules: [rule('force', ALWAYS, { type: 'forcePackage', packageId: 'high' }, 1)] });
    expect(generateResult(config, sess()).package.id).toBe('high'); // complexity 0 would be 'low'
  });

  it('excludePackage removes a package from selection', () => {
    const config = { ...withComplexity(20),
      rules: [rule('excl', ALWAYS, { type: 'excludePackage', packageId: 'high' }, 1)] };
    expect(generateResult(config, answerC).package.id).toBe('mid'); // high excluded → next band
  });

  it('a forcePackage that is also excluded is ignored (falls back to band)', () => {
    const config = baseConfig({ packages, rules: [
      rule('force', ALWAYS, { type: 'forcePackage', packageId: 'high' }, 1),
      rule('excl', ALWAYS, { type: 'excludePackage', packageId: 'high' }, 2),
    ] });
    expect(generateResult(config, sess()).package.id).not.toBe('high');
  });

  it('throws when no package matches the service', () => {
    const config = baseConfig({ packages: [pkg({ id: 'p', serviceIds: ['other'] })] });
    expect(() => generateResult(config, sess())).toThrow(/No package matches/);
  });
});

describe('generateResult — extras & audit trail', () => {
  it('appends addDeliverable / addNextStep after the package defaults', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p', deliverables: ['base-d'], nextSteps: ['base-n'] })],
      rules: [
        rule('d', ALWAYS, { type: 'addDeliverable', text: 'extra-d' }, 1),
        rule('n', ALWAYS, { type: 'addNextStep', text: 'extra-n' }, 2),
      ],
    });
    const r = generateResult(config, sess());
    expect(r.deliverables).toEqual(['base-d', 'extra-d']);
    expect(r.nextSteps).toEqual(['base-n', 'extra-n']);
  });

  it('records every fired rule in appliedRules (exclude → multiply → add → step order)', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'keep' }), pkg({ id: 'gone' })],
      rules: [
        rule('r_excl', ALWAYS, { type: 'excludePackage', packageId: 'gone' }, 1),
        rule('r_mult', ALWAYS, { type: 'multiply', factor: 2 }, 2),
        rule('r_add', ALWAYS, { type: 'add', amount: 10 }, 3),
        rule('r_step', ALWAYS, { type: 'addNextStep', text: 'x' }, 4),
      ],
    });
    const r = generateResult(config, sess());
    expect(r.appliedRules.map(a => a.ruleId)).toEqual(['r_excl', 'r_mult', 'r_add', 'r_step']);
  });

  it('rules whose condition is false do not fire', () => {
    const config = baseConfig({
      packages: [pkg({ id: 'p' })],
      rules: [rule('never', { op: 'complexityGte', value: 999 }, { type: 'add', amount: 1000 }, 1)],
    });
    const r = generateResult(config, sess());
    expect(r.appliedRules).toHaveLength(0);
    expect(r.estimate).toEqual({ min: 100, max: 200 });
  });
});

// ================= flow: visibility / next / complete / progress =================

describe('flow', () => {
  const questions: Question[] = [
    { id: 'qA', type: 'yes_no', text: '', required: true, order: 1, stage: 'goals' },
    { id: 'qB', type: 'yes_no', text: '', required: true, order: 1, stage: 'discovery', serviceIds: ['s1'] },
    { id: 'qC', type: 'yes_no', text: '', required: true, order: 2, stage: 'discovery',
      showIf: { questionId: 'qA', op: 'eq', value: 'yes' } },
    { id: 'qD', type: 'yes_no', text: '', required: true, order: 2, stage: 'goals', serviceIds: ['s2'] },
  ];
  const config = baseConfig({
    services: [
      { id: 's1', industryId: 'i1', name: 'S1' },
      { id: 's2', industryId: 'i1', name: 'S2' },
    ],
    questions,
  });

  it('filters by service scope and showIf, sorts by stage then order', () => {
    const v = visibleQuestions(config, sess({ answers: {} }));
    // qD hidden (service s2), qC hidden (showIf false) → [qA(goals), qB(discovery)]
    expect(v.map(q => q.id)).toEqual(['qA', 'qB']);
  });

  it('re-branches when an earlier answer opens a conditional question', () => {
    const v = visibleQuestions(config, sess({ answers: { qA: 'yes' } }));
    // now qC visible; discovery ordered qB(1) then qC(2)
    expect(v.map(q => q.id)).toEqual(['qA', 'qB', 'qC']);
  });

  it('nextQuestion returns the first unanswered required visible question', () => {
    expect(nextQuestion(config, sess({ answers: {} }))?.id).toBe('qA');
    expect(nextQuestion(config, sess({ answers: { qA: 'yes' } }))?.id).toBe('qB');
    expect(nextQuestion(config, sess({ answers: { qA: 'yes', qB: 'no', qC: 'no' } }))).toBeNull();
  });

  it('isComplete requires industry, service, and no next question', () => {
    expect(isComplete(config, sess({ answers: { qA: 'no', qB: 'no' } }))).toBe(true);
    expect(isComplete(config, { serviceId: 's1', answers: {} })).toBe(false); // no industry
    expect(isComplete(config, sess({ answers: {} }))).toBe(false); // qA unanswered
  });

  it('progress counts answered vs visible', () => {
    expect(progress(config, sess({ answers: {} }))).toEqual({ answered: 0, total: 2 });
    expect(progress(config, sess({ answers: { qA: 'yes' } }))).toEqual({ answered: 1, total: 3 });
  });
});
