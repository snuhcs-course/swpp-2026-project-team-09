/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { lunchQuest, NOW, roomRequestSchema, RoomStage } from './room-requests.js';

// A companion who has not answered by 20:00 on the day before the meeting is out at the next read.
//
// Every room file shares one database, and any read applies the deadlines of every request by its own file's clock,
// which stands at Wednesday 2026-11-04 10:05. So a request whose deadline is still to come at a check is due after
// Wednesday 10:30, and this file's clock stays before Wednesday 20:00, the other files' deadline.

// Each test signs in four Users and befriends them over HTTP before it starts, which takes up to 4 s on a loaded
// runner: close to Vitest's 5 s.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

afterEach(() => {
  at(NOW);
});

const at = (time: Date): void => {
  vi.spyOn(stage.clock, 'now').mockReturnValue(time);
};

const korea = (time: string): Date => new Date(`${time}+09:00`);

let count = 0;

// A request for the six-person room made at `when`, which the first Friend consents to and the others leave asked.
async function madeAt(when: Date, key: string): Promise<{ people: readonly TestUser[]; id: string }> {
  count += 1;
  const people = await stage.party([`마감${count}부`, `마감${count}a`, `마감${count}b`, `마감${count}c`] as const);
  const [booker, ...friends] = people;
  at(when);
  const { id } = await stage.made(booker, friends, key);
  await stage.consent(friends[0], id).expect(200);
  return { people, id };
}

const states = async (booker: TestUser, id: string): Promise<string[]> =>
  (await stage.status(booker, id)).companions.map(({ state }) => state).toSorted();

describe('A request made on Monday for Wednesday 15:30', () => {
  it('counts a companion still asked at Tuesday 20:00 as unanswered at the next read, and tells the booker', async () => {
    const { people, id } = await madeAt(korea('2026-11-02T10:00:00'), 'book:4F-group-6:2026-11-04:1530:60');
    const [booker] = people;
    at(korea('2026-11-03T20:00:00'));

    expect(await states(booker, id)).toEqual(['consented', 'unanswered', 'unanswered']);
    expect(await stage.status(booker, id)).toMatchObject({ status: 'gathering', moreNeeded: 2 });
    expect(await stage.notificationsOf(booker, 'room-declined', 2)).toHaveLength(2);
  });
});

describe('A request made on Tuesday for Thursday 15:30', () => {
  it('changes nothing at a read at Wednesday 19:59', async () => {
    const { people, id } = await madeAt(korea('2026-11-03T10:00:00'), 'book:4F-group-6:2026-11-05:1530:60');
    const [booker] = people;
    at(korea('2026-11-04T19:59:00'));

    expect(await states(booker, id)).toEqual(['asked', 'asked', 'consented']);
  });
});

describe('Requests with no deadline', () => {
  it('one made on Tuesday at 20:30 for Wednesday', async () => {
    const { people, id } = await madeAt(korea('2026-11-03T20:30:00'), 'book:4F-group-6:2026-11-04:1530:60');
    const [booker] = people;
    at(korea('2026-11-04T10:00:00'));

    expect(await states(booker, id)).toEqual(['asked', 'asked', 'consented']);
  });

  it('one for the same day', async () => {
    const { people, id } = await madeAt(korea('2026-11-04T09:00:00'), 'book:4F-group-6:2026-11-04:1530:60');
    const [booker] = people;
    at(korea('2026-11-04T15:00:00'));

    expect(await states(booker, id)).toEqual(['asked', 'asked', 'consented']);
  });
});

describe('A companion asked after the deadline', () => {
  // A request made on Monday for Wednesday 15:30, whose first asked companions are out at Tuesday 20:00.
  const WEDNESDAY = 'book:4F-group-6:2026-11-04:1530:60';

  it('stays asked at the next read when the booker asks them at Tuesday 21:00, and the booker is not told', async () => {
    count += 1;
    const names = [`늦게${count}부`, `늦게${count}a`, `늦게${count}b`, `늦게${count}c`, `늦게${count}d`] as const;
    const [booker, minsu, jieun, seojun, haeun] = await stage.party(names);
    at(korea('2026-11-02T10:00:00'));
    const { id } = await stage.made(booker, [minsu, jieun, seojun], WEDNESDAY);
    await stage.consent(minsu, id).expect(200);
    at(korea('2026-11-03T20:00:00'));
    await stage.status(booker, id);

    at(korea('2026-11-03T21:00:00'));
    await stage.askOneMore(booker, id, haeun.id).expect(201);
    at(korea('2026-11-03T21:30:00'));

    expect(await stage.states(booker, id)).toEqual({
      [names[1]]: 'consented',
      [names[2]]: 'unanswered',
      [names[3]]: 'unanswered',
      [names[4]]: 'asked',
    });
    const told = await stage.notificationsOf(booker, 'room-declined', 2);
    expect(told.map(({ title }) => title).join(' ')).not.toContain(names[4]);
  });

  it('stays asked when a Holder joins the request’s own Quest after the deadline', async () => {
    count += 1;
    const names = [`합류${count}부`, `합류${count}a`, `합류${count}b`, `합류${count}c`, `합류${count}d`] as const;
    const [booker, minsu, jieun, seojun, haeun] = await stage.party(names);
    const questId = await lunchQuest(stage.prisma, [booker.id, minsu.id, jieun.id, seojun.id]);
    at(korea('2026-11-02T10:00:00'));
    const { id } = roomRequestSchema.parse((await stage.create(booker, { key: WEDNESDAY, questId }).expect(201)).body);

    at(korea('2026-11-03T21:00:00'));
    await stage.prisma.questHolder.create({ data: { questId, userId: haeun.id } });
    const { RoomRequestSync } = await import('../src/library/room-request-sync.service.js');
    await stage.app.get(RoomRequestSync).questChanged(questId);
    at(korea('2026-11-03T21:30:00'));

    expect((await stage.states(booker, id))[names[4]]).toBe('asked');
  });
});
