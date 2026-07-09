/**
 * Characterization tests — GOLDEN MASTER against the real data/config.json.
 *
 * Six representative sessions are run through the full engine and snapshotted.
 * The committed snapshot file IS the frozen baseline of current behavior.
 *
 * If a snapshot fails after a refactor, the engine's output changed. Review the
 * diff and confirm it is intentional BEFORE updating snapshots (`vitest -u`).
 * Never update blindly — that defeats the entire purpose of this net.
 */
import { describe, it, expect } from 'vitest';
import {
  generateResult,
  computeProfile,
  computeComplexity,
  visibleQuestions,
  nextQuestion,
  isComplete,
} from '../index';
import type { BusinessConfig, SessionAnswers } from '../types';
import configJson from '../../../data/config.json';

const config = configJson as unknown as BusinessConfig;

/** A stable, serializable snapshot of everything the engine derives for a session. */
function report(session: SessionAnswers) {
  const base = {
    profile: computeProfile(config, session),
    complexity: computeComplexity(config, session),
    visibleQuestionIds: visibleQuestions(config, session).map(q => q.id),
    nextQuestionId: nextQuestion(config, session)?.id ?? null,
    isComplete: isComplete(config, session),
  };
  try {
    const r = generateResult(config, session);
    return {
      ...base,
      result: {
        packageId: r.package.id,
        estimate: r.estimate,
        profileTier: r.profile.tierId,
        complexityScore: r.complexityScore,
        deliverables: r.deliverables,
        nextSteps: r.nextSteps,
        appliedRuleIds: r.appliedRules.map(a => a.ruleId),
      },
    };
  } catch (e) {
    return { ...base, result: { error: (e as Error).message } };
  }
}

const sessions: Record<string, SessionAnswers> = {
  // Bare video session, nothing answered → lowest package, no rules.
  bare_video: {
    industryId: 'creative',
    serviceId: 'video',
    answers: {},
  },

  // Nonprofit, simple social content → nonprofit discount, starter tier.
  nonprofit_social_simple: {
    industryId: 'creative',
    serviceId: 'video',
    answers: {
      org_type: 'nonprofit',
      goal: 'event',
      video_style: ['social'],
      shoot_days: 1,
      quality_expectation: 'simple',
      timeline_social: 'week',
      decision_maker: true,
      worked_with_agency: 'never',
    },
  },

  // Enterprise, premium, broadcast commercial, 5 shoot days, rush → many rules stack.
  enterprise_broadcast_rush: {
    industryId: 'creative',
    serviceId: 'video',
    answers: {
      org_type: 'enterprise',
      goal: 'launch',
      video_style: ['commercial', 'brand_film'],
      commercial_broadcast: true,
      shoot_days: 5,
      quality_expectation: 'premium',
      timeline: 'rush',
      decision_maker: false,
      worked_with_agency: 'regularly',
    },
  },

  // Private school → hard floor at $7,500.
  private_school_floor: {
    industryId: 'creative',
    serviceId: 'video',
    answers: {
      org_type: 'private_school',
      goal: 'content',
      video_style: ['social'],
      shoot_days: 1,
      quality_expectation: 'simple',
      timeline_social: 'flexible',
      decision_maker: true,
      worked_with_agency: 'never',
    },
  },

  // Returning client, next-day social → surge multiplier + returning discount.
  returning_next_day: {
    industryId: 'creative',
    serviceId: 'video',
    answers: {
      org_type: 'small_business',
      goal: 'content',
      video_style: ['social'],
      shoot_days: 1,
      quality_expectation: 'professional',
      timeline_social: 'next_day',
      decision_maker: true,
      worked_with_agency: 'returning',
    },
  },

  // Photo service has no configured package → generateResult throws (documented edge).
  photo_no_package: {
    industryId: 'creative',
    serviceId: 'photo',
    answers: {},
  },
};

describe('golden master — real config.json', () => {
  for (const [name, session] of Object.entries(sessions)) {
    it(name, () => {
      expect(report(session)).toMatchSnapshot();
    });
  }
});

// A few explicit, human-readable anchors so the intent is legible even without
// opening the snapshot file. These duplicate a slice of the snapshot on purpose.
describe('golden master — explicit anchors', () => {
  it('bare video session yields the starter package with its base range', () => {
    const r = generateResult(config, sessions.bare_video);
    expect(r.package.id).toBe('starter_video');
    expect(r.estimate).toEqual({ min: 1500, max: 2500 });
    expect(r.appliedRules).toHaveLength(0);
  });

  it('private school session floors the estimate at $7,500', () => {
    const r = generateResult(config, sessions.private_school_floor);
    expect(r.estimate.min).toBe(7500);
    expect(r.appliedRules.map(a => a.ruleId)).toContain('private_school_floor');
  });

  it('photo service currently has no package and throws', () => {
    expect(() => generateResult(config, sessions.photo_no_package)).toThrow(/No package matches/);
  });

  it('validate: the shipped config is referentially valid', async () => {
    const { validateConfig } = await import('../index');
    expect(validateConfig(config)).toEqual([]);
  });
});
