/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';

// A café on the way to the next Class (board q9), at the Assistant's endpoint with the scripted model, the seed's
// Places and walking table, and the cafés of seed/openstreetmap-cafes.json tied to their Places by position. Each
// date is a Tuesday.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

async function at(number: string): Promise<{ location: { latitude: number; longitude: number } }> {
  const { latitude, longitude } = await stage.numbered(number);
  return { location: { latitude, longitude } };
}

describe('A café on the way to the 13:00 Class (board q9)', () => {
  it('is drawn with the fewest extra minutes, the next two beside it, and the model is given them', async () => {
    await stage.asking('2093-03-03', '12:30');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    const response = await stage.send(
      [{ tool: 'findCafeOnWay', input: {} }, { text: '…' }],
      { context: await at('301') },
      '가는 길에 카페',
    );

    expect(response.status).toBe(200);
    const { answer, lookup } = replySchema.parse(response.body);
    expect(answer).toBeNull();
    expect(lookup).toMatchObject({
      kind: 'way',
      chips: [
        { kind: 'origin', text: '301동에서', userId: null },
        { kind: 'until', text: '13:00 수업까지', userId: null },
        { kind: 'what', text: '카페', userId: null },
      ],
    });
    expect(lookup?.scene.places.map(({ role }) => role)).toEqual(['pick', 'candidate', 'candidate', 'next']);
    expect(lookup?.basis.at(-1)).toBe('카페는 OpenStreetMap에 올라 있는 곳만 찾아요');
    const words = z
      .object({ result: z.literal('found'), to: z.string(), cafes: z.array(z.object({ name: z.string() })).length(3) })
      .parse(stage.model.toolResults()[0]);
    expect(words.to).toBe('24동');
    expect(lookup?.lines[0]?.[0]).toEqual({ text: words.cafes[0]?.name, strong: true });
  });
});

describe('No café', () => {
  it('is answered when the User has nothing later today and names no Place, and nothing is drawn', async () => {
    await stage.asking('2093-03-10', '12:30');

    const response = await stage.send(
      [{ tool: 'findCafeOnWay', input: {} }, { text: '…' }],
      { context: await at('301') },
      '가는 길에 카페',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'none',
      reason: expect.stringContaining('no item with a Place later today') as unknown,
    });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('is answered when the Class starts too soon to stop anywhere', async () => {
    await stage.asking('2093-03-17', '12:58');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    await stage.send([{ tool: 'findCafeOnWay', input: {} }, { text: '…' }], { context: await at('301') }, '카페');

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'none',
      reason: expect.stringContaining('No café can be stopped at') as unknown,
    });
  });
});
