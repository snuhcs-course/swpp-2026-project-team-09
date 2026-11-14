/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  answerOf,
  firstPlan,
  jieun,
  JIEUN,
  me,
  ME,
  minsu,
  MINSU,
  plain,
  point,
  position,
  strong,
  time,
  withBoth,
} from './meal-answers.js';
import { at, id, readWorld } from './worked-example.js';

// The words, the scene, and the band of the design's worked example: lunch for the asker, 민수, and 지은 on Tuesday
// 2026-11-17, asked at 11:50.

beforeAll(() => readWorld());

describe('Lunch with 민수 and 지은: the plan', () => {
  it('gives the conditions as chips: where the asker sets out, until when, and each Friend', () => {
    expect(withBoth().chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '13:00 수업까지', userId: null },
      { kind: 'person', text: '민수', userId: MINSU },
      { kind: 'person', text: '지은', userId: JIEUN },
    ]);
  });

  it('plans the Student Center first, 12:33 to 12:55, meeting 민수 at 301동 at 12:18', () => {
    expect(firstPlan(withBoth())).toMatchObject({
      id: '학생회관식당',
      title: '학생회관식당에서 점심',
      place: point('학생회관', '학생회관식당'),
      startAt: time('12:33'),
      endAt: time('12:55'),
      togetherMinutes: 22,
      meeting: { place: point('제1공학관', '301동'), at: time('12:18'), userIds: [ME, MINSU] },
    });
  });

  it('gives the Sub Quests of the Quest: the meeting, then the meal', () => {
    expect(firstPlan(withBoth()).subQuests).toEqual([
      { at: time('12:18'), placeId: id('제1공학관'), title: '유상, 민수: 301동 앞에서 만나기' },
      { at: time('12:33'), placeId: id('학생회관'), title: '학생회관식당에서 식사' },
    ]);
  });

  it('says when everyone is there and how much shorter the meal is than alone', () => {
    expect(firstPlan(withBoth()).lines).toEqual([
      [strong('12:33 학생회관식당')],
      [plain('같이 먹으면 식사가 33분 줄어요')],
    ]);
  });

  it('gives what the plan rests on, each Friend first, then the asker', () => {
    expect(firstPlan(withBoth()).basis).toEqual([
      '민수 12:15 302동 수업 끝 · 301동까지 걸어서 3분, 같이 15분',
      '지은 12:15 8동 수업 끝 · 학생회관식당까지 걸어서 5분 · 12:55에 나서요',
      '학생회관식당 → 24동 걸어서 1분, 그래서 12:59에 나서요',
    ]);
  });
});

describe("Lunch with 민수 and 지은: each person's part", () => {
  it("gives each person's part, everyone there at the start", () => {
    expect(firstPlan(withBoth()).parts).toEqual([
      {
        userId: ME,
        name: '유상',
        me: true,
        origin: { place: point('제1공학관', '301동'), basis: 'timetable' },
        leaveAt: time('12:18'),
        walkMinutes: 15,
        leaveBy: time('12:59'),
        next: { startAt: time('13:00'), place: point('자연과학관6', '24동') },
      },
      {
        userId: MINSU,
        name: '민수',
        me: false,
        origin: { place: point('제2공학관', '302동'), basis: 'timetable' },
        leaveAt: time('12:15'),
        walkMinutes: 18,
        leaveBy: null,
        next: null,
      },
      {
        userId: JIEUN,
        name: '지은',
        me: false,
        origin: { place: point('두산인문관', '8동'), basis: 'timetable' },
        leaveAt: time('12:28'),
        walkMinutes: 5,
        leaveBy: time('12:55'),
        next: { startAt: time('13:00'), place: point('두산인문관', '8동') },
      },
    ]);
  });
});

describe('Lunch with 민수 and 지은: the map', () => {
  it('draws each person at the Place of their Class', () => {
    expect(firstPlan(withBoth()).scene.people).toEqual([
      { userId: ME, name: '유상', me: true, at: position('제1공학관'), source: 'timetable', tag: '나 · 15분' },
      { userId: MINSU, name: '민수', me: false, at: position('제2공학관'), source: 'timetable', tag: '민수 · 18분' },
      { userId: JIEUN, name: '지은', me: false, at: position('두산인문관'), source: 'timetable', tag: '지은 · 5분' },
    ]);
  });

  it('draws the pick, the other candidates, the dropped places, the next Class, and the meeting', () => {
    expect(firstPlan(withBoth()).scene.places).toEqual([
      { place: point('학생회관', '학생회관식당'), role: 'pick', tag: '학생회관식당' },
      { place: point('자하연식당', '자하연식당'), role: 'candidate', tag: '자하연식당' },
      { place: point('제3학생식당', '3식당'), role: 'candidate', tag: '3식당' },
      { place: point('제1공학관', '301동식당'), role: 'dropped', tag: '301동식당 · 지은은 13분밖에 못 있어요' },
      { place: point('제2공학관', '302동식당'), role: 'dropped', tag: '302동식당 · 지은은 8분밖에 못 있어요' },
      { place: point('자연과학관6', '24동'), role: 'next', tag: '13:00 수업 · 24동' },
      { place: point('제1공학관', '301동'), role: 'meeting', tag: null },
    ]);
  });

  it("draws 민수's way to the meeting, the asker's on from there, 지은's own, and the asker's to the next Class", () => {
    expect(firstPlan(withBoth()).scene.routes).toEqual([
      { userId: MINSU, role: 'friend', from: position('제2공학관'), to: position('제1공학관'), minutes: 3 },
      { userId: ME, role: 'me', from: position('제1공학관'), to: position('학생회관'), minutes: 15 },
      { userId: JIEUN, role: 'friend', from: position('두산인문관'), to: position('학생회관'), minutes: 5 },
      { userId: ME, role: 'next', from: position('학생회관'), to: position('자연과학관6'), minutes: 1 },
    ]);
  });

  it('flags the meal at the place and the meeting at 301동', () => {
    expect(firstPlan(withBoth()).scene.flags).toEqual([
      { at: position('학생회관'), text: '12:33 점심', role: 'place' },
      { at: position('제1공학관'), text: '12:18 민수와 만남', role: 'meeting' },
    ]);
  });
});

describe('Lunch with 민수 and 지은: the time band and the other places', () => {
  it("gives a time band from 11:30 to 13:30 with each person's busy time in it", () => {
    expect(firstPlan(withBoth()).band).toEqual({
      range: { startAt: time('11:30'), endAt: time('13:30') },
      now: time('11:50'),
      lanes: [
        {
          userId: ME,
          name: '나',
          busy: [
            { startAt: time('11:30'), endAt: time('11:50') },
            { startAt: time('13:00'), endAt: time('13:30') },
          ],
        },
        { userId: MINSU, name: '민수', busy: [{ startAt: time('11:30'), endAt: time('12:15') }] },
        {
          userId: JIEUN,
          name: '지은',
          busy: [
            { startAt: time('11:30'), endAt: time('12:15') },
            { startAt: time('13:00'), endAt: time('13:30') },
          ],
        },
      ],
      startAt: time('12:33'),
      endAt: time('12:55'),
      text: '12:33–12:55 · 식사 22분',
    });
  });

  it('drops the two engineering Places, naming 지은, who could stay the shortest', () => {
    const { dropped, noPlan } = withBoth();

    expect(dropped).toEqual([
      { place: point('제1공학관', '301동식당'), reason: '지은은 13분밖에 못 있어요' },
      { place: point('제2공학관', '302동식당'), reason: '지은은 8분밖에 못 있어요' },
    ]);
    expect(noPlan).toBeNull();
  });

  it('plans the other places after the first, in order', () => {
    expect(withBoth().plans.map(({ id: key }) => key)).toEqual(['학생회관식당', '자하연식당', '3식당']);
  });
});

describe("The time band's range", () => {
  it('starts an hour before the plan when it is asked hours ahead, and still says the time now', () => {
    const plan = firstPlan(answerOf([me(), minsu(), jieun()], { now: at('09:00') }));

    expect(plan.startAt).toBe(time('12:33'));
    expect(plan.band.range).toEqual({ startAt: time('11:30'), endAt: time('13:30') });
    expect(plan.band.now).toBe(time('09:00'));
  });

  it('lies on the day of the plan when it is asked the day before', () => {
    const now = new Date('2026-11-16T20:00:00+09:00');

    const { band } = firstPlan(answerOf([me(), minsu(), jieun()], { now }));

    expect(band.range).toEqual({ startAt: time('11:30'), endAt: time('13:30') });
    expect(band.now).toBe('2026-11-16T20:00:00+09:00');
  });
});
