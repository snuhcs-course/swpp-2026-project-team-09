/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  type AnsweredSession,
  type JudgedSession,
  type JudgementCheck,
} from '../src/global-events/judgement-answer.js';
import { checkedSessions, matchedPlace } from '../src/global-events/judgement-checks.js';
import { POST_SOURCES } from '../src/global-events/post-sources.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

function placeNamed(id: string, name: string, number: string): PlaceDto {
  return { id, name, number, latitude: 37.45, longitude: 126.95 };
}

const PLACES = [placeNamed('a', '뉴미디어통신공동연구소', '132'), placeNamed('b', '제1공학관', '301')];

const TEXT = [
  '- 일시: 2026. 11. 5.(목) 14:00~16:00',
  '- 장소: 301동 117호',
  '- 신청 기간: 2026. 10. 20.(화) 09:00 ~ 2026. 10. 30.(금) 18:00',
  '신청 기간',
  '2026. 11. 3.(화) 10:00',
  '문의: [전화번호]',
].join('\n');

const POST = { title: '설명회', text: TEXT };
const TIME_LINE = '- 일시: 2026. 11. 5.(목) 14:00~16:00';
const PLACE_LINE = '- 장소: 301동 117호';

function session(changes: Partial<AnsweredSession> = {}): AnsweredSession {
  return {
    start: '2026-11-05T14:00',
    end: '2026-11-05T16:00',
    place: '301동 117호',
    overPeriod: false,
    lines: { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] },
    ...changes,
  };
}

function checked(
  answered: AnsweredSession,
  { announcesEvent = true, readStarts = [] as Date[], source = POST_SOURCES.snu_events } = {},
): JudgedSession {
  const [result] = checkedSessions(
    { announcesEvent, sessions: [answered] },
    { post: POST, source, places: PLACES, now: new Date('2026-11-01T12:00:00+09:00'), readStarts },
  );
  if (result === undefined) {
    throw new Error('No session');
  }
  return result;
}

// Against a post of its time line, quoted for the start and any end, and the place line.
function checkedOn(line: string, changes: Partial<AnsweredSession>): JudgedSession {
  const lines = { start: [line], end: changes.end === null ? [] : [line], place: [PLACE_LINE] };
  const [result] = checkedSessions(
    { announcesEvent: true, sessions: [session({ ...changes, lines })] },
    {
      post: { title: '설명회', text: `${line}\n${PLACE_LINE}` },
      source: POST_SOURCES.snu_events,
      places: PLACES,
      now: new Date('2026-11-01T12:00:00+09:00'),
      readStarts: [],
    },
  );
  if (result === undefined) {
    throw new Error('No session');
  }
  return result;
}

function failing({ checks }: JudgedSession): JudgementCheck[] {
  return checks.filter(({ passed }) => !passed).map(({ name }) => name);
}

// Each fails only its own check, so that each is known to decide on its own.
const ONE_CHECK_FAILS: [string, Partial<AnsweredSession>, JudgementCheck[]][] = [
  [
    'a quoted line that is not in the post',
    { lines: { start: ['- 일시: 2026. 11. 5.(목) 14:00~17:00'], end: [TIME_LINE], place: [PLACE_LINE] } },
    ['linesInPost'],
  ],
  [
    'a value without a line',
    { lines: { start: [TIME_LINE], end: [], place: [PLACE_LINE] } },
    ['linesInPost', 'timeAgrees'],
  ],
  ['a date the line does not write', { start: '2026-11-06T14:00', end: '2026-11-06T16:00' }, ['dateAgrees']],
  ['an end time the line does not write', { end: '2026-11-05T17:00' }, ['timeAgrees']],
  ['a start time the line does not write', { start: '2026-11-05T15:00' }, ['timeAgrees']],
  [
    'an application period',
    {
      start: '2026-10-20T09:00',
      end: '2026-10-30T18:00',
      lines: {
        start: ['2026. 10. 20.(화) 09:00'],
        end: ['2026. 10. 30.(금) 18:00'],
        place: [PLACE_LINE],
      },
    },
    ['notApplicationPeriod', 'length'],
  ],
  ['an end before the start', { start: '2026-11-05T16:00', end: '2026-11-05T14:00' }, ['startBeforeEnd']],
  [
    'a day with no time of day',
    { start: '2026-11-05', end: null, lines: { start: [TIME_LINE], end: [], place: [PLACE_LINE] } },
    ['hasTimeOfDay'],
  ],
  ['a place off its line', { place: '132동 103호' }, ['placeInLines']],
  [
    'a place that names no Place',
    { place: '일시', lines: { start: [TIME_LINE], end: [TIME_LINE], place: [TIME_LINE] } },
    ['placeMatches'],
  ],
];

describe('checkedSessions', () => {
  it('passes a session that agrees with its post, with the Place', () => {
    const result = checked(session());

    expect(failing(result)).toEqual([]);
    expect(result).toMatchObject({ passed: true, placeId: 'b', globalEventId: null });
  });

  it.each(ONE_CHECK_FAILS)('%s', (_, changes, expected) => {
    const result = checked(session(changes));

    expect(failing(result)).toEqual(expected);
    expect(result.passed).toBe(false);
  });
});

describe('checkedSessions: the day and time of a session', () => {
  it('fails a weekday the date does not fall on', () => {
    expect(failing(checkedOn('2027. 11. 5.(목) 14:00', { start: '2027-11-05T14:00', end: null }))).toEqual([
      'weekdayAgrees',
    ]);
  });
});

describe('checkedSessions: what a post says beyond the session', () => {
  it('fails every session of a post called no event', () => {
    expect(failing(checked(session(), { announcesEvent: false }))).toEqual(['announcesEvent']);
  });

  it('sees through a quote of only the dates of an application line', () => {
    const lines = { start: ['2026. 10. 20.(화) 09:00'], end: [], place: [PLACE_LINE] };

    expect(failing(checked(session({ start: '2026-10-20T09:00', end: null, lines })))).toEqual([
      'notApplicationPeriod',
    ]);
  });

  it('sees a short label above the quoted line', () => {
    const lines = { start: ['2026. 11. 3.(화) 10:00'], end: [], place: [PLACE_LINE] };

    expect(failing(checked(session({ start: '2026-11-03T10:00', end: null, lines })))).toEqual([
      'notApplicationPeriod',
    ]);
  });
});

describe('checkedSessions: the length and time of day of a session', () => {
  it('holds a session over a period back until ticket 07, whatever its lines', () => {
    expect(failing(checked(session({ overPeriod: true })))).toEqual(['length']);
  });

  it('does not ask a time of day of a session over a period', () => {
    const lines = { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] };

    expect(
      failing(checked(session({ start: '2026-11-05', end: '2026-11-05T16:00', overPeriod: true, lines }))),
    ).toEqual(['length']);
  });

  it('refuses an end given as a day alone', () => {
    expect(failing(checkedOn('2026. 11. 5.(목) 14:00 ~ 2026. 11. 6.(금)', { end: '2026-11-06' }))).toEqual([
      'hasTimeOfDay',
    ]);
  });

  it('takes 00:00 for no time of day, as the site writes it', () => {
    expect(failing(checkedOn('2026.11.05. 00:00', { start: '2026-11-05T00:00', end: null }))).toEqual(['hasTimeOfDay']);
  });
});

describe('checkedSessions: a long session', () => {
  it('refuses a session longer than a day', () => {
    expect(failing(checkedOn('2026. 11. 5.(목) 14:00 ~ 2026. 11. 6.(금) 15:00', { end: '2026-11-06T15:00' }))).toEqual([
      'length',
    ]);
  });
});

describe('checkedSessions: missing values', () => {
  it('fails a null start and a null place without throwing', () => {
    const lines = { start: [], end: [], place: [] };

    expect(failing(checked(session({ start: null, end: null, place: null, lines })))).toEqual([
      'dateAgrees',
      'startBeforeEnd',
      'hasTimeOfDay',
      'length',
      'placeInLines',
      'placeMatches',
    ]);
  });

  it('refuses a time it cannot read', () => {
    expect(failing(checked(session({ start: '11월 5일 14시' })))).toContain('dateAgrees');
  });
});

describe('checkedSessions: whether a session is new', () => {
  it('fails a session the rules already read, by its start', () => {
    expect(failing(checked(session(), { readStarts: [new Date('2026-11-05T14:00:00+09:00')] }))).toEqual([
      'newSession',
    ]);
  });

  it('fails a session the answer repeats', () => {
    const results = checkedSessions(
      { announcesEvent: true, sessions: [session(), session()] },
      { post: POST, source: POST_SOURCES.snu_events, places: PLACES, now: new Date(), readStarts: [] },
    );

    expect(results.map(({ passed }) => passed)).toEqual([true, false]);
  });
});

describe('matchedPlace', () => {
  const gwanak = { buildingNumberIsGwanak: true, postKeyInLink: /x/u };
  const elsewhere = { buildingNumberIsGwanak: false, postKeyInLink: /x/u };

  it.each(['301동', '301동 117호', '301동 1층', '301동 지하1층 117호'])('takes %s alone as Gwanak', (place) => {
    expect(matchedPlace(place, gwanak, PLACES)?.id).toBe('b');
  });

  it('does not where the Source says otherwise', () => {
    expect(matchedPlace('301동 117호', elsewhere, PLACES)).toBeNull();
  });

  it.each(['수원캠퍼스 301동 117호', '연건 301동', '정부청사 1동', '301동 117호, 132동 103호', '온라인', '301호'])(
    'does not match %s',
    (place) => {
      expect(matchedPlace(place, gwanak, PLACES)).toBeNull();
    },
  );

  it('matches a name on the campus as the rules do', () => {
    expect(matchedPlace('서울대학교 제1공학관 117호', elsewhere, PLACES)?.id).toBe('b');
  });

  it('has no place to match for none', () => {
    expect(matchedPlace(null, gwanak, PLACES)).toBeNull();
  });
});
