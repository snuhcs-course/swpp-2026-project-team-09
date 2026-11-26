/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { LIBRARY_ANSWER_RULES, LIBRARY_STUDY_RULES } from '../src/assistant/library/library-rules.js';
import { STUDY_PLAN_RULES } from '../src/assistant/lookup/study-plan-tools.js';
import { STUDY_RULES } from '../src/assistant/lookup/study-tools.js';
import { signInUser } from './friends.js';
import { MealPlanStage } from './meal-plan.js';
import { A9_AREA } from './study-area-example.js';

// "공부할 자리 있어?" answered as ranked study places (P10 ticket 04), at the Assistant's endpoint with the scripted
// model and the seed's Places, walking table, study spaces and hours: for an app that says `study-plan`, planStudy and
// its rules in the place of findStudyNearby's, and the study answer; for one that does not, the prompt and tools as
// before.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const STUDY_APP = ['library', 'answer', 'area', 'study-plan'];
const AREA_APP = ['library', 'answer', 'area'];
const ASKED = '공부할 자리 있어?';

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

async function asker(date: string): Promise<void> {
  await stage.asking(date, '12:10');
  stage.asker = { ...(await signInUser(stage.app, { name: '유상', department: '경제학부' })), name: '유상' };
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
}

describe('"공부할 자리 있어?" from an app that says study-plan', () => {
  it('gives the study answer, choosable, and the model the plans in words', async () => {
    await asker('2077-03-02');

    const response = await stage.send(
      [{ tool: 'planStudy', input: { what: 'any' } }, { text: '…' }],
      { clientCapabilities: STUDY_APP },
      ASKED,
    );

    expect(response.status).toBe(200);
    const { answer } = replySchema.parse(response.body);
    expect(answer?.input.kind).toBe('study');
    expect(answer?.choosable).toBe(true);
    expect(answer?.plans.length).toBeGreaterThan(0);
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned' });
    expect(JSON.stringify(stage.model.toolResults()[0])).toContain(`"number":1,"building":"${answer?.plans[0]?.id}"`);
    expect(JSON.stringify(stage.model.toolResults()[0])).not.toMatch(/좌석|seats? free/u);
  });

  it('says the first plan in one sentence when the model writes none', async () => {
    await asker('2077-03-09');

    const response = await stage.send(
      [{ tool: 'planStudy', input: { what: 'any' } }, { text: '' }],
      { clientCapabilities: STUDY_APP },
      ASKED,
    );

    const { text, answer } = replySchema.parse(response.body);
    expect(text).toMatch(/추천해요\.$/u);
    expect(text).toContain(answer?.plans[0]?.id ?? '-');
  });

  it('reads 근처 within the visible area', async () => {
    await asker('2077-03-16');

    const response = await stage.send(
      [{ tool: 'planStudy', input: { what: 'quiet', near: true } }, { text: '…' }],
      { clientCapabilities: STUDY_APP, context: { viewport: A9_AREA } },
      '근처 조용한 데',
    );

    const { answer } = replySchema.parse(response.body);
    expect(answer?.input).toMatchObject({ what: 'quiet', area: A9_AREA });
    expect(answer?.chips.map(({ text }) => text)).toContain('보는 범위');
  });
});

describe('The prompt and tools by study-plan', () => {
  it('offers planStudy and its rules in the place of findStudyNearby, and leaves "공부할 자리" to it', async () => {
    await stage.asking('2077-03-23', '12:10');

    await stage.send([{ text: '네' }], { clientCapabilities: AREA_APP }, ASKED);
    const [before, toolsBefore] = [stage.model.system(), toolNames()];
    await stage.send([{ text: '네' }], { clientCapabilities: STUDY_APP }, ASKED);

    expect(toolsBefore).not.toContain('planStudy');
    expect(toolNames()).toEqual(toolsBefore.map((name) => (name === 'findStudyNearby' ? 'planStudy' : name)));
    expect(stage.model.system()).toBe(
      before.replace(STUDY_RULES, STUDY_PLAN_RULES).replace(LIBRARY_ANSWER_RULES, LIBRARY_STUDY_RULES),
    );
    expect(stage.model.system()).toContain(STUDY_PLAN_RULES);
  });
});
