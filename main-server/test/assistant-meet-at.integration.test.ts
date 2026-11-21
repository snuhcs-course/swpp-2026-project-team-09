/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { COURSE, MealPlanStage, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A meeting at a start the User fixed (P05 ticket 26): "내일 민수랑 두시에 보자" plans from that start, and the answer
// says whether it holds. When it does not, the first plan is the nearest time everyone can be there, and the answer
// says who is busy then: a Friend by their name and when it ends only, the asker by their own Class too.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const MEET_APP = { clientCapabilities: ['library', 'answer', 'meet'] };

const meetAt = (date: string, friendId: string, at: string): Step => ({
  tool: 'planMeet',
  input: { date, friendIds: [friendId], at },
});

const askedSchema = z.object({
  asked: z.object({ at: z.string(), fits: z.boolean(), busy: z.array(z.record(z.string(), z.unknown())).optional() }),
  plans: z.array(z.object({ start: z.string() })),
});

describe('A meeting at a start the User fixed', () => {
  it('starts then when everyone is free, and says it fits', async () => {
    await stage.asking('2091-04-02', '11:30');
    const minsu = await stage.friend('민수');

    await stage.send(
      [resolve('민수'), meetAt('2091-04-03', minsu.id, '14:00'), { text: '…' }],
      MEET_APP,
      '내일 민수랑 두시에 보자',
    );

    const told = askedSchema.parse(stage.model.toolResults()[1]);
    expect(told.asked).toEqual({ at: '14:00', fits: true });
    expect(told.plans[0]?.start).toBe('14:00');
  });
});

describe('A fixed start nobody can keep', () => {
  it('offers the nearest time when a Friend is in a Class then, naming them by when it ends only', async () => {
    await stage.asking('2091-04-09', '11:30');
    const minsu = await stage.friend('민수');
    await stage.classAt(minsu, '14:00', '15:15', '301');

    await stage.send(
      [resolve('민수'), meetAt('2091-04-10', minsu.id, '14:00'), { text: '…' }],
      MEET_APP,
      '내일 민수랑 두시에 보자',
    );

    const told = askedSchema.parse(stage.model.toolResults()[1]);
    expect(told.asked).toMatchObject({
      at: '14:00',
      fits: false,
      busy: [{ who: 'friend', name: expect.stringContaining('민수') as unknown, until: '15:15', kind: 'class' }],
    });
    expect(told.plans[0]?.start.localeCompare('15:15')).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(stage.model.toolResults()[1])).not.toContain(COURSE);
  });

  it('names the asker’s own Class when it is theirs that is in the way', async () => {
    await stage.asking('2091-04-16', '11:30');
    const minsu = await stage.friend('민수');
    await stage.classAt(stage.asker, '14:00', '15:15', '301');

    await stage.send(
      [resolve('민수'), meetAt('2091-04-17', minsu.id, '14:00'), { text: '…' }],
      MEET_APP,
      '내일 민수랑 두시에 보자',
    );

    expect(askedSchema.parse(stage.model.toolResults()[1]).asked).toMatchObject({
      fits: false,
      busy: [{ who: 'you', name: expect.stringContaining(COURSE) as unknown, until: '15:15', kind: 'class' }],
    });
  });
});
