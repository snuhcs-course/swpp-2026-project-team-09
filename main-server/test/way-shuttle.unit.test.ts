/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { onDay } from '../src/assistant/free-time/free-time.js';
import {
  classAt,
  id,
  ME,
  point,
  position,
  readCampus,
  reporting,
  stopPoint,
  stopPosition,
  time,
  TUESDAY,
  wayFor,
} from './way-example.js';

// "셔틀 탈까 걸을까" (board q4): Tuesday 16:40 at 301동, the next Class at 17:00 in 58동, on the seed's walking table
// and shuttle timing. A shuttle reported at 신소재공동연구소 at 16:40 comes to the 301동 stop at 16:45, the board's
// example arrival.

beforeAll(() => readCampus());

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const AT_301 = { latitude: 37.45021, longitude: 126.95262 };

// With the one shuttle reported at that stop at 16:40.
function shuttleOrWalk(reportedAt = '신소재공동연구소'): Lookup {
  const now = onDay(TUESDAY, '16:40');
  const answer = wayFor(now, {
    me: {
      userId: ME,
      name: '유상',
      items: [classAt(TUESDAY, '15:00', '16:15', '제1공학관'), classAt(TUESDAY, '17:00', '18:15', 'SK경영관')],
    },
    location: { at: AT_301, placeId: id('제1공학관'), onCampus: true },
    shuttle: reporting([{ stop: reportedAt, at: now }]),
  });
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

describe('Board q4: the shuttle to the 17:00 Class in 58동', () => {
  it('goes to the next Class, until its start', () => {
    expect(shuttleOrWalk().chips.map(({ text }) => text)).toEqual(['301동에서', '17:00 수업까지']);
  });

  it('says how much faster the shuttle is, and when to set out for it', () => {
    expect(shuttleOrWalk().lines).toEqual([
      [strong('셔틀'), plain('이 12분 빨라요')],
      [strong('16:43'), plain('에 나서면 16:53 도착')],
    ]);
  });

  it('rests on the shuttle reported, the legs, the walk, and the rule', () => {
    expect(shuttleOrWalk().basis).toEqual([
      '16:43에 나서 정류장까지 2분 · 16:45 셔틀, 약 5분 뒤',
      '타는 시간 7분 · 내려서 걷기 1분 · 모두 10분',
      '지금 걸어 나서면 25분 · 17:05 도착, 5분 늦어요',
      '셔틀은 걷기보다 3분 이상 빠를 때만 권해요 (평일 8–21시)',
    ]);
  });
});

describe('Board q4: the map', () => {
  it('draws the two stops and the next Class', () => {
    expect(shuttleOrWalk().scene.places).toEqual([
      { place: stopPoint('301동'), role: 'stop', tag: '301동 정류장 · 16:45 셔틀' },
      { place: stopPoint('경영대'), role: 'stop', tag: '경영대 정류장' },
      { place: point('SK경영관', '58동'), role: 'next', tag: '17:00 수업 · 58동' },
    ]);
  });

  it('draws the walk faded, the walk to the stop, the ride stop by stop along the loop, and the walk from the stop', () => {
    const ride = ['301동', '유전공학연구소', '교수회관', '기숙사삼거리', '국제대학원', '수의대', '경영대'];

    expect(shuttleOrWalk().scene.routes.map(({ role, from, to }) => ({ role, from, to }))).toEqual([
      { role: 'alt', from: position('제1공학관'), to: position('SK경영관') },
      { role: 'me', from: position('제1공학관'), to: stopPosition('301동') },
      ...ride.slice(1).map((name, stretch) => ({
        role: 'shuttle',
        from: stopPosition(ride[stretch] ?? ''),
        to: stopPosition(name),
      })),
      { role: 'me', from: stopPosition('경영대'), to: position('SK경영관') },
    ]);
  });

  it('gives the walks their minutes, and the ride its 7 minutes stretch by stretch', () => {
    const { routes } = shuttleOrWalk().scene;
    const rideMinutes = routes.filter(({ role }) => role === 'shuttle').reduce((sum, { minutes }) => sum + minutes, 0);

    expect(routes.filter(({ role }) => role !== 'shuttle').map(({ minutes }) => minutes)).toEqual([25, 2, 1]);
    expect(rideMinutes).toBe(7);
  });

  it('flags the stop the shuttle passed last, and the arrival at the Class', () => {
    expect(shuttleOrWalk().scene.flags).toEqual([
      { at: stopPosition('신소재공동연구소'), text: '셔틀 · 신소재공동연구소 지남', role: 'shuttle' },
      { at: position('SK경영관'), text: '16:53 도착', role: 'place' },
    ]);
  });
});

describe('Board q4: the band and the actions', () => {
  it('bands the stretch from setting out to the arrival', () => {
    expect(shuttleOrWalk().band).toEqual({
      range: { startAt: time(TUESDAY, '16:30'), endAt: time(TUESDAY, '17:00') },
      now: time(TUESDAY, '16:40'),
      lanes: [{ userId: ME, name: '나', busy: [] }],
      startAt: time(TUESDAY, '16:43'),
      endAt: time(TUESDAY, '16:53'),
      text: '16:43 나서기 · 셔틀로 10분',
    });
  });

  it('offers a notification at 16:43 first, then route guidance to the stop', () => {
    expect(shuttleOrWalk().actions).toEqual([
      {
        kind: 'remind',
        at: time(TUESDAY, '16:43'),
        text: '지금 나서면 16:45 셔틀로 17:00 수업에 맞아요 · 301동 정류장까지 걸어서 2분',
      },
      { kind: 'guide', to: stopPoint('301동') },
    ]);
  });
});

// A lap from the 301동 stop at 14–17 is its ride to 302동, 1,080 s, and back, 135 s: 20 minutes and 15 seconds.
describe('Board q4 with the shuttle just gone', () => {
  it('walks when the shuttle reported has just left the 301동 stop, as when it is one stop past it', () => {
    const walk = [[plain('지금 가도 '), strong('17:05'), plain(' 도착')], [plain('5분 늦어요')]];

    expect(shuttleOrWalk('301동')).toMatchObject({
      lines: walk,
      basis: ['걸어서 25분 · 지금 16:40', '셔틀은 28분 걸려 걸어요'],
    });
    expect(shuttleOrWalk('유전공학연구소')).toMatchObject({
      lines: walk,
      basis: ['걸어서 25분 · 지금 16:40', '셔틀은 26분 걸려 걸어요'],
    });
  });
});
