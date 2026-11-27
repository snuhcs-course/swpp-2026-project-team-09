/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type PlanInput, type ReplyStep } from '../src/assistant/dto/answer.dto.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// The stage of the steps' tests (P05 ticket 74): the Assistant's endpoint with the scripted model, the seed's walking
// table, Places and study spaces, and a Tuesday on which at 09:00 the asker has a Class in 301동 from 09:30 to 10:45 and
// three Restaurants serve lunch and dinner.

export const DATE = '2088-03-09';
const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];
export const ANSWERS_APP = { clientCapabilities: ['library', 'answer', 'events', 'study-plan', 'answers'] };
export const OLD_APP = { clientCapabilities: ['library', 'answer', 'events', 'study-plan'] };

const bothMeals = (name: string): object =>
  restaurant({
    name,
    lines: [
      { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 },
      { meal: 'dinner', text: '돈까스 : 6,500원', kind: 'dish', name: '돈까스', price: 6500 },
    ],
  });

const replySchema = z.object({
  text: z.string(),
  withdrawn: z.array(z.string()).optional(),
  clears: z.literal(true).optional(),
  answer: z.custom<AnswerReply | null>(),
  answers: z.custom<AnswerReply[]>().optional(),
  steps: z.custom<ReplyStep[]>().optional(),
});

export type Reply = z.infer<typeof replySchema>;

export class StepsStage {
  readonly stage = new MealPlanStage();
  private prisma: PrismaClient | null = null;
  private stored: string[] = [];

  async start(): Promise<void> {
    await this.stage.start();
    this.prisma = connectToDatabase();
  }

  async stop(): Promise<void> {
    await this.prisma?.globalEvent.deleteMany({ where: { id: { in: this.stored } } });
    await this.prisma?.$disconnect();
    await this.stage.stop();
  }

  // A new asker at 09:00, with the day's menus and the morning Class.
  async morning(): Promise<void> {
    await this.stage.asking(DATE, '09:00');
    await sendAsWorker(
      this.stage.app,
      '/menus/collected',
      menusMessage([{ date: DATE, restaurants: RESTAURANTS.map((name) => bothMeals(name)) }]),
    );
    await this.stage.classAt(this.stage.asker, '09:30', '10:45', '301');
  }

  async asked(steps: Step[], text: string, app: object = ANSWERS_APP, context?: object): Promise<Reply> {
    const response = await this.stage.send(steps, context === undefined ? app : { ...app, context }, text);
    expect(response.status).toBe(200);
    return replySchema.parse(response.body);
  }

  // The one event of the day: the events planned are the day's, which only a search of the message could narrow.
  async eventAt(title: string, start: string, end: string): Promise<string> {
    if (this.prisma === null) {
      throw new Error('The stage has not started');
    }
    await this.prisma.globalEvent.deleteMany({ where: { id: { in: this.stored.splice(0) } } });
    const { latitude, longitude } = await this.stage.numbered('73');
    const event = await storeEvent(this.prisma, {
      title,
      startsAt: new Date(`${DATE}T${start}:00+09:00`),
      endsAt: new Date(`${DATE}T${end}:00+09:00`),
      place: '문화관',
      latitude,
      longitude,
    });
    this.stored.push(event.id);
    return event.id;
  }
}

export const meal = (which: 'lunch' | 'dinner', more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date: DATE, meal: which, ...more },
});

export const said: Step = { text: '순서대로 짰어요.' };

export const seatAt = (start: string, end: string): Step => ({
  tool: 'proposeLibraryBooking',
  input: { spaceId: '7F-7A-zone2', date: DATE, start, end },
});

export const chainFrom = (placeId: string, time: string, source = 'step'): object[] => [
  { kind: 'from', placeId, source },
  { kind: 'notBefore', time, source },
];

export const originOf = (answer: AnswerReply | undefined): { placeId: string; basis: string } | null => {
  const origin = answer?.plans[0]?.parts[0]?.origin ?? null;
  return origin === null ? null : { placeId: origin.place.placeId, basis: origin.basis };
};

export const askerConstraints = (input: PlanInput | undefined): unknown =>
  input !== undefined && 'people' in input ? input.people[0]?.constraints : null;

export const clock = (at: string | null | undefined): string | null =>
  at === null || at === undefined ? null : at.slice(11, 16);
