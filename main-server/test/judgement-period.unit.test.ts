/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type AnsweredSession, type JudgedSession } from '../src/global-events/judgement-answer.js';
import { checkedSessions } from '../src/global-events/judgement-checks.js';
import { POST_SOURCES } from '../src/global-events/post-sources.js';

const PLACES = [{ id: 'b', name: '제1공학관', number: '301', latitude: 37.45, longitude: 126.95 }];
const PLACE_LINE = '- 장소: 301동 117호';

// The failing checks of a session against a post of `postLines` and the place line. Its quotes default to the first line.
function failingOn(postLines: string[], changes: Partial<AnsweredSession>): string[] {
  const line = postLines[0] ?? '';
  const [result]: JudgedSession[] = checkedSessions(
    {
      announcesEvent: true,
      sessions: [
        {
          start: '2026-11-05',
          end: '2026-11-30',
          place: '301동 117호',
          overPeriod: true,
          lines: { start: [line], end: changes.end === null ? [] : [line], place: [PLACE_LINE] },
          ...changes,
        },
      ],
    },
    {
      post: { title: '전시', text: [...postLines, PLACE_LINE].join('\n') },
      source: POST_SOURCES.snu_events,
      places: PLACES,
      now: new Date('2026-11-01T12:00:00+09:00'),
      readStarts: [],
    },
  );
  if (result === undefined) {
    throw new Error('No session');
  }
  return result.checks.filter(({ passed }) => !passed).map(({ name }) => name);
}

describe('checkedSessions: a session over a period that passes', () => {
  it.each([
    '전시 기간: 11월 5일 ~ 11월 30일',
    '전시 기간: 11월 5일부터 11월 30일까지',
    '2026.11.05 - 2026.11.30',
    '2026.11.05-2026.11.30',
    '11/5 - 11/30 10:00-18:00',
    '11월 5일 - 11월 30일',
  ])('holds both its days on the line %s', (line) => {
    expect(failingOn([line], {})).toEqual([]);
  });

  it('may have the times the line writes', () => {
    const line = '기간: 2026.11.02. 00:00 ~ 2026.11.30. 00:00';

    expect(failingOn([line], { start: '2026-11-02T00:00', end: '2026-11-30T00:00' })).toEqual([]);
  });

  it('may run into the next year', () => {
    expect(failingOn(['12월 20일 ~ 1월 5일'], { start: '2026-12-20', end: '2027-01-05' })).toEqual([]);
  });
});

describe('checkedSessions: a session over a period that fails the length', () => {
  it('quotes its days from two lines', () => {
    const lines = { start: ['시작일: 11월 5일'], end: ['종료일: 11월 30일'], place: [PLACE_LINE] };

    expect(failingOn(['시작일: 11월 5일', '종료일: 11월 30일'], { lines })).toEqual(['length']);
  });

  it('has no last day', () => {
    expect(failingOn(['11월 5일부터 상시'], { end: null })).toEqual(['length']);
  });

  it('ends before its line does', () => {
    expect(failingOn(['11월 5일 ~ 11월 30일 (11월 20일 휴관)'], { end: '2026-11-20' })).toEqual(['length']);
  });

  it('has a line of two ranges', () => {
    expect(failingOn(['1차 11월 5일 ~ 11월 7일, 2차 11월 20일 ~ 11월 30일'], {})).toEqual(['length']);
  });

  // A day alone or a 00:00 would show as 00:00 on its card, since only a session over a period goes without a time.
  it.each([
    ['a sitting', '2026. 11. 5.(목) 14:00~16:00', '2026-11-05T14:00', '2026-11-05T16:00'],
    ['a day alone', '2026. 11. 5.(목) 14:00~16:00', '2026-11-05', '2026-11-05T16:00'],
    ['00:00', '2026.11.05. 00:00 ~ 2026.11.05. 16:00', '2026-11-05T00:00', '2026-11-05T16:00'],
  ])('reads %s over one day', (_, line, start, end) => {
    expect(failingOn([line], { start, end })).toEqual(['length']);
  });
});

describe('checkedSessions: a session over a period and the other checks', () => {
  it('fails an application period', () => {
    expect(failingOn(['신청 기간: 11월 5일 ~ 11월 30일'], {})).toEqual(['notApplicationPeriod']);
  });

  it('fails a date its line does not write', () => {
    expect(failingOn(['11월 5일 ~ 11월 30일'], { start: '2026-11-06' })).toEqual(['dateAgrees', 'length']);
  });

  it('fails a place that is no Place', () => {
    expect(failingOn(['11월 5일 ~ 11월 30일'], { place: '온라인' })).toEqual(['placeInLines', 'placeMatches']);
  });
});

describe('checkedSessions: a period not read as one', () => {
  const sitting = { start: '2026-11-05T10:00', end: '2026-11-05T18:00', overPeriod: false };

  it.each([
    '2026.11.05 - 2026.11.30 10:00-18:00',
    '2026.11.05-2026.11.30 10:00-18:00',
    '11/5 - 11/30 10:00-18:00',
    '11월 5일 - 11월 30일 10:00-18:00',
  ])('fails as a sitting on the first day of %s', (line) => {
    expect(failingOn([line], sitting)).toEqual(['length']);
  });

  it.each(['2026-11-05 10:00-18:00', '11월 5일 10:00-18:00'])(
    "passes the sitting of %s, whose hyphen is a time's",
    (line) => {
      expect(failingOn([line], sitting)).toEqual([]);
    },
  );
});
