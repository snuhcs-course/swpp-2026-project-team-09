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
import { type AnswerReply, NO_CONTEXT, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import {
  LIBRARY_ANSWER_RULES,
  LIBRARY_GROUP_RULES,
  LIBRARY_STUDY_GROUP_RULES,
  LIBRARY_STUDY_RULES,
} from '../src/assistant/library/library-rules.js';
import { planStudyGroup, STUDY_GROUP_RULES } from '../src/assistant/lookup/study-group-tools.js';
import { STUDY_PLAN_RULES } from '../src/assistant/lookup/study-plan-tools.js';
import { chatServicesWithoutData } from './chat-services.js';
import { STUDY_GROUP_MORE_NEEDED, STUDY_GROUP_TO_SEND } from './fixtures/study-group-answers.js';

// planStudyGroup and its rules for an app that says `study-group` (P10 ticket 07): the prompt and tools of the four
// kinds of app (neither capability, study-plan only, study-group only, both), the tool's input from what the User
// named, and what the model is told.

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

// The option sets of an app that draws answers, without either study capability.
const DRAWN: ChatAssistantOptions[] = [false, true].flatMap((drawsEvents) =>
  [false, true].flatMap((drawsMeets) =>
    [false, true].map((drawsArea) => ({ drawsAnswers: true, drawsEvents, drawsMeets, drawsArea })),
  ),
);

const toolsOf = (options: ChatAssistantOptions): string[] => Object.keys(chatAssistant(SERVICES, options).tools);

describe('The prompt and tools without study-group', () => {
  it('keep proposeStudyRoom, study-plan or not, and offer no planStudyGroup', () => {
    for (const options of DRAWN) {
      for (const drawsStudy of [false, true]) {
        const tools = toolsOf({ ...options, drawsStudy });

        expect(tools).toContain('proposeStudyRoom');
        expect(tools).not.toContain('planStudyGroup');
        expect(chatAssistant(SERVICES, { ...options, drawsStudy }).instructions).not.toContain(STUDY_GROUP_RULES);
      }
    }
  });

  it('are not offered planStudyGroup by an app that does not draw answers', () => {
    expect(toolsOf({ drawsAnswers: false, drawsStudyGroup: true })).not.toContain('planStudyGroup');
  });
});

describe('The prompt and tools with study-group', () => {
  it('swap proposeStudyRoom and its rule for planStudyGroup and its rules with study-group alone', () => {
    for (const options of DRAWN) {
      const before = chatAssistant(SERVICES, options);
      const group = chatAssistant(SERVICES, { ...options, drawsStudyGroup: true });

      expect(group.instructions).toBe(
        before.instructions.replace(LIBRARY_ANSWER_RULES, `${STUDY_GROUP_RULES}\n\n${LIBRARY_GROUP_RULES}`),
      );
      expect(Object.keys(group.tools).toSorted()).toEqual(
        [...Object.keys(before.tools).filter((name) => name !== 'proposeStudyRoom'), 'planStudyGroup'].toSorted(),
      );
    }
  });

  it('give an app with both planStudy for studying alone and planStudyGroup for studying together', () => {
    for (const options of DRAWN) {
      const both = chatAssistant(SERVICES, { ...options, drawsStudy: true, drawsStudyGroup: true });
      const tools = Object.keys(both.tools);

      expect(tools).toEqual(expect.arrayContaining(['planStudy', 'planStudyGroup', 'findLibrarySpace']));
      expect(tools).not.toContain('proposeStudyRoom');
      expect(tools).not.toContain('findStudyNearby');
      expect(both.instructions).toContain(STUDY_GROUP_RULES);
      expect(both.instructions).toContain(LIBRARY_STUDY_GROUP_RULES);
      expect(both.instructions).not.toContain(STUDY_PLAN_RULES);
      expect(both.instructions).toContain('조용히 공부할 곳, 혼자 공부할 곳, 컴퓨터 쓸 곳');
      expect(both.instructions).toContain("Studying together (같이, 친구랑, 스터디, 조모임, 팀플) is planStudyGroup's");
    }
  });

  it('leave the library’s seat words as they are, and route studying together to planStudyGroup', () => {
    for (const rules of [LIBRARY_GROUP_RULES, LIBRARY_STUDY_GROUP_RULES]) {
      expect(rules).not.toContain('proposeStudyRoom');
      expect(rules).toContain("it is planStudyGroup's");
    }
    expect(LIBRARY_GROUP_RULES).toContain('Words that name no space, such as "공부할 자리"');
    expect(LIBRARY_STUDY_GROUP_RULES).toContain('"공부할 자리 있어?" asked without a booking is planStudy\'s');
    expect(LIBRARY_STUDY_RULES).toContain('proposeStudyRoom');
  });
});

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const FRIENDS = [
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b01',
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b02',
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b03',
];

function contextOf(): ToolContext {
  const found = new FoundIds();
  found.add('friend', FRIENDS);
  return {
    userId: ME,
    now: new Date('2026-11-04T19:10:00+09:00'),
    context: NO_CONTEXT,
    capabilities: new Set<ClientCapability>(['library', 'answer', 'study-group']),
    found,
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

const asked: { input: StudyInput; dates: readonly string[] | undefined }[] = [];

// The answer together of the fixtures: the full plan for four, one more needed for fewer.
const answered = (people: number): AnswerReply => (people >= 4 ? STUDY_GROUP_TO_SEND : STUDY_GROUP_MORE_NEEDED);

const tool = (): ReturnType<typeof planStudyGroup> =>
  planStudyGroup(
    {
      plan: (_userId, input, _at, dates) => {
        asked.push({ input, dates });
        return Promise.resolve({ answer: answered(input.people.length), otherDays: [] });
      },
      aheadDays: () => 3,
    },
    SERVICES.library,
  );

describe('planStudyGroup', () => {
  it('plans the asker alone, together, when the User named nobody (같이 공부할 자리 있어?)', async () => {
    const context = contextOf();

    const words = await tool().run({}, context);

    expect(asked.at(-1)?.input).toMatchObject({
      kind: 'study',
      date: '2026-11-04',
      together: true,
      people: [{ userId: ME, constraints: [] }],
      chosen: { seatSpaceId: null, roomSpaceId: null },
    });
    expect(asked.at(-1)?.dates).toEqual(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
    expect(context.presented.answer).toBe(STUDY_GROUP_MORE_NEEDED);
    expect(words).toMatchObject({
      result: 'planned',
      moreNeeded: 1,
      why: '그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.',
    });
  });

  it('plans the Friends named, the asker first, on the day and for the length said', async () => {
    const one = await tool().run({ friendIds: [FRIENDS[0] ?? ''], date: '2026-11-05' }, contextOf());
    expect(asked.at(-1)?.input.people.map(({ userId }) => userId)).toEqual([ME, FRIENDS[0]]);
    expect(one).toMatchObject({ result: 'planned' });

    const three = await tool().run({ friendIds: FRIENDS, date: '2026-11-05', minutes: 120 }, contextOf());
    expect(asked.at(-1)?.input).toMatchObject({ date: '2026-11-05', minutes: 120, together: true });
    expect(asked.at(-1)?.input.people.map(({ userId }) => userId)).toEqual([ME, ...FRIENDS]);
    expect(three).toMatchObject({
      result: 'planned',
      moreNeeded: 0,
      why: '네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요.',
      room: '관정 4층 6인실',
    });
  });
});

describe('planStudyGroup over a period, and its refusals', () => {
  it('plans a period from today on, and refuses one longer than a week', async () => {
    await tool().run({ friendIds: FRIENDS, firstDay: '2026-11-03', lastDay: '2026-11-08' }, contextOf());
    expect(asked.at(-1)?.dates).toEqual(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);

    const before = asked.length;
    expect(await tool().run({ firstDay: '2026-11-04', lastDay: '2026-11-20' }, contextOf())).toMatchObject({
      result: 'none',
    });
    expect(asked).toHaveLength(before);
  });

  it('refuses a Friend no resolveFriend returned in this message, planning nothing', async () => {
    const before = asked.length;

    await expect(tool().run({ friendIds: ['1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b99'] }, contextOf())).rejects.toThrow(
      'No tool returned these ids',
    );
    expect(asked).toHaveLength(before);
  });
});
