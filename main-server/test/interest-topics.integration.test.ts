/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Quest } from '../src/generated/prisma/client.js';
import { BADMINTON, InterestsStage, JOB_FAIR } from './interests.js';
import { ownQuest, storeEvent } from './quests.js';

// The topics step over the published Global Events and the recruiting Quests, with a stand-in for the model.

const stage = new InterestsStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('The topics step', () => {
  it('stores the topics of an event and of a recruiting Quest, and asks for neither again', async () => {
    const event = await stage.jobFair();
    const questId = await ownQuest(stage.app, await stage.user(), { title: BADMINTON, joinPolicy: 'open' });
    const quest = (): Promise<Quest> => stage.prisma.quest.findUniqueOrThrow({ where: { id: questId } });

    await stage.stepUntil(async () => (await stage.event(event.id)).topicsTries > 0 && (await quest()).topicsTries > 0);

    expect(await stage.event(event.id)).toMatchObject({ topics: ['채용'], topicsTries: 1 });
    expect((await stage.event(event.id)).topicsReadAt).not.toBeNull();
    expect(await quest()).toMatchObject({ topics: ['배드민턴', '운동'], topicsTries: 1 });
    expect((await quest()).topicsReadAt).not.toBeNull();
    const asked = [stage.topics.asked(JOB_FAIR), stage.topics.asked(BADMINTON)];
    await stage.runStep();
    expect([stage.topics.asked(JOB_FAIR), stage.topics.asked(BADMINTON)]).toEqual(asked);
  });

  it('leaves an event without topics when the call fails, asks once more, and then never', async () => {
    stage.topics.answer('고장 난 설명회', 'fail');
    const event = await storeEvent(stage.prisma, { title: '고장 난 설명회' });
    const tries = async (): Promise<number> => (await stage.event(event.id)).topicsTries;

    await stage.stepUntil(async () => (await tries()) === 1);
    expect(await stage.event(event.id)).toMatchObject({ topics: [], topicsTries: 1 });
    await stage.stepUntil(async () => (await tries()) === 2);
    await stage.runStep();
    await stage.runStep();

    expect(await stage.event(event.id)).toMatchObject({ topics: [], topicsTries: 2 });
    expect(stage.topics.asked('고장 난 설명회')).toBe(2);
  });

  it('reads no Closed Quest and no event that has ended', async () => {
    const closed = await ownQuest(stage.app, await stage.user(), { title: '닫힌 배드민턴' });
    const ended = await storeEvent(stage.prisma, {
      title: '끝난 채용박람회',
      startsAt: new Date('2020-03-05T14:00:00+09:00'),
      endsAt: new Date('2020-03-05T17:00:00+09:00'),
    });
    await stage.tagged(await stage.jobFair());

    expect((await stage.prisma.quest.findUniqueOrThrow({ where: { id: closed } })).topicsTries).toBe(0);
    expect((await stage.event(ended.id)).topicsTries).toBe(0);
  });
});
