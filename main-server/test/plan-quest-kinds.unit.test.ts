/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { mealOrMeetInputOf } from '../src/plans/plans.service.js';

// The plan inputs that POST /plans and PUT /plans/:questId plan again before a Quest is made or changed: a meal's and a
// meet's, and no other.

const DATE = '2026-11-17';
const people = [{ userId: 'c1d2e3f4-0000-4000-8000-000000000001', constraints: [] }];
const window = { from: null, until: null };

function codeOf(input: PlanInput): string | null {
  try {
    mealOrMeetInputOf(input);
  } catch (error) {
    if (error instanceof BadRequestException) {
      return z.object({ code: z.string() }).parse(error.getResponse()).code;
    }
    throw error;
  }
  return null;
}

describe('A plan input made into a Quest', () => {
  it.each<PlanInput>([
    { kind: 'meal', date: DATE, meal: 'lunch', people, window, placeId: null },
    { kind: 'meet', date: DATE, people, window, placeId: null },
  ])('is let through as it is for a $kind', (input) => {
    expect(mealOrMeetInputOf(input)).toBe(input);
  });

  it.each<PlanInput>([
    { kind: 'events', date: DATE, eventIds: null },
    { kind: 'quests', globalEventId: null, questIds: [] },
    { kind: 'new-quest', date: DATE, globalEventId: null, title: '배드민턴', placeId: null, time: null, people },
  ])('is refused with 400 PLAN_KIND for $kind', (input) => {
    expect(codeOf(input)).toBe('PLAN_KIND');
  });
});
