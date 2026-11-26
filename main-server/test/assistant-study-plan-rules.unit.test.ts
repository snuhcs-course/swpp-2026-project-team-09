/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  chatAssistant,
  type ChatAssistantOptions,
  type ChatAssistantServices,
} from '../src/assistant/chat/chat-assistant.js';
import { type AnswerReply, NO_CONTEXT, type RequestContext, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { contextLines } from '../src/assistant/context-lines.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { choosePlan } from '../src/assistant/gathering/choose-plan.js';
import { LIBRARY_ANSWER_RULES, LIBRARY_STUDY_RULES } from '../src/assistant/library/library-rules.js';
import { planStudy, STUDY_PLAN_RULES } from '../src/assistant/lookup/study-plan-tools.js';
import { wordlessStudySentence } from '../src/assistant/lookup/study-plan-words.js';
import { STUDY_RULES } from '../src/assistant/lookup/study-tools.js';
import { wordlessText } from '../src/assistant/wordless-reply.js';
import { chatServicesWithoutData } from './chat-services.js';
import { STUDY_ANSWER } from './fixtures/study-answer.js';
import { STUDY_GROUP_TO_SEND } from './fixtures/study-group-answers.js';

// planStudy and its rules for an app that says `study-plan` (P10 ticket 04): the prompt and tools of every other app
// as they are, the tool's refusals before it plans, and the one sentence a reply with no words says over the answer.

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

// The option sets of an app that draws answers, without `study-plan`.
const DRAWN: ChatAssistantOptions[] = [false, true].flatMap((drawsEvents) =>
  [false, true].flatMap((drawsMeets) =>
    [false, true].map((drawsArea) => ({ drawsAnswers: true, drawsEvents, drawsMeets, drawsArea })),
  ),
);

const toolsOf = (options?: ChatAssistantOptions): string[] => Object.keys(chatAssistant(SERVICES, options).tools);

describe('The prompt and tools without study-plan', () => {
  it('are those of an app that says nothing of it, with no planStudy, and "공부할 자리" the library’s', () => {
    for (const options of [undefined, ...DRAWN]) {
      const feature = chatAssistant(SERVICES, options);
      const without = chatAssistant(SERVICES, options === undefined ? undefined : { ...options, drawsStudy: false });

      expect(feature.instructions).toBe(without.instructions);
      expect(toolsOf(options)).not.toContain('planStudy');
      expect(feature.instructions).not.toContain(STUDY_PLAN_RULES);
    }
    expect(chatAssistant(SERVICES, DRAWN[0]).instructions).toContain(LIBRARY_ANSWER_RULES);
  });
});

describe('The prompt and tools with study-plan', () => {
  it('swap findStudyNearby and its rules for planStudy and its rules, and the library’s "공부할 자리" sentence', () => {
    for (const options of DRAWN) {
      const study = chatAssistant(SERVICES, { ...options, drawsStudy: true });
      const before = chatAssistant(SERVICES, options).instructions;
      // With area, the study rules stand where findStudyNearby's stood; without it, after the other rules of the map.
      const expected =
        options.drawsArea === true
          ? before.replace(STUDY_RULES, STUDY_PLAN_RULES).replace(LIBRARY_ANSWER_RULES, LIBRARY_STUDY_RULES)
          : before.replace(LIBRARY_ANSWER_RULES, `${STUDY_PLAN_RULES}\n\n${LIBRARY_STUDY_RULES}`);

      expect(study.instructions).toBe(expected);
      expect(Object.keys(study.tools)).toContain('planStudy');
      expect(Object.keys(study.tools)).not.toContain('findStudyNearby');
    }
  });

  it('is not offered to an app that does not draw answers', () => {
    expect(toolsOf({ drawsAnswers: false, drawsStudy: true })).not.toContain('planStudy');
  });
});

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

function contextOf(context: RequestContext): ToolContext {
  return {
    userId: ME,
    now: new Date('2026-11-04T19:10:00+09:00'),
    context,
    capabilities: new Set<ClientCapability>(['answer', 'study-plan']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe('planStudy', () => {
  const asked: StudyInput[] = [];
  const tool = planStudy({
    plan: (_userId, input) => {
      asked.push(input);
      return Promise.resolve({ ...STUDY_ANSWER, input });
    },
  });

  it('plans for today, puts the answer on the map, and tells the model the plans in words', async () => {
    const toolContext = contextOf(NO_CONTEXT);

    const words = await tool.run({ what: 'any' }, toolContext);

    expect(asked.at(-1)).toMatchObject({ kind: 'study', date: '2026-11-04', what: 'any', area: null });
    expect(toolContext.presented.answer?.plans).toEqual(STUDY_ANSWER.plans);
    expect(words).toMatchObject({ result: 'planned' });
    expect(JSON.stringify(words)).toContain('"number":1,"building":"공대 신양학술정보관"');
  });

  it('refuses 근처 without the visible area, and a day out of reach, planning nothing', async () => {
    const before = asked.length;

    expect(await tool.run({ what: 'quiet', near: true }, contextOf(NO_CONTEXT))).toMatchObject({ result: 'none' });
    expect(await tool.run({ what: 'any', date: '2026-11-03' }, contextOf(NO_CONTEXT))).toMatchObject({
      result: 'none',
    });
    expect(asked).toHaveLength(before);
  });
});

describe('A study answer’s one sentence', () => {
  it('recommends the first plan with why, when the model writes none', () => {
    const presented = { mapButtons: [], cards: [], proposal: null, answer: STUDY_ANSWER, lookup: null, refusal: null };

    expect(wordlessStudySentence(STUDY_ANSWER)).toBe('열려 있는 곳 중 가장 가까운 공대 신양학술정보관을 추천해요.');
    expect(wordlessText(presented)).toBe('열려 있는 곳 중 가장 가까운 공대 신양학술정보관을 추천해요.');
  });

  it('says the stay before the next item when it is short, and that the hours are not known', () => {
    const [first, ...rest] = STUDY_ANSWER.plans;
    if (first === undefined) {
      throw new Error('The fixture has plans');
    }
    const short: AnswerReply = {
      ...STUDY_ANSWER,
      chips: [{ kind: 'until', text: '21:00 수업까지', userId: null }],
      plans: [{ ...first, togetherMinutes: 108 }, ...rest],
    };
    const unknown: AnswerReply = { ...STUDY_ANSWER, plans: STUDY_ANSWER.plans.slice(3) };

    expect(wordlessStudySentence(short)).toBe('21:00 수업까지 가장 오래 있을 수 있는 공대 신양학술정보관을 추천해요.');
    expect(wordlessStudySentence(unknown)).toBe('여는 시간은 모르지만 가장 가까운 인문대 신양학술정보관을 추천해요.');
  });
});

describe('A study answer on screen', () => {
  const planIds = STUDY_ANSWER.plans.map(({ id }) => id);
  const onScreen = (planId: string): RequestContext => ({
    ...NO_CONTEXT,
    conditions: STUDY_ANSWER.input,
    planId,
    planIds,
  });

  it('is chosen by number or by building, as a meal answer is', async () => {
    const byNumber = contextOf(onScreen(planIds[0] ?? ''));
    const byName = contextOf(onScreen(planIds[0] ?? ''));

    expect(await choosePlan().run({ number: 2 }, byNumber)).toMatchObject({ result: 'chosen', number: 2 });
    expect(byNumber.presented.select).toBe(planIds[1]);
    expect(await choosePlan().run({ restaurant: '법학도서관' }, byName)).toMatchObject({ result: 'chosen' });
    expect(byName.presented.select).toBe('법학도서관');
  });

  it('gives 관정관’s seat to book when its plan is shown, and none for another', () => {
    expect(contextLines(onScreen('관정관'))[0]).toContain('"book":"7F-7A-zone2"');
    expect(contextLines(onScreen('법학도서관'))[0]).not.toContain('"book"');
    expect(
      contextLines({ ...NO_CONTEXT, conditions: STUDY_GROUP_TO_SEND.input, planId: '관정관', planIds: ['관정관'] })[0],
    ).not.toContain('"book"');
  });
});
