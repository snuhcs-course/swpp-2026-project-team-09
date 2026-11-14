/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { classAt, id, ME, position, readCampus, TUESDAY, wayFor } from './way-example.js';

// The way's deadline, when to set out, and lateness at their boundaries, on Tuesday on the seed's walking table:
// 301동 → 24동 is 15 minutes, 학생회관 → 8동 5 minutes, 문화관 → 8동 4 minutes, and 301동 → 문화관 18 minutes.

beforeAll(() => readCampus());

const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const me = (items: DayItem[]): WayArgs['me'] => ({ userId: ME, name: '유상', items });

// At the Place of that name, as the User's location.
const atPlace = (name: string): WayArgs['location'] => ({ at: position(name), placeId: id(name), onCampus: true });

const classIn24 = (): DayItem => classAt(TUESDAY, '13:00', '13:50', '자연과학관6');

function lookupAt(now: Date, given: Partial<Omit<WayArgs, 'now' | 'travel' | 'placeOf'>>): Lookup {
  const answer = wayFor(now, given);
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

// The text of each line, its parts joined.
const linesOf = ({ lines }: Lookup): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

describe('Lateness, from 301동 to the 13:00 Class in 24동', () => {
  it('is none when the User sets out at 12:45, on time to the minute', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:45'), { me: me([classIn24()]), location: atPlace('제1공학관') });

    expect(linesOf(lookup)).toEqual(['24동까지 걸어서 15분', '12:45에 나서면 13:00에 맞아요']);
  });

  it('is one minute at 12:46', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:46'), { me: me([classIn24()]), location: atPlace('제1공학관') });

    expect(linesOf(lookup)).toEqual(['지금 가도 13:01 도착', '1분 늦어요']);
  });

  it('counts now rounded up to the whole minute: one minute at 12:45:30', () => {
    const now = new Date(onDay(TUESDAY, '12:45').getTime() + 30_000);

    const lookup = lookupAt(now, { me: me([classIn24()]), location: atPlace('제1공학관') });

    expect(linesOf(lookup)).toEqual(['지금 가도 13:01 도착', '1분 늦어요']);
  });
});

const classIn8 = (): DayItem => classAt(TUESDAY, '13:00', '13:50', '두산인문관');

describe('The leave-by notification', () => {
  it('is not offered once the leave-by time is now: route guidance is the action', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:45'), { me: me([classIn24()]), location: atPlace('제1공학관') });

    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });

  it('is offered for a walk of 5 minutes', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:40'), { me: me([classIn8()]), location: atPlace('학생회관') });

    expect(lookup.actions[0]).toMatchObject({ kind: 'remind', at: '2026-11-17T12:55:00+09:00' });
  });

  it('is not offered for a walk of 4 minutes', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:40'), { me: me([classIn8()]), location: atPlace('문화관') });

    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});

describe("The way's deadline", () => {
  it('is the time the User named, before the next Class', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:30'), {
      me: me([classIn24()]),
      location: atPlace('제1공학관'),
      by: '12:50',
    });

    expect(lookup.chips[1]).toEqual({ kind: 'until', text: '12:50까지', userId: null });
    expect(linesOf(lookup)).toEqual(['24동까지 걸어서 15분', '12:35에 나서면 12:50에 맞아요']);
  });

  it('is the time the User named for a Place that is not their next item, called by its name and number', () => {
    const lookup = lookupAt(onDay(TUESDAY, '13:30'), {
      me: me([classIn24()]),
      location: atPlace('제1공학관'),
      toPlaceId: id('문화관'),
      by: '14:00',
    });

    expect(linesOf(lookup)).toEqual(['문화관(73동)까지 걸어서 18분', '13:42에 나서면 14:00에 맞아요']);
    expect(lookup.scene.places.map(({ role, tag }) => ({ role, tag }))).toEqual([
      { role: 'pick', tag: '문화관(73동)' },
    ]);
  });

  it('is none for a Place that is not the next item, and there is no band', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:40'), {
      me: me([classIn24()]),
      location: atPlace('제1공학관'),
      toPlaceId: id('문화관'),
    });

    expect(lookup.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
    expect(lookup.band).toBeNull();
  });

  it('is the start of a Sub Quest that is the next item, as a clock time', () => {
    const quest: DayItem = { ...classAt(TUESDAY, '13:00', '14:00', '자연과학관6'), isClass: false };

    const lookup = lookupAt(onDay(TUESDAY, '12:40'), { me: me([quest]), location: atPlace('제1공학관') });

    expect(lookup.chips[1]).toEqual({ kind: 'until', text: '13:00까지', userId: null });
    expect(lookup.scene.places[0]?.tag).toBe('13:00 · 24동');
  });
});

// The way from 301동 to 문화관 by that time.
const askedBy = (now: Date, by: string): ReturnType<typeof wayFor> =>
  wayFor(now, { me: me([classIn24()]), location: atPlace('제1공학관'), toPlaceId: id('문화관'), by });

describe('A time the User named that is not later than now', () => {
  it('draws no way, as for 2시 given as 02:00 at 13:30', () => {
    expect(askedBy(onDay(TUESDAY, '13:30'), '02:00')).toEqual({ result: 'none', reason: 'past-by' });
  });

  it('is refused at now rounded up to the minute, and taken a minute later', () => {
    const now = new Date(onDay(TUESDAY, '13:29').getTime() + 30 * 1000);

    expect(askedBy(now, '13:30').result).toBe('none');
    expect(askedBy(now, '13:31').result).toBe('found');
  });
});

describe('The next item, with no Place named', () => {
  it('is the first item later today that has a Place', () => {
    const noPlace: DayItem = { ...classAt(TUESDAY, '12:50', '12:55', '제1공학관'), placeId: null, isClass: false };

    const lookup = lookupAt(onDay(TUESDAY, '12:40'), {
      me: me([classIn24(), noPlace]),
      location: atPlace('제1공학관'),
    });

    expect(linesOf(lookup)[0]).toBe('24동까지 걸어서 15분');
  });

  it('is none when no item later today has a Place, and there is no way', () => {
    const answer = wayFor(onDay(TUESDAY, '14:00'), { me: me([classIn24()]), location: atPlace('제1공학관') });

    expect(answer).toEqual({ result: 'none', reason: 'no-next' });
  });
});

describe('Off campus', () => {
  const OFF_CAMPUS = { at: { latitude: 37.4766, longitude: 126.9816 }, placeId: null, onCampus: false };

  it('counts a way to a Place from the main gate', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:40'), { location: OFF_CAMPUS, toPlaceId: id('문화관') });

    expect(lookup.chips).toEqual([{ kind: 'origin', text: '정문에서', userId: null }]);
    expect(lookup.lines[1]).toEqual([plain('정문에서 걸어서 8분')]);
    expect(lookup.basis).toEqual([
      '정문 → 문화관(73동) 걸어서 8분 · 앱의 도보표',
      '지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요',
    ]);
  });

  it('says how late the User is when they pass the gate now', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:55'), { me: me([classIn24()]), location: OFF_CAMPUS });

    expect(linesOf(lookup)).toEqual(['지금 정문을 지나도 13:05 도착', '5분 늦어요']);
  });

  it('counts from the Place the User named, not the gate', () => {
    const lookup = lookupAt(onDay(TUESDAY, '12:40'), {
      location: OFF_CAMPUS,
      fromPlaceId: id('제1공학관'),
      toPlaceId: id('문화관'),
    });

    expect(lookup.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
  });
});
