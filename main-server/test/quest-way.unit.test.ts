/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { questWay, type QuestWayAnswer } from '../src/assistant/lookup/quest-way.js';
import { spansOn } from '../src/assistant/lookup/tutorial-lookup.js';
import { readTutorialContent, TUTORIAL_FILE, type TutorialVisit } from '../src/tutorial/tutorial-content.js';
import { CARD, CARD_NOTE, plain, pointOf, positionOf, strong } from './tutorial-example.js';
import { classAt, id, ME, numbered, readCampus, reporting, TUESDAY, wayArgs } from './way-example.js';

// The way to the 학생증 and back (board q12): on Tuesday 2026-11-17 at 11:50 at 301동, after its 11:00 Class, before a
// 13:00 Class in 24동, on the seed's walking table and shuttle timing, with the S-CARD's hours of content/tutorial.yaml.
// A shuttle reported at 신소재공동연구소 at 11:50 comes to the 301동 stop at 11:55, as the board's example.

const AT_301 = { latitude: 37.45021, longitude: 126.95262 };
const SATURDAY = '2026-11-21';

let visit: TutorialVisit | null = null;

beforeAll(async () => {
  await readCampus();
  const content = await readTutorialContent(TUTORIAL_FILE);
  visit = content.quests.find(({ key }) => key === 's-card')?.visit ?? null;
});

const day = (date = TUESDAY): DayItem[] => [
  classAt(date, '11:00', '11:50', '제1공학관'),
  classAt(date, '13:00', '13:50', '자연과학관6'),
];

interface Asked {
  date?: string;
  items?: DayItem[];
  // The Place the User is at, by number, else 301동.
  at?: string;
  shuttleSeenAt?: string;
}

function cardWay(clock: string, { date = TUESDAY, items = day(date), at, shuttleSeenAt }: Asked = {}): QuestWayAnswer {
  const now = onDay(date, clock);
  const card = numbered('67');
  return questWay(
    wayArgs(now, {
      me: { userId: ME, name: '유상', items },
      location:
        at === undefined
          ? { at: AT_301, placeId: id('제1공학관'), onCampus: true }
          : { at: positionOf(at), placeId: numbered(at).id, onCampus: true },
      shuttle: reporting(
        shuttleSeenAt === undefined ? [] : [{ stop: '신소재공동연구소', at: onDay(date, shuttleSeenAt) }],
      ),
    }),
    {
      title: CARD,
      placeId: card.id,
      words: 'NH농협두레문예관 2층',
      at: positionOf('67'),
      stayMinutes: 10,
      open: spansOn(visit, date),
      note: visit?.note ?? null,
    },
  );
}

function lookupOf(answer: QuestWayAnswer): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

const boardQ12 = (): Lookup => lookupOf(cardWay('11:50', { shuttleSeenAt: '11:50' }));

describe('Board q12: the 학생증 at 11:50, before the 13:00 Class in 24동', () => {
  it('takes the shuttle, 4 minutes faster, and says the User is back before the Class', () => {
    expect(boardQ12().kind).toBe('way');
    expect(boardQ12().chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지']);
    expect(boardQ12().lines).toEqual([
      [plain('셔틀로 가면 '), strong('12:08'), plain(' 도착')],
      [strong('13:00 수업 전'), plain('에 다녀올 수 있어요')],
    ]);
  });

  it('says the shuttle against the walk, the stay and the walk on, and when the card can be had', () => {
    expect(boardQ12().basis).toEqual([
      '셔틀: 정류장까지 2분 · 11:55 셔틀 · 타기 9분 · 내려서 4분',
      '걸으면 22분 · 12:12 도착이라 셔틀이 4분 빨라요',
      '거기서 10분 · 24동까지 걸어서 8분 · 12:26 도착',
      CARD_NOTE,
    ]);
  });
});

describe('Board q12 on the map', () => {
  it('draws the ride, the place picked out with its arrival, and the walk on to the Class', () => {
    const { places, routes, flags } = boardQ12().scene;
    expect(places.map(({ role, tag }) => [role, tag])).toEqual([
      ['stop', '301동 정류장 · 11:55 셔틀'],
      ['stop', '정문 정류장'],
      ['pick', 'NH농협두레문예관 2층'],
      ['next', '13:00 수업 · 24동'],
    ]);
    expect(routes.at(-1)).toEqual({
      userId: ME,
      role: 'next',
      from: positionOf('67'),
      to: positionOf('24'),
      minutes: 8,
    });
    expect(flags.at(-1)).toEqual({ at: positionOf('67'), text: '12:08 도착 · NH농협두레문예관 2층', role: 'place' });
    expect(boardQ12().band).toBeNull();
  });

  it('offers route guidance to the place, and nothing that completes the quest', () => {
    expect(boardQ12().actions).toEqual([{ kind: 'guide', to: pointOf('67', 'NH농협두레문예관 2층') }]);
  });

  it('gives the model the arrival, the stay, and the way back, in words', () => {
    expect(cardWay('11:50', { shuttleSeenAt: '11:50' })).toMatchObject({
      words: {
        quest: CARD,
        place: 'NH농협두레문예관 2층',
        by: 'shuttle',
        arrival: '12:08',
        stay: { from: '12:08', until: '12:18', waitsForOpening: false },
        next: { due: '13:00 수업', place: '24동', walkMinutes: 8, backAt: '12:26', lateMinutes: 0 },
        note: CARD_NOTE,
      },
    });
  });
});

describe('The way to a quest, at other times', () => {
  it('says how late the User is for the next Class when the stay does not fit before it', () => {
    const late = lookupOf(cardWay('12:40'));
    expect(late.lines).toEqual([
      [plain('셔틀로 가면 '), strong('12:59'), plain(' 도착')],
      [plain('다녀오면 '), strong('13:00 수업'), plain('에 17분 늦어요')],
    ]);
    expect(late.scene.flags.at(-1)).toMatchObject({ text: '12:59 도착 · NH농협두레문예관 2층', role: 'late' });
  });

  it('says when the place closes when the stay no longer fits that day, and the model is given no stay', () => {
    const closing = cardWay('17:45', { items: [] });
    expect(lookupOf(closing).lines[1]).toEqual([plain('오늘은 17:50에 닫아요')]);
    expect(closing).toMatchObject({ words: { stay: null, next: null } });
  });

  it('says it is not open that day at all on a day without hours', () => {
    const saturday = lookupOf(cardWay('11:50', { date: SATURDAY, items: [] }));
    expect(saturday.lines[1]).toEqual([plain('오늘은 열지 않아요')]);
  });

  it('waits for the place to open, and says so', () => {
    const early = lookupOf(cardWay('08:30', { items: [classAt(TUESDAY, '11:00', '11:50', '제1공학관')] }));
    expect(early.lines[1]).toEqual([strong('11:00 수업 전'), plain('에 다녀올 수 있어요')]);
    expect(early.basis).toContain('09:00에 열어 12분 기다려요');
    expect(early.basis).toContain('거기서 10분 · 301동까지 걸어서 22분 · 09:32 도착');
  });

  it('says when the stay ends when nothing comes after it that day', () => {
    const free = lookupOf(cardWay('14:00'));
    expect(free.chips.map(({ text }) => text)).toEqual(['301동에서']);
    expect(free.lines[1]).toEqual([plain('10분 머물면 '), strong('14:29'), plain('에 끝나요')]);
    expect(free.basis).toContain('거기서 10분 · 14:29에 끝나요');
  });

  it('walks when the place is near, and does not weigh the shuttle', () => {
    const near = lookupOf(cardWay('11:50', { at: '63' }));
    expect(near.lines[0]).toEqual([plain('걸어서 가면 '), strong('11:58'), plain(' 도착')]);
    expect(near.scene.routes.map(({ role }) => role)).toEqual(['me', 'next']);
  });

  it('says the User is there already, with no way and no button', () => {
    const there = lookupOf(cardWay('11:50', { at: '67' }));
    expect(there.lines[0]).toEqual([plain('지금 '), strong('NH농협두레문예관 2층'), plain('에 있어요')]);
    expect(there.actions).toEqual([]);
    expect(there.scene.flags).toEqual([]);
  });
});
