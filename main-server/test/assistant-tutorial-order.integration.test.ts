/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { COURSE, MealPlanStage, ROOM } from './meal-plan.js';
import { BUTTON_KEYS, completeAll } from './tutorial.js';

// The Tutorial Quests in order before the next Class, drawn on the map as a Lookup, at the Assistant's endpoint with
// the scripted model, the seed's walking table and Places, and content/tutorial.yaml: board q10 (a Tuesday at 13:50, as
// the Class in 24동 ends, with the next at 17:00 in 58동, and three quests left), what the model is given, no order
// when where the User sets out from is not known, and a start the User names.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

// Board q10's three quests left: the 보건진료소, the 학생증, and the 분실물센터.
const BOARD_Q10 = new Set(['health-clinic', 's-card', 'lost-and-found']);

const CLINIC = '서울대 보건진료소 이용';
const LOST = '분실물센터 위치 알아두기';
const CARD = '학생증(S-CARD) 발급받기';

const BOARD_Q10_LOOKUP = {
  kind: 'tutorial',
  chips: [
    { kind: 'origin', text: '24동에서', userId: null },
    { kind: 'until', text: '17:00 수업까지', userId: null },
  ],
  lines: [
    [
      { text: '세 곳을 돌면 ', strong: false },
      { text: '14:29', strong: true },
      { text: '에 끝나요', strong: false },
    ],
    [
      { text: '다음은 ', strong: false },
      { text: '17:00 수업', strong: true },
      { text: ' · 58동', strong: false },
    ],
  ],
  steps: [
    { at: '13:51', text: `학생회관 3층 · ${CLINIC}` },
    { at: '14:08', text: `아시아연구소 1층 · ${LOST}` },
    { at: '14:19', text: `NH농협두레문예관 2층 · ${CARD}` },
  ],
  actions: [{ kind: 'guide', to: { label: '학생회관 3층' } }],
};

const BOARD_Q10_WORDS = {
  result: 'found',
  from: '24동',
  fromIs: "the Place of the User's last item today",
  stops: [
    {
      at: '13:51',
      quest: CLINIC,
      place: '학생회관 3층',
      walkMinutes: 1,
      when: '보건진료소는 평일 09:00–12:00, 13:30–17:30에 진료해요 · 금요일은 16:30까지',
    },
    { at: '14:08', quest: LOST, place: '아시아연구소 1층', walkMinutes: 7, when: '분실물센터는 09:00–18:00에 열어요' },
    {
      at: '14:19',
      quest: CARD,
      place: 'NH농협두레문예관 2층',
      walkMinutes: 1,
      when: '학생증은 MySNU 신청 다음 날부터 받아요 · 평일 09:00–17:50',
    },
  ],
  doneAt: '14:29',
  next: { at: '17:00', isClass: true, place: '58동', walkMinutes: 5 },
  minutesPerStop: 10,
  leftOut: [],
  online: [],
};

describe('The Tutorial Quests left before the 17:00 Class (board q10)', () => {
  it('are drawn as a Lookup numbered with their times, and the model is given the order in words', async () => {
    await stage.asking('2093-01-27', '13:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    await stage.classAt(stage.asker, '17:00', '18:15', '58');
    await completeAll(stage.app, stage.asker, { keys: BUTTON_KEYS.filter((key) => !BOARD_Q10.has(key)) });

    const response = await stage.send(
      [{ tool: 'findTutorialOrder', input: {} }, { text: '17:00 수업 전에 세 곳을 가장 적게 걸어서 돌 수 있어요.' }],
      {},
      '새내기 퀘스트 뭐부터?',
    );

    expect(response.status).toBe(200);
    const { answer, lookup } = replySchema.parse(response.body);
    expect(answer).toBeNull();
    expect(lookup).toMatchObject(BOARD_Q10_LOOKUP);
    expect(lookup?.scene.places.map(({ tag, order }) => [tag, order ?? null])).toEqual([
      [`13:51 ${CLINIC}`, 1],
      [`14:08 ${LOST}`, 2],
      [`14:19 ${CARD}`, 3],
      ['17:00 수업 · 58동', null],
    ]);
    expect(stage.model.toolResults()[0]).toEqual(BOARD_Q10_WORDS);
    expect(JSON.stringify(response.body)).not.toContain(COURSE);
    expect(JSON.stringify(response.body)).not.toContain(ROOM);
  });
});

// A User before their first Class, whose location the app does not send.
async function beforeTheDay(date: string): Promise<void> {
  await stage.asking(date, '09:00');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

describe('No order', () => {
  it('is answered when where the User sets out from is not known, and nothing is drawn', async () => {
    await beforeTheDay('2093-02-03');

    const response = await stage.send([{ tool: 'findTutorialOrder', input: {} }, { text: '어디서 출발해요?' }]);

    expect(response.status).toBe(200);
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'none',
      reason: expect.stringContaining('Where the User sets out from is not known') as unknown,
    });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});

describe('A start the User names', () => {
  it('is where the order sets out from, once resolvePlace returned it', async () => {
    await beforeTheDay('2093-02-10');
    const place301 = await stage.numbered('301');

    const response = await stage.send([
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'findTutorialOrder', input: { from: place301.id } },
      { text: '…' },
    ]);

    expect(replySchema.parse(response.body).lookup?.chips[0]).toEqual({
      kind: 'origin',
      text: '301동에서',
      userId: null,
    });
  });
});
