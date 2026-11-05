/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type AnsweredSession, type JudgementCheck } from '../src/global-events/judgement-answer.js';
import { checkedSessions } from '../src/global-events/judgement-checks.js';
import { POST_SOURCES } from '../src/global-events/post-sources.js';

const PLACES = [{ id: 'b', name: '제1공학관', number: '301', latitude: 37.45, longitude: 126.95 }];
const PLACE_LINE = '장소: 301동 117호';
const NOW = new Date('2026-11-01T12:00:00+09:00');

// The checks that fail for a session read from a post of its time line and PLACE_LINE, quoting `quoted` for its times.
function failing(timeLine: string, changes: Partial<AnsweredSession>, quoted = timeLine): JudgementCheck[] {
  const session: AnsweredSession = {
    start: '2027-03-09T14:00',
    end: '2027-03-09T17:00',
    place: '301동 117호',
    overPeriod: false,
    lines: { start: [quoted], end: [quoted], place: ['301동 117호'] },
    ...changes,
  };
  const [result] = checkedSessions(
    { announcesEvent: true, sessions: [session] },
    {
      post: { title: '공개 세미나', text: `${timeLine}\n${PLACE_LINE}` },
      source: POST_SOURCES.snu_events,
      places: PLACES,
      now: NOW,
      readStarts: [],
    },
  );
  if (result === undefined) {
    throw new Error('No session');
  }
  return result.checks.filter(({ passed }) => !passed).map(({ name }) => name);
}

describe('checkedSessions: a list number before the day', () => {
  it.each(['1. 3월 9일(화) 오후 2–5시', '12. 3월 9일(화) 오후 2–5시'])('passes the day %s writes', (line) => {
    expect(failing(line, {})).toEqual([]);
  });

  it('fails the day the list number would make', () => {
    expect(failing('1. 3월 9일(화) 오후 2–5시', { start: '2027-01-03T14:00', end: '2027-01-03T17:00' })).toEqual([
      'dateAgrees',
    ]);
  });
});

describe('checkedSessions: the hours of 오전 or 오후', () => {
  it.each(['3월 9일(화) 오후 2–5시', '3월 9일(화) 오후 2~5시', '3월 9일(화) 오후 2-5시'])(
    'passes a start of 14:00 in %s',
    (line) => {
      expect(failing(line, {})).toEqual([]);
    },
  );

  it('passes a start of 09:00 in 오전 9–11시', () => {
    expect(failing('3월 9일(화) 오전 9–11시', { start: '2027-03-09T09:00', end: '2027-03-09T11:00' })).toEqual([]);
  });

  it('fails a start the hours do not write', () => {
    expect(failing('3월 9일(화) 오후 2–5시', { start: '2027-03-09T02:00' })).toEqual(['timeAgrees']);
  });
});

describe('checkedSessions: characters that show nothing', () => {
  it.each([
    ['a soft hyphen', '\u00AD'],
    ['a zero-width space', '\u200B'],
    ['a byte-order mark', '\uFEFF'],
  ])('finds a quote in a post that has %s', (_, invisible) => {
    expect(failing(`3월 9${invisible}일(화) 오후 2–5시`, {}, '3월 9일(화) 오후 2–5시')).toEqual([]);
  });

  it('finds a quote that has one in a post without', () => {
    expect(failing('3월 9일(화) 오후 2–5시', {}, '3월 9\u200B일(화) 오후 2–5시')).toEqual([]);
  });

  it('still fails a quote that differs by more', () => {
    expect(failing('3월 9일(화)\u00AD 오후 2–5시', {}, '3월 9일(화) 오후 2–5시 강연')).toEqual(['linesInPost']);
  });
});
