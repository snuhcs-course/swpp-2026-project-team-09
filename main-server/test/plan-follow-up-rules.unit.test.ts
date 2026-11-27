/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PLAN_RULES } from '../src/assistant/gathering/plan-rules.js';

// A question about the meal plan on screen that changes nothing gets one short sentence of only what was asked (P05
// ticket 66), as a question about a 관정 card on screen does: the rules said how long a reply to a plan is, and to a
// change of it, but not to a question about it.
describe('The meal plan rules on a plan already on screen', () => {
  it('answer a question that changes nothing in one short sentence of only what was asked', () => {
    expect(PLAN_RULES).toContain(
      'A question about the plan on screen that changes nothing is answered in one short sentence of only what was asked',
    );
    expect(PLAN_RULES).toContain('never the plan again, its way, or what a button does');
  });

  it('say where it is from the line with no tool, and its hours with restaurantHours', () => {
    expect(PLAN_RULES).toContain('where it is from [Plan on screen: …] with no tool');
    expect(PLAN_RULES).toContain("its Restaurant's hours with restaurantHours, the meal on screen alone");
  });
});
