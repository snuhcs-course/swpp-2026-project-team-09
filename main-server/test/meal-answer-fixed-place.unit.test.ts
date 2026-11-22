/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { type AnswerPerson } from '../src/assistant/gathering/meal-answer.js';
import {
  answerOf,
  type Fixed,
  firstPlan,
  JIEUN,
  jieun,
  me,
  ME,
  MINSU,
  minsu,
  person,
  plain,
  point,
  time,
  withBoth,
} from './meal-answers.js';
import { at, classAt, id, readWorld } from './worked-example.js';

// "여기면 어때?": a Place pressed during the worked example's lunch with 민수 and 지은 (Tuesday 2026-11-17, asked at
// 11:50), recalculated with that Place fixed. Boards a7 (자하연식당, which fits) and a8 (301동식당, which does not), and
// what ends the stay of whoever stays shortest.

beforeAll(() => readWorld());

const jahayeon = (): GatheringPlace[] => [{ key: '자하연식당', placeId: id('자하연식당') }];
const at301 = (): GatheringPlace[] => [{ key: '301동식당', placeId: id('제1공학관') }];
const studentCenter = (): GatheringPlace[] => [{ key: '학생회관식당', placeId: id('학생회관') }];

// The answer with the one candidate fixed, as the service filters the open Restaurants to the fixed Place.
function pressed(
  people: [AnswerPerson, ...AnswerPerson[]],
  candidates: GatheringPlace[],
  fixed: Fixed = {},
): AnswerReply {
  return answerOf(people, { candidates, fixed: { placeId: candidates[0]?.placeId ?? null, ...fixed } });
}

const lines = (...texts: string[]): AnswerReply['noPlan'] => ({
  reason: 'no-fit',
  lines: texts.map((text) => [plain(text)]),
});

describe('a7: 자하연식당 pressed', () => {
  it('plans 12:31 to 12:55, 24 minutes, with no Place dropped', () => {
    const answer = pressed([me(), minsu(), jieun()], jahayeon());

    expect(firstPlan(answer)).toMatchObject({
      id: '자하연식당',
      startAt: time('12:31'),
      endAt: time('12:55'),
      togetherMinutes: 24,
    });
    expect(answer.dropped).toEqual([]);
    expect(answer.noPlan).toBeNull();
  });

  // 민수 takes the shuttle, 16 minutes against 19 on foot by way of 301동, so nobody meets on the way (P05 ticket 39).
  it("gives each person's earliest arrival: 나 12:07, 민수 12:31 by the shuttle, 지은 12:18", () => {
    const { parts } = firstPlan(pressed([me(), minsu(), jieun()], jahayeon()));

    expect(parts.map(({ userId, arriveAt }) => [userId, arriveAt])).toEqual([
      [ME, time('12:07')],
      [MINSU, time('12:31')],
      [JIEUN, time('12:18')],
    ]);
  });
});

describe('a8: 301동식당 pressed', () => {
  it("drops it with each person's part: 나 there already, 민수 at 12:18, 지은 at 12:31", () => {
    const { plans, dropped } = pressed([me(), minsu(), jieun()], at301());

    expect(plans).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({ place: point('제1공학관', '301동식당'), reason: '지은은 13분밖에 못 있어요' });
    expect(
      dropped[0]?.parts?.map(({ userId, origin, walkMinutes, arriveAt, leaveBy }) => [
        userId,
        origin?.place.label,
        walkMinutes,
        arriveAt,
        leaveBy,
      ]),
    ).toEqual([
      [ME, '301동', 0, time('11:50'), time('12:45')],
      [MINSU, '302동', 3, time('12:18'), null],
      [JIEUN, '8동', 16, time('12:31'), time('12:44')],
    ]);
  });

  it('names 지은, who stays shortest, and the Class 지은 leaves for', () => {
    expect(pressed([me(), minsu(), jieun()], at301()).noPlan).toEqual(
      lines('지은은 12:31에 도착해 13분만 먹어요', '13:00 수업에 가려면 12:44엔 나서야 해요'),
    );
  });

  it('gives no parts to a dropped Place the input did not fix', () => {
    expect(withBoth().dropped.map((dropped) => 'parts' in dropped)).toEqual([false, false]);
  });
});

// Classes in 301동 until 12:10 and from 12:30.
const late = (): AnswerPerson =>
  person(ME, '유상', [classAt('11:00', '12:10', '제1공학관'), classAt('12:30', '14:30', '제1공학관')]);

// A Class without a Place, so that where its person sets out from is unknown.
const nowhere = (start: string, end: string): DayItem => ({
  id: `nowhere ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId: null,
  isClass: true,
});

describe('Who stays shortest at a fixed Place, and why', () => {
  it('leaves the asker unnamed, who arrives after they must leave', () => {
    expect(pressed([late()], studentCenter()).noPlan).toEqual(
      lines('12:25에야 도착해요', '12:30 수업에 가려면 12:15엔 나서야 해요'),
    );
  });

  it('gives the leave-by the User fixed for a Friend', () => {
    const fixed: Fixed = { constraints: { [JIEUN]: [{ kind: 'leaveBy', time: '12:25', source: 'asker' }] } };

    expect(pressed([me(), jieun()], jahayeon(), fixed).noPlan).toEqual(
      lines('지은은 12:18에 도착해 7분만 먹어요', '12:25엔 나서야 해요'),
    );
  });

  it('gives the end the User fixed', () => {
    expect(pressed([me(), minsu(), jieun()], at301(), { window: { from: null, until: '12:40' } }).noPlan).toEqual(
      lines('지은은 12:31에 도착해 9분만 먹어요', '12:40까지로 정했어요'),
    );
  });

  it("gives a Friend whose position is unknown from when they are free, and the meal's own end", () => {
    const haeun = person('b0c2e3a4-0000-4000-8000-000000000004', '하은', [nowhere('11:00', '14:20')]);

    expect(pressed([person(ME, '유상', []), haeun], studentCenter()).noPlan).toEqual(
      lines('하은은 14:20부터 10분만 먹어요', '점심은 14:30까지예요'),
    );
  });
});

describe('No time at all, or nobody alone the reason', () => {
  // 민수's second Class runs to the meal's end, so that no later stretch is shared.
  it('says only that there is no time when the stay is 0 minutes and the arrival is before the window opens', () => {
    const minsuDay = [classAt('11:00', '12:00', '제1공학관'), classAt('12:50', '14:30', '제1공학관')];
    const window = { from: '12:45', until: null };

    expect(
      pressed([person(ME, '유상', []), person(MINSU, '민수', minsuDay)], studentCenter(), { window }).noPlan,
    ).toEqual(lines('민수는 시간이 안 돼요', '12:50 수업에 가려면 12:35엔 나서야 해요'));
  });

  it('names who comes last and who leaves first when everyone could stay long enough alone', () => {
    const fixed: Fixed = {
      constraints: {
        [MINSU]: [{ kind: 'leaveBy', time: '12:20', source: 'asker' }],
        [JIEUN]: [{ kind: 'notBefore', time: '12:10', source: 'asker' }],
      },
    };
    const friends = [person(MINSU, '민수', []), person(JIEUN, '지은', [])] as const;

    expect(pressed([me(), ...friends], studentCenter(), fixed).noPlan).toEqual(
      lines('같이 있는 시간이 10분뿐이에요', '지은은 12:10부터 시간이 되고 민수는 12:20엔 나서야 해요'),
    );
  });
});
