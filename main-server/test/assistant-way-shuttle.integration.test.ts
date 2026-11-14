/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// The shuttle weighed against the walk, at the Assistant's endpoint with the scripted model, the seed's walking table,
// shuttle timing, stops, and Places: "셔틀 탈까 걸을까" (board q4, a Tuesday at 16:40 at 301동, the next Class at 17:00
// in 58동), and a walk the shuttle does not beat (board q1). Only test/shuttle.integration.test.ts stores shuttles, and
// one stored there is years from this clock, so none is reported here and the wait is the timing's average.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({ lookup: z.custom<Lookup | null>() });

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

// The text of each line, its parts joined.
const linesOf = ({ lines }: Lookup): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

async function at(number: string): Promise<{ location: { latitude: number; longitude: number } }> {
  const { latitude, longitude } = await stage.numbered(number);
  return { location: { latitude, longitude } };
}

// "셔틀 탈까 걸을까" from 301동 at 16:40 on that Tuesday, with a Class at 17:00 in 58동.
async function shuttleOrWalk(date: string): Promise<{ status: number; body: unknown }> {
  await stage.asking(date, '16:40');
  await stage.classAt(stage.asker, '17:00', '18:15', '58');
  const findWay: Step = { tool: 'findWay', input: {} };
  return stage.send([findWay, { text: '셔틀이 11분 빨라요.' }], { context: await at('301') });
}

describe('"셔틀 탈까 걸을까" at 16:40 at 301동 (board q4)', () => {
  it('takes the shuttle to the next Class, with the average wait', async () => {
    const response = await shuttleOrWalk('2096-05-08');

    expect(response.status).toBe(200);
    const lookup = lookupIn(response.body);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '17:00 수업까지']);
    expect(linesOf(lookup)).toEqual(['셔틀이 11분 빨라요', '16:40에 나서면 16:54 도착']);
    expect(lookup.basis).toEqual([
      '지금 나서 정류장까지 2분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 4분',
      '타는 시간 7분 · 내려서 걷기 1분 · 모두 14분',
      '지금 걸어 나서면 25분 · 17:05 도착, 5분 늦어요',
      '셔틀은 걷기보다 3분 이상 빠를 때만 권해요 (평일 8–21시)',
    ]);
  });

  it('draws the stops, the faded walk, and the ride, and offers route guidance', async () => {
    const lookup = lookupIn((await shuttleOrWalk('2096-05-29')).body);

    expect(lookup.scene.places.map(({ place, role }) => [place.label, role])).toEqual([
      ['301동 정류장', 'stop'],
      ['경영대 정류장', 'stop'],
      ['58동', 'next'],
    ]);
    expect(lookup.scene.routes.map(({ role }) => role)).toEqual([
      'alt',
      'me',
      ...Array.from({ length: 6 }, () => 'shuttle'),
      'me',
    ]);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});

describe('What the model is given of a way by the shuttle', () => {
  it('is the stops, the times, and the minutes, and no coordinates', async () => {
    await shuttleOrWalk('2096-05-15');

    const [given] = stage.model.toolResults();
    expect(given).toMatchObject({
      walkMinutes: 25,
      shuttle: {
        taken: true,
        boardAt: '301동 정류장',
        getOffAt: '경영대 정류장',
        leaveAt: '16:40',
        comesAt: '16:46',
        comesBy: 'the average wait at this hour',
        arrival: '16:54',
        lateMinutes: 0,
      },
    });
    expect(JSON.stringify(given)).not.toMatch(/37\.4\d|126\.9\d/u);
  });
});

describe('"문화관이 어디야?" at 11:50 at 301동 (board q1)', () => {
  it('walks, the resolver answering the one 문화관, and the basis names the shuttle', async () => {
    await stage.asking('2096-05-22', '11:50');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [
        { tool: 'resolvePlace', input: { words: '문화관' } },
        { tool: 'findWay', input: { to: cultureHall.id } },
        { text: '문화관은 지금 있는 301동에서 걸어서 18분이에요.' },
      ],
      { context: await at('301') },
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'one', candidate: { id: cultureHall.id } });
    const lookup = lookupIn(response.body);
    expect(linesOf(lookup)).toEqual(['문화관(73동)은 여기예요', '지금 있는 301동에서 걸어서 18분']);
    expect(lookup.basis).toEqual(['301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표', '셔틀은 18분 걸려 걸어요']);
  });
});
