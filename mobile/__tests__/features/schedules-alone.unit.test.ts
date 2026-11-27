/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan, PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { schedulesAlone } from '@/features/assistant/plan-input';
import { takenAlone } from '@/features/assistant/tracked-requests';

// "일정에 넣기" saves the Plan on screen as a Quest taken alone (P10 ticket 19): a meal's for the asker alone, or a study
// place's alone but 관정's, whose seat is booked from its seat ticket (ticket 22). The main server takes a study alone
// so since P10 ticket 24.

const [SINYANG, KWANJEONG] = STUDY_PLAN_ANSWER.plans;
const [MEAL] = MEAL_ANSWER_ALONE.plans;
if (SINYANG === undefined || KWANJEONG === undefined || MEAL === undefined) {
  throw new Error('The stored answers have too few Plans');
}
const STUDY = STUDY_PLAN_ANSWER.input;
const FRIEND = { userId: 'c1d2e3f4-0000-4000-8000-000000000002', constraints: [] };
const withFriend = (input: PlanInput): PlanInput =>
  'people' in input ? { ...input, people: [...input.people, FRIEND] } : input;

// Partitions: a meal alone and with a Friend; a study place alone, 관정 alone, a study together and with a Friend.
// Expected values: the stored answers.
describe('what "일정에 넣기" saves alone', () => {
  it.each<[string, PlanInput, Plan, boolean]>([
    ['a meal for the asker alone', MEAL_ANSWER_ALONE.input, MEAL, true],
    ['a meal with a Friend', withFriend(MEAL_ANSWER_ALONE.input), MEAL, false],
    ['a study place alone', STUDY, SINYANG, true],
    ['관정 alone, booked from its seat ticket', STUDY, KWANJEONG, false],
    ['a study together', { ...STUDY, together: true }, SINYANG, false],
    ['a study with a Friend', withFriend(STUDY), SINYANG, false],
  ])('is %s', (_, input, plan, expected) => {
    expect(schedulesAlone(input, plan)).toBe(expected);
  });

  it('is sent as a Plan taken alone for a study alone, with no usage data of a 파티', () => {
    expect(takenAlone(STUDY)).toBe(true);
    expect(takenAlone({ ...STUDY, together: true })).toBe(false);
  });
});
