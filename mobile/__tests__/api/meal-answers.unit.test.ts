/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of the stored copies of the main server's answers to a meal, one for each request: the User alone, three
// people, a fixed start, and another starting Place. Each passes the app's check of a reply, and holds its Plans in
// the order the server gave them. Expected values: the stored replies of `POST /assistant/answers`.

import {
  MEAL_ANSWER_ALONE,
  MEAL_ANSWER_FIXED_START,
  MEAL_ANSWER_OTHER_ORIGIN,
  MEAL_ANSWER_THREE,
} from '@/api/mock/data/meal-answers';
import { isAnswerReply } from '@/api/server/plan-answers';

describe('the stored copies of real meal answers', () => {
  it.each([
    ['alone', MEAL_ANSWER_ALONE, ['301동식당', '학생회관식당', '3식당', '302동식당', '자하연식당 2층']],
    ['three', MEAL_ANSWER_THREE, ['학생회관식당', '자하연식당 2층', '3식당']],
    ['fixed start', MEAL_ANSWER_FIXED_START, ['학생회관식당', '자하연식당 2층']],
    ['other origin', MEAL_ANSWER_OTHER_ORIGIN, ['302동식당', '301동식당', '학생회관식당', '3식당', '자하연식당 2층']],
  ])('the answer %s passes the check and holds its Plans in order', (_, answer, labels) => {
    expect(isAnswerReply(answer)).toBe(true);
    expect(answer.plans.map(({ place }) => place.label)).toEqual(labels);
  });
});
