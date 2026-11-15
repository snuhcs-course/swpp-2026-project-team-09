/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { classAt, id, position, readCampus, TUESDAY } from './way-example.js';
import { dish, facts, plain, pressed, strong } from './place-card.js';

// Whether the User is in the pressed Place (wireframe row 6): only when the outline of the Place holds their location.
// A start at the Place found otherwise (the nearest Place within 150 m, the last Class, or the main gate) keeps the
// walk, counted from that start, and the way there. Tuesday 2026-11-17 at 12:10, with the next Class at 13:00 in 24동.

beforeAll(() => readCampus());

const lunch = { restaurants: [{ name: '학생회관식당', lines: [dish('순두부찌개')] }] };

// About 100 m north of 학생회관's point.
const NEAR_63 = { latitude: 37.46022, longitude: 126.95058 };

describe('The User inside the Place pressed', () => {
  it('is here, staying from now, with no way to it', () => {
    const lookup = pressed('학생회관', {
      ...lunch,
      location: { at: position('학생회관'), placeId: id('학생회관'), onCampus: true },
      inside: id('학생회관'),
    });

    expect(facts(lookup).slice(0, 2)).toEqual([
      strong('route', '지금 여기 있어요'),
      plain('clock', '13:00 수업 전까지 49분 머물 수 있어요'),
    ]);
    expect(lookup.basis).toEqual(['지금 있는 곳이 학생회관(63동)이에요']);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['plan']);
  });
});

describe('A User whose start is the Place pressed but who is not in it', () => {
  it('near it, outside every outline, has the walk from there and the way', () => {
    const lookup = pressed('학생회관', {
      ...lunch,
      location: { at: NEAR_63, placeId: id('학생회관'), onCampus: true },
      inside: null,
    });

    expect(facts(lookup)[0]).toEqual(strong('route', '걸어서 0분 · 12:10 도착'));
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['plan', 'guide']);
  });

  it('after a Class there, with no location, has the walk from there and the way', () => {
    const lookup = pressed('제1공학관', { location: null });

    expect(facts(lookup)[0]).toEqual(strong('route', '걸어서 0분 · 12:10 도착'));
    expect(lookup.basis).toEqual(['오늘 마지막으로 끝난 일정이 제1공학관(301동)에서였어요']);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });

  it('off campus, pressing the main gate, has the walk from the gate and the way', () => {
    const lookup = pressed('서울대 정문', {
      items: [classAt(TUESDAY, '13:00', '13:50', '자연과학관6')],
      location: { at: { latitude: 37.4766, longitude: 126.9816 }, placeId: null, onCampus: false },
    });

    expect(facts(lookup)[0]).toEqual(strong('route', '걸어서 0분 · 12:10 도착'));
    expect(lookup.basis).toEqual(['지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요']);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});
