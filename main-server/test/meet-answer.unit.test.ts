/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  classAt,
  HAEUN,
  JIEUN,
  ME,
  me,
  meetOf,
  minsu,
  MINSU,
  myDay,
  readMeetWorld,
  subQuestAt,
  summary,
  time,
} from './meet-example.js';
import { id, point, position } from './way-example.js';

// "만나고 싶다" through the calculation and its words, on the seed's Places and walking table: boards a5 and a6 of the
// design's row 6, a Friend seen through the Timetable only, one whose position is unknown, no time to meet, and the
// band's busy stretches.

beforeAll(() => readMeetWorld());

const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

describe('a5: 민수, from now', () => {
  it('meets at 302동 앞 from 12:15 to 12:43, 28 minutes, then at 301동 앞 for 27', () => {
    expect(summary(meetOf([me(), minsu()]))).toEqual([
      `302동 앞 ${time('12:15')}–${time('12:43')} (28)`,
      `301동 앞 ${time('12:18')}–${time('12:45')} (27)`,
      `신양학술정보관 앞 ${time('12:25')}–${time('12:52')} (27)`,
      `학생회관 ${time('12:32')}–${time('12:59')} (27)`,
      `중앙도서관 관정관 앞 ${time('12:31')}–${time('12:56')} (25)`,
    ]);
  });

  it('words the first Plan as a meeting, with the Quest it becomes', () => {
    const [first] = meetOf([me(), minsu()]).plans;

    expect(first).toMatchObject({
      title: '302동 앞에서 만나기',
      place: point('제2공학관', '302동 앞'),
      meeting: null,
      subQuests: [{ at: time('12:15'), placeId: id('제2공학관'), title: '302동 앞에서 만나기' }],
      lines: [[{ text: '12:15 302동 앞', strong: true }, plain('에서 만나요')], [plain('12:43까지 함께 28분이에요')]],
      basis: [
        '민수 12:15 302동 수업 끝 · 15:30에 나서요',
        '301동 → 302동 앞 걸어서 3분',
        '302동 앞 → 24동 걸어서 17분, 그래서 12:43에 나서요',
      ],
    });
  });

  it('gives where the User sets out, until when, and 민수 as chips', () => {
    expect(meetOf([me(), minsu()]).chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '13:00 수업까지', userId: null },
      { kind: 'person', text: '민수', userId: MINSU },
    ]);
  });
});

describe('a5 on the map', () => {
  it('draws the place, the others numbered, the User walking there and on to 24동, and 민수 where the Class ends', () => {
    const [first] = meetOf([me(), minsu()]).plans;

    expect(first?.scene).toEqual({
      people: [
        { userId: ME, name: '유상', me: true, at: position('제1공학관'), source: 'exact', tag: '나 · 3분' },
        { userId: MINSU, name: '민수', me: false, at: position('제2공학관'), source: 'timetable', tag: '민수' },
      ],
      places: [
        { place: point('제2공학관', '302동 앞'), role: 'pick', tag: '302동 앞' },
        { place: point('제1공학관', '301동 앞'), role: 'candidate', tag: '301동 앞' },
        { place: point('신양학술정보관', '신양학술정보관 앞'), role: 'candidate', tag: '신양학술정보관 앞' },
        { place: point('학생회관', '학생회관'), role: 'candidate', tag: '학생회관' },
        { place: point('중앙도서관 관정관', '중앙도서관 관정관 앞'), role: 'candidate', tag: '중앙도서관 관정관 앞' },
        { place: point('자연과학관6', '24동'), role: 'next', tag: '13:00 수업 · 24동' },
      ],
      routes: [
        { userId: ME, role: 'me', from: position('제1공학관'), to: position('제2공학관'), minutes: 3 },
        { userId: ME, role: 'next', from: position('제2공학관'), to: position('자연과학관6'), minutes: 17 },
      ],
      flags: [{ at: position('제2공학관'), text: '12:15 만남', role: 'place' }],
    });
  });
});

describe("a5's time band", () => {
  it('spans the band from 12:00 to 18:30, each busy stretch named by its Class', () => {
    const [first] = meetOf([me(), minsu()]).plans;

    expect(first?.band).toEqual({
      range: { startAt: time('12:00'), endAt: time('18:30') },
      now: time('12:10'),
      lanes: [
        {
          userId: ME,
          name: '나',
          busy: [
            { startAt: time('13:00'), endAt: time('13:50'), label: '24동 수업' },
            { startAt: time('17:00'), endAt: time('18:15'), label: '58동 수업' },
          ],
        },
        {
          userId: MINSU,
          name: '민수',
          busy: [
            { startAt: time('12:00'), endAt: time('12:15'), label: '302동 수업' },
            { startAt: time('15:30'), endAt: time('16:45'), label: '302동 수업' },
          ],
        },
      ],
      startAt: time('12:15'),
      endAt: time('12:43'),
      text: '12:15–12:43 · 함께 28분',
    });
  });
});

const a6 = (): ReturnType<typeof meetOf> => meetOf([me(), minsu()], { window: { from: '14:00', until: null } });

describe('a6: 민수, the band let go at 14:00', () => {
  it('meets at 302동 앞 for 83 minutes, ahead of 신양학술정보관 앞 from 14:00 to 15:20 for 80', () => {
    expect(summary(a6())).toEqual([
      `302동 앞 ${time('14:07')}–${time('15:30')} (83)`,
      `신양학술정보관 앞 ${time('14:00')}–${time('15:20')} (80)`,
      `중앙도서관 관정관 앞 ${time('14:00')}–${time('15:14')} (74)`,
      `24동 앞 ${time('14:00')}–${time('15:13')} (73)`,
      `학생회관 ${time('14:00')}–${time('15:13')} (73)`,
    ]);
  });

  it('sets the User out from 24동, where the 13:00 Class ends, and shows the fixed start as a chip', () => {
    expect(a6().chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'from', text: '14:00부터', userId: null },
      { kind: 'person', text: '민수', userId: MINSU },
    ]);
  });

  it('words its second Plan, 신양학술정보관 앞, as the board does', () => {
    expect(a6().plans[1]?.lines).toEqual([
      [{ text: '14:00 신양학술정보관 앞', strong: true }, plain('에서 만나요')],
      [plain('15:20까지 함께 80분이에요')],
    ]);
  });

  it('keeps the band over 12:00 to 18:30', () => {
    expect(a6().plans[0]?.band.range).toEqual({ startAt: time('12:00'), endAt: time('18:30') });
  });
});

describe('A Friend seen through the Timetable only', () => {
  it('sets out from the building where their Class ended, as long as it ended at most 15 minutes ago', () => {
    const jieun = { userId: JIEUN, name: '지은', items: [classAt('11:00', '12:00', '제2공학관')], in: null };

    const [first] = meetOf([me(), jieun]).plans;

    expect(first).toMatchObject({ id: '301동 앞', startAt: time('12:13'), endAt: time('12:45'), togetherMinutes: 32 });
    expect(first?.parts[1]).toMatchObject({
      origin: { place: point('제2공학관', '302동'), basis: 'timetable' },
      walkMinutes: 3,
      leaveAt: time('12:10'),
    });
  });
});

describe('A Friend whose position is unknown', () => {
  it('is counted without a walk, free from now, and marked on their chip', () => {
    const haeun = { userId: HAEUN, name: '하은', items: [], in: null };

    const answer = meetOf([me(), haeun]);

    expect(answer.plans[0]).toMatchObject({ id: '301동 앞', startAt: time('12:10'), togetherMinutes: 35 });
    expect(answer.plans[0]?.parts[1]).toMatchObject({ origin: null, walkMinutes: null, leaveAt: null });
    expect(answer.plans[0]?.scene.people.map(({ name }) => name)).toEqual(['유상']);
    expect(answer.chips.at(-1)).toEqual({ kind: 'person', text: '하은 · 위치 모름', userId: HAEUN });
  });
});

describe('No time to meet', () => {
  it('says so when the two share no stretch in the window', () => {
    const answer = meetOf([me(), minsu()], { window: { from: '13:00', until: '13:50' } });

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toEqual({ reason: 'no-shared-time', lines: [[plain('같이 비는 시간이 없어요')]] });
  });

  it('drops every place when they would be together less than 15 minutes', () => {
    const answer = meetOf([me(), minsu()], { window: { from: '12:45', until: '13:00' } });

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toEqual({
      reason: 'no-fit',
      lines: [[plain('함께 15분 이상 있을 수 있는 곳이 없어요')]],
    });
    expect(answer.dropped.map(({ place }) => place.label)).toEqual([
      '301동 앞',
      '302동 앞',
      '학생회관',
      '신양학술정보관 앞',
      '중앙도서관 관정관 앞',
    ]);
  });
});

describe('A fixed Place ("여기면 어때?")', () => {
  it("gives each person's earliest arrival at 학생회관", () => {
    const [first] = meetOf([me(), minsu()], { placeId: id('학생회관') }).plans;

    expect(first).toMatchObject({ id: '학생회관', startAt: time('12:32'), togetherMinutes: 27 });
    expect(first?.parts.map(({ arriveAt }) => arriveAt)).toEqual([time('12:25'), time('12:32')]);
  });

  it("names the User, who stays shortest, and the Class they leave for, with each person's part", () => {
    const answer = meetOf([me(), minsu()], { window: { from: '12:45', until: '13:00' }, placeId: id('학생회관') });

    expect(answer.noPlan).toEqual({
      reason: 'no-fit',
      lines: [[plain('12:45부터 14분만 있을 수 있어요')], [plain('13:00 수업에 가려면 12:59엔 나서야 해요')]],
    });
    expect(answer.dropped[0]?.parts?.map(({ arriveAt }) => arriveAt)).toEqual([time('12:25'), time('12:32')]);
  });
});

describe("The band's busy stretches", () => {
  it('name a Class with a Place by it, a Class without one as 수업, and a Sub Quest as 일정', () => {
    const items = [...myDay(), classAt('15:00', '15:20', null), subQuestAt('16:00', '16:30', '학생회관')];

    const [first] = meetOf([me(items), minsu()]).plans;

    expect(first?.band.lanes[0]?.busy).toEqual([
      { startAt: time('13:00'), endAt: time('13:50'), label: '24동 수업' },
      { startAt: time('15:00'), endAt: time('15:20'), label: '수업' },
      { startAt: time('16:00'), endAt: time('16:30'), label: '일정' },
      { startAt: time('17:00'), endAt: time('18:15'), label: '58동 수업' },
    ]);
  });
});

describe('A meet with nothing after it', () => {
  it("says no one has an item after it, not the minutes to the day's 22:00", () => {
    const free = { userId: JIEUN, name: '지은', items: [], in: '제2공학관' };

    const [first] = meetOf([me([]), free]).plans;

    expect(first?.endAt).toBe(time('22:00'));
    expect(first?.lines[1]).toEqual([plain('그 뒤로는 일정이 없어요')]);
    expect(first?.band.text).not.toContain('분');
  });
});

describe('A meet on another day', () => {
  it('carries its day in the first line', () => {
    const theDayBefore = new Date(Date.parse(time('12:00')) - 24 * 60 * 60 * 1000);

    const [first] = meetOf([me(), minsu()], {}, theDayBefore).plans;

    expect(first?.lines[0]?.[0]?.text).toMatch(/^내일\(화\) \d{2}:\d{2} /u);
  });
});
