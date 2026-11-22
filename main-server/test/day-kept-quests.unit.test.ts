/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { onDay } from '../src/assistant/free-time/free-time.js';
import { type DayAnswer, dayAnswer } from '../src/assistant/lookup/day-lookup.js';
import { type KeptQuest } from '../src/quests/kept-quests.js';
import { classAt, id, ME, placeOf, readCampus, seedTravel, TUESDAY } from './way-example.js';

// A day drawn on the map with the User's Quests beside their Classes (P05 ticket 17, slice 1): "오늘 뭐 있지?", and a
// question about one Quest already set ("민수랑 약속 몇 시였지?"), which shows only that Quest. The drawing gives each
// Quest's title and the others in it, so that two meetings are told apart; a Class stays its time and building.

beforeAll(() => readCampus());

const MEETING_ID = '1a2b3c4d-0000-4000-8000-000000000001';
const LUNCH_ID = '5e6f7a8b-0000-4000-8000-000000000002';

const kept = (): KeptQuest[] => [
  {
    kind: 'meal-lunch',
    questId: LUNCH_ID,
    title: '학생회관식당에서 점심',
    start: onDay(TUESDAY, '12:10'),
    end: onDay(TUESDAY, '12:50'),
    placeId: id('학생회관'),
    placeLabel: null,
    people: [],
    mine: true,
    changeable: true,
  },
  {
    kind: 'meet',
    questId: MEETING_ID,
    title: 'SK경영관 앞에서 만나기',
    start: onDay(TUESDAY, '14:00'),
    end: onDay(TUESDAY, '15:00'),
    placeId: id('SK경영관'),
    placeLabel: null,
    people: [{ userId: 'minsu', name: '민수', answer: 'waiting' }],
    mine: true,
    changeable: true,
  },
];

function dayWith(asked?: string[], quests: KeptQuest[] = kept()): DayAnswer {
  return dayAnswer({
    date: TUESDAY,
    now: onDay(TUESDAY, '10:30'),
    me: { userId: ME, items: [classAt(TUESDAY, '11:00', '11:50', '제1공학관')] },
    travel: seedTravel(),
    placeOf,
    kept: quests,
    ...(asked === undefined ? {} : { asked }),
  });
}

function found(answer: DayAnswer): Extract<DayAnswer, { result: 'found' }> {
  if (answer.result !== 'found') {
    throw new Error('Nothing found');
  }
  return answer;
}

describe('A day with Quests', () => {
  it('draws the Classes and Quests in order, each Quest by its title and the others in it', () => {
    const { lookup } = found(dayWith());

    expect(lookup.kind).toBe('day');
    expect(lookup.lines[0]?.map(({ text }) => text).join('')).toContain('수업 1개 · 일정 2개');
    expect(lookup.steps?.map(({ at, text }) => `${at} ${text}`)).toEqual([
      expect.stringMatching(/^11:00–11:50 /u),
      '12:10–12:50 학생회관식당에서 점심',
      '14:00–15:00 SK경영관 앞에서 만나기 · 민수',
    ]);
    expect(lookup.scene.places.map(({ order }) => order)).toEqual([1, 2, 3]);
    expect(lookup.kept).toBeUndefined();
  });

  it("tells the model each Quest's ref, kind, title, time, place, people, and whether it may be changed", () => {
    const { words } = found(dayWith());

    expect(words.quests).toEqual([
      expect.objectContaining({ ref: LUNCH_ID, kind: 'meal-lunch', start: '12:10', end: '12:50', mine: true }),
      expect.objectContaining({
        ref: MEETING_ID,
        kind: 'meet',
        start: '14:00',
        changeable: true,
        people: [{ name: expect.stringContaining('민수') as unknown, answer: 'waiting' }],
      }),
    ]);
  });
});

describe('A Quest asked about', () => {
  it('is drawn alone, without the Classes, when asked for by its ref or the first 8 characters of it', () => {
    const sk = placeOf(id('SK경영관'));
    for (const asked of [[MEETING_ID], [MEETING_ID.slice(0, 8)]]) {
      const { lookup, words } = found(dayWith(asked));

      expect(lookup.steps?.map(({ text }) => text)).toEqual(['SK경영관 앞에서 만나기 · 민수']);
      expect(lookup.kept).toEqual([
        {
          kind: 'meet',
          questId: MEETING_ID,
          title: 'SK경영관 앞에서 만나기',
          startAt: '2026-11-17T14:00:00+09:00',
          endAt: '2026-11-17T15:00:00+09:00',
          place: '58동',
          point: { placeId: id('SK경영관'), label: '58동', latitude: sk.latitude, longitude: sk.longitude },
          people: [{ name: '민수', answer: 'waiting' }],
          mine: true,
          changeable: true,
        },
      ]);
      expect(words.classes).toEqual([]);
      expect(words.quests).toHaveLength(1);
    }
  });

  it('answers none when no Quest of the day has the ref', () => {
    expect(dayWith(['ffffffff'])).toEqual({ result: 'none', reason: 'not-kept' });
  });

  it('picks none when the first 8 characters fit two Quests, and says it is ambiguous', () => {
    const twins = kept();
    const [lunch] = twins;
    if (lunch !== undefined) {
      lunch.questId = '1a2b3c4d-0000-4000-8000-00000000000a';
    }

    expect(dayWith(['1a2b3c4d'], twins)).toEqual({ result: 'none', reason: 'ambiguous' });
  });
});

describe("A kept Quest's point", () => {
  it('has no point when its place is only words', () => {
    const [lunch, meeting] = kept();
    if (meeting === undefined || lunch === undefined) {
      throw new Error('No meeting');
    }
    const handWritten = { ...meeting, placeId: null, placeLabel: '정문 앞' };

    const { lookup } = found(dayWith([MEETING_ID], [lunch, handWritten]));

    expect(lookup.kept).toMatchObject([{ questId: MEETING_ID, place: '정문 앞', point: null }]);
  });
});
