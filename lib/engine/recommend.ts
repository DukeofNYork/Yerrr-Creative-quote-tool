import type {
  AppliedRule, BusinessConfig, BusinessRule, DiscoveryResult, Package, SessionAnswers,
} from './types';
import { evaluate, type RuleContext } from './conditions';
import { computeComplexity, computeProfile } from './profile';

/**
 * Rule precedence (resolves conflicts deterministically):
 *   1. Package constraints:  forcePackage > excludePackage > complexity-band match
 *   2. Estimate pipeline:    base range → multiply → add → floor/ceiling
 *   3. Hard constraints (floor/ceiling) ALWAYS win over soft adjustments.
 * Within each phase, rules run in priority order (lower first).
 * Every fired rule is recorded in the audit trail.
 */
export function generateResult(config: BusinessConfig, session: SessionAnswers): DiscoveryResult {
  const profile = computeProfile(config, session);
  const complexityScore = computeComplexity(config, session);
  const ctx: RuleContext = { profileTierId: profile.tierId, complexityScore };

  const fired: BusinessRule[] = config.rules
    .filter(r => evaluate(r.when, session, ctx))
    .sort((a, b) => a.priority - b.priority);

  const applied: AppliedRule[] = [];
  const record = (r: BusinessRule) => applied.push({ ruleId: r.id, label: r.label, effect: r.effect });

  // ----- Phase 1: package selection -----
  const excluded = new Set(
    fired.filter(r => r.effect.type === 'excludePackage')
      .map(r => { record(r); return (r.effect as { packageId: string }).packageId; })
  );

  const forced = fired.find(r => r.effect.type === 'forcePackage'
    && !excluded.has((r.effect as { packageId: string }).packageId));

  let pkg: Package | undefined;
  if (forced) {
    record(forced);
    pkg = config.packages.find(p => p.id === (forced.effect as { packageId: string }).packageId);
  }
  if (!pkg) {
    // Highest complexity band the project qualifies for, among eligible packages
    pkg = config.packages
      .filter(p => (!session.serviceId || p.serviceIds.includes(session.serviceId)) && !excluded.has(p.id))
      .sort((a, b) => b.complexityMin - a.complexityMin)
      .find(p => complexityScore >= p.complexityMin);
  }
  if (!pkg) throw new Error('No package matches this session — check package complexity bands.');

  // ----- Phase 2: estimate pipeline -----
  let { min, max } = pkg.baseRange;

  for (const r of fired) if (r.effect.type === 'multiply') {
    record(r); min *= r.effect.factor; max *= r.effect.factor;
  }
  for (const r of fired) if (r.effect.type === 'add') {
    record(r); min += r.effect.amount; max += r.effect.amount;
  }
  for (const r of fired) if (r.effect.type === 'floor') {
    record(r); min = Math.max(min, r.effect.amount); max = Math.max(max, r.effect.amount * 1.1);
  }
  for (const r of fired) if (r.effect.type === 'ceiling') {
    record(r); max = Math.min(max, r.effect.amount); min = Math.min(min, max);
  }

  const round = (n: number) => Math.round(n / config.roundTo) * config.roundTo;

  // ----- Phase 3: recommendation extras -----
  const deliverables = [...pkg.deliverables];
  const nextSteps = [...pkg.nextSteps];
  for (const r of fired) {
    if (r.effect.type === 'addDeliverable') { record(r); deliverables.push(r.effect.text); }
    if (r.effect.type === 'addNextStep') { record(r); nextSteps.push(r.effect.text); }
  }

  return {
    profile,
    complexityScore,
    package: pkg,
    deliverables,
    estimate: { min: round(min), max: round(max) },
    nextSteps,
    appliedRules: applied,
  };
}
