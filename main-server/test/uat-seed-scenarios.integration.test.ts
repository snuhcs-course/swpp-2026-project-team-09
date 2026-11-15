/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { cancelUatEvent } from '../src/uat/uat.seed.js';
import { NOW, inKorea, UatStage } from './uat-stage.js';

// What the preparations of Risk 1, 3 and 4 write, as the UAT sheet's Setup of each asks, read as A's phone reads it.

const stage = new UatStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('Risk 1', () => {
  beforeAll(() => stage.prepare('risk1'));

  it('makes A and B Friends, and leaves C out', async () => {
    expect(await stage.friendsOf('A')).toStrictEqual(['이도현']);
    expect(await stage.friendsOf('C')).toStrictEqual([]);
  });

  it("lists B's public badminton posts with their places taken, the private one left out", async () => {
    const posts = await stage.recruiting('?board=hobby');

    expect(
      posts.map(({ title, joinPolicy, holderCount, capacity, nextSubQuest }) => [
        title,
        joinPolicy,
        `${holderCount}/${capacity}`,
        nextSubQuest.startsAt,
      ]),
    ).toStrictEqual([
      ['[UAT] 민턴 진행 중', 'open', '1/4', inKorea('2026-11-16T15:30')],
      ['[UAT] 민턴 승인', 'approval', '1/2', inKorea('2026-11-17T18:50')],
      ['[UAT] 민턴 마감', 'open', '1/1', inKorea('2026-11-17T19:10')],
      ['[UAT] 민턴 바로', 'open', '1/6', inKorea('2026-11-17T19:20')],
    ]);
  });

  it('shows of the three events only the published one', async () => {
    expect(await stage.eventTitles()).toStrictEqual(['[UAT] 배드민턴 대회', '수집 사흘 뒤']);
  });
});

// Menus as the Collections wrote them: the coming Sunday's, which the preparation removes, and today's.
async function writeMenus(): Promise<void> {
  await stage.prisma.restaurantDay.createMany({
    data: ['2026-11-22', '2026-11-16'].map((date) => ({
      source: 'dormitory_menus' as const,
      date: new Date(`${date}T00:00:00Z`),
      restaurant: '기숙사식당',
      collectedAt: NOW,
    })),
  });
}

describe('Risk 3, after Risk 1', () => {
  beforeAll(async () => {
    await writeMenus();
    await stage.prepare('risk3');
  });

  it('makes B and C Friends of A', async () => {
    expect(await stage.friendsOf('A')).toStrictEqual(['박지호', '이도현']);
  });

  it('gives C a Class through all of dinner, and A and B none', async () => {
    const classes = z.array(
      z.object({ courseName: z.string(), times: z.array(z.object({ weekday: z.string(), startTime: z.string() })) }),
    );

    expect(classes.parse(await stage.bodyOf('/timetable/classes', 'C'))).toMatchObject([
      { courseName: '[UAT] C 수업', times: [{ weekday: 'monday', startTime: '16:30' }] },
    ]);
    expect(await stage.bodyOf('/timetable/classes', 'A')).toStrictEqual([]);
    expect(await stage.bodyOf('/timetable/classes', 'B')).toStrictEqual([]);
  });

  it("lists B's four posts of today inside the gap, one of them at words that name no Place", async () => {
    const posts = await stage.recruiting();

    expect(
      posts.map(({ title, nextSubQuest }) => [title, nextSubQuest.startsAt, nextSubQuest.place.placeId === null]),
    ).toStrictEqual([
      ['[UAT] Gap', inKorea('2026-11-16T17:25'), false],
      ['[UAT] Gap 마감', inKorea('2026-11-16T17:30'), false],
      ['[UAT] Gap 장소없음', inKorea('2026-11-16T17:35'), true],
      ['[UAT] Gap 늦음', inKorea('2026-11-16T18:25'), false],
    ]);
  });

  it('publishes the gap event', async () => {
    expect(await stage.eventTitles()).toStrictEqual(['[UAT] Gap Event', '수집 사흘 뒤']);
  });

  it("removes the coming Sunday's menus and keeps today's", async () => {
    const days = await stage.prisma.restaurantDay.findMany({ where: { restaurant: '기숙사식당' } });

    expect(days.map(({ date }) => date.toISOString().slice(0, 10))).toStrictEqual(['2026-11-16']);
  });
});

describe('Risk 4, after Risk 3', () => {
  beforeAll(() => stage.prepare('risk4'));

  it('leaves A and B not Friends, with 친구와 위치 공유 on', async () => {
    expect(await stage.friendsOf('A')).toStrictEqual([]);
    const on = await stage.prisma.user.findMany({ where: { masterSwitchOn: true }, select: { name: true } });
    expect(on.map(({ name }) => name).toSorted()).toStrictEqual(['김서연', '이도현']);
  });

  it("publishes today's two events, the short one ending 8 minutes after the run", async () => {
    expect(await stage.eventTitles()).toStrictEqual(['[UAT] Event', '[UAT] 짧은 행사', '수집 사흘 뒤']);
    const short = await stage.prisma.globalEvent.findFirstOrThrow({ where: { title: '[UAT] 짧은 행사' } });
    expect(short.endsAt?.toISOString()).toBe(inKorea('2026-11-16T16:08'));
  });

  it("lists B's Open and C's Approval post for the event", async () => {
    const event = await stage.prisma.globalEvent.findFirstOrThrow({ where: { title: '[UAT] Event' } });
    const posts = await stage.recruiting(`?globalEventId=${event.id}`);

    expect(
      posts
        .toSorted((a, b) => a.title.localeCompare(b.title))
        .map(({ title, leader, joinPolicy, nextSubQuest }) => [title, leader.name, joinPolicy, nextSubQuest.attending]),
    ).toStrictEqual([
      ['[UAT] Approval', '박지호', 'approval', true],
      ['[UAT] Open', '이도현', 'open', true],
    ]);
  });

  it('cancels the event where the sheet has an Administrator cancel it', async () => {
    expect(await cancelUatEvent(stage.prisma, stage.redis)).toStrictEqual(['[UAT] Event를 취소했어요.']);

    expect(await stage.eventTitles()).toStrictEqual(['[UAT] 짧은 행사', '수집 사흘 뒤']);
  });
});
