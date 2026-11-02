/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { befriend, type TestUser } from './friends.js';
import { answerInvitation, invite } from './quest-recruiting.js';
import { DECLINED, inboxSchema, lunchQuest, PARTY_REFUSAL, ROOM_KEY, RoomStage } from './room-requests.js';

// A room request from the book card: the booking party it makes, the consents that make it ready, the people it
// holds, what the booking came to, its cancel and its expiry.

// Each test signs in four to nine Users and befriends them over HTTP before it starts, which takes up to 4 s on a
// loaded runner: close to Vitest's 5 s. Only these files wait longer.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

// The requester and three Friends: four people, which 그룹스터디룸 6인실 takes.
function fourOf(prefix: string): Promise<readonly [TestUser, TestUser, TestUser, TestUser]> {
  return stage.party([`${prefix}부커`, `${prefix}민수`, `${prefix}지은`, `${prefix}하늘`] as const);
}

const ids = (users: readonly TestUser[]): string[] => users.map(({ id }) => id);

async function asksOf(user: TestUser): Promise<ReturnType<typeof inboxSchema.parse>['asks']> {
  return inboxSchema.parse((await stage.inbox(user).expect(200)).body).asks;
}

// A request of the requester's that asks an existing Quest's other Holders.
async function askingQuest(booker: TestUser, questId: string): Promise<string> {
  return (await stage.asking(booker, questId)).id;
}

async function enterByInvitation(leader: TestUser, questId: string, user: TestUser): Promise<void> {
  await invite(stage.app, leader, questId, user.id).expect(204);
  await answerInvitation(stage.app, user, await stage.invitationOf(user), 'accept').expect(201);
}

describe('Making a room request with Friends', () => {
  it('makes the Closed booking party with one Sub Quest at 관정관 and an invitation for each Friend', async () => {
    const [booker, ...friends] = await fourOf('만들');
    const made = await stage.made(booker, friends);

    expect(made).toMatchObject({ status: 'gathering', madeForBooking: true, date: '2026-11-05', start: '15:00' });
    expect(made.consents.map(({ consented }) => consented)).toEqual([null, null, null]);

    const quest = await stage.prisma.quest.findUniqueOrThrow({
      where: { id: made.questId },
      include: { subQuests: { include: { place: true } }, invitations: true },
    });

    expect(quest).toMatchObject({ joinPolicy: 'closed', leaderId: booker.id, title: `관정 ${made.space.name} 예약` });
    expect(quest.subQuests.map(({ startsAt, endsAt, place }) => ({ startsAt, endsAt, number: place?.number }))).toEqual(
      [
        {
          startsAt: new Date('2026-11-05T15:00:00+09:00'),
          endsAt: new Date('2026-11-05T16:00:00+09:00'),
          number: '62-1',
        },
      ],
    );
    expect(quest.invitations.map(({ userId }) => userId).toSorted()).toEqual(ids(friends).toSorted());
  });
});

describe('The people a room request holds', () => {
  it('accepts 8 people and refuses 9 with the party reason', async () => {
    const names = ['팔부', '팔1', '팔2', '팔3', '팔4', '팔5', '팔6', '팔7', '팔8'] as const;
    const [booker, ...friends] = await stage.party(names, '20268');

    await stage
      .create(booker, { key: 'book:4F-group-8:2026-11-05:1500:60', friendIds: ids(friends.slice(0, 7)) })
      .expect(201);
    const nine = await stage
      .create(booker, { key: 'book:4F-group-10:2026-11-05:1500:60', friendIds: ids(friends) })
      .expect(400);

    expect(nine.body).toMatchObject({ message: PARTY_REFUSAL });
  });
});

describe('What a room request is refused for', () => {
  it('refuses G201, the 20인실, as more than a party holds', async () => {
    const [booker, ...friends] = await fourOf('이공');
    const response = await stage
      .create(booker, { key: 'book:2F-group-20:2026-11-05:1500:60', friendIds: ids(friends) })
      .expect(400);

    expect(response.body).toMatchObject({ message: PARTY_REFUSAL });
  });

  it('refuses a User who is not a Friend, and a day outside the window, as the tool does', async () => {
    const [booker, ...friends] = await fourOf('남남');
    const stranger = await stage.user('남남모름');

    await stage.create(booker, { key: ROOM_KEY, friendIds: [...ids(friends.slice(1)), stranger.id] }).expect(400);
    const late = await stage
      .create(booker, { key: 'book:4F-group-6:2026-11-09:1500:60', friendIds: ids(friends) })
      .expect(400);

    expect(late.body).toMatchObject({ code: 'ROOM_REQUEST_REFUSED' });
    expect(await stage.prisma.roomRequest.count({ where: { requesterId: booker.id } })).toBe(0);
  });
});

describe('Consent', () => {
  it('accepts the invitation, and the last consent makes the request ready', async () => {
    const [booker, minsu, jieun, haneul] = await fourOf('동의');
    const { id, questId } = await stage.made(booker, [minsu, jieun, haneul]);

    expect(await asksOf(minsu)).toEqual([expect.objectContaining({ requestId: id, consented: null, recheck: false })]);

    await stage.consent(minsu, id).expect(200);
    await stage.consent(jieun, id).expect(200);

    expect(await stage.holderIds(questId)).toEqual(expect.arrayContaining([minsu.id, jieun.id]));
    expect((await stage.status(booker, id)).status).toBe('gathering');

    await stage.consent(haneul, id).expect(200);

    expect((await stage.status(booker, id)).status).toBe('ready');
  });

  it('is refused while the 학번 is not in 내 정보, which the dialog saves first', async () => {
    const [booker, minsu, jieun] = await stage.party(['학번부', '학번1', '학번2'] as const);
    const blank = await stage.user('학번없음');
    await befriend(stage.app, booker, blank);
    const { id } = await stage.made(booker, [minsu, jieun, blank]);

    const refused = await stage.consent(blank, id).expect(409);

    expect(refused.body).toMatchObject({ code: 'STUDENT_NUMBER_MISSING' });
  });
});

describe('A decline', () => {
  it('dissolves the request, deletes a booking party made for it and tells everyone it asked', async () => {
    const [booker, minsu, jieun, haneul] = await fourOf('거절');
    const { id, questId } = await stage.made(booker, [minsu, jieun, haneul]);
    await stage.consent(minsu, id).expect(200);
    await stage.decline(jieun, id).expect(204);

    expect(await stage.status(booker, id)).toMatchObject({ status: 'dissolved', reason: DECLINED, consents: [] });
    expect(await stage.prisma.quest.count({ where: { id: questId } })).toBe(0);
    for (const user of [booker, minsu, jieun, haneul]) {
      // oxlint-disable-next-line no-await-in-loop -- one User at a time
      expect(await stage.notices(user)).toEqual([DECLINED]);
    }
  });

  it('declining the booking party’s invitation dissolves it too', async () => {
    const [booker, minsu, jieun, haneul] = await fourOf('초대');
    const { id } = await stage.made(booker, [minsu, jieun, haneul]);
    await answerInvitation(stage.app, minsu, await stage.invitationOf(minsu), 'decline').expect(204);

    expect((await stage.status(booker, id)).status).toBe('dissolved');
  });

  it('never deletes or changes an existing Quest: only the request ends', async () => {
    const people = await fourOf('점심');
    const [booker, , , haneul] = people;
    const lunch = await lunchQuest(stage.prisma, [booker.id, ...ids(people.slice(1))]);
    const id = await askingQuest(booker, lunch);
    await stage.decline(haneul, id).expect(204);

    expect((await stage.status(booker, id)).status).toBe('dissolved');
    expect((await stage.holderIds(lunch)).toSorted()).toEqual(ids(people).toSorted());
    expect(await stage.prisma.quest.findUniqueOrThrow({ where: { id: lunch } })).toMatchObject({ title: '점심 파티' });
  });
});

describe('A Holder who joins later', () => {
  it('is asked too, and the request waits for their consent', async () => {
    const people = await stage.party(['늦게부', '늦게1', '늦게2', '늦게3', '늦게4'] as const, '20267');
    const [booker, minsu, jieun, haneul, later] = people;
    const lunch = await lunchQuest(stage.prisma, [booker.id, minsu.id, jieun.id, haneul.id]);
    const id = await askingQuest(booker, lunch);
    await stage.allConsent(id, [minsu, jieun, haneul]);

    expect((await stage.status(booker, id)).status).toBe('ready');

    await enterByInvitation(booker, lunch, later);

    expect((await stage.status(booker, id)).status).toBe('gathering');
    await stage.companions(booker, id).expect(409);
    expect(await asksOf(later)).toHaveLength(1);

    await stage.consent(later, id).expect(200);

    expect((await stage.status(booker, id)).status).toBe('ready');
  });

  it('dissolves the request with the reason when the room no longer holds everyone', async () => {
    const names = ['넘침부', '넘침1', '넘침2', '넘침3', '넘침4', '넘침5', '넘침6'] as const;
    const people = await stage.party(names, '20266');
    const [booker, , , , , , seventh] = people;
    const lunch = await lunchQuest(stage.prisma, [booker.id, ...ids(people.slice(1, 6))]);
    const id = await askingQuest(booker, lunch);
    await enterByInvitation(booker, lunch, seventh);
    const ended = await stage.status(booker, id);

    expect(ended.status).toBe('dissolved');
    expect(ended.reason).toContain('최대 6명');
    expect(await stage.prisma.quest.count({ where: { id: lunch } })).toBe(1);
  });
});

describe('The booking', () => {
  it('booked tells the members, and a companion the library did not recognise is asked again', async () => {
    const [booker, minsu, jieun, haneul] = await fourOf('예약');
    const { id } = await stage.made(booker, [minsu, jieun, haneul]);
    await stage.allConsent(id, [minsu, jieun, haneul]);
    await stage.result(booker, id, { ok: false, failedUserId: jieun.id }).expect(204);

    expect(await stage.status(booker, id)).toMatchObject({ status: 'gathering', failed: { userId: jieun.id } });
    expect(await asksOf(jieun)).toEqual([expect.objectContaining({ recheck: true, consented: null })]);

    await stage.consent(jieun, id).expect(200);

    expect(await stage.status(booker, id)).toMatchObject({ status: 'ready', failed: null });

    await stage.result(booker, id, { ok: false }).expect(204);

    expect((await stage.status(booker, id)).status).toBe('ready');

    await stage.result(booker, id, { ok: true }).expect(204);

    expect(await stage.status(booker, id)).toMatchObject({ status: 'booked', consents: [] });
    expect(await stage.notices(minsu)).toEqual([
      expect.stringMatching(/^예약부커님이 .+ 11월 5일 15:00 예약을 마쳤어요$/u),
    ]);
  });
});

describe('The end of a room request', () => {
  it('cancelled is the requester’s only while booked, deletes the booking party and frees its members’ day', async () => {
    const [booker, minsu, jieun, haneul] = await fourOf('취소');
    const { id, questId, space } = await stage.made(booker, [minsu, jieun, haneul]);
    await stage.cancelled(booker, id).expect(409);
    await stage.allConsent(id, [minsu, jieun, haneul]);
    await stage.result(booker, id, { ok: true }).expect(204);

    expect(await stage.itemNames(minsu.id, '2026-11-05')).toEqual([`관정 ${space.name} 예약`]);

    await stage.cancelled(minsu, id).expect(403);
    await stage.cancelled(booker, id).expect(204);
    await stage.cancelled(booker, id).expect(204);

    expect((await stage.status(booker, id)).status).toBe('cancelled');
    expect(await stage.prisma.quest.count({ where: { id: questId } })).toBe(0);
    expect(await stage.itemNames(minsu.id, '2026-11-05')).toEqual([]);
    expect((await stage.notices(haneul)).at(-1)).toMatch(/^취소부커님이 .+ 예약을 취소했어요$/u);
  });

  it('a request still not booked at its start expires, and its booking party goes', async () => {
    const [booker, ...friends] = await fourOf('만료');
    // Today, so that no other file's request, all on Thursday, is due when the clock moves.
    const { id, questId } = await stage.made(booker, friends, 'book:4F-group-6:2026-11-04:1030:60');
    const now = vi.spyOn(stage.clock, 'now').mockReturnValue(new Date('2026-11-04T10:30:00+09:00'));
    try {
      expect(await stage.status(booker, id)).toMatchObject({ status: 'expired', consents: [] });
    } finally {
      now.mockReturnValue(new Date('2026-11-04T10:05:00+09:00'));
    }

    expect(await stage.prisma.quest.count({ where: { id: questId } })).toBe(0);
    expect(await stage.prisma.roomConsent.count({ where: { requestId: id } })).toBe(0);
  });
});
