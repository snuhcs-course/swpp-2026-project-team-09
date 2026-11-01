/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { TUTORIAL_FILE } from '../src/tutorial/tutorial-content.js';
import { TestUser } from './friends.js';
import { patchProfile } from './profile.js';
import { withAccessToken } from './sign-in.js';

const placeSchema = z.union([
  z.strictObject({ place: z.string(), floor: z.number().optional(), label: z.string().optional() }),
  z.strictObject({ point: z.strictObject({ latitude: z.number(), longitude: z.number() }), label: z.string() }),
]);

// The answer of every tutorial route, exactly: the content and the statuses, and nothing of any User.
export const tutorialSchema = z.strictObject({
  state: z.enum(['finished', 'stopped', 'off', 'active', 'available']),
  quests: z.array(
    z.strictObject({
      key: z.string(),
      order: z.number(),
      title: z.string(),
      brief: z.string(),
      body: z.array(z.string()),
      condition: z.string(),
      completion: z.union([
        z.strictObject({ kind: z.literal('button') }),
        z.strictObject({ kind: z.literal('kwanjeongCheck'), skipLabel: z.string() }),
      ]),
      completionMessage: z.string(),
      places: z.array(placeSchema),
      links: z.array(z.strictObject({ label: z.string(), url: z.string() })),
      status: z.enum(['notStarted', 'started', 'completed']),
    }),
  ),
});

export type Tutorial = z.infer<typeof tutorialSchema>;

export const BUTTON_KEYS = ['s-card', 'admin-shuttle', 'health-clinic', 'art-museum'];

export function getTutorial(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/tutorial'), user.accessToken);
}

// POST /tutorial/{path}, such as `enable` or `quests/s-card/start`.
export function postTutorial(app: INestApplication<Server>, user: TestUser, path: string, body?: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/tutorial/${path}`), user.accessToken).send(body);
}

// Calls a route that must succeed and reads its answer.
export async function tutorialAfter(call: request.Test): Promise<Tutorial> {
  const response = await call;
  if (response.status !== 200) {
    throw new Error(`The tutorial answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tutorialSchema.parse(response.body);
}

export function statuses(tutorial: Tutorial): Record<string, string> {
  return Object.fromEntries(tutorial.quests.map(({ key, status }) => [key, status]));
}

export function yearInKorea(): number {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()));
}

export async function admitIn(app: INestApplication<Server>, user: TestUser, admissionYear: number): Promise<void> {
  const response = await patchProfile(app, user.accessToken, { admissionYear });
  if (response.status !== 200) {
    throw new Error(`The profile answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// Completes every quest as the app would.
export async function completeAll(app: INestApplication<Server>, user: TestUser): Promise<Tutorial> {
  for (const key of BUTTON_KEYS) {
    // oxlint-disable-next-line no-await-in-loop -- one after another, as the User would
    await tutorialAfter(postTutorial(app, user, `quests/${key}/complete`, { by: 'button' }));
  }
  return tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'skipped' }));
}

// A copy of content/tutorial.yaml in a folder of its own, with `extra` added at the end and `without` left out.
export async function changedTutorialFile({
  extra = [],
  without = [],
}: { extra?: object[]; without?: string[] } = {}): Promise<string> {
  const content = z
    .object({ quests: z.array(z.object({ key: z.string() }).loose()) })
    .parse(parse(await readFile(TUTORIAL_FILE, 'utf8')));
  const quests = [...content.quests.filter(({ key }) => !without.includes(key)), ...extra];
  const file = join(await mkdtemp(join(tmpdir(), 'tutorial-')), 'tutorial.yaml');
  await writeFile(file, stringify({ quests }));
  return file;
}

// A sixth quest, as the content might gain one later.
export const ADDED_QUEST = {
  key: 'student-union',
  order: 6,
  title: '학생회관 둘러보기',
  brief: '학생회관에 가 보세요.',
  body: ['학생회관(63동)에는 식당과 동아리방이 있어요.'],
  condition: '학생회관 가 보기',
  completion: { kind: 'button' },
  completionMessage: '학생회관은 어떠셨나요?',
  places: [{ place: '63' }],
  links: [],
};
