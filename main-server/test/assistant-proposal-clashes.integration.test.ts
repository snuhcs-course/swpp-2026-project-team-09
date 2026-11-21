/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { COURSE, MealPlanStage, resolve } from './meal-plan.js';
import { ownQuest } from './quests.js';
import { type Step } from './scripted-model.js';

// A 파티 proposed over the asker's own time (P05 ticket 19): proposeQuest names the asker's Classes and the Quests they
// hold that the 파티 overlaps, its first 30 minutes as a Sub Quest with no end fills, and still proposes it, so that the
// model says it and asks. Nobody else's day is read: an invited Friend's Class is never named.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

// A recruiting 파티 starting at `clock` on `date`.
const codingStudy = (date: string, clock: string, more: object = {}): Step => ({
  tool: 'proposeQuest',
  input: {
    title: '코딩 스터디',
    description: '같이 코딩 공부해요',
    joinPolicy: 'approval',
    board: 'hobby',
    capacity: 4,
    startsAt: `${date}T${clock}:00+09:00`,
    ...more,
  },
});

const replySchema = z.object({ proposal: z.unknown() });

describe('A 파티 proposed over the asker’s own time', () => {
  it('names the Class it falls in, with its time, and is still proposed', async () => {
    await stage.asking('2090-01-09', '11:30');
    await stage.classAt(stage.asker, '15:00', '16:15', '301');

    const response = await stage.send([codingStudy('2090-01-10', '15:00'), { text: '…' }], {}, '내일 15시 코딩스터디');

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'proposed',
      clashes: [{ kind: 'class', name: expect.stringContaining(COURSE) as unknown, start: '15:00', end: '16:15' }],
    });
    expect(replySchema.parse(response.body).proposal).not.toBeNull();
  });

  it('names a Quest the asker holds that its first 30 minutes reach, and nothing at a free time', async () => {
    await stage.asking('2090-01-16', '11:30');
    await stage.classAt(stage.asker, '15:00', '16:15', '301');
    await ownQuest(stage.app, stage.asker, {
      title: '스터디 준비',
      subQuest: { title: '스터디 준비', startsAt: '2090-01-17T13:20:00+09:00', endsAt: '2090-01-17T14:00:00+09:00' },
    });

    await stage.send([codingStudy('2090-01-17', '13:00'), { text: '…' }], {}, '내일 13시 코딩스터디');
    const reached = stage.model.toolResults()[0];
    await stage.send([codingStudy('2090-01-17', '14:00'), { text: '…' }], {}, '내일 14시 코딩스터디');

    expect(reached).toMatchObject({
      clashes: [
        { kind: 'quest', name: expect.stringContaining('스터디 준비') as unknown, start: '13:20', end: '14:00' },
      ],
    });
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'proposed' });
    expect(stage.model.toolResults()[0]).not.toHaveProperty('clashes');
  });
});

describe('An invited Friend’s day', () => {
  it('is never read: their Class at the time is not named', async () => {
    await stage.asking('2090-01-23', '11:30');
    const hyunsu = await stage.friend('현수');
    await stage.classAt(hyunsu, '13:00', '14:15', '301');

    await stage.send(
      [
        resolve('현수'),
        codingStudy('2090-01-24', '13:00', {
          joinPolicy: 'closed',
          board: undefined,
          description: '',
          capacity: 2,
          inviteeIds: [hyunsu.id],
        }),
        { text: '…' },
      ],
      {},
      '내일 13시 현수랑 코딩스터디',
    );

    const [, proposed] = stage.model.toolResults();
    expect(proposed).toMatchObject({ result: 'proposed' });
    expect(proposed).not.toHaveProperty('clashes');
    expect(JSON.stringify(proposed)).not.toContain(COURSE);
  });
});
