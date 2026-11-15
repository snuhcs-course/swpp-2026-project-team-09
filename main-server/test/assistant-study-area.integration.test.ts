/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { STUDY_RULES } from '../src/assistant/lookup/study-tools.js';
import { signInUser } from './friends.js';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';
import { A9_AREA } from './study-area-example.js';

// "이 근처 조용히 공부할 곳" over the visible area, drawn on the map as a Lookup, at the Assistant's endpoint with the
// scripted model and the seed's Places, walking table, and study spaces: board a9 (a Tuesday at 12:10, at 301동, a
// student of 경제학부), what the model is given, a request without the area, and an app without the capability `area`.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const AREA_APP = ['library', 'answer', 'area'];
const ASKED = '이 근처 조용히 공부할 곳';

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

const findStudyNearby = (what = 'quiet'): Step => ({ tool: 'findStudyNearby', input: { what } });

// The asker of board a9, a student of 경제학부: a Class in 301동 until 11:50, and one in 24동 at 13:00.
async function boardA9(date: string): Promise<void> {
  await stage.asking(date, '12:10');
  stage.asker = { ...(await signInUser(stage.app, { name: '유상', department: '경제학부' })), name: '유상' };
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

async function a9Context(): Promise<object> {
  const { latitude, longitude } = await stage.numbered('301');
  return { location: { latitude, longitude }, viewport: A9_AREA };
}

function sendA9(steps: Step[], context: object): ReturnType<MealPlanStage['send']> {
  return stage.send(steps, { context, clientCapabilities: AREA_APP }, ASKED);
}

describe('Board a9 at the endpoint', () => {
  it('draws 44-1동 picked, the department rooms faded, and 관정 to the north, and no answer', async () => {
    await boardA9('2077-01-05');
    const [sinyang, kwanjeong] = [await stage.numbered('44-1'), await stage.numbered('62-1')];

    const response = await sendA9([findStudyNearby(), { text: '…' }], await a9Context());

    expect(response.status).toBe(200);
    expect(replySchema.parse(response.body).answer).toBeNull();
    const lookup = lookupIn(response.body);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지', '보는 범위', '조용한 곳']);
    expect(lookup.scene.places.map(({ place, role, tag }) => [place.placeId, role, tag])).toEqual([
      [sinyang.id, 'pick', '3층 자유열람실 · 학기 중 24시간'],
      [(await stage.numbered('301')).id, 'dropped', '해동학술정보실 · 전기·정보공학부·컴퓨터공학부'],
      [(await stage.numbered('302')).id, 'dropped', '화생공 해동학술정보실·학생라운지 · 화학생물공학부'],
    ]);
    expect(lookup.scene.flags.map(({ text, role }) => [text, role])).toEqual([
      ['걸어서 8분 · 12:52까지 34분', 'place'],
      ['↑ 관정', 'away'],
    ]);
    expect(lookup.scene.flags[1]?.placeId).toBe(kwanjeong.id);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide', 'ask']);
  });

  it('gives the model names and minutes, and none of the area', async () => {
    await boardA9('2077-01-12');

    await sendA9([findStudyNearby(), { text: '…' }], await a9Context());

    const given = stage.model.toolResults()[0];
    expect(given).toMatchObject({
      result: 'found',
      building: '공대 신양학술정보관',
      space: '3층 자유열람실',
      from: '301동',
      walkMinutes: 8,
      next: '13:00 수업',
      leaveBy: '12:52',
      stayMinutes: 34,
      kwanjeong: 'outside the visible area',
    });
    expect(JSON.stringify(given)).not.toMatch(/37\.|126\./u);
    expect(JSON.stringify(stage.model.received())).not.toContain(String(A9_AREA.north));
  });
});

describe('A request without the visible area', () => {
  it('answers none, and draws nothing', async () => {
    await boardA9('2077-01-19');
    const { location } = z.object({ location: z.unknown() }).parse(await a9Context());

    const response = await sendA9([findStudyNearby(), { text: '…' }], { location });

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app without the capability area', () => {
  it('is given the same prompt and tools as before, but for findStudyNearby and its rules', async () => {
    await stage.asking('2077-01-26', '12:10');

    await stage.send([{ text: '네' }], { clientCapabilities: AREA_APP }, ASKED);
    const [withArea, toolsWithArea] = [stage.model.system(), toolNames()];
    await stage.send([{ text: '네' }], { clientCapabilities: ['library', 'answer'] }, ASKED);

    expect(toolsWithArea).toContain('findStudyNearby');
    expect(withArea).toContain(STUDY_RULES);
    expect(toolNames()).toEqual(toolsWithArea.filter((name) => name !== 'findStudyNearby'));
    expect(stage.model.system()).toBe(withArea.replace(`\n\n${STUDY_RULES}`, ''));
  });

  it('is not offered findStudyNearby without answer or events, and is with events', async () => {
    await stage.asking('2077-02-02', '12:10');

    for (const clientCapabilities of [
      ['library', 'area'],
      ['library', 'answer', 'events'],
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one message at a time
      await stage.send([{ text: '네' }], { clientCapabilities }, ASKED);

      expect(toolNames()).not.toContain('findStudyNearby');
      expect(stage.model.system()).not.toContain(STUDY_RULES);
    }
    await stage.send([{ text: '네' }], { clientCapabilities: ['library', 'answer', 'events', 'area'] }, ASKED);

    expect(toolNames()).toEqual(expect.arrayContaining(['findStudyNearby', 'planEvents']));
  });

  it('is offered findStudyNearby beside planMeet with meet', async () => {
    await stage.asking('2077-02-09', '12:10');

    await stage.send([{ text: '네' }], { clientCapabilities: ['library', 'answer', 'meet', 'area'] }, ASKED);

    expect(toolNames()).toEqual(expect.arrayContaining(['findStudyNearby', 'planMeet']));
  });
});
