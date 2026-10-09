// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #47
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import { expectStatus, getPositions, setMasterSwitch, uploadPosition } from './location-sharing.js';
import {
  changeParty,
  enter,
  getMyParty,
  handOver,
  joinParty,
  partyOf,
  partyOfHolders,
  removeMember,
  sharedQuest,
} from './parties.js';
import { refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function partySignalsTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'party-changed').length;
}

// A Party of the Leader and the others, Holders of its Quest who enter in the order given.
async function partyWith(leader: TestUser, others: TestUser[], body: object = {}): Promise<string> {
  return (await partyOfHolders(app, leader, others, body)).partyId;
}

describe('The Leader changing the settings', () => {
  it('changes the title, the capacity and the Join Policy, and tells the members, Holders and Friends of members', async () => {
    const [leader, member, holder, friend] = await Promise.all(Array.from({ length: 4 }, () => signInUser(app)));
    await befriend(app, member, friend);
    const questId = await sharedQuest(app, leader, [member, holder]);
    const partyId = await partyOf(app, leader, { questId });
    await enter(app, member, partyId);

    const response = await changeParty(app, leader, { title: '저녁 같이', capacity: 2, joinPolicy: 'open' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: partyId, title: '저녁 같이', capacity: 2, joinPolicy: 'open' });
    expect((await getMyParty(app, member)).body).toEqual({ ...response.body, sharing: true });
    await vi.waitFor(() => {
      expect(partySignalsTo(member)).toBe(3);
      expect(partySignalsTo(holder)).toBe(3);
      expect(partySignalsTo(friend)).toBe(2);
    });
  });

  it('leaves what is left out as it was', async () => {
    const leader = await signInUser(app);
    await partyOf(app, leader, { title: '점심 같이', capacity: 3, joinPolicy: 'approval' });

    const response = await changeParty(app, leader, { capacity: 5 });

    expect(response.body).toMatchObject({ title: '점심 같이', capacity: 5, joinPolicy: 'approval' });
  });

  it('is refused for a capacity below the number of members', async () => {
    const [leader, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await partyWith(leader, [first, second]);

    const response = await changeParty(app, leader, { capacity: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'CAPACITY_BELOW_MEMBERS'));
    expect((await changeParty(app, leader, { capacity: 3 })).status).toBe(200);
  });

  it.each([{ capacity: 9 }, { title: '' }, { joinPolicy: 'secret' }, { questId: randomUUID() }])(
    'is refused for %o',
    async (changes) => {
      const leader = await signInUser(app);
      await partyOf(app, leader);

      expect((await changeParty(app, leader, changes)).status).toBe(400);
    },
  );
});

describe('The Leader handing the role over', () => {
  it('makes another member the Leader, and tells the members', async () => {
    const [leader, member, holder] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(app, leader, [member, holder]);
    await enter(app, member, await partyOf(app, leader, { questId }));

    const response = await handOver(app, leader, member.id);

    expect(response.status).toBe(204);
    expect((await getMyParty(app, leader)).body).toMatchObject({
      members: [
        { id: leader.id, leader: false },
        { id: member.id, leader: true },
      ],
    });
    expect((await changeParty(app, member, { title: '새 이름' })).status).toBe(200);
    await vi.waitFor(() => {
      expect(partySignalsTo(leader)).toBe(4);
      expect(partySignalsTo(holder)).toBe(3);
    });
  });

  it('is refused for a User who is not a member', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    await partyOf(app, leader);

    const response = await handOver(app, leader, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_PARTY_MEMBER'));
  });
});

describe('The Leader removing a member', () => {
  it('takes the member out, and tells the members, the one removed included', async () => {
    const [leader, member, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member, other]);

    const response = await removeMember(app, leader, member.id);

    expect(response.status).toBe(204);
    expect((await getMyParty(app, member)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    expect((await getMyParty(app, other)).body).toMatchObject({
      id: partyId,
      members: [{ id: leader.id }, { id: other.id }],
    });
    await vi.waitFor(() => {
      expect(partySignalsTo(member)).toBe(4);
      expect(partySignalsTo(other)).toBe(4);
    });
  });

  it('lets the member enter again', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member]);
    await removeMember(app, leader, member.id);

    expect((await joinParty(app, member, partyId)).status).toBe(201);
  });
});

describe('Removing a member', () => {
  it('hides the removed member and the members from each other at once', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    await partyWith(leader, [member]);
    await Promise.all([
      expectStatus(setMasterSwitch(app, leader, true), 204),
      expectStatus(setMasterSwitch(app, member, true), 204),
    ]);
    await Promise.all([expectStatus(uploadPosition(app, leader), 200), expectStatus(uploadPosition(app, member), 200)]);

    await removeMember(app, leader, member.id);

    await vi.waitFor(() => {
      const removals = watcher.all().filter(({ name }) => name === 'position-removed');
      expect(removals).toContainEqual({
        name: 'position-removed',
        userIds: [leader.id],
        payload: { userId: member.id },
      });
      expect(removals).toContainEqual({
        name: 'position-removed',
        userIds: [member.id],
        payload: { userId: leader.id },
      });
    });
    expect((await getPositions(app, leader)).body).toEqual([]);
  });
});

describe('Removing is refused', () => {
  it('for a User who is not a member', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await partyOf(app, leader);
    await partyWith(other, [user]);

    const response = await removeMember(app, leader, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_PARTY_MEMBER'));
    expect((await getMyParty(app, user)).status).toBe(200);
  });
});

describe('The Leader’s controls', () => {
  it('are each refused for another member', async () => {
    const [leader, member, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await partyWith(leader, [member, other]);

    const responses = await Promise.all([
      changeParty(app, member, { title: '내 파티' }),
      handOver(app, member, other.id),
      removeMember(app, member, other.id),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject(refused(403, 'NOT_PARTY_LEADER'));
    }
    expect((await getMyParty(app, other)).body).toMatchObject({
      title: '같이 가요',
      members: [{ id: leader.id, leader: true }, { id: member.id }, { id: other.id }],
    });
  });

  it('are each refused to a User in no Party', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);

    const responses = await Promise.all([
      changeParty(app, user, { title: '내 파티' }),
      handOver(app, user, other.id),
      removeMember(app, user, other.id),
    ]);

    for (const response of responses) {
      expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    }
  });
});
