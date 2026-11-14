/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { befriend, type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage, resolving } from './library.js';
import { keptButHidden, keptPositionIn } from './location-sharing.js';
import { ownQuest } from './quests.js';

// The people of a 관정 booking at the Assistant's endpoint: the User and the Friends resolveFriend returned, or the
// Holders of a Quest the User holds, compared with the room's GR_MIN and GR_MAX as numbers. The card names each
// companion by id and name only.

const stage = new LibraryStage();
let booker: TestUser;
let friendIds: string[];

beforeAll(async () => {
  await stage.start(inject('settings'));
  booker = await stage.user('관정예약자');
  const friends = await Promise.all(['관정민수', '관정지은', '관정서연'].map((name) => stage.user(name)));
  await Promise.all(friends.map((friend) => befriend(stage.app, booker, friend)));
  friendIds = friends.map(({ id }) => id);
});

afterAll(() => stage.stop());

const room = { spaceId: '4F-group-6', date: '2026-11-05', start: '15:00', minutes: 120 };

describe('Friends', () => {
  it('fill a room with the User, with their names, and the equipment group asked for', async () => {
    const [minsu, jieun, seoyeon] = friendIds;
    const asked = { ...room, friendIds: [minsu, jieun, seoyeon], equipment: 'with-monitor', useDesc: '과제' };
    const resolvers = ['관정민수', '관정지은', '관정서연'].map((name) => resolving(name));
    const response = await stage.send(booker, [
      find(['4F-group-6']),
      ...resolvers,
      { tool: 'proposeLibraryBooking', input: asked },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[4]).toMatchObject({
      result: 'shown',
      summary: expect.stringContaining('4명') as unknown,
    });
    expect(libraryCards(response.body)).toMatchObject([
      {
        key: 'book:4F-group-6:2026-11-05:1500:120:e=with-monitor',
        space: { seatNos: [14103002, 14103004, 14103008, 14103010] },
        useDesc: '과제',
        companions: [
          { friendId: minsu, name: '관정민수' },
          { friendId: jieun, name: '관정지은' },
          { friendId: seoyeon, name: '관정서연' },
        ],
      },
    ]);
  });

  it('too few for a room are told how many more it needs', async () => {
    await stage.send(booker, [
      find(['4F-group-6']),
      resolving('관정민수'),
      { tool: 'proposeLibraryBooking', input: { ...room, friendIds: friendIds.slice(0, 1) } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[2]).toMatchObject({
      result: 'refused',
      refusals: [
        {
          field: 'friendIds',
          reason: expect.stringContaining('2명 더 필요해요') as unknown,
          bound: { min: 4, more: 2 },
        },
      ],
    });
  });
});

describe('A Friend the Friend view puts at the Timetable, whose position is kept', () => {
  it('is a companion by id and name, and nothing of where they are reaches the model or the reply', async () => {
    const names = ['관정하은', '관정도윤', '관정시우'];
    const [another, ...friends] = await Promise.all(['관정숨김예약자', ...names].map((name) => stage.user(name)));
    if (another === undefined) {
      throw new Error('The booker was not signed in');
    }
    await Promise.all(friends.map((friend) => befriend(stage.app, another, friend)));
    const [hidden] = friends;
    if (hidden === undefined) {
      throw new Error('The Friends were not signed in');
    }
    await keptButHidden(stage.app, another, hidden);

    const response = await stage.send(another, [
      find(['4F-group-6']),
      ...names.map((name) => resolving(name)),
      { tool: 'proposeLibraryBooking', input: { ...room, friendIds: friends.map(({ id }) => id) } },
      { text: '…' },
    ]);

    expect(libraryCards(response.body)).toMatchObject([
      { companions: names.map((name, index) => ({ friendId: friends[index]?.id, name })) },
    ]);
    expect(keptPositionIn(stage.model.received(), response.body)).toEqual([]);
  });
});

describe('Friends who cannot come', () => {
  it('are taken only from resolveFriend in this message', async () => {
    await stage.send(booker, [
      find(['4F-group-6']),
      { tool: 'proposeLibraryBooking', input: { ...room, friendIds: friendIds.slice(0, 1) } },
      { text: '…' },
    ]);

    expect(JSON.stringify(stage.model.toolResults()[1])).toContain('No tool returned these ids');
  });

  it('are refused for a reading-room seat', async () => {
    const seat = { spaceId: '7F-7A-zone2', date: '2026-11-04', start: '17:00', minutes: 60 };
    await stage.send(booker, [
      find(['7F-7A-zone2']),
      resolving('관정민수'),
      { tool: 'proposeLibraryBooking', input: { ...seat, friendIds: friendIds.slice(0, 1) } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[2]).toMatchObject({
      result: 'refused',
      refusals: [{ field: 'friendIds', reason: expect.stringContaining('한 사람씩') as unknown }],
    });
  });
});

describe('A held Quest', () => {
  it('counts its Holders, and is carried on the card by its id; one the User does not hold is refused', async () => {
    const subQuest = { title: '점심', startsAt: '2026-11-05T12:00:00+09:00' };
    const questId = await ownQuest(stage.app, booker, { title: '관정 점심 파티', joinPolicy: 'open', subQuest });
    const at = { date: '2026-11-05', start: '10:00', minutes: 60 };
    const response = await stage.send(booker, [
      find(['6F-studio']),
      { tool: 'proposeLibraryBooking', input: { ...at, spaceId: '6F-studio', questId } },
      find(['4F-group-8']),
      { tool: 'proposeLibraryBooking', input: { ...at, spaceId: '4F-group-8', questId } },
      { tool: 'proposeLibraryBooking', input: { ...at, spaceId: '4F-group-8', questId: crypto.randomUUID() } },
      { text: '…' },
    ]);

    expect(libraryCards(response.body)).toMatchObject([
      { key: 'book:6F-studio:2026-11-05:1000:60', questId, companions: [] },
    ]);
    expect(stage.model.toolResults()[3]).toMatchObject({ refusals: [{ bound: { min: 6, more: 5 } }] });
    expect(stage.model.toolResults()[4]).toEqual({
      result: 'refused',
      refusals: [{ field: 'questId', reason: '내가 참여 중인 파티 중에 그런 파티가 없어요' }],
    });
  });
});
