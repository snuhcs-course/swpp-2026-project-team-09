/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { expectStatus, getPositions, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { getMyParty, partyOf, partyOfHolders, removeMember } from './parties.js';
import { endQuest, removeHolder } from './quest-recruiting.js';
import { connectToDatabase, dropQuest, joinQuest, ownQuest } from './quests.js';
import { refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

// A Quest's Party (its activation) follows the Quest: a Holder the Leader removes leaves it, and a Quest that is
// deleted closes it (P06 ticket 23).

let app: INestApplication<Server>;
let watcher: SignalWatcher;
let prisma: PrismaClient;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

function signalsTo(user: TestUser, name: string): unknown[] {
  return watcher.for(user).filter((signal) => signal.name === name);
}

// The Leader, two members and the Party of their shared Quest, each sharing a position on campus.
async function activated(): Promise<{ leader: TestUser; member: TestUser; other: TestUser; questId: string }> {
  const [leader, member, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
  const { questId } = await partyOfHolders(app, leader, [member, other]);
  await Promise.all(
    [leader, member, other].map(async (user) => {
      await expectStatus(setMasterSwitch(app, user, true), 204);
      await expectStatus(uploadPosition(app, user), 200);
    }),
  );
  return { leader, member, other, questId };
}

describe('The Leader removing a Holder who is in the Quest’s Party', () => {
  it('takes them out of the Party, so that its members no longer see them', async () => {
    const { leader, member, other, questId } = await activated();
    expect((await getPositions(app, other)).body).toContainEqual(expect.objectContaining({ userId: member.id }));

    expect((await removeHolder(app, leader, questId, member.id)).status).toBe(204);

    expect((await getMyParty(app, member)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    expect((await getMyParty(app, other)).body).toMatchObject({
      members: [{ id: leader.id }, { id: other.id }],
    });
    expect((await getPositions(app, other)).body).not.toContainEqual(expect.objectContaining({ userId: member.id }));
    await vi.waitFor(() => {
      expect(signalsTo(other, 'position-removed')).toContainEqual(
        expect.objectContaining({ payload: { userId: member.id } }),
      );
      expect(signalsTo(other, 'party-changed')).not.toEqual([]);
    });
  });

  it('leaves the app before this change no refusal when it then takes them out of the Party itself', async () => {
    const { leader, member, questId } = await activated();
    expect((await removeHolder(app, leader, questId, member.id)).status).toBe(204);

    expect((await removeMember(app, leader, member.id)).status).toBe(204);

    expect((await getMyParty(app, leader)).body).toMatchObject({ members: [{ id: leader.id }, {}] });
  });

  it('who is in no Party leaves the Party as it was', async () => {
    const [leader, member, outside] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { partyId, questId } = await partyOfHolders(app, leader, [member]);
    expect((await joinQuest(app, outside, questId)).status).toBe(201);

    expect((await removeHolder(app, leader, questId, outside.id)).status).toBe(204);

    expect((await getMyParty(app, member)).body).toMatchObject({ id: partyId, members: [{}, {}] });
  });
});

describe('A Quest that is deleted', () => {
  it('by the Leader’s end closes its Party, members included', async () => {
    const { leader, member, questId } = await activated();
    const { id: partyId } = z.object({ id: z.string() }).parse((await getMyParty(app, leader)).body);

    expect((await endQuest(app, leader, questId)).status).toBe(204);

    expect(await prisma.party.count({ where: { id: partyId } })).toBe(0);
    expect((await getMyParty(app, member)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    await vi.waitFor(() => {
      expect(signalsTo(member, 'party-changed')).not.toEqual([]);
    });
  });

  it('by its last Holder leaving closes its Party', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader);
    const partyId = await partyOf(app, leader, { questId });

    expect((await dropQuest(app, leader, questId)).status).toBe(204);

    expect(await prisma.party.count({ where: { id: partyId } })).toBe(0);
    expect((await getMyParty(app, leader)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});
