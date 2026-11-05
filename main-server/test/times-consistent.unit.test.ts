/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The check timesConsistent, on posts of a few lines written for these tests: each session quotes the first line, and the
// others are what the post writes besides.

import { type AnsweredSession, type JudgementCheck } from '../src/global-events/judgement-answer.js';
import { checkedSessions } from '../src/global-events/judgement-checks.js';
import { POST_SOURCES } from '../src/global-events/post-sources.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

const PLACES: PlaceDto[] = [{ id: 'a', name: '제1공학관', number: '301', latitude: 37.45, longitude: 126.95 }];
const PLACE_LINE = '장소: 301동 117호';

function session(quoted: string, start: string, end: string | null): AnsweredSession {
  return {
    start,
    end,
    place: '301동 117호',
    overPeriod: false,
    lines: { start: [quoted], end: end === null ? [] : [quoted], place: [PLACE_LINE] },
  };
}

// The checks each session fails, on a post of `lines` and the place line.
function failing(lines: string[], sessions: AnsweredSession[]): JudgementCheck[][] {
  return checkedSessions(
    { announcesEvent: true, sessions },
    {
      post: { title: '공개 강연', text: [...lines, PLACE_LINE].join('\n') },
      source: POST_SOURCES.snu_events,
      places: PLACES,
      now: new Date('2026-11-01T12:00:00+09:00'),
      readStarts: [],
    },
  ).map(({ checks }) => checks.filter(({ passed }) => !passed).map(({ name }) => name));
}

function failingOne(lines: string[], start: string, end: string | null): JudgementCheck[] {
  return failing(lines, [session(lines[0] ?? '', start, end)])[0] ?? [];
}

describe('timesConsistent', () => {
  it('fails when another line gives the same day another start', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '본 강연은 11월 12일 18:00에 시작합니다.'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual(['timesConsistent']);
  });

  it('fails when another line gives the same day another end', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '11월 12일 15:00 ~ 18:30 진행'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual(['timesConsistent']);
  });

  it('passes a line with a start alone beside one with a start and an end, whose end the session has', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '11월 12일 15:00 개회'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual([]);
  });

  it('passes the start-only line quoted, with the end of the line that has one', () => {
    const lines = ['11월 12일 15:00 개회', '일시: 11월 12일(목) 15:00~17:00'];
    const answered = session(lines[0] ?? '', '2026-11-12T15:00', '2026-11-12T17:00');
    answered.lines = { ...answered.lines, end: [lines[1] ?? ''] };

    expect(failing(lines, [answered])[0]).toEqual([]);
  });

  it.each([
    ['오후 3시', '15:00'],
    ['오후 3시 반', '15:30'],
    ['3시', '15:00'],
  ])('passes %s against %s', (written, clock) => {
    const lines = [`일시: 11월 12일(목) ${clock}~17:00`, `11월 12일 ${written} 시작`];

    expect(failingOne(lines, `2026-11-12T${clock}`, '2026-11-12T17:00')).toEqual([]);
  });

  it('passes a range written across its two days', () => {
    const lines = ['기간: 2026.11.12. 15:00 ~ 2026.11.12. 17:00'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual([]);
  });
});

describe('timesConsistent, on lines it does not compare', () => {
  it('does not read a time line with no day', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '15:30~16:00 질의응답', '16:00 폐회'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual([]);
  });

  it('does not read a line for another day', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '예비 모임: 11월 10일 19:00'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual([]);
  });

  it('does not read an application period', () => {
    const lines = ['일시: 11월 12일(목) 15:00~17:00', '신청 마감: 11월 12일 12:00'];

    expect(failingOne(lines, '2026-11-12T15:00', '2026-11-12T17:00')).toEqual([]);
  });
});

describe('timesConsistent, on the worker’s session lines of extra.snu', () => {
  const lines = [
    '[1회차] 기간: 2026.11.12. 10:00 ~ 2026.11.12. 12:00 / 장소: 301동 117호',
    '[2회차] 기간: 2026.11.12. 14:00 ~ 2026.11.12. 16:00 / 장소: 301동 117호',
  ];

  it('compares a numbered line with its own session only', () => {
    const sessions = [
      session(lines[0] ?? '', '2026-11-12T10:00', '2026-11-12T12:00'),
      session(lines[1] ?? '', '2026-11-12T14:00', '2026-11-12T16:00'),
    ];

    expect(failing(lines, sessions)).toEqual([[], []]);
  });

  it('fails a session whose own numbered line gives another start than the line it quotes', () => {
    const post = [
      lines[0] ?? '',
      '[2회차] 기간: 2026.11.19. 14:30 ~ 2026.11.19. 16:00 / 장소: 301동 117호',
      '2회차: 11월 19일 14:00~16:00',
    ];
    const sessions = [
      session(post[0] ?? '', '2026-11-12T10:00', '2026-11-12T12:00'),
      session(post[2] ?? '', '2026-11-19T14:00', '2026-11-19T16:00'),
    ];

    expect(failing(post, sessions)).toEqual([[], ['timesConsistent']]);
  });

  it('takes the number of the line a quote comes from', () => {
    const answered = session(lines[1] ?? '', '2026-11-12T14:00', '2026-11-12T16:00');
    answered.lines = { ...answered.lines, start: ['2026.11.12. 14:00'], end: ['2026.11.12. 16:00'] };

    expect(failing(lines, [answered])[0]).toEqual([]);
  });
});
