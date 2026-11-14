/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, type TestUser } from './friends.js';
import { type MealPlanStage } from './meal-plan.js';
import { addSubQuest, attend, joinQuest, ownQuest, storeEvent } from './quests.js';
import { withAccessToken } from './sign-in.js';

// The recruiting parties of the design's sections 6.3 and 6.4, made through the routes a User makes them with, on the
// stage of a meal's plan: a party going to a Global Event meets at a 모이기 Sub Quest before it, and a party for an
// activity is one Sub Quest at a Place. Each joiner enters it as a User does.

export const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

// A new User who is nobody's Friend.
export const stranger = (stage: MealPlanStage, name: string): Promise<TestUser> =>
  signInUser(stage.app, { name, department: '경영학과' });

// The job fair of that day, published in 문화관 (the Place numbered 73) from 10:00 to 17:00.
export async function jobFairOn(stage: MealPlanStage, prisma: PrismaClient, date: string): Promise<GlobalEvent> {
  const { latitude, longitude } = await stage.numbered('73');
  const time = timeOn(date);
  return storeEvent(prisma, {
    title: '채용박람회',
    startsAt: new Date(time('10:00')),
    endsAt: new Date(time('17:00')),
    place: '문화관',
    latitude,
    longitude,
  });
}

async function joined(stage: MealPlanStage, questId: string, joiners: readonly TestUser[]): Promise<void> {
  for (const joiner of joiners) {
    // oxlint-disable-next-line no-await-in-loop -- one Holder enters at a time
    await joinQuest(stage.app, joiner, questId).expect(201);
  }
}

export interface PartyMaking {
  leader: TestUser;
  title: string;
  // The day, the time, and the building's number.
  meets: [string, string, string];
  joiners?: readonly TestUser[];
}

// An Open party of the leader's going to the event, meeting at the building of that number at that time, which the
// joiners then enter.
export async function partyFor(
  stage: MealPlanStage,
  event: GlobalEvent,
  { leader, title, meets: [date, clock, number], joiners = [] }: PartyMaking,
): Promise<string> {
  const made = await attend(stage.app, leader, event.id).expect(201);
  const { id } = z.object({ id: z.string() }).parse(made.body);
  await withAccessToken(request(stage.app.getHttpServer()).patch(`/quests/${id}`), leader.accessToken)
    .send({ title, joinPolicy: 'open', board: 'career', description: '같이 가요' })
    .expect(200);
  const place = { placeId: (await stage.numbered(number)).id };
  await addSubQuest(stage.app, leader, id, { title: '모이기', startsAt: timeOn(date)(clock), place }).expect(201);
  await joined(stage, id, joiners);
  return id;
}

// An Open party of the leader's for an activity, one Sub Quest at the building of that number at that time.
export async function activityParty(
  stage: MealPlanStage,
  { leader, title, meets: [date, clock, number], joiners = [] }: PartyMaking,
): Promise<string> {
  const placeId = (await stage.numbered(number)).id;
  const id = await ownQuest(stage.app, leader, {
    title,
    joinPolicy: 'open',
    board: 'hobby',
    description: '같이 쳐요',
    subQuest: { title, startsAt: timeOn(date)(clock), place: { placeId } },
  });
  await joined(stage, id, joiners);
  return id;
}

// The job fair's party meeting at 13:30, and the one meeting at 14:20 that these joiners and another User entered.
export async function jobFairParties(
  stage: MealPlanStage,
  [jobFair, date]: [GlobalEvent, string],
  joiners: readonly TestUser[],
): Promise<{ early: string; at1420: string }> {
  const early = await partyFor(stage, jobFair, {
    leader: await stranger(stage, '하나'),
    title: '박람회 일찍 가요',
    meets: [date, '13:30', '73'],
  });
  const at1420 = await partyFor(stage, jobFair, {
    leader: await stranger(stage, '둘'),
    title: '채용박람회 같이 가요',
    meets: [date, '14:20', '73'],
    joiners: [...joiners, await stranger(stage, '셋')],
  });
  return { early, at1420 };
}

// The badminton parties at the gymnasium (the Place numbered 71) at 17:00, 2 of 4, and at 18:00, 3 of 4.
export async function badmintonParties(stage: MealPlanStage, date: string): Promise<{ at17: string; at18: string }> {
  const at17 = await activityParty(stage, {
    leader: await stranger(stage, '넷'),
    title: '배드민턴 칠 사람',
    meets: [date, '17:00', '71'],
    joiners: [await stranger(stage, '다섯')],
  });
  const at18 = await activityParty(stage, {
    leader: await stranger(stage, '여섯'),
    title: '배드민턴 한 게임',
    meets: [date, '18:00', '71'],
    joiners: [await stranger(stage, '일곱'), await stranger(stage, '여덟')],
  });
  return { at17, at18 };
}
