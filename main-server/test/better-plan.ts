/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { type TestUser } from './friends.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { answerInvitation, getInvitations } from './quest-recruiting.js';
import { withAccessToken } from './sign-in.js';
import { type SignalEvent, type SignalWatcher, signalsWhile } from './signals.js';

// The stage of the tests of a better Plan after a decline: the meal Plan's stage with the design's worked example, the
// Quest the Leader makes of it at POST /plans with 민수 and 지은, and the two routes.

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

export const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

export const instantOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    new Date(time(date, clock)).toISOString();

export const inputOf = (date: string, people: string[]): PlanInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: people.map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
});

export const betterSchema = z.object({
  current: z
    .object({
      place: z.object({ placeId: z.string(), label: z.string() }).loose(),
      startAt: z.string(),
      endAt: z.string(),
      togetherMinutes: z.number(),
    })
    .nullable(),
  better: z.object({ id: z.string(), startAt: z.string() }).loose().nullable(),
  input: z.custom<PlanInput>().nullable(),
});

export const steps = ({ subQuests }: QuestDto): object[] =>
  subQuests.map(({ title, startsAt, endsAt, place }) => ({ title, startsAt, endsAt, placeId: place?.placeId }));

export const toldUsers = (signals: { userIds?: string[] }[]): string[] =>
  signals.flatMap(({ userIds }) => userIds ?? []).toSorted();

export interface WorkedQuest {
  minsu: Named;
  jieun: Named;
  questId: string;
  jieunInvitation: string;
}

export class BetterPlanStage extends MealPlanStage {
  getBetter(user: TestUser, questId: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).get(`/plans/${questId}/better`), user.accessToken);
  }

  changePlan(user: TestUser, questId: string, body: object): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).put(`/plans/${questId}`), user.accessToken).send(body);
  }

  async invitationTo(user: TestUser, questId: string): Promise<string | undefined> {
    const listed = z
      .array(z.object({ id: z.string(), quest: z.object({ id: z.string() }) }))
      .parse((await getInvitations(this.app, user)).body);
    return listed.find(({ quest }) => quest.id === questId)?.id;
  }

  // The worked example on that day: the Quest of the Student Center from 12:33 with the meeting at 301동 first, made at
  // POST /plans, with 민수 a Holder and 지은 invited.
  async workedQuest(date: string): Promise<WorkedQuest> {
    await this.asking(date, '11:50');
    await this.menusOn(date, RESTAURANTS);
    await this.classAt(this.asker, '11:00', '11:50', '301');
    await this.classAt(this.asker, '13:00', '13:50', '24');
    const minsu = await this.friend('민수');
    await this.classAt(minsu, '11:00', '12:15', '302');
    const jieun = await this.friend('지은');
    await this.classAt(jieun, '11:00', '12:15', '8');
    await this.classAt(jieun, '13:00', '14:15', '8');
    const response = await withAccessToken(request(this.app.getHttpServer()).post('/plans'), this.asker.accessToken)
      .set('Idempotency-Key', randomUUID())
      .send({
        input: inputOf(date, [this.asker.id, minsu.id, jieun.id]),
        planId: '학생회관식당',
        startAt: time(date, '12:33'),
        location: null,
      });
    if (response.status !== 201) {
      throw new Error(`Making the Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
    }
    const questId = z.object({ quest: z.object({ id: z.string() }) }).parse(response.body).quest.id;
    const [minsuInvitation, jieunInvitation] = [
      await this.invitationTo(minsu, questId),
      await this.invitationTo(jieun, questId),
    ];
    if (minsuInvitation === undefined || jieunInvitation === undefined) {
      throw new Error('Both Friends are invited');
    }
    await answerInvitation(this.app, minsu, minsuInvitation, 'accept');
    return { minsu, jieun, questId, jieunInvitation };
  }

  // The worked example after 지은 declined.
  async declined(date: string): Promise<WorkedQuest> {
    const worked = await this.workedQuest(date);
    await answerInvitation(this.app, worked.jieun, worked.jieunInvitation, 'decline');
    return worked;
  }

  // The signals `plan-changed` and `quests-changed` sent while `act` runs.
  async bothSignalsWhile(
    watcher: SignalWatcher,
    act: () => Promise<unknown>,
  ): Promise<{ planChanged: SignalEvent[]; questsChanged: SignalEvent[] }> {
    let questsChanged: SignalEvent[] = [];
    const planChanged = await signalsWhile(this.app, watcher, 'plan-changed', async () => {
      questsChanged = await signalsWhile(this.app, watcher, 'quests-changed', act);
    });
    return { planChanged, questsChanged };
  }
}
