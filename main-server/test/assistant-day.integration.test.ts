/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { DAY_RULES } from '../src/assistant/lookup/day-tools.js';
import { COURSE, MealPlanStage, ROOM } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A day's Classes drawn on the map as a Lookup, at the Assistant's endpoint with the scripted model, the seed's walking
// table, and Places: board q14 (a Tuesday at 10:30, with Classes in 301동, 24동, and 58동), what the model is given,
// and an app that does not draw answers. Each test takes a Tuesday of 2093.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

const findDay = (date: string): Step => ({ tool: 'findDay', input: { date } });

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

const BOARD_Q14 = '2093-01-13';

const BOARD_Q14_LOOKUP = {
  kind: 'day',
  lines: [
    [
      { text: '1월 13일 화요일 ', strong: false },
      { text: '수업 3개', strong: true },
    ],
    [{ text: '빈 시간 70분, 3시간 10분', strong: false }],
    [{ text: '수업 사이 걸어서 15분, 12분', strong: false }],
  ],
  steps: [
    { at: '11:00–11:50', text: '301동' },
    { at: '13:00–13:50', text: '24동' },
    { at: '17:00–18:15', text: '58동' },
  ],
  actions: [
    {
      kind: 'remind',
      at: `${BOARD_Q14}T12:45:00+09:00`,
      text: '지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분',
    },
  ],
};

const BOARD_Q14_WORDS = {
  result: 'found',
  date: BOARD_Q14,
  classes: [
    { start: '11:00', end: '11:50', place: '301동' },
    { start: '13:00', end: '13:50', place: '24동' },
    { start: '17:00', end: '18:15', place: '58동' },
  ],
  freeMinutes: [70, 190],
  walkMinutes: [15, 12],
};

describe("Today's Classes (board q14)", () => {
  it('are drawn as a Lookup of the day, and the model is given their times, buildings, and minutes alone', async () => {
    await stage.asking(BOARD_Q14, '10:30');
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    await stage.classAt(stage.asker, '17:00', '18:15', '58');

    const response = await stage.send([findDay(BOARD_Q14), { text: '오늘 수업은 3개예요.' }], {}, '오늘 수업 뭐 있어?');

    expect(response.status).toBe(200);
    const { answer, lookup } = replySchema.parse(response.body);
    expect(answer).toBeNull();
    expect(lookup).toMatchObject(BOARD_Q14_LOOKUP);
    expect(lookup?.scene.places.map(({ tag, order }) => [tag, order])).toEqual([
      ['11:00–11:50 · 301동', 1],
      ['13:00–13:50 · 24동', 2],
      ['17:00–18:15 · 58동', 3],
    ]);
    expect(stage.model.toolResults()[0]).toEqual(BOARD_Q14_WORDS);
    expect(JSON.stringify(response.body)).not.toContain(COURSE);
    expect(JSON.stringify(response.body)).not.toContain(ROOM);
  });
});

describe('An app that does not draw answers', () => {
  it("keeps today's prompt and tools: no findDay nor its rules, getMyDay still, and no Lookup", async () => {
    await stage.asking('2093-01-20', '10:30');

    const response = await stage.send([{ text: '네' }], { clientCapabilities: ['library'] }, '오늘 수업 뭐 있어?');

    expect(response.status).toBe(200);
    expect(toolNames()).not.toContain('findDay');
    expect(toolNames()).toContain('getMyDay');
    expect(stage.model.system()).not.toContain(DAY_RULES);
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});
