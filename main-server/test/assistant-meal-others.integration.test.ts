/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { expectStatus, keptButHidden, shareAt, uploadPosition } from './location-sharing.js';
import { MealPlanStage, planMeal, resolve } from './meal-plan.js';
import { answerIn } from './plan-answers.js';

// The asker's Friends who are not in a meal's plan, which each Plan's band gives for the time card to add them (P04
// ticket 64), at the Assistant's endpoint with the scripted model, the seed's walking table, and Places.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const TUESDAY = '2084-03-07';
const time = (clock: string): string => `${TUESDAY}T${clock}:00+09:00`;

// The design's worked example (Classes in 301동 until 11:50 and in 24동 from 13:00, lunch with 민수), while 지은 is
// seen at the building level in 8동 and 하은 at the Timetable, her position kept. Each walks from where they set out by
// the planner's rule for a picked person (P04 ticket 68): 지은 from her 8동 Class, which ends as the lunch can start,
// and 하은, busy from 12:30, from the 24동 Class her lane already shows, which she comes free after.
describe('Lunch with 민수, with 지은 and 하은 not in it', () => {
  it("gives them in each Plan's band in the Friend list's order, with stretches as a lane's and where they set out from", async () => {
    await stage.asking(TUESDAY, '11:50');
    await stage.menusOn(TUESDAY, ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층']);
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    const [friend, seen, hidden] = [await stage.friend('민수'), await stage.friend('지은'), await stage.friend('하은')];
    await stage.classAt(friend, '11:00', '12:15', '302');
    await stage.classAt(seen, '11:00', '12:15', '8');
    await stage.classAt(seen, '13:00', '14:15', '8');
    await stage.classAt(hidden, '12:30', '13:45', '24');
    await shareAt(stage.app, stage.asker, seen, 'building');
    const { latitude, longitude } = await stage.numbered('8');
    await expectStatus(uploadPosition(stage.app, seen, { latitude, longitude }), 200);
    await keptButHidden(stage.app, stage.asker, hidden);

    const response = await stage.send([resolve('민수'), planMeal(TUESDAY, [friend.id]), { text: '…' }]);

    const answer = answerIn(response.body);
    expect(answer.plans[0]?.band).toMatchObject({
      range: { startAt: time('11:30'), endAt: time('13:30') },
      others: [
        {
          userId: seen.id,
          name: '지은',
          busy: [
            { startAt: time('11:30'), endAt: time('12:15'), label: '8동 수업' },
            { startAt: time('13:00'), endAt: time('13:30'), label: '8동 수업' },
          ],
          walkMinutes: expect.any(Number) as unknown,
          after: '8동 수업',
        },
        {
          userId: hidden.id,
          name: '하은',
          busy: [{ startAt: time('12:30'), endAt: time('13:30'), label: '24동 수업' }],
          walkMinutes: expect.any(Number) as unknown,
          after: '24동 수업',
        },
      ],
    });
    for (const { band } of answer.plans) {
      expect(band.others?.map(({ userId }) => userId)).toEqual([seen.id, hidden.id]);
      expect(band.lanes.map(({ userId }) => userId)).toEqual([stage.asker.id, friend.id]);
    }
  });
});
