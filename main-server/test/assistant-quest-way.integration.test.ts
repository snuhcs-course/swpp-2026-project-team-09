/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type ReplyOffer } from '../src/assistant/dto/assistant-messages.dto.js';
import { MealPlanStage } from './meal-plan.js';

// A Tutorial quest's facts in words first, with 가는 길 보기 under them (board q11), and the way there, the stay, and
// the way on to the next Class once it is pressed (board q12), at the Assistant's endpoint with the scripted model,
// the seed's Places, walking table and shuttle timing, and content/tutorial.yaml. Each date is a Tuesday.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
  offers: z.custom<ReplyOffer[]>().optional(),
});

const CARD = '학생증(S-CARD) 발급받기';

const WAY_TO_CARD: ReplyOffer = { kind: 'ask', label: '가는 길 보기', text: `${CARD} 가는 길` };

const cardFacts = { tool: 'getTutorial', input: { questKey: 's-card' } };

async function at(number: string): Promise<{ location: { latitude: number; longitude: number } }> {
  const { latitude, longitude } = await stage.numbered(number);
  return { location: { latitude, longitude } };
}

describe('A question about one quest (board q11)', () => {
  it('is answered in words with 가는 길 보기 under them, and nothing is drawn', async () => {
    await stage.asking('2093-03-03', '11:50');

    const response = await stage.send(
      [cardFacts, { text: '두레문예관(67동) 2층 학생지원센터에서 받아요.' }],
      {},
      '학생증 어디서 받아?',
    );

    expect(response.status).toBe(200);
    const reply = replySchema.parse(response.body);
    expect(reply).toMatchObject({ text: '두레문예관(67동) 2층 학생지원센터에서 받아요.', answer: null, lookup: null });
    expect(reply.offers).toEqual([WAY_TO_CARD]);
  });

  it('has no button for an app that does not draw answers', async () => {
    await stage.asking('2093-03-03', '11:50');

    const response = await stage.send([cardFacts, { text: '…' }], { clientCapabilities: ['library'] }, '학생증?');

    expect(response.body).not.toHaveProperty('offers');
  });

  it('has no button for all the quests at once, or for one done online', async () => {
    await stage.asking('2093-03-03', '11:50');

    const all = await stage.send([{ tool: 'getTutorial', input: {} }, { text: '…' }], {}, '튜토리얼 뭐 있어?');
    const online = await stage.send(
      [{ tool: 'getTutorial', input: { questKey: 'chatgpt-edu' } }, { text: '…' }],
      {},
      'ChatGPT Edu 어떻게 써?',
    );

    expect(all.body).not.toHaveProperty('offers');
    expect(online.body).not.toHaveProperty('offers');
  });
});

describe('가는 길 보기 pressed (board q12)', () => {
  it('draws the way to the place, the stay, and the way on to the next Class, and the model is given it', async () => {
    await stage.asking('2093-03-10', '11:50');
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    const response = await stage.send(
      [{ tool: 'findWay', input: { quest: 's-card' } }, { text: '…' }],
      { context: await at('301') },
      `${CARD} 가는 길`,
    );

    expect(response.status).toBe(200);
    const reply = replySchema.parse(response.body);
    expect(reply.answer).toBeNull();
    expect(reply.offers).toBeUndefined();
    expect(reply.lookup).toMatchObject({
      kind: 'way',
      chips: [
        { kind: 'origin', text: '301동에서', userId: null },
        { kind: 'until', text: '13:00 수업까지', userId: null },
      ],
      actions: [{ kind: 'guide', to: { label: '301동 정류장' } }],
    });
    expect(reply.lookup?.lines[1]).toEqual([
      { text: '13:00 수업 전', strong: true },
      { text: '에 다녀올 수 있어요', strong: false },
    ]);
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'found',
      fromIs: 'where the User is now',
      quest: CARD,
      place: 'NH농협두레문예관 2층',
      next: { due: '13:00 수업', place: '24동', walkMinutes: 8, lateMinutes: 0 },
    });
  });
});

describe("A quest's way, otherwise", () => {
  it('keeps the way and drops the button when both come in one run', async () => {
    await stage.asking('2093-03-17', '11:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    const response = await stage.send(
      [cardFacts, { tool: 'findWay', input: { quest: 's-card' } }, { text: '…' }],
      { context: await at('301') },
      '학생증 받으러 가는 길',
    );

    const reply = replySchema.parse(response.body);
    expect(reply.lookup?.kind).toBe('way');
    expect(reply.offers).toBeUndefined();
  });

  it('answers none for a quest there is not, and for one done online, and draws nothing', async () => {
    await stage.asking('2093-03-17', '11:50');

    const response = await stage.send(
      [
        { tool: 'findWay', input: { quest: 'no-such-quest' } },
        { tool: 'findWay', input: { quest: 'chatgpt-edu' } },
        { text: '…' },
      ],
      { context: await at('301') },
      '가는 길',
    );

    expect(stage.model.toolResults()).toEqual([
      { result: 'none', reason: 'There is no such quest.' },
      { result: 'none', reason: 'The quest is done online, at no place.' },
    ]);
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});
