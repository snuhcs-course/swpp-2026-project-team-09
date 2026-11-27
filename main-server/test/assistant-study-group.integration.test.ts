/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, resolve } from './meal-plan.js';

// Studying together answered on the map (P10 ticket 07), at the Assistant's endpoint with the scripted model, the 관정
// catalogue and the seed's Places and walking table: for an app that says `study-group`, the Friends resolved and
// planStudyGroup called with their ids, or with none when nobody was named; and the tools each kind of app is offered.
// Nobody here has a Class.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const NEITHER = ['library', 'answer', 'area'];
const PLAN_ONLY = [...NEITHER, 'study-plan'];
const GROUP_ONLY = [...NEITHER, 'study-group'];
const BOTH = [...NEITHER, 'study-plan', 'study-group'];

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('"민수, 지은, 서준이랑 내일 스터디" from an app that says study-group', () => {
  it('resolves each Friend and calls planStudyGroup with their ids: one 관정관 plan with its key', async () => {
    await stage.asking('2087-04-01', '19:10');
    const friends = [await stage.friend('민수'), await stage.friend('지은'), await stage.friend('서준')];
    const friendIds = friends.map(({ id }) => id);

    const response = await stage.send(
      [
        resolve('민수'),
        resolve('지은'),
        resolve('서준'),
        { tool: 'planStudyGroup', input: { friendIds, date: '2087-04-02' } },
        { text: '…' },
      ],
      { clientCapabilities: GROUP_ONLY },
      '민수, 지은, 서준이랑 내일 스터디',
    );

    expect(response.status).toBe(200);
    const { answer } = replySchema.parse(response.body);
    expect(answer?.input).toMatchObject({ kind: 'study', together: true, date: '2087-04-02' });
    expect(answer?.plans[0]?.study?.group).toMatchObject({
      people: 4,
      moreNeeded: 0,
      key: 'book:4F-group-6:2087-04-02:0900:180',
    });
    expect(stage.model.toolResults().at(-1)).toMatchObject({
      result: 'planned',
      why: '네 명이 모두 비는 내일 09:00에 관정 4층 6인실을 추천해요.',
      moreNeeded: 0,
    });
  });

  it('plans the asker alone at three more when nobody is named, and says so when the model writes nothing', async () => {
    await stage.asking('2087-04-08', '19:10');

    const response = await stage.send(
      [{ tool: 'planStudyGroup', input: {} }, { text: '' }],
      { clientCapabilities: BOTH },
      '같이 공부할 자리 있어?',
    );

    const { text, answer } = replySchema.parse(response.body);
    expect(answer?.plans[0]?.study?.group).toMatchObject({ people: 1, moreNeeded: 3, key: null });
    expect(answer?.plans[0]?.startAt).toBe('2087-04-08T19:30:00+09:00');
    expect(text).toBe('그룹스터디룸은 네 명부터예요. 세 명 더 부르면 돼요.');
  });
});

describe('The tools by the study capabilities', () => {
  it('keep proposeStudyRoom without study-group, and give planStudyGroup in its place with it', async () => {
    await stage.asking('2087-04-15', '12:10');
    const offered: Record<string, string[]> = {};
    for (const [name, capabilities] of Object.entries({ NEITHER, PLAN_ONLY, GROUP_ONLY, BOTH })) {
      // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one request at a time
      await stage.send([{ text: '네' }], { clientCapabilities: capabilities }, '같이 공부할 자리 있어?');
      offered[name] = toolNames().filter((tool) => ['planStudy', 'planStudyGroup', 'proposeStudyRoom'].includes(tool));
    }

    expect(offered).toEqual({
      NEITHER: ['proposeStudyRoom'],
      PLAN_ONLY: ['planStudy', 'proposeStudyRoom'],
      GROUP_ONLY: ['planStudyGroup'],
      BOTH: ['planStudy', 'planStudyGroup'],
    });
  });
});
