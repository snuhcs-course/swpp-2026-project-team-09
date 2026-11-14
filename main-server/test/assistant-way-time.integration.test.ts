/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { COURSE, MealPlanStage, ROOM } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// How many minutes to the next Class and whether the User will be late, at the Assistant's endpoint with the scripted
// model, the seed's walking table, and Places: boards q2 and q3 (a Tuesday at 12:40 and 12:50 at 301동, the next Class
// at 13:00 in 24동), board q15 from off campus (on a Tuesday here), what the model is given, a time the User named, and
// no next item.

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

// In 사당동, outside the campus boundary.
const OFF_CAMPUS = { latitude: 37.4766, longitude: 126.9816 };

const findWay = (input: object = {}): Step => ({ tool: 'findWay', input });

// The text of each line, its parts joined.
const linesOf = ({ lines }: Lookup): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

// The asker at 301동 at that time, with a Class there until 11:50 and one in 24동 at 13:00.
async function lateFor13(date: string, clock: string): Promise<{ location: { latitude: number; longitude: number } }> {
  await stage.asking(date, clock);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  const { latitude, longitude } = await stage.numbered('301');
  return { location: { latitude, longitude } };
}

describe('"늦나" at 12:40 at 301동 (board q2)', () => {
  it('goes to the next Class, says when to set out, and offers a leave-by notification', async () => {
    const context = await lateFor13('2096-03-27', '12:40');

    const response = await stage.send([findWay(), { text: '12:45에 나서면 13:00 수업에 맞아요.' }], { context });

    expect(response.status).toBe(200);
    const lookup = lookupIn(response.body);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지']);
    expect(linesOf(lookup)).toEqual(['24동까지 걸어서 15분', '12:45에 나서면 13:00에 맞아요']);
    expect(lookup.actions[0]).toEqual({
      kind: 'remind',
      at: '2096-03-27T12:45:00+09:00',
      text: '지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분',
    });
  });

  it('gives the model the times and minutes, and no course names, rooms, or coordinates', async () => {
    const context = await lateFor13('2096-04-03', '12:40');

    const response = await stage.send([findWay(), { text: '…' }], { context });

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'found',
      from: '301동',
      to: '24동',
      fromIs: 'where the User is now',
      walkMinutes: 15,
      deadline: { at: '13:00', isClass: true, leaveBy: '12:45', arrivalIfLeavingNow: '12:55', lateMinutes: 0 },
    });
    const replied = JSON.stringify(response.body);
    expect(replied).not.toContain(COURSE);
    expect(replied).not.toContain(ROOM);
  });
});

describe('"늦나" at 12:50 at 301동 (board q3)', () => {
  it('says when the User arrives if they go now, and how late', async () => {
    const context = await lateFor13('2096-04-10', '12:50');

    const response = await stage.send([findWay(), { text: '지금 가도 5분 늦어요.' }], { context });

    const lookup = lookupIn(response.body);
    expect(linesOf(lookup)).toEqual(['지금 가도 13:05 도착', '5분 늦어요']);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});

describe('"9시 수업인데 늦나" from off campus (board q15)', () => {
  it('counts from the main gate, without the location', async () => {
    await stage.asking('2096-04-17', '08:35');
    await stage.classAt(stage.asker, '09:00', '09:50', '24');

    const response = await stage.send([findWay(), { text: '…' }], { context: { location: OFF_CAMPUS } });

    const lookup = lookupIn(response.body);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['정문에서', '09:00 수업까지']);
    expect(linesOf(lookup)).toEqual(['정문을 08:50까지 지나면', '09:00 수업에 맞아요']);
    expect(lookup.basis).toEqual(['정문 → 24동 걸어서 10분', '지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요']);
    expect(lookup.scene.people[0]?.at).not.toEqual(OFF_CAMPUS);
  });
});

describe('A time the User named', () => {
  it('is the deadline of a way to a Place they named', async () => {
    const context = await lateFor13('2096-04-24', '13:30');
    const cultureHall = await stage.numbered('73');

    const response = await stage.send(
      [{ tool: 'resolvePlace', input: { words: '73동' } }, findWay({ to: cultureHall.id, by: '14:00' }), { text: '…' }],
      { context },
    );

    const lookup = lookupIn(response.body);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '14:00까지']);
    expect(linesOf(lookup)).toEqual(['문화관(73동)까지 걸어서 18분', '13:42에 나서면 14:00에 맞아요']);
  });
});

describe('No next item', () => {
  it('answers none, and nothing is drawn', async () => {
    const context = await lateFor13('2096-05-01', '14:00');

    const response = await stage.send([findWay(), { text: '…' }], { context });

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});
