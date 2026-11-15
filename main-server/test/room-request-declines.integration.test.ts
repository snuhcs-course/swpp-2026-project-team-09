/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { withSubject } from '../src/assistant/gathering/answer-words.js';
import { endFriendship, type TestUser } from './friends.js';
import { cancelInvitation, endQuest, removeHolder } from './quest-recruiting.js';
import { dropQuest } from './quests.js';
import { DECLINED, lunchQuest, RoomStage } from './room-requests.js';

// What takes one companion out of a room request, which stays for the others with the booker told, and what still
// ends it: the booker gone, the Quest deleted or nobody left. An ended request deletes a booking party made for it,
// but never an existing Quest.

// Each test signs in four Users and befriends them over HTTP before it starts, which takes up to 4 s on a loaded
// runner: close to Vitest's 5 s. Only these files wait longer.
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

// Only this companion is out: the request gathers with the others, the booker is told, and nobody gets a notice.
async function expectOnlyOut({ people, id }: Party, out: TestUser): Promise<void> {
  const [booker, ...companions] = people;
  const { status, companions: states, moreNeeded } = await stage.status(booker, id);

  expect({ status, moreNeeded }).toEqual({ status: 'gathering', moreNeeded: 1 });
  expect(states.filter(({ state }) => state === 'declined').map(({ userId }) => userId)).toEqual([out.id]);
  expect(states.map(({ userId }) => userId).toSorted()).toEqual(companions.map(({ id: userId }) => userId).toSorted());
  expect(await stage.notificationsOf(booker, 'room-declined')).toEqual([
    expect.objectContaining({
      title: `${withSubject(states.find(({ userId }) => userId === out.id)?.name ?? '')} 못 온대요`,
      line: '관정 4층 6인실 · 1명 더 필요해요',
    }),
  ]);
  for (const user of people) {
    // oxlint-disable-next-line no-await-in-loop -- one User at a time
    expect(await stage.notices(user)).toEqual([]);
  }
}

async function expectOutOfParty({ questId }: Party, out: TestUser): Promise<void> {
  const quest = await stage.prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    include: { holders: true, invitations: true },
  });

  expect([...quest.holders, ...quest.invitations].map(({ userId }) => userId)).not.toContain(out.id);
}

async function expectDissolved({ people, id }: Party): Promise<void> {
  const [booker] = people;

  expect(await stage.status(booker, id)).toMatchObject({ status: 'dissolved', reason: DECLINED });

  for (const user of people) {
    // oxlint-disable-next-line no-await-in-loop -- one User at a time
    expect(await stage.notices(user)).toEqual([DECLINED]);
  }
}

describe('Taking one companion out of a booking party’s request', () => {
  it('a withdrawn consent', async () => {
    const party = await bookingParty();
    const [, minsu] = party.people;
    await stage.decline(minsu, party.id).expect(204);

    await expectOnlyOut(party, minsu);
    await expectOutOfParty(party, minsu);
  });

  it('a consented companion leaving the booking party', async () => {
    const party = await bookingParty();
    const [, minsu] = party.people;
    await dropQuest(stage.app, minsu, party.questId).expect(204);

    await expectOnlyOut(party, minsu);
  });

  it('the Leader cancelling an invitation not yet answered', async () => {
    const party = await bookingParty(2);
    const [booker, , , haneul] = party.people;
    const invitation = await stage.prisma.questInvitation.findFirstOrThrow({
      where: { questId: party.questId, userId: haneul.id },
    });
    await cancelInvitation(stage.app, booker, party.questId, invitation.id).expect(204);

    await expectOnlyOut(party, haneul);
  });

  it('a companion unfriending the booker', async () => {
    const party = await bookingParty(1);
    const [booker, , jieun] = party.people;
    await endFriendship(stage.app, jieun, booker.id).expect(204);

    await expectOnlyOut(party, jieun);
    await expectOutOfParty(party, jieun);
  });
});

describe('Taking one companion out of an existing Quest’s request', () => {
  it('the booker unfriending a companion, who stays in the Quest', async () => {
    const party = await existingQuest();
    const [booker, minsu] = party.people;
    await endFriendship(stage.app, booker, minsu.id).expect(204);

    await expectOnlyOut(party, minsu);
    expect(await stage.holderIds(party.questId)).toContain(minsu.id);
  });

  it('a companion removed from the Quest', async () => {
    const party = await existingQuest();
    const [booker, , jieun] = party.people;
    await removeHolder(stage.app, booker, party.questId, jieun.id).expect(204);

    await expectOnlyOut(party, jieun);
  });
});

describe('What still ends a request', () => {
  it('the booker leaving the booking party, which is deleted', async () => {
    const party = await bookingParty();
    const [booker] = party.people;
    await dropQuest(stage.app, booker, party.questId).expect(204);

    await expectDissolved(party);
    expect(await stage.prisma.quest.count({ where: { id: party.questId } })).toBe(0);
  });

  it('the last companion going out, and the booking party is deleted', async () => {
    const party = await bookingParty(0);
    const [, ...friends] = party.people;
    for (const friend of friends) {
      // oxlint-disable-next-line no-await-in-loop -- one answer at a time
      await stage.decline(friend, party.id).expect(204);
    }

    await expectDissolved(party);
    expect(await stage.prisma.quest.count({ where: { id: party.questId } })).toBe(0);
  });

  it('the booker leaving an existing Quest, which stays', async () => {
    const party = await existingQuest();
    const [booker] = party.people;
    await dropQuest(stage.app, booker, party.questId).expect(204);

    await expectDissolved(party);
    expect(await stage.prisma.quest.count({ where: { id: party.questId } })).toBe(1);
  });

  it('the Quest being deleted', async () => {
    const party = await existingQuest();
    const [booker] = party.people;
    await endQuest(stage.app, booker, party.questId).expect(204);

    await expectDissolved(party);
  });
});
