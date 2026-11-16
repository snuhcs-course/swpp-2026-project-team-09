/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { MealPlanStage } from './meal-plan.js';
import * as planQuests from './plan-quests.js';
import { dropQuest, getQuests } from './quests.js';
import { withAccessToken } from './sign-in.js';

// "여기로" for a meal (P03 ticket 15): a Plan taken alone at POST /plans over the started server with the seed's walking
// table and Places, the design's worked example for the asker alone (a Tuesday at 11:50 at 301동, the Class at 24동 at
// 13:00), and "다시 고르기" at DELETE /quests/:questId. Each test stands on a Tuesday of January 2075, which no other
// file uses.

const stage = new MealPlanStage();

beforeAll(async () => {
  await stage.start();
});

afterAll(async () => {
  await stage.stop();
});

const takenSchema = z.object({
  quest: z.custom<QuestDto>(),
  invitations: z.array(z.unknown()),
  askLevels: z.array(z.unknown()),
  alone: z.object({
    lines: z.array(z.array(z.object({ text: z.string(), strong: z.boolean() }))),
    remindAt: z.string().nullable(),
  }),
});

const rowsSchema = z.array(z.object({ kind: z.string(), title: z.string(), line: z.string(), url: z.string() }));

async function leaveBys(): Promise<z.infer<typeof rowsSchema>> {
  const response = await withAccessToken(
    request(stage.app.getHttpServer()).get('/notifications'),
    stage.asker.accessToken,
  );
  return rowsSchema.parse(response.body).filter(({ kind }) => kind === 'leave-by');
}

async function heldIds(): Promise<string[]> {
  const quests = z.array(z.custom<QuestDto>()).parse((await getQuests(stage.app, stage.asker)).body);
  return quests.filter(({ classQuest }) => !classQuest).map(({ id }) => id);
}

const words = (lines: { text: string }[][]): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

// 301동식당 at the first Plan's start, or 학생회관식당 at 12:05, as the arrows show it.
async function take(date: string, planId: '301동식당' | '학생회관식당'): Promise<request.Response> {
  const first = await planQuests.firstPlan(stage, date, [stage.asker.id]);
  expect(first.id).toBe('301동식당');
  const startAt = planId === '301동식당' ? first.startAt : `${date}T12:05:00+09:00`;
  const input = planQuests.inputOf(date, [stage.asker.id]);
  return planQuests.makePlanQuest(stage, { input, planId, startAt, location: null });
}

// Partitions: a walk on of 15 minutes, of 1 minute. Expected values: boards s4b, s4 and s5, and the seed's walking table
// (301동 → 24동 15 minutes, 학생회관 → 24동 1 minute).
describe('"여기로" on a meal\'s Plan for the asker alone', () => {
  it('makes 301동식당 a Quest held alone and keeps its leave-by for 12:45 (s4b, s5)', async () => {
    const date = '2075-01-08';
    await planQuests.workedExample(stage, date);

    const response = await take(date, '301동식당');

    expect(response.status).toBe(201);
    const { quest, invitations, askLevels, alone } = takenSchema.parse(response.body);
    expect(quest).toMatchObject({
      title: '301동식당에서 점심',
      globalEvent: null,
      leader: { id: stage.asker.id },
      capacity: 1,
      joinPolicy: 'closed',
      board: null,
      holders: [{ id: stage.asker.id }],
    });
    expect([invitations, askLevels]).toEqual([[], []]);
    expect(words(alone.lines)).toEqual(['301동식당에서 먹어요', '12:45에 나설 시각을 알려 드릴게요']);
    expect(alone.remindAt).toBe(new Date(`${date}T12:45:00+09:00`).toISOString());
    expect(await leaveBys()).toEqual([
      { kind: 'leave-by', title: '지금 나서요', line: '24동까지 걸어서 15분', url: `/main?card=party:${quest.id}` },
    ]);
    expect(await heldIds()).toEqual([quest.id]);
  });

  it('makes 학생회관식당 a Quest held alone with no leave-by for a walk on of 1 minute (s4)', async () => {
    const date = '2075-01-15';
    await planQuests.workedExample(stage, date);

    const response = await take(date, '학생회관식당');

    expect(response.status).toBe(201);
    const { quest, alone } = takenSchema.parse(response.body);
    expect(quest.capacity).toBe(1);
    expect(words(alone.lines)).toEqual(['학생회관식당으로 가요', '수업까지 1분이라 나설 알림은 없어요']);
    expect(alone.remindAt).toBeNull();
    expect(await leaveBys()).toEqual([]);
  });
});

// Expected values: the Quest and its leave-by gone.
describe('a meal taken alone, given up', () => {
  it('ends with its leave-by at "다시 고르기"', async () => {
    const date = '2075-01-22';
    await planQuests.workedExample(stage, date);
    const { quest } = takenSchema.parse((await take(date, '301동식당')).body);

    const response = await dropQuest(stage.app, stage.asker, quest.id);

    expect(response.status).toBe(204);
    expect(await heldIds()).toEqual([]);
    expect(await leaveBys()).toEqual([]);
  });
});
