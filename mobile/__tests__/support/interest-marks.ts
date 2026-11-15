/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { InterestMatches } from '@/api/interest-types';
import type { RecruitingQuest } from '@/api/party-types';
import { type InterestMark, type MarkInputs, sourcesOf } from '@/features/map/interest-marks';
import { event, GYM_POINT, HALL, LIBRARY_POINT, NOW, recruitingFor } from './map-sources';

// The interest marks' events and recruiting parties (P05 ticket 13), at 13:00 on 6 October 2026 in Korea
// (`map-sources.ts`' NOW): the design's job fair and company session share 문화관, the concert stands elsewhere, the
// morning yoga has ended and the festival is tomorrow.

export const ARTS = { latitude: 37.4602, longitude: 126.953 };
export const FIELD = { latitude: 37.4632, longitude: 126.9497 };
export const HALL_ID = `place:${HALL.latitude},${HALL.longitude}`;

export const JOB = event('job', {
  title: '채용박람회',
  place: '문화관',
  startsAt: '2026-10-06T14:00:00+09:00',
  endsAt: '2026-10-06T17:00:00+09:00',
});
export const TALK = event('talk', {
  title: '기업 설명회',
  place: '문화관',
  startsAt: '2026-10-06T15:00:00+09:00',
  endsAt: '2026-10-06T16:00:00+09:00',
});
export const CONCERT = event('concert', {
  title: '동아리 정기공연',
  startsAt: '2026-10-06T18:00:00+09:00',
  endsAt: '2026-10-06T20:00:00+09:00',
  ...ARTS,
});
const LECTURE = event('lecture', {
  title: 'AI 특강',
  startsAt: '2026-10-06T19:00:00+09:00',
  endsAt: '2026-10-06T20:00:00+09:00',
  ...GYM_POINT,
});
const YOGA = event('yoga', {
  title: '아침 요가',
  startsAt: '2026-10-06T09:00:00+09:00',
  endsAt: '2026-10-06T10:00:00+09:00',
  ...LIBRARY_POINT,
});
const FESTIVAL = event('festival', {
  title: '가을 축제',
  startsAt: '2026-10-07T12:00:00+09:00',
  endsAt: '2026-10-07T18:00:00+09:00',
  ...FIELD,
});
export const EVENTS = [CONCERT, TALK, JOB, LECTURE, YOGA, FESTIVAL];

function recruiting(
  id: string,
  title: string,
  startsAt: string,
  at: { latitude: number; longitude: number },
): RecruitingQuest {
  return {
    ...recruitingFor('job', id),
    title,
    nextSubQuest: {
      id: `${id}-1`,
      title: '모이기',
      startsAt,
      endsAt: null,
      place: { placeId: null, label: '문화관', ...at },
    },
  };
}

export const RUN = { ...recruiting('run', '러닝 크루 모집', '2026-10-06T19:30:00+09:00', FIELD), globalEvent: null };
const GOING = recruiting('going', '채용박람회 같이 가요', '2026-10-06T13:55:00+09:00', HALL);
export const RECRUITING = [RUN, GOING];

// The answer of GET /interests/matches: each id with whether a watched interest matched it.
export function matches(events: [string, boolean][], quests: [string, boolean][] = []): InterestMatches {
  return {
    globalEvents: events.map(([id, watched]) => ({ id, watched })),
    quests: quests.map(([id, watched]) => ({ id, watched })),
  };
}

// The marks' inputs for a User who watches something, nothing told and nothing opened.
export function inputs(found: InterestMatches, more: Partial<MarkInputs> = {}): MarkInputs {
  return {
    sources: sourcesOf(found, true, EVENTS, NOW),
    events: EVENTS,
    recruiting: RECRUITING,
    told: new Set(),
    opened: new Set(),
    ...more,
  };
}

// The job fair's mark alone.
export function markOf(more: Partial<InterestMark>): InterestMark {
  return {
    id: 'event:job',
    title: '채용박람회',
    name: '채용박람회',
    look: 'plain',
    items: ['event:job'],
    eventIds: ['job'],
    questIds: [],
    firstStart: JOB.startsAt,
    ...more,
  };
}
