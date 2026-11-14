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
import { getQuest, getQuests, ownQuest } from './quests.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

function member(user: TestUser, name: string, state: string): object {
  return { user: { id: user.id, name, department: '컴퓨터공학부' }, state, lateMinutes: null };
}

interface Invited {
  leader: TestUser;
  minsu: TestUser;
  jieun: TestUser;
  questId: string;
  minsuInvitation: string;
  jieunInvitation: string;
}

// A Leader's Quest, with an invitation of 지은 and then one of 민수.
async function invitedTwo(): Promise<Invited> {
  const [leader, minsu, jieun] = await Promise.all([
    signInUser(app, { name: '유상', department: '컴퓨터공학부' }),
    signInUser(app, { name: '민수', department: '컴퓨터공학부' }),
    signInUser(app, { name: '지은', department: '컴퓨터공학부' }),
  ]);
  await Promise.all([befriend(app, leader, minsu), befriend(app, leader, jieun)]);
  const questId = await ownQuest(app, leader, { title: '점심' });
  const jieunInvitation = await invitationOf(app, leader, questId, jieun);
  const minsuInvitation = await invitationOf(app, leader, questId, minsu);
  return { leader, minsu, jieun, questId, minsuInvitation, jieunInvitation };
}

describe('The members of a Quest', () => {
  it('are the Holders as accepted, then the invited by when they were invited', async () => {
    const { leader, minsu, jieun, questId } = await invitedTwo();

    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      members: [member(leader, '유상', 'accepted'), member(jieun, '지은', 'invited'), member(minsu, '민수', 'invited')],
    });
  });

  it('list a User who accepted as a Holder, the same for the Leader and the new Holder', async () => {
    const { leader, minsu, jieun, questId, minsuInvitation } = await invitedTwo();

    await answerInvitation(app, minsu, minsuInvitation, 'accept');

    const members = [
      member(leader, '유상', 'accepted'),
      member(minsu, '민수', 'accepted'),
      member(jieun, '지은', 'invited'),
    ];
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ members });
    expect((await getQuest(app, minsu, questId)).body).toMatchObject({ members });
  });

  it('list a User who declined as declined', async () => {
    const { leader, minsu, jieun, questId, minsuInvitation, jieunInvitation } = await invitedTwo();
    await answerInvitation(app, minsu, minsuInvitation, 'accept');

    await answerInvitation(app, jieun, jieunInvitation, 'decline');

    const members = [
      member(leader, '유상', 'accepted'),
      member(minsu, '민수', 'accepted'),
      member(jieun, '지은', 'declined'),
    ];
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ members });
    expect((await getQuests(app, minsu)).body).toMatchObject([{ id: questId, members }]);
  });
});
