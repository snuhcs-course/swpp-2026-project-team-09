/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { endFriendship, type TestUser } from './friends.js';
import { endQuest, removeHolder } from './quest-recruiting.js';
import { dropQuest } from './quests.js';
import { DECLINED, lunchQuest, RoomStage } from './room-requests.js';

// What counts as a decline while a room request gathers or is ready: each dissolves it, tells everyone it asked, and
// deletes a booking party made for it, but never an existing Quest.

// Each test signs in four to nine Users and befriends them over HTTP before it starts, which takes up to 4 s on a
// loaded runner: close to Vitest's 5 s. Only these files wait longer.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

let count = 0;

interface Party {
  people: readonly [TestUser, TestUser, TestUser, TestUser];
  id: string;
  questId: string;
}

// The requester and three Friends with a booking party for them, every Friend consenting unless `consenting` is less.
async function bookingParty(consenting = 3): Promise<Party> {
  count += 1;
  const people = await stage.party([`해산${count}부`, `해산${count}a`, `해산${count}b`, `해산${count}c`] as const);
  const [booker, ...friends] = people;
  const { id, questId } = await stage.made(booker, friends);
  await stage.allConsent(id, friends.slice(0, consenting));
  return { people, id, questId };
}

// The same people holding an existing Quest, and a request that asks its other Holders, none consenting yet.
async function existingQuest(): Promise<Party> {
  count += 1;
  const people = await stage.party([`기존${count}부`, `기존${count}a`, `기존${count}b`, `기존${count}c`] as const);
  const [booker] = people;
  const questId = await lunchQuest(stage.prisma, [booker.id, ...people.slice(1).map(({ id }) => id)]);
  const { id } = await stage.asking(booker, questId);
  return { people, id, questId };
}

async function expectDissolved({ people, id }: Party, questStays: Party | null = null): Promise<void> {
  const [booker] = people;

  expect(await stage.status(booker, id)).toMatchObject({ status: 'dissolved', reason: DECLINED });

  for (const user of people) {
    // oxlint-disable-next-line no-await-in-loop -- one User at a time
    expect(await stage.notices(user)).toEqual([DECLINED]);
  }
  if (questStays !== null) {
    expect(await stage.prisma.quest.count({ where: { id: questStays.questId } })).toBe(1);
  }
}

describe('Counted as a decline', () => {
  it('a consented companion leaving the booking party', async () => {
    const party = await bookingParty();
    const [, minsu] = party.people;
    await dropQuest(stage.app, minsu, party.questId).expect(204);

    await expectDissolved(party);

    expect(await stage.prisma.quest.count({ where: { id: party.questId } })).toBe(0);
  });

  it('a companion who has not consented leaving an existing Quest', async () => {
    const party = await existingQuest();
    const [, , , haneul] = party.people;
    await dropQuest(stage.app, haneul, party.questId).expect(204);

    await expectDissolved(party, party);
  });

  it('a companion removed by DELETE quests/:questId/holders/:userId', async () => {
    const party = await bookingParty();
    const [booker, , jieun] = party.people;
    await removeHolder(stage.app, booker, party.questId, jieun.id).expect(204);

    await expectDissolved(party);
  });

  it('the booker leaving the existing Quest of a questId request', async () => {
    const party = await existingQuest();
    const [booker] = party.people;
    await dropQuest(stage.app, booker, party.questId).expect(204);

    await expectDissolved(party, party);
  });
});

describe('Counted as a decline as well', () => {
  it('the party being deleted', async () => {
    const party = await existingQuest();
    const [booker] = party.people;
    await endQuest(stage.app, booker, party.questId).expect(204);

    await expectDissolved(party);
  });

  it('a companion unfriending the booker', async () => {
    const party = await bookingParty(1);
    const [booker, , jieun] = party.people;
    await endFriendship(stage.app, jieun, booker.id).expect(204);

    await expectDissolved(party);
  });

  it('the booker unfriending a companion', async () => {
    const party = await existingQuest();
    const [booker, minsu] = party.people;
    await endFriendship(stage.app, booker, minsu.id).expect(204);

    await expectDissolved(party, party);
  });

  it('a withdrawn consent', async () => {
    const party = await bookingParty();
    const [, minsu] = party.people;
    await stage.decline(minsu, party.id).expect(204);

    await expectDissolved(party);
  });
});
