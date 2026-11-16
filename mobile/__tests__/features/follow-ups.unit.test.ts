/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ConditionChip, MealInput } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { type FollowUpSource, followUpsOf, withRang } from '@/features/assistant/follow-ups';

// The follow-ups under a reply (P02 ticket 36): fixed per kind of reply, filled from its own date, meal, Friends and
// place, and kept only where the main server's Assistant brought what they name.

// Tuesday 2026-11-17, 05:40 in Korea.
const NOW = new Date('2026-11-17T05:40:00+09:00');
const TODAY = '2026-11-17';
const TOMORROW = '2026-11-18';

function reply(parts: Partial<FollowUpSource>): FollowUpSource {
  return { cards: [], failure: null, ...parts };
}

function person(text: string): ConditionChip {
  return { kind: 'person', text, userId: text };
}

function meal(date: string, which: MealInput['meal'], friends: readonly string[] = []): AnswerReply {
  return {
    ...MEAL_ANSWER,
    input: { ...MEAL_ANSWER.input, date, meal: which },
    chips: [...MEAL_ANSWER.chips.filter(({ kind }) => kind !== 'person'), ...friends.map((name) => person(name))],
    noPlan: null,
  };
}

function lookup(parts: Partial<Lookup>): Lookup {
  return { ...WAY_LOOKUP, ...parts };
}

// Partitions: today's lunch and dinner, tomorrow's lunch and dinner, alone and with Friends, and no Plan.
describe('under a meal Plan', () => {
  it.each([
    ['today’s lunch', TODAY, 'lunch', ['오늘 저녁 배고파', '내일 점심 배고파']],
    ['today’s dinner', TODAY, 'dinner', ['내일 점심 배고파', '내일 저녁 배고파']],
    ['tomorrow’s lunch', TOMORROW, 'lunch', ['내일 저녁 배고파']],
    ['tomorrow’s dinner', TOMORROW, 'dinner', []],
  ] as const)('offers the next meals after %s, as a hungry User says them', (_when, date, which, words) => {
    expect(followUpsOf(reply({ answer: meal(date, which) }), NOW)).toEqual(words);
  });

  it('names the Friends of the Plan, so the next meal is planned with them', () => {
    const answer = meal(TOMORROW, 'lunch', ['김민수', '박지은']);

    expect(followUpsOf(reply({ answer }), NOW)).toEqual(['김민수, 박지은이랑 내일 저녁 먹자']);
  });

  it('offers nothing under an answer without a Plan, whose own buttons say what to try', () => {
    const answer = { ...meal(TODAY, 'lunch'), noPlan: { reason: 'no-shared-time' as const, lines: [], relax: [] } };

    expect(followUpsOf(reply({ answer }), NOW)).toEqual([]);
  });
});

describe('under a meet and a day’s events', () => {
  it('puts the meal with the Friend first, then tomorrow’s meet', () => {
    const answer = { ...MEET_ANSWER, input: { ...MEET_ANSWER.input, date: TODAY }, chips: [person('김민수')] };

    expect(followUpsOf(reply({ answer, recalculated: true }), NOW)).toEqual([
      '김민수랑 같이 밥 먹자',
      '김민수랑 내일 만나고 싶어',
    ]);
  });

  it('asks for a party to go with first, and only under a reply to a message', () => {
    const answer = { ...EVENTS_ANSWER, input: { ...EVENTS_ANSWER.input, date: TODAY } };

    expect(followUpsOf(reply({ answer }), NOW)).toEqual(['같이 갈 파티 있어?', '내일 볼 만한 거 있어?']);
    expect(followUpsOf(reply({ answer, recalculated: true }), NOW)).toEqual(['내일 볼 만한 거 있어?']);
  });
});

describe('under a Lookup and a reply’s cards', () => {
  it('offers a meal with the Friend found', () => {
    const scene = {
      ...WAY_LOOKUP.scene,
      people: [
        {
          ...WAY_LOOKUP.scene.people[0],
          userId: 'f',
          name: '박지은',
          me: false,
          at: { latitude: 0, longitude: 0 },
          source: 'building' as const,
          tag: null,
        },
      ],
    };

    expect(followUpsOf(reply({ lookup: lookup({ kind: 'friend', scene }) }), NOW)).toEqual(['박지은이랑 같이 밥 먹자']);
  });

  it('offers tomorrow’s menu of the restaurant whose menu of today it showed', () => {
    const lines = [
      [
        { text: '301동식당', strong: true },
        { text: ' 오늘 점심은 부대짬뽕', strong: false },
      ],
    ];

    expect(followUpsOf(reply({ lookup: lookup({ kind: 'menu', lines }) }), NOW)).toEqual(['내일 301동식당 메뉴 뭐야?']);
  });

  it('offers nothing under a way, whose card has its own buttons', () => {
    expect(followUpsOf(reply({ lookup: WAY_LOOKUP }), NOW)).toEqual([]);
  });

  it('narrows a list of parties, and offers another reading room under a seat card, only after a message', () => {
    expect(followUpsOf(reply({ cards: [{ kind: 'quest' }] }), NOW)).toEqual(['운동 파티만 보여줘']);
    expect(followUpsOf(reply({ cards: [{ kind: 'library' }] }), NOW)).toEqual(['다른 열람실']);
    expect(followUpsOf(reply({ cards: [{ kind: 'library' }], recalculated: true }), NOW)).toEqual([]);
  });
});

// Partitions: a refusal, offers of its own, a failure, nothing at all.
describe('no follow-up', () => {
  it.each([
    ['a refusal', reply({ answer: meal(TODAY, 'lunch'), refusal: {} })],
    ['offers of its own', reply({ answer: meal(TODAY, 'lunch'), offers: [{}] })],
    ['a failure', reply({ failure: 'unavailable' })],
    ['words alone', reply({})],
  ])('under %s', (_what, source) => {
    expect(followUpsOf(source, NOW)).toEqual([]);
  });

  it('when there is no reply', () => {
    expect(followUpsOf(undefined, NOW)).toEqual([]);
  });
});

describe('withRang', () => {
  it('says 랑 after a vowel and 이랑 after a final consonant', () => {
    expect(withRang(['김민수'])).toBe('김민수랑');
    expect(withRang(['박지은'])).toBe('박지은이랑');
  });
});
