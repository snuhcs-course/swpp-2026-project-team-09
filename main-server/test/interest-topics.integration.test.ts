/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { onTestFinished } from 'vitest';
import { JoinPolicy, type Quest, QuestBoard } from '../src/generated/prisma/client.js';
import { BADMINTON, InterestsStage, JOB_FAIR, TENNIS_CLUB, TENNIS_LESSON } from './interests.js';
import { ownQuest, storeEvent } from './quests.js';

// The topics step over the published Global Events and the recruiting Quests, with a stand-in for the model.

const stage = new InterestsStage();

// Events that started this long ago and have not ended come first in a step.
const LONG_AGO = new Date('2000-01-01T09:00:00+09:00');
const FAR_AHEAD = new Date('2099-01-01T09:00:00+09:00');

// Past the topics call's time limit in the tests (ASSISTANT_TIMEOUT_MS, 30 s) and the minute after it.
const PAST_THE_CALL_MS = 2 * 60 * 1000;

// Open Quests on a Board whose one Sub Quest ended an hour ago, removed when the test ends.
async function storeEndedQuests(leaderId: string, count: number): Promise<string[]> {
  const ids = Array.from({ length: count }, () => randomUUID());
  const endsAt = new Date(Date.now() - 60 * 60 * 1000);
  onTestFinished(async () => {
    await stage.prisma.quest.deleteMany({ where: { id: { in: ids } } });
  });
  await stage.prisma.quest.createMany({
    data: ids.map((id) => ({
      id,
      title: '지난 배드민턴',
      leaderId,
      joinPolicy: JoinPolicy.open,
      board: QuestBoard.hobby,
    })),
  });
  await stage.prisma.subQuest.createMany({
    data: ids.map((questId) => ({
      questId,
      title: '배드민턴',
      startsAt: new Date(endsAt.getTime() - 60 * 60 * 1000),
      endsAt,
    })),
  });
  return ids;
}

// The topics step reads the unread events and recruiting Quests of the shared database, other files' too, ten of each a
// step, before it reaches this test's own: on a loaded runner that takes longer than Vitest's 5 s.
vi.setConfig({ testTimeout: 30_000 });

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

  it('leaves an event without topics when the call fails, asks once more after the call is over, and then never', async () => {
    stage.topics.answer('고장 난 설명회', 'fail');
    const event = await storeEvent(stage.prisma, { title: '고장 난 설명회' });
    const tries = async (): Promise<number> => (await stage.event(event.id)).topicsTries;

    await stage.stepUntil(async () => (await tries()) === 1);
    expect(await stage.event(event.id)).toMatchObject({ topics: [], topicsTries: 1 });
    stage.moveClock(PAST_THE_CALL_MS);
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

describe('A second topics step', () => {
  it('does not ask about an event whose first call may still be running', async () => {
    // As a step on another server leaves it while its call runs.
    const event = await storeEvent(stage.prisma, {
      title: '아직 읽는 설명회',
      startsAt: LONG_AGO,
      endsAt: FAR_AHEAD,
      topicsTries: 1,
      topicsReadAt: new Date(),
    });

    await stage.runStep();

    expect(await stage.event(event.id)).toMatchObject({ topics: [], topicsTries: 1 });
    expect(stage.topics.asked('아직 읽는 설명회')).toBe(0);
  });
});

describe('One topics step', () => {
  it('reads the topics in use once, and gives two events that read alike one word', async () => {
    const lesson = await storeEvent(stage.prisma, { title: TENNIS_LESSON, startsAt: LONG_AGO, endsAt: FAR_AHEAD });
    const club = await storeEvent(stage.prisma, {
      title: TENNIS_CLUB,
      startsAt: new Date(LONG_AGO.getTime() + 60_000),
      endsAt: FAR_AHEAD,
    });
    const inUse = vi.spyOn(stage.reader, 'inUse');

    await stage.runStep();

    expect(inUse).toHaveBeenCalledOnce();
    inUse.mockRestore();
    expect(await stage.event(lesson.id)).toMatchObject({ topics: ['테니스'], topicsTries: 1 });
    expect(await stage.event(club.id)).toMatchObject({ topics: ['테니스'], topicsTries: 1 });
  });
});

describe('The Quests the topics step loads', () => {
  it('leave out a Quest with nothing ahead', async () => {
    const [ended] = await storeEndedQuests((await stage.user()).id, 1);
    const findMany = vi.spyOn(stage.appPrisma.quest, 'findMany');

    await stage.runStep();

    expect(findMany).toHaveBeenCalled();
    // A Prisma query is no Promise, so the spy keeps it unsettled; awaiting it again gives the rows it gave the step.
    const loaded = await Promise.all(
      findMany.mock.results.flatMap((result) => (result.type === 'return' ? [result.value] : [])),
    );
    findMany.mockRestore();
    expect(loaded.flat().map(({ id }) => id)).not.toContain(ended);
  });

  it('reach a recruiting Quest behind more than a hundred newer Quests with nothing ahead', async () => {
    const leader = await stage.user();
    const questId = await ownQuest(stage.app, leader, { title: BADMINTON, joinPolicy: 'open' });
    await storeEndedQuests(leader.id, 101);
    const quest = (): Promise<Quest> => stage.prisma.quest.findUniqueOrThrow({ where: { id: questId } });

    await stage.stepUntil(async () => (await quest()).topicsTries > 0);

    expect(await quest()).toMatchObject({ topics: ['배드민턴', '운동'], topicsTries: 1 });
  });
});
