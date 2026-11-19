/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { clockOf } from '../src/assistant/free-time/free-time.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { expectStatus, ON_CAMPUS, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { joinParty, openParty } from './parties.js';
import { answerInvitation, invitationOf } from './quest-recruiting.js';
import { addSubQuest, cancelSubQuest, editSubQuest, getQuest, ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// What words between a party's members would have said, told to the other Holders as Notifications: a step changed
// and a member arrived. The times are the real clock's, since a position is checked against it.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MINUTE_MS = 60_000;
const minutesFromNow = (minutes: number): string => new Date(Date.now() + minutes * MINUTE_MS).toISOString();

interface Step {
  title: string;
  startsAt: string;
  endsAt: string;
  place: { latitude: number; longitude: number; label: string };
}

// A step to meet at the point the members' positions are uploaded at.
const meeting = (startsIn: number): Step => ({
  title: '정문 앞에서 만나기',
  startsAt: minutesFromNow(startsIn),
  endsAt: minutesFromNow(startsIn + 60),
  place: { ...ON_CAMPUS, label: '301동 정문 앞' },
});

interface Holders {
  leader: TestUser;
  minsu: TestUser;
  questId: string;
}

// 김리더's Quest, whose first step is given, with the Friend 민수 in it by an invitation.
async function twoHolders(subQuest?: Step): Promise<Holders> {
  const [leader, minsu] = await Promise.all([
    signInUser(app, { name: '김리더', department: '컴퓨터공학부' }),
    signInUser(app, { name: '민수', department: '경제학부' }),
  ]);
  await befriend(app, leader, minsu);
  const questId = await ownQuest(app, leader, { title: '저녁 같이', ...(subQuest === undefined ? {} : { subQuest }) });
  await expectStatus(answerInvitation(app, minsu, await invitationOf(app, leader, questId, minsu), 'accept'), 201);
  return { leader, minsu, questId };
}

async function noticesOf(user: TestUser, kind: string): Promise<object[]> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
  return z
    .array(z.object({ kind: z.string() }).loose())
    .parse(response.body)
    .filter((notice) => notice.kind === kind);
}

// For a Notification that must not come: what is not awaited has had time to run.
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

// 민수 opens the Quest's Party and 김리더 enters it, both sharing with it with their Master Switches on, so that each
// sees where the other is.
async function bothInParty(holders: Holders): Promise<void> {
  const opened = await expectStatus(openParty(app, holders.minsu, { questId: holders.questId }), 201);
  await expectStatus(joinParty(app, holders.leader, z.object({ id: z.string() }).parse(opened.body).id), 201);
  await Promise.all([
    expectStatus(setMasterSwitch(app, holders.minsu, true), 204),
    expectStatus(setMasterSwitch(app, holders.leader, true), 204),
  ]);
}

// 지은, 김리더's Friend, holds the Quest with her Master Switch on but stays out of its Party: she sees nothing of 민수.
async function outsider({ leader, questId }: Holders): Promise<TestUser> {
  const jieun = await signInUser(app, { name: '지은', department: '수학과' });
  await befriend(app, leader, jieun);
  await expectStatus(answerInvitation(app, jieun, await invitationOf(app, leader, questId, jieun), 'accept'), 201);
  await expectStatus(setMasterSwitch(app, jieun, true), 204);
  return jieun;
}

async function stepIdOf({ leader, questId }: Holders): Promise<string> {
  const response = await expectStatus(getQuest(app, leader, questId), 200);
  const [step] = z.object({ subQuests: z.array(z.object({ id: z.string() })) }).parse(response.body).subQuests;
  if (step === undefined) {
    throw new Error('The Quest has no step');
  }
  return step.id;
}

describe('A Holder changing a step', () => {
  it('tells the other Holder who changed it and to what, and not the Holder who changed it', async () => {
    const { leader, minsu, questId } = await twoHolders();
    const step = meeting(30);

    await expectStatus(addSubQuest(app, minsu, questId, step), 201);

    await vi.waitFor(async () => {
      expect(await noticesOf(leader, 'step-changed')).toEqual([
        expect.objectContaining({
          id: `step-changed:party:${questId}:${minsu.id}`,
          title: '민수가 일정을 바꿨어요',
          line: `${clockOf(new Date(step.startsAt))} 정문 앞에서 만나기`,
          url: `/main?card=party:${questId}`,
        }),
      ]);
    });
    expect(await noticesOf(minsu, 'step-changed')).toEqual([]);
  });

  it('names a cancelled step by its words', async () => {
    const { leader, minsu, questId } = await twoHolders();
    const response = await expectStatus(addSubQuest(app, leader, questId, { ...meeting(30), title: '카페' }), 201);

    const { id } = z.object({ id: z.string() }).parse(response.body);
    await expectStatus(cancelSubQuest(app, leader, { questId, subQuestId: id }), 204);

    await vi.waitFor(async () => {
      expect(await noticesOf(minsu, 'step-changed')).toEqual([
        expect.objectContaining({ title: '김리더가 일정을 바꿨어요', line: "'카페' 취소" }),
      ]);
    });
  });

  it('tells nobody of a step that has already ended', async () => {
    const { leader, minsu, questId } = await twoHolders();

    await expectStatus(
      addSubQuest(app, minsu, questId, { title: '점심', startsAt: minutesFromNow(-120), endsAt: minutesFromNow(-60) }),
      201,
    );
    await settle();

    expect(await noticesOf(leader, 'step-changed')).toEqual([]);
  });
});

describe('A member of the Quest’s Party reaching the step’s point', () => {
  it('tells the other Holder who sees the member once, with the step’s place, and not the member', async () => {
    const holders = await twoHolders(meeting(10));
    const { leader, minsu, questId } = holders;
    const jieun = await outsider(holders);
    await bothInParty(holders);

    await expectStatus(uploadPosition(app, minsu), 200);
    let first: object[] = [];
    await vi.waitFor(async () => {
      first = await noticesOf(leader, 'arrived');
      expect(first).toEqual([
        expect.objectContaining({
          id: `arrived:party:${questId}:${minsu.id}`,
          title: '민수가 도착했어요',
          line: '301동 정문 앞',
        }),
      ]);
    });
    // Told again, it would be kept anew at a later time.
    await settle();
    await expectStatus(uploadPosition(app, minsu), 200);
    await settle();

    expect(await noticesOf(leader, 'arrived')).toEqual(first);
    expect(await noticesOf(minsu, 'arrived')).toEqual([]);
    expect(await noticesOf(jieun, 'arrived')).toEqual([]);
  });
});

describe('A member of the Quest’s Party reaching a moved step’s point', () => {
  it('tells the other Holder anew', async () => {
    const holders = await twoHolders(meeting(10));
    const { leader, minsu, questId } = holders;
    await bothInParty(holders);
    await expectStatus(uploadPosition(app, minsu), 200);
    await vi.waitFor(async () => {
      expect(await noticesOf(leader, 'arrived')).toEqual([expect.objectContaining({ line: '301동 정문 앞' })]);
    });

    const moved = { latitude: ON_CAMPUS.latitude + 0.0009, longitude: ON_CAMPUS.longitude };
    const subQuestId = await stepIdOf(holders);
    await expectStatus(
      editSubQuest(app, leader, { questId, subQuestId }, { ...meeting(10), place: { ...moved, label: '301동 후문' } }),
      200,
    );
    await expectStatus(uploadPosition(app, minsu, moved), 200);

    await vi.waitFor(async () => {
      expect(await noticesOf(leader, 'arrived')).toEqual([expect.objectContaining({ line: '301동 후문' })]);
    });
  });
});

describe('A member of the Quest’s Party near the step', () => {
  it('tells nobody from 100 m away, before the step’s last 30 minutes, or with the Party’s sharing off', async () => {
    const away = await twoHolders(meeting(10));
    const early = await twoHolders(meeting(45));
    const hidden = await twoHolders(meeting(10));
    await Promise.all([bothInParty(away), bothInParty(early), bothInParty(hidden)]);
    await expectStatus(
      withAccessToken(request(app.getHttpServer()).put('/parties/mine/sharing'), hidden.minsu.accessToken).send({
        on: false,
      }),
      204,
    );

    await Promise.all([
      expectStatus(uploadPosition(app, away.minsu, { latitude: ON_CAMPUS.latitude + 0.0009 }), 200),
      expectStatus(uploadPosition(app, early.minsu), 200),
      expectStatus(uploadPosition(app, hidden.minsu), 200),
    ]);
    await settle();

    expect(await noticesOf(away.leader, 'arrived')).toEqual([]);
    expect(await noticesOf(early.leader, 'arrived')).toEqual([]);
    expect(await noticesOf(hidden.leader, 'arrived')).toEqual([]);
  });
});
