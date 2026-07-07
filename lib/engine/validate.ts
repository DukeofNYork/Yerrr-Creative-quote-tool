import type { BusinessConfig, Condition } from './types';

/**
 * Validates a BusinessConfig for referential integrity.
 * This is what the future admin dashboard will run on save/publish.
 */
export function validateConfig(config: BusinessConfig): string[] {
  const errors: string[] = [];
  const industryIds = new Set(config.industries.map(i => i.id));
  const serviceIds = new Set(config.services.map(s => s.id));
  const questionIds = new Set(config.questions.map(q => q.id));
  const packageIds = new Set(config.packages.map(p => p.id));

  const checkCondition = (c: Condition, where: string) => {
    for (const sub of [...(c.all ?? []), ...(c.any ?? []), ...(c.not ? [c.not] : [])]) {
      checkCondition(sub, where);
    }
    if (c.questionId && !c.questionId.startsWith('$') && !questionIds.has(c.questionId)) {
      errors.push(`${where}: references unknown question "${c.questionId}"`);
    }
  };

  for (const s of config.services) {
    if (!industryIds.has(s.industryId)) errors.push(`Service "${s.id}": unknown industry "${s.industryId}"`);
  }
  for (const q of config.questions) {
    q.industryIds?.forEach(id => { if (!industryIds.has(id)) errors.push(`Question "${q.id}": unknown industry "${id}"`); });
    q.serviceIds?.forEach(id => { if (!serviceIds.has(id)) errors.push(`Question "${q.id}": unknown service "${id}"`); });
    if (q.showIf) checkCondition(q.showIf, `Question "${q.id}" showIf`);
  }
  for (const ind of config.profile.indicators) {
    if (!questionIds.has(ind.questionId)) errors.push(`Profile indicator: unknown question "${ind.questionId}"`);
  }
  for (const p of config.packages) {
    p.serviceIds.forEach(id => { if (!serviceIds.has(id)) errors.push(`Package "${p.id}": unknown service "${id}"`); });
  }
  for (const r of config.rules) {
    checkCondition(r.when, `Rule "${r.id}"`);
    const e = r.effect as { packageId?: string };
    if (e.packageId && !packageIds.has(e.packageId)) errors.push(`Rule "${r.id}": unknown package "${e.packageId}"`);
  }
  const tiers = config.profile.tiers;
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minScore <= tiers[i - 1].minScore) {
      errors.push(`Profile tiers must have strictly ascending minScore ("${tiers[i].id}")`);
    }
  }
  return errors;
}
