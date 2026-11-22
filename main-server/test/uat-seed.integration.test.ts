/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { ASKED_QUEST, UAT_EVENT, uatId } from '../src/uat/uat-specs.js';
import { inKorea, NOW, UatStage } from './uat-stage.js';

// The UAT data (cycle 2): what `setup`, `reset`, `s2-cancel` and `status` leave, read as the phones read it.

const stage = new UatStage();

beforeAll(async () => {
  await stage.start();
}, 120_000);

afterAll(async () => {
  await stage.stop();
});

beforeEach(async () => {
  await stage.setUp();
});

const titles = (rows: { title: string }[]): string[] => rows.map(({ title }) => title).toSorted();

describe('setup: the people', () => {
  it('leaves each tester Friends with C and E only, and B with C', async () => {
    expect(await stage.friendsOf('A1')).toEqual(['박지호', '윤서아']);
    expect(await stage.friendsOf('A3')).toEqual(['박지호', '윤서아']);
    expect(await stage.friendsOf('B')).toEqual(['박지호']);
    expect(await stage.friendsOf('D')).toEqual([]);
  });

  it('turns 위치 공유 on for B and D only, with nobody having turned it off', async () => {
    const users = await stage.prisma.user.findMany({
      select: { name: true, masterSwitchOn: true, masterOffAskedAt: true },
    });
    expect(
      users
        .filter(({ masterSwitchOn }) => masterSwitchOn)
        .map(({ name }) => name)
        .toSorted(),
    ).toEqual(['이도현', '한지우']);
    expect(users.every(({ masterOffAskedAt }) => masterOffAskedAt === null)).toBe(true);
  });
});

describe('setup: the parties', () => {
  it("shows a tester the sheet's recruiting parties, without the private one and with the full ones still listed", async () => {
    const posts = await stage.recruiting('A1');
    expect(titles(posts)).toEqual(
      [
        '[UAT] 2인 파티 · 정하윤',
        '[UAT] 2인 파티 · 최민준',
        '[UAT] Approval',
        '[UAT] Open',
        '[UAT] 공강 마감',
        '[UAT] 공강 신청함',
        '[UAT] 공강 장소없음',
        '[UAT] 공강 파티',
        '[UAT] 민턴 마감',
        '[UAT] 민턴 바로',
        '[UAT] 민턴 승인',
      ].toSorted(),
    );
    const byTitle = new Map(posts.map((post) => [post.title, post]));
    expect(byTitle.get('[UAT] 민턴 바로')).toMatchObject({ holderCount: 2, capacity: 8, joinPolicy: 'open' });
    expect(byTitle.get('[UAT] 민턴 승인')).toMatchObject({ holderCount: 1, capacity: 2, joinPolicy: 'approval' });
    expect(byTitle.get('[UAT] 민턴 바로')?.nextSubQuest.startsAt).toBe(inKorea('2026-11-24T19:20'));
    expect(byTitle.get('[UAT] 민턴 승인')?.nextSubQuest.startsAt).toBe(inKorea('2026-11-24T18:50'));
    expect(byTitle.get('[UAT] 공강 장소없음')?.nextSubQuest.place.placeId).toBeNull();
    expect(byTitle.get('[UAT] Open')?.nextSubQuest.attending).toBe(true);
  });

  it("has every tester's request to [UAT] 공강 신청함 waiting, and a party of two each leads", async () => {
    const asked = await stage.prisma.questJoinRequest.findMany({
      where: { questId: ASKED_QUEST },
      select: { user: { select: { name: true } } },
    });
    expect(asked.map(({ user }) => user.name).toSorted()).toEqual(['김서연', '정하윤', '최민준']);
    const own = await stage.prisma.quest.findUniqueOrThrow({
      where: { id: uatId('quest:two:A1') },
      include: { holders: true, leader: true },
    });
    expect(own).toMatchObject({ title: '[UAT] 2인 파티 · 김서연', capacity: 2, joinPolicy: 'open' });
    expect(own.leader.name).toBe('김서연');
    expect(own.holders).toHaveLength(1);
  });
});

describe('setup: the events and the classes', () => {
  it('lists the published [UAT] events, without the Draft, the cancelled one and what was collected for these days', async () => {
    expect(await stage.eventTitles('A1')).toEqual(
      [
        '[UAT] Event',
        '[UAT] 공강 행사 29분',
        '[UAT] 공강 행사 30분',
        '[UAT] 배드민턴 대회',
        '[UAT] 짧은 행사',
        '수집 사흘 뒤',
      ].toSorted(),
    );
  });

  it("gives the testers' classes tomorrow, and C ten and E fifteen minutes of their gap", async () => {
    const classes = await stage.prisma.timetableClass.findMany({
      include: { times: true, user: { select: { name: true } } },
    });
    const of = (name: string): string[] =>
      classes
        .filter(({ user }) => user.name === name)
        .flatMap(({ courseName, times }) =>
          times.map(({ weekday, startTime, endTime }) => `${courseName} ${weekday} ${startTime}-${endTime}`),
        )
        .toSorted();
    expect(of('김서연')).toEqual(['[UAT] 수업1 tuesday 10:00-11:30', '[UAT] 수업2 tuesday 13:00-14:30']);
    expect(of('박지호')).toEqual(['[UAT] C 수업 tuesday 11:00-12:50', '[UAT] C 저녁 tuesday 18:00-22:00']);
    expect(of('윤서아')).toEqual(['[UAT] E 수업 tuesday 11:00-12:45', '[UAT] E 저녁 tuesday 18:00-22:00']);
    expect(of('이도현')).toEqual(['[UAT] B 저녁 tuesday 18:00-22:00']);
  });
});

describe('setup: a second run', () => {
  // E's phone is in no later test, so E stands for an account that the earlier UAT held under another key.
  it("takes the place of the earlier UAT's accounts, which hold the same Friend IDs under other keys", async () => {
    const e = { googleSubject: 'uat-e' };
    await stage.prisma.$executeRawUnsafe(`TRUNCATE TABLE quests, friendships, timetable_classes CASCADE`);
    await stage.prisma.refreshToken.deleteMany({ where: { session: { user: e } } });
    await stage.prisma.session.deleteMany({ where: { user: e } });
    await stage.prisma.user.delete({ where: e });
    await stage.prisma.user.create({
      data: { googleSubject: 'uat-old', email: 'uat-old@uat.invalid', name: '예전 계정', friendId: 'UATE2345' },
    });

    await stage.setUp();

    expect(await stage.prisma.user.count({ where: { googleSubject: 'uat-old' } })).toBe(0);
    expect(await stage.prisma.user.findUniqueOrThrow({ where: { friendId: 'UATE2345' } })).toMatchObject(e);
    expect(await stage.prisma.user.count()).toBe(7);
  });

  it('keeps the phones signed in, and gives the same', async () => {
    await stage.setUp();
    expect(await stage.friendsOf('A2')).toEqual(['박지호', '윤서아']);
    expect(await stage.prisma.quest.count()).toBe(13);
  });
});

// What UAT-3 and UAT-4 leave: A1 is Friends with B, turned 위치 공유 on and off, joined 민턴 바로, made a party, and
// spent Assistant messages.
async function play(): Promise<string> {
  const [a1, b] = [await stage.idOf('A1'), await stage.idOf('B')];
  const [userAId = '', userBId = ''] = [a1, b].toSorted();
  await stage.prisma.friendship.create({ data: { userAId, userBId, senderId: a1, acceptedAt: NOW } });
  await stage.prisma.user.update({ where: { id: a1 }, data: { masterSwitchOn: true, masterOffAskedAt: NOW } });
  await stage.prisma.questHolder.create({ data: { questId: uatId('quest:minton-open'), userId: a1 } });
  await stage.prisma.quest.create({
    data: {
      title: '볼링',
      leaderId: a1,
      joinPolicy: 'open',
      board: 'hobby',
      holders: { create: [{ userId: a1 }, { userId: b }] },
      subQuests: { create: { title: '볼링', startsAt: new Date(inKorea('2026-11-24T21:30')) } },
    },
  });
  await stage.redis.set(`assistant:messages:${a1}:2026-11-23`, '9');
  return a1;
}

describe('reset', () => {
  it('sets the tester back to the start', async () => {
    const a1 = await play();

    await stage.reset('A1');

    expect(await stage.friendsOf('A1')).toEqual(['박지호', '윤서아']);
    expect(await stage.prisma.user.findUniqueOrThrow({ where: { id: a1 } })).toMatchObject({
      masterSwitchOn: false,
      masterOffAskedAt: null,
    });
    const held = await stage.prisma.questHolder.findMany({
      where: { userId: a1 },
      select: { quest: { select: { title: true } } },
    });
    expect(held.map(({ quest }) => quest.title)).toEqual(['[UAT] 2인 파티 · 김서연']);
    expect(await stage.prisma.quest.count({ where: { title: '볼링' } })).toBe(0);
    expect(await stage.prisma.questJoinRequest.count({ where: { questId: ASKED_QUEST, userId: a1 } })).toBe(1);
    expect(await stage.prisma.timetableClass.count({ where: { userId: a1 } })).toBe(2);
    expect(await stage.redis.get(`assistant:messages:${a1}:2026-11-23`)).toBeNull();
  });

  it("leaves the other testers and the helpers' own parties as they are", async () => {
    await play();
    const a2 = await stage.idOf('A2');
    await stage.prisma.questHolder.create({ data: { questId: uatId('quest:minton-open'), userId: a2 } });

    await stage.reset('A1');

    const open = await stage.prisma.quest.findUniqueOrThrow({
      where: { id: uatId('quest:minton-open') },
      include: { holders: { select: { user: { select: { name: true } } } } },
    });
    expect(open.holders.map(({ user }) => user.name).toSorted()).toEqual(['박지호', '이도현', '정하윤']);
    expect(await stage.friendsOf('A2')).toEqual(['박지호', '윤서아']);
    expect(await stage.friendsOf('B')).toEqual(['박지호']);
    expect(await stage.prisma.quest.count()).toBe(13);
  });
});

describe('s2-cancel', () => {
  it('takes [UAT] Event off the list, once', async () => {
    expect(await stage.cancel()).toEqual(['[UAT] Event를 취소했어요.']);

    expect(await stage.eventTitles('A1')).not.toContain('[UAT] Event');
    expect(await stage.prisma.globalEvent.findUniqueOrThrow({ where: { id: UAT_EVENT } })).toMatchObject({
      state: 'cancelled',
    });
    expect((await stage.cancel())[0]).toContain('취소할 [UAT] Event가 없어요');
  });
});

describe('status', () => {
  it('reads every account and the events', async () => {
    const lines = (await stage.status()).join('\n');

    expect(lines).toContain('A1 김서연: 로그인 1대 · 위치 공유 끔 · AI 0개');
    expect(lines).toContain('친구: 박지호, 윤서아');
    expect(lines).toContain('[UAT] 2인 파티 · 김서연(파티장)');
    expect(lines).toContain('신청 중: [UAT] 공강 신청함');
    expect(lines).toContain('D 한지우: 로그인 1대 · 위치 공유 켬');
    expect(lines).toContain('[UAT] Event · published');
  });
});
