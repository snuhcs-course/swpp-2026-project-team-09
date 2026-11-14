/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { classAt, id, ME, point, position, readCampus, time, TUESDAY, WEDNESDAY, wayFor } from './way-example.js';

// How many minutes to the next Class, and whether the User will be late, on the seed's walking table: board q2
// (Tuesday 12:40 at 301동, the next Class at 13:00 in 24동), board q3 (the same at 12:50), and board q15 (Wednesday
// 08:35 off campus, a Class at 09:00 in 24동).

beforeAll(() => readCampus());

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const AT_301 = { latitude: 37.45021, longitude: 126.95262 };
// In 사당동, well outside the campus.
const OFF_CAMPUS = { latitude: 37.4766, longitude: 126.9816 };

const me = (items: DayItem[]): { userId: string; name: string; items: DayItem[] } => ({
  userId: ME,
  name: '유상',
  items,
});

const tuesday = (): DayItem[] => [
  classAt(TUESDAY, '11:00', '11:50', '제1공학관'),
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
];

function lookupOf(answer: ReturnType<typeof wayFor>): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

// "늦나", at 301동 on Tuesday at that time.
const fromBuilding301At = (clock: string): Lookup =>
  lookupOf(
    wayFor(onDay(TUESDAY, clock), {
      me: me(tuesday()),
      location: { at: AT_301, placeId: id('제1공학관'), onCampus: true },
    }),
  );

describe('Board q2: 12:40 at 301동, the next Class at 13:00 in 24동', () => {
  it('goes to the next Class, until its start', () => {
    expect(fromBuilding301At('12:40').chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '13:00 수업까지', userId: null },
    ]);
  });

  it('says the minutes on foot and when to set out to be there at 13:00', () => {
    expect(fromBuilding301At('12:40').lines).toEqual([
      [plain('24동까지 걸어서 '), strong('15분')],
      [strong('12:45'), plain('에 나서면 13:00에 맞아요')],
    ]);
  });

  it('rests on the way on foot', () => {
    expect(fromBuilding301At('12:40').basis).toEqual(['301동 → 24동 걸어서 15분']);
  });
});

describe('Board q2: the map, the band, and the actions', () => {
  it('draws the next Class, the way to it, and when to set out at the start', () => {
    expect(fromBuilding301At('12:40').scene).toEqual({
      people: [{ userId: ME, name: '유상', me: true, at: AT_301, source: 'exact', tag: '나' }],
      places: [{ place: point('자연과학관6', '24동'), role: 'next', tag: '13:00 수업 · 24동' }],
      routes: [{ userId: ME, role: 'me', from: position('제1공학관'), to: position('자연과학관6'), minutes: 15 }],
      flags: [{ at: position('제1공학관'), text: '12:45 나서기', role: 'place' }],
    });
  });

  it('bands the stretch from setting out to the Class, the half hours around it, and the User busy with nothing there', () => {
    expect(fromBuilding301At('12:40').band).toEqual({
      range: { startAt: time(TUESDAY, '12:30'), endAt: time(TUESDAY, '13:00') },
      now: time(TUESDAY, '12:40'),
      lanes: [{ userId: ME, name: '나', busy: [] }],
      startAt: time(TUESDAY, '12:45'),
      endAt: time(TUESDAY, '13:00'),
      text: '12:45 나서기 · 걸어서 15분',
    });
  });

  it('offers a leave-by notification at 12:45 first, then route guidance', () => {
    expect(fromBuilding301At('12:40').actions).toEqual([
      {
        kind: 'remind',
        at: time(TUESDAY, '12:45'),
        text: '지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분',
      },
      { kind: 'guide', to: point('자연과학관6', '24동') },
    ]);
  });

  it('is the same when the User names 24동, the Place of the next Class', () => {
    const named = lookupOf(
      wayFor(onDay(TUESDAY, '12:40'), {
        me: me(tuesday()),
        location: { at: AT_301, placeId: id('제1공학관'), onCampus: true },
        toPlaceId: id('자연과학관6'),
      }),
    );

    expect(named).toEqual(fromBuilding301At('12:40'));
  });
});

describe('Board q3: the same at 12:50', () => {
  it('says when the User arrives if they go now, and how late', () => {
    expect(fromBuilding301At('12:50').lines).toEqual([
      [plain('지금 가도 '), strong('13:05'), plain(' 도착')],
      [plain('5분 늦어요')],
    ]);
  });

  it('rests on the walk and the time now', () => {
    expect(fromBuilding301At('12:50').basis).toEqual(['걸어서 15분 · 지금 12:50']);
  });

  it('flags the arrival and the lateness at the Class', () => {
    expect(fromBuilding301At('12:50').scene.flags).toEqual([
      { at: position('자연과학관6'), text: '13:05 도착 · 5분 늦어요', role: 'place' },
    ]);
  });

  it('bands the stretch from now to the arrival, with the Class in the User’s lane', () => {
    expect(fromBuilding301At('12:50').band).toEqual({
      range: { startAt: time(TUESDAY, '12:30'), endAt: time(TUESDAY, '13:30') },
      now: time(TUESDAY, '12:50'),
      lanes: [{ userId: ME, name: '나', busy: [{ startAt: time(TUESDAY, '13:00'), endAt: time(TUESDAY, '13:30') }] }],
      startAt: time(TUESDAY, '12:50'),
      endAt: time(TUESDAY, '13:05'),
      text: '12:50–13:05 · 걸어서 15분',
    });
  });

  it('offers route guidance only', () => {
    expect(fromBuilding301At('12:50').actions).toEqual([{ kind: 'guide', to: point('자연과학관6', '24동') }]);
  });
});

// "9시 수업인데 늦나", off campus on Wednesday at 08:35.
const offCampus = (): Lookup =>
  lookupOf(
    wayFor(onDay(WEDNESDAY, '08:35'), {
      me: me([classAt(WEDNESDAY, '09:00', '09:50', '자연과학관6')]),
      location: { at: OFF_CAMPUS, placeId: null, onCampus: false },
    }),
  );

describe('Board q15: Wednesday 08:35 off campus, a Class at 09:00 in 24동', () => {
  it('counts from the main gate, until the Class', () => {
    expect(offCampus().chips).toEqual([
      { kind: 'origin', text: '정문에서', userId: null },
      { kind: 'until', text: '09:00 수업까지', userId: null },
    ]);
  });

  it('says by when to pass the main gate', () => {
    expect(offCampus().lines).toEqual([
      [plain('정문을 '), strong('08:50'), plain('까지 지나면')],
      [plain('09:00 수업에 맞아요')],
    ]);
  });

  it('rests on the way from the gate, and says the location off campus was not used', () => {
    expect(offCampus().basis).toEqual([
      '정문 → 24동 걸어서 10분',
      '지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요',
    ]);
  });

  it('draws the User at the gate, not where they are, the way from it, and by when to pass it', () => {
    expect(offCampus().scene).toEqual({
      people: [{ userId: ME, name: '유상', me: true, at: position('서울대 정문'), source: 'timetable', tag: '나' }],
      places: [{ place: point('자연과학관6', '24동'), role: 'next', tag: '09:00 수업 · 24동' }],
      routes: [{ userId: ME, role: 'me', from: position('서울대 정문'), to: position('자연과학관6'), minutes: 10 }],
      flags: [{ at: position('서울대 정문'), text: '08:50까지 정문 통과', role: 'place' }],
    });
  });

  it('bands from now to the Class, and reminds at 08:50', () => {
    const { band, actions } = offCampus();

    expect(band).toMatchObject({
      range: { startAt: time(WEDNESDAY, '08:30'), endAt: time(WEDNESDAY, '09:00') },
      startAt: time(WEDNESDAY, '08:50'),
      endAt: time(WEDNESDAY, '09:00'),
      text: '08:50까지 정문 통과 · 걸어서 10분',
    });
    expect(actions[0]).toEqual({
      kind: 'remind',
      at: time(WEDNESDAY, '08:50'),
      text: '지금 정문을 지나면 09:00 수업에 맞아요 · 24동까지 걸어서 10분',
    });
  });
});
