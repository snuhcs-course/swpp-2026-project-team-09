/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, invitationOf } from './quest-recruiting.js';
import { joinQuest, ownQuest } from './quests.js';
import { SignalEvent, signalsWhile, SignalWatcher } from './signals.js';
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

// An open Quest of a Leader with another Holder, and an invitation of a Friend of the Leader into it.
async function invited(): Promise<{
  leader: TestUser;
  holder: TestUser;
  friend: TestUser;
  questId: string;
  invitationId: string;
}> {
  const [leader, holder, friend] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
  await befriend(app, leader, friend);
  const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
  await joinQuest(app, holder, questId);
  return { leader, holder, friend, questId, invitationId: await invitationOf(app, leader, questId, friend) };
}

// The signals of this Quest only: other test files' servers send to the same Redis.
function ofQuest(signals: SignalEvent[], questId: string): Pick<SignalEvent, 'userIds' | 'payload'>[] {
  return signals
    .filter(
      ({ payload }) => typeof payload === 'object' && payload !== null && Reflect.get(payload, 'questId') === questId,
    )
    .map(({ userIds, payload }) => ({ userIds, payload }));
}

describe('An answer to an invitation', () => {
  it('when accepted, tells the Leader alone with the Quest and the User', async () => {
    const { leader, friend, questId, invitationId } = await invited();

    const signals = await signalsWhile(app, watcher, 'invitation-accepted', () =>
      answerInvitation(app, friend, invitationId, 'accept'),
    );

    expect(ofQuest(signals, questId)).toEqual([{ userIds: [leader.id], payload: { questId, userId: friend.id } }]);
  });

  it('when declined, tells the Leader alone with the Quest and the User', async () => {
    const { leader, friend, questId, invitationId } = await invited();

    const signals = await signalsWhile(app, watcher, 'invitation-declined', () =>
      answerInvitation(app, friend, invitationId, 'decline'),
    );

    expect(ofQuest(signals, questId)).toEqual([{ userIds: [leader.id], payload: { questId, userId: friend.id } }]);
  });

  it('when declined, tells the User and every Holder that their Quests changed', async () => {
    const { leader, holder, friend, invitationId } = await invited();

    const signals = await signalsWhile(app, watcher, 'quests-changed', () =>
      answerInvitation(app, friend, invitationId, 'decline'),
    );

    const told = signals.flatMap(({ userIds }) => userIds ?? []);
    expect(told).toEqual(expect.arrayContaining([friend.id, leader.id, holder.id]));
  });
});
