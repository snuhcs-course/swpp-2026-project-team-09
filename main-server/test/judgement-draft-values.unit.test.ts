/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { JUDGEMENT_CHECKS, type JudgedSession } from '../src/global-events/judgement-answer.js';
import { draftValues } from '../src/global-events/session-settling.js';
import { verdictOf } from '../src/global-events/session-verdict.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

const PLACE: PlaceDto = { id: 'p', name: '목공실', number: '1', latitude: 37.4, longitude: 126.9 };

const KEPT = {
  startsAt: new Date('2085-11-05T00:00:00+09:00'),
  endsAt: null,
  place: '워커가 읽은 곳',
  latitude: null,
  longitude: null,
};

function failing(...names: string[]): JudgedSession {
  return {
    start: '2085-11-05T14:00',
    end: '2085-11-05T16:00',
    place: '목공실',
    overPeriod: false,
    lines: { start: [], end: [], place: [] },
    placeId: 'p',
    passed: false,
    globalEventId: null,
    checks: JUDGEMENT_CHECKS.map((name) => ({ name, passed: !names.includes(name) })),
  };
}

function valuesOf(session: JudgedSession): ReturnType<typeof draftValues> {
  return draftValues(session, verdictOf(session.checks), PLACE, KEPT);
}

describe('draftValues', () => {
  it('fills only the time of a session it compares, even when its place passes', () => {
    expect(valuesOf(failing('length'))).toEqual({
      ...KEPT,
      startsAt: new Date('2085-11-05T14:00:00+09:00'),
      endsAt: new Date('2085-11-05T16:00:00+09:00'),
    });
  });

  it('fills the place and its position when only the time fails, keeping the time the worker read', () => {
    expect(valuesOf(failing('timeAgrees'))).toEqual({ ...KEPT, place: '목공실', latitude: 37.4, longitude: 126.9 });
  });

  it('fills the time when only the event check and the place fail', () => {
    expect(valuesOf(failing('announcesEvent', 'placeMatches'))).toMatchObject({
      startsAt: new Date('2085-11-05T14:00:00+09:00'),
      place: KEPT.place,
    });
  });
});
