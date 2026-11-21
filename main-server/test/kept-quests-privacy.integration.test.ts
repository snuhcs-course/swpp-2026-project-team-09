/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { answerIn } from './plan-answers.js';
import { type Step } from './scripted-model.js';

// What the User is told of the others of their Quests (P05 ticket 17): one who only holds an invitation sees the Holders
// alone, as the invitation card shows them, never another invitee or a decline; a Holder sees everyone, as a Quest's
// members show them. A Friend who declined a Quest makes it no Quest "with" them. Each path that reads the User's Quests
// is checked: findDay's words, its drawn steps and `kept`, the line ahead, and a plan's `related`.

const stage = new MealPlanStage();
let prisma: PrismaClient;

beforeAll(async () => {
  await stage.start();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), stage.stop()]);
});

const MEET_APP = { clientCapabilities: ['library', 'answer', 'meet'] };

const replySchema = z.object({ lookup: z.custom<Lookup | null>() });

// 지은's meeting at 14:00 on `date`, made from a meeting's Plan: the asker as `asker` (invited and waiting, or a Holder),
// and 현수 who declined it.
async function jieunsMeeting(date: string, asker: 'invited' | 'holder'): Promise<{ questId: string; hyunsu: Named }> {
  await stage.asking(date, '10:30');
  const jieun = await stage.friend('지은');
  const hyunsu = await stage.friend('현수');
  const quest = await prisma.quest.create({
    data: {
      title: '학생회관 앞에서 만나기',
      leaderId: jieun.id,
      meet: true,
      holders: { create: [{ userId: jieun.id }, ...(asker === 'holder' ? [{ userId: stage.asker.id }] : [])] },
      invitations: { create: asker === 'invited' ? [{ userId: stage.asker.id }] : [] },
      declines: { create: [{ userId: hyunsu.id }] },
      subQuests: {
        create: [
          {
            title: '학생회관 앞에서 만나기',
            startsAt: new Date(`${date}T14:00:00+09:00`),
            endsAt: new Date(`${date}T15:00:00+09:00`),
          },
        ],
      },
    },
  });
  return { questId: quest.id, hyunsu };
}

const findDay = (input: object): Step => ({ tool: 'findDay', input });

describe('A User who only holds an invitation', () => {
  it("is told of its Holders alone in findDay's words, its drawn steps and kept, and the line ahead", async () => {
    const date = '2089-12-05';
    const { questId } = await jieunsMeeting(date, 'invited');

    const day = await stage.send([findDay({ date }), { text: '…' }], {}, '오늘 뭐 있지?');
    const asked = await stage.send(
      [findDay({ date, questIds: [questId] }), { text: '…' }],
      {},
      '지은이랑 약속 몇 시야?',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({
      quests: [{ ref: questId, people: [{ name: expect.stringContaining('지은') as unknown, answer: 'leads' }] }],
    });
    const lookup = replySchema.parse(asked.body).lookup;
    expect(lookup?.kept).toMatchObject([{ questId, people: [{ name: '지은', answer: 'leads' }] }]);
    for (const shown of [JSON.stringify(replySchema.parse(day.body).lookup), JSON.stringify(lookup)]) {
      expect(shown).not.toContain('현수');
      expect(shown).not.toContain('declined');
    }
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain('[Ahead: ');
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).not.toContain('현수');
  });

  it("is told of it as a meeting related to a meeting's plan, with its Holders alone", async () => {
    const date = '2089-12-12';
    const { questId, hyunsu } = await jieunsMeeting(date, 'invited');

    const response = await stage.send(
      [resolve('현수'), { tool: 'planMeet', input: { date, friendIds: [hyunsu.id], from: '16:00' } }, { text: '…' }],
      MEET_APP,
      '현수랑 만나고 싶어',
    );

    const { related } = answerIn(response.body);
    expect(related).toMatchObject([{ questId, people: [{ name: '지은', answer: 'leads' }] }]);
    const toldModel = z.object({ related: z.unknown() }).parse(stage.model.toolResults()[1]).related;
    for (const told of [JSON.stringify(related), JSON.stringify(toldModel)]) {
      expect(told).not.toContain('현수');
      expect(told).not.toContain('declined');
    }
  });
});

describe('A Holder who does not lead it', () => {
  it("is told of the invited and the declined, as the Quest's members show them, and a Friend who declined it relates nothing to a meal with them", async () => {
    const date = '2089-12-19';
    const { questId, hyunsu } = await jieunsMeeting(date, 'holder');

    await stage.send([findDay({ date }), { text: '…' }], {}, '오늘 뭐 있지?');

    expect(stage.model.toolResults()[0]).toMatchObject({
      quests: [{ ref: questId, people: [{ answer: 'leads' }, { answer: 'declined' }] }],
    });

    const response = await stage.send(
      [resolve('현수'), { tool: 'planMeal', input: { date, meal: 'lunch', friendIds: [hyunsu.id] } }, { text: '…' }],
      {},
      '현수랑 점심 먹자',
    );

    expect(answerIn(response.body).related).toEqual([]);
  });
});
