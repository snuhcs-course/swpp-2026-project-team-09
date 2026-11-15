/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup, type PlacePoint } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { tutorialAnswer, type TutorialAnswer } from '../src/assistant/lookup/tutorial-lookup.js';
import { type Position } from '../src/common/geometry.js';
import { readTutorialContent, TUTORIAL_FILE, type TutorialContent } from '../src/tutorial/tutorial-content.js';
import { classAt, id, ME, numbered, placeOf, readCampus, seedTravel, TUESDAY } from './way-example.js';

// The Tutorial Quests in order before the next Class (board q10): "새내기 퀘스트 뭐부터?" on Tuesday at 13:50, as the
// Class in 24동 ends and the next is at 17:00 in 58동, with the quests of content/tutorial.yaml and the seed's Places and
// walking table.

let content: TutorialContent;

beforeAll(async () => {
  await readCampus();
  content = await readTutorialContent(TUTORIAL_FILE);
});

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

// Board q10's three quests left: the 보건진료소, the 학생증, and the 분실물센터.
const BOARD_Q10 = ['health-clinic', 's-card', 'lost-and-found'];

const CLINIC = '서울대 보건진료소 이용';
const LOST = '분실물센터 위치 알아두기';
const CARD = '학생증(S-CARD) 발급받기';
const CLINIC_NOTE = '보건진료소는 평일 09:00–12:00, 13:30–17:30에 진료해요 · 금요일은 16:30까지';
const LOST_NOTE = '분실물센터는 09:00–18:00에 열어요';
const CARD_NOTE = '학생증은 MySNU 신청 다음 날부터 받아요 · 평일 09:00–17:50';

const positionOf = (number: string): Position => {
  const { latitude, longitude } = numbered(number);
  return { latitude, longitude };
};

const pointOf = (number: string, label: string): PlacePoint => ({
  placeId: numbered(number).id,
  label,
  ...positionOf(number),
});

// The Class in 24동 that ends at 13:50 and the one in 58동 at 17:00.
const afternoon = (): DayItem[] => [
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
  classAt(TUESDAY, '17:00', '18:15', 'SK경영관'),
];

function tutorialAt(clock: string, keys: readonly string[], items: DayItem[] = afternoon()): TutorialAnswer {
  return tutorialAnswer({
    now: onDay(TUESDAY, clock),
    me: { userId: ME, name: '유상', items },
    location: null,
    gatePlaceId: id('서울대 정문'),
    quests: content.quests
      .filter(({ key }) => keys.includes(key))
      .map(({ key, title, places, visit }) => ({ key, title, places, visit: visit ?? null })),
    placeIdOf: (place) => {
      if (!('place' in place)) {
        throw new Error('No quest of a point is open here');
      }
      return numbered(place.place).id;
    },
    travel: seedTravel(),
    placeOf,
  });
}

function lookupOf(answer: TutorialAnswer): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No order: ${answer.reason}`);
  }
  return answer.lookup;
}

const boardQ10 = (): Lookup => lookupOf(tutorialAt('13:50', BOARD_Q10));

// The 보건진료소 and the 분실물센터 left at 12:05, after a Class in 24동, before a 13:00 Class in 58동.
const lunchtime = (): TutorialAnswer =>
  tutorialAt(
    '12:05',
    ['health-clinic', 'lost-and-found'],
    [classAt(TUESDAY, '11:00', '11:50', '자연과학관6'), classAt(TUESDAY, '13:00', '13:50', 'SK경영관')],
  );

describe('Three quests left at 13:50, before the 17:00 Class in 58동 (board q10)', () => {
  it('are a Lookup of the Tutorial, from 24동 until the 17:00 Class, with when all are done and the next Class', () => {
    expect(boardQ10()).toMatchObject({
      kind: 'tutorial',
      chips: [
        { kind: 'origin', text: '24동에서', userId: null },
        { kind: 'until', text: '17:00 수업까지', userId: null },
      ],
      band: null,
    });
    expect(boardQ10().lines).toEqual([
      [plain('세 곳을 돌면 '), strong('14:29'), plain('에 끝나요')],
      [plain('다음은 '), strong('17:00 수업'), plain(' · 58동')],
    ]);
  });

  it('are listed as steps in the order of the shortest walk, each its time, the floor of its Place, and the quest', () => {
    expect(boardQ10().steps).toEqual([
      { at: '13:51', text: `학생회관 3층 · ${CLINIC}` },
      { at: '14:08', text: `아시아연구소 1층 · ${LOST}` },
      { at: '14:19', text: `NH농협두레문예관 2층 · ${CARD}` },
    ]);
  });

  it('say first what decides the order, then when each quest can be done', () => {
    expect(boardQ10().basis).toEqual([
      '가장 적게 걷는 순서예요 · 58동까지 모두 걸어서 14분',
      '한 곳에 10분씩 잡았어요',
      CLINIC_NOTE,
      LOST_NOTE,
      CARD_NOTE,
    ]);
  });

  it('offer route guidance to the first, and nothing that completes a quest', () => {
    expect(boardQ10().actions).toEqual([{ kind: 'guide', to: pointOf('63', '학생회관 3층') }]);
  });
});

describe('The three quests of board q10 on the map, and as the model is given them', () => {
  it('are numbered on the map with their times, the walks between them, and the walk on to the next Class', () => {
    expect(boardQ10().scene).toEqual({
      people: [{ userId: ME, name: '유상', me: true, at: positionOf('24'), source: 'timetable', tag: '나' }],
      places: [
        { place: pointOf('63', '학생회관 3층'), role: 'pick', tag: `13:51 ${CLINIC}`, order: 1 },
        { place: pointOf('101', '아시아연구소 1층'), role: 'pick', tag: `14:08 ${LOST}`, order: 2 },
        { place: pointOf('67', 'NH농협두레문예관 2층'), role: 'pick', tag: `14:19 ${CARD}`, order: 3 },
        { place: pointOf('58', '58동'), role: 'next', tag: '17:00 수업 · 58동' },
      ],
      routes: [
        { userId: ME, role: 'me', from: positionOf('24'), to: positionOf('63'), minutes: 1 },
        { userId: ME, role: 'me', from: positionOf('63'), to: positionOf('101'), minutes: 7 },
        { userId: ME, role: 'me', from: positionOf('101'), to: positionOf('67'), minutes: 1 },
        { userId: ME, role: 'next', from: positionOf('67'), to: positionOf('58'), minutes: 5 },
      ],
      flags: [],
    });
  });

  it('are given to the model as times, quests, Places, and minutes', () => {
    expect(tutorialAt('13:50', BOARD_Q10)).toMatchObject({
      result: 'found',
      words: {
        from: '24동',
        stops: [
          { at: '13:51', quest: CLINIC, place: '학생회관 3층', walkMinutes: 1, when: CLINIC_NOTE },
          { at: '14:08', quest: LOST, place: '아시아연구소 1층', walkMinutes: 7, when: LOST_NOTE },
          { at: '14:19', quest: CARD, place: 'NH농협두레문예관 2층', walkMinutes: 1, when: CARD_NOTE },
        ],
        doneAt: '14:29',
        next: { at: '17:00', isClass: true, place: '58동', walkMinutes: 5 },
        minutesPerStop: 10,
        leftOut: [],
        online: [],
      },
    });
  });
});

describe('A quest done online', () => {
  it('is named in one line of the basis, and not ordered', () => {
    const answer = tutorialAt('13:50', [...BOARD_Q10, 'chatgpt-edu', 'ms365-campus-software']);

    expect(lookupOf(answer).basis.at(-1)).toBe(
      'ChatGPT Edu 무료로 쓰기, 캠퍼스 라이선스 소프트웨어 받기 · 온라인으로 할 수 있어요',
    );
    expect(lookupOf(answer).steps).toHaveLength(3);
  });
});

describe('The 보건진료소 at 12:05, before a 13:00 Class in 58동', () => {
  it('is left out as closed then, with its hours, and the 분실물센터 is ordered alone', () => {
    const lookup = lookupOf(lunchtime());

    expect(lookup.lines).toEqual([
      [plain('한 곳을 돌면 '), strong('12:22'), plain('에 끝나요')],
      [plain('다음은 '), strong('13:00 수업'), plain(' · 58동')],
    ]);
    expect(lookup.basis).toEqual([
      '가장 적게 걷는 순서예요 · 58동까지 모두 걸어서 12분',
      '한 곳에 10분씩 잡았어요',
      LOST_NOTE,
      `${CLINIC} · 13:00 수업 전에는 열지 않아 뺐어요`,
      CLINIC_NOTE,
    ]);
    expect(lunchtime()).toMatchObject({
      words: { leftOut: [{ quest: CLINIC, reason: 'closed then', when: CLINIC_NOTE }] },
    });
  });
});

describe('No order', () => {
  it('is found when no quest fits before the next Class, and the model is told which and why', () => {
    expect(tutorialAt('16:50', ['s-card'])).toEqual({
      result: 'none',
      reason: 'no-fit',
      leftOut: [{ quest: CARD, reason: 'no time before the next item', when: CARD_NOTE }],
      online: [],
    });
  });

  it('is found when every quest with a place is completed, the online ones named', () => {
    expect(tutorialAt('13:50', ['chatgpt-edu'])).toEqual({
      result: 'none',
      reason: 'no-quests',
      leftOut: [],
      online: ['ChatGPT Edu 무료로 쓰기'],
    });
  });

  it('is found when where the User sets out from is not known', () => {
    expect(tutorialAt('09:00', BOARD_Q10)).toMatchObject({ result: 'none', reason: 'no-start' });
  });
});
