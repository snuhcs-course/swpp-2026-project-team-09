/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { onDay } from '../src/assistant/free-time/free-time.js';
import { facts, plain, pressed, strong } from './place-card.js';
import { classAt, point, readCampus, stopPoint, TUESDAY } from './way-example.js';

// 58동 pressed from inside 301동 on Tuesday 2026-11-17, with nothing on the Timetable unless given: 25 minutes on foot
// on the seed's walking table, or the shuttle from the 301동 stop to the 경영대 stop, 2 minutes to the stop, a 7-minute
// ride, and 1 minute from the stop. The shuttle is taken when it arrives at least 3 minutes before the walk.

beforeAll(() => readCampus());

const at = (clock: string): Date => onDay(TUESDAY, clock);

// The average wait at 10:00 is 4 minutes: there at 10:14 by the shuttle, at 10:25 on foot.
const atTen = (): Lookup => pressed('SK경영관', { clock: '10:00', items: [] });

describe('58동 pressed at 10:00, with no shuttle reported', () => {
  it('says the shuttle, its arrival, and the stop to take it at', () => {
    expect(facts(atTen())).toEqual([
      strong('route', '셔틀로 14분 · 10:14 도착'),
      plain('route', '301동 정류장에서 타요 · 기다림 약 4분'),
    ]);
  });

  it('rests on the shuttle’s legs, the walk it beats, and the rule', () => {
    expect(atTen().basis).toEqual([
      '지금 나서 정류장까지 2분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 4분',
      '타는 시간 7분 · 내려서 걷기 1분 · 모두 14분',
      '지금 걸어 나서면 25분 · 10:25 도착',
      '셔틀은 걷기보다 3분 이상 빠를 때만 권해요 (평일 8–21시)',
    ]);
  });

  it('guides to the stop the shuttle is taken at', () => {
    expect(atTen().actions).toEqual([{ kind: 'guide', to: stopPoint('301동') }]);
  });

  it('counts the stay from the shuttle’s arrival', () => {
    const items = [classAt(TUESDAY, '11:00', '11:50', '제1공학관')];

    // 10:14 to 11:00, less the 25-minute walk back to 301동.
    expect(facts(pressed('SK경영관', { clock: '10:00', items }))[2]).toEqual(
      plain('clock', '11:00 수업 전까지 21분 머물 수 있어요'),
    );
  });
});

describe('58동 pressed at 16:40, with a shuttle reported', () => {
  it('takes the shuttle 3 minutes faster, with when to set out for it', () => {
    const lookup = pressed('SK경영관', {
      clock: '16:40',
      items: [],
      reported: [{ stop: '국제대학원', at: at('16:40') }],
    });

    expect(facts(lookup)).toEqual([
      strong('route', '셔틀로 10분 · 17:02 도착'),
      plain('route', '16:52에 나서 301동 정류장에서 16:54 셔틀'),
    ]);
    expect(lookup.actions).toEqual([{ kind: 'guide', to: stopPoint('301동') }]);
  });

  it('walks when the shuttle is only 1 minute faster', () => {
    const lookup = pressed('SK경영관', {
      clock: '16:40',
      items: [],
      reported: [{ stop: '기숙사삼거리', at: at('16:40') }],
    });

    expect(facts(lookup)).toEqual([strong('route', '걸어서 25분 · 17:05 도착')]);
    expect(lookup.basis).toEqual([
      '301동에서 58동까지 걸어서 25분',
      '셔틀은 24분으로 걷기보다 3분 이상 빠르지 않아 걸어요',
    ]);
    expect(lookup.actions).toEqual([{ kind: 'guide', to: point('SK경영관', '58동') }]);
  });
});

describe('58동 pressed at 22:00, when the shuttle does not run', () => {
  it('walks, and says the shuttle is not running', () => {
    const lookup = pressed('SK경영관', { clock: '22:00', items: [] });

    expect(facts(lookup)).toEqual([strong('route', '걸어서 25분 · 22:25 도착')]);
    expect(lookup.basis).toEqual(['301동에서 58동까지 걸어서 25분', '셔틀은 지금 다니지 않아요 (평일 8–21시)']);
    expect(lookup.actions).toEqual([{ kind: 'guide', to: point('SK경영관', '58동') }]);
  });
});

// P05 ticket 47: only an hours or a menu answer is a fact.
it("is no fact, for a pressed building's card", () => {
  expect(atTen()).not.toHaveProperty('fact');
});
