/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CardStep, gatheringOf } from '../src/plans/own-way.js';
import { at, item, walks } from './gathering-fixtures.js';
import { HAND, meetingThenMeal, step, wayOf } from './own-way-fixtures.js';

// The invitee's Merging Point, the destination step, and a late arrival, on small walking tables with values chosen by
// hand.

// O→M→P is 1 + 10 minutes; O→P straight is given.
const byMeeting = (straightSeconds: number): ReturnType<typeof walks> =>
  walks(['O', 'M', 60], ['M', 'P', 600], ['O', 'P', straightSeconds]);

describe('The Merging Point by the detour', () => {
  it('is taken when going by it is one minute longer', () => {
    expect(wayOf(meetingThenMeal(), [item('11:00', '11:50', 'O')], { ...HAND, travel: byMeeting(600) })).toMatchObject({
      leaveAt: '2026-11-17T11:59:00+09:00',
      walkMinutes: 11,
      arriveAt: '2026-11-17T12:10:00+09:00',
      meeting: { place: { placeId: 'M' }, at: '2026-11-17T12:00:00+09:00' },
    });
  });

  it('is left when going by it is two minutes longer', () => {
    expect(wayOf(meetingThenMeal(), [item('11:00', '11:50', 'O')], { ...HAND, travel: byMeeting(540) })).toMatchObject({
      leaveAt: '2026-11-17T12:01:00+09:00',
      walkMinutes: 9,
      meeting: null,
    });
  });
});

describe('The Merging Point by the time', () => {
  it('is taken by one who reaches it exactly at its start', () => {
    expect(wayOf(meetingThenMeal(), [item('11:00', '11:59', 'O')], { ...HAND, travel: byMeeting(600) })).toMatchObject({
      leaveAt: '2026-11-17T11:59:00+09:00',
      meeting: { at: '2026-11-17T12:00:00+09:00' },
    });
  });

  it('is left by one who would reach it a minute after its start, who goes straight and is in time', () => {
    expect(wayOf(meetingThenMeal(), [item('11:00', '12:00', 'O')], { ...HAND, travel: byMeeting(600) })).toMatchObject({
      leaveAt: '2026-11-17T12:00:00+09:00',
      walkMinutes: 10,
      arriveAt: '2026-11-17T12:10:00+09:00',
      meeting: null,
    });
  });

  it('is none for one whose way starts at the meeting Place', () => {
    const travel = walks(['M', 'P', 600]);

    expect(wayOf(meetingThenMeal(), [item('11:00', '11:50', 'M')], { ...HAND, travel })).toMatchObject({
      origin: { place: { placeId: 'M' } },
      leaveAt: '2026-11-17T12:00:00+09:00',
      walkMinutes: 10,
      meeting: null,
    });
  });
});

describe('The destination', () => {
  it('is a step that only ends where the next starts, which is no meeting step', () => {
    expect(gatheringOf(meetingThenMeal(), walks(['M', 'P', 300]))).toMatchObject({
      destination: { title: '유상, 민수: M관 앞에서 만나기' },
      meeting: null,
    });
  });

  it('is the meal once the meeting step has ended', () => {
    const [meeting, meal] = meetingThenMeal();
    const steps: CardStep[] = [{ ...meeting, ended: true }, meal];

    expect(gatheringOf(steps, walks(['M', 'P', 600]))).toMatchObject({
      destination: { title: 'P관에서 식사' },
      meeting: null,
    });
  });

  it('is none when no step ahead has a start and a Place of the list', () => {
    const steps = [step('어딘가', at('12:00'), null, null), step('언젠가', null, null, 'P')];

    expect(gatheringOf(steps, walks())).toBeNull();
  });
});

describe('Arriving late', () => {
  it('sets out when ready and says when they arrive, a minute after the start', () => {
    expect(wayOf(meetingThenMeal(), [item('11:00', '12:02', 'O')], { ...HAND, travel: byMeeting(540) })).toMatchObject({
      status: 'ok',
      leaveAt: '2026-11-17T12:02:00+09:00',
      walkMinutes: 9,
      arriveAt: '2026-11-17T12:11:00+09:00',
      lines: [
        [
          { text: '12:11에야 도착해요.', strong: true },
          { text: ' 걸어서 9분.', strong: false },
        ],
      ],
    });
  });
});
