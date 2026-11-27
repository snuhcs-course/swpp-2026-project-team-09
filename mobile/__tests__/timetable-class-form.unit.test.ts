/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ClassTime, Place, TimetableClass, Weekday } from '@/api/types';
import {
  type ClassDraft,
  draftOf,
  EMPTY_SLOT,
  isReady,
  saveOf,
  slotCrossesAnother,
  slotName,
  type SlotDraft,
  withoutSlot,
} from '@/features/timetable/class-form';

// The class form's time slots (P06-11): how a class opens as slots, how slots are saved, and when they are ready.

const P302: Place = { id: 'p302', number: '302', name: '제2공학관', latitude: 0, longitude: 0 };

function time(weekday: Weekday, startTime: string, endTime: string, placeId: string | null = null): ClassTime {
  return { id: `${weekday}-${startTime}`, weekday, startTime, endTime, placeId, room: null };
}

function slot(changed: Partial<SlotDraft>): SlotDraft {
  return { ...EMPTY_SLOT, ...changed };
}

function draft(...slots: SlotDraft[]): ClassDraft {
  return { name: '선형대수', slots };
}

describe('opening a class', () => {
  it('gives two slots for two sets of hours on one day', () => {
    const lesson: TimetableClass = {
      id: 'c1',
      courseName: '선형대수',
      times: [time('wednesday', '19:00', '20:45'), time('wednesday', '15:30', '16:45')],
      overlaps: [],
    };

    expect(draftOf(lesson, []).slots.map((each) => slotName(each, 0))).toEqual(['수 15:30–16:45', '수 19:00–20:45']);
  });

  it('gives a slot per set of hours and Place, in the week’s order, the later one checked when it shares the Place', () => {
    const lesson: TimetableClass = {
      id: 'c1',
      courseName: '선형대수',
      times: [
        time('wednesday', '15:30', '16:45', 'p302'),
        time('monday', '13:00', '14:30', 'p302'),
        time('friday', '13:00', '14:30', 'p302'),
      ],
      overlaps: [],
    };

    const opened = draftOf(lesson, [P302]);

    expect(opened.slots.map((each) => slotName(each, 0))).toEqual(['월·금 13:00–14:30', '수 15:30–16:45']);
    expect(opened.slots.map(({ same }) => same)).toEqual([false, true]);
  });
});

describe('saving', () => {
  it('saves each slot’s days at its own hours, a checked slot at the first’s Place', () => {
    const saved = saveOf(
      draft(
        slot({ days: [0], start: '13:00', end: '14:30', place: P302, room: '118호' }),
        slot({ days: [2], start: '15:30', end: '16:45', same: true }),
      ),
    );

    expect(saved.times).toEqual([
      { weekday: 'monday', startTime: '13:00', endTime: '14:30', placeId: 'p302', room: '118호' },
      { weekday: 'wednesday', startTime: '15:30', endTime: '16:45', placeId: 'p302', room: '118호' },
    ]);
  });

  it('saves two slots on one day as two times of that day, in the order of their hours (P06 ticket 11a)', () => {
    const saved = saveOf(
      draft(slot({ days: [2], start: '19:00', end: '20:45' }), slot({ days: [2], start: '15:30', end: '16:45' })),
    );

    expect(saved.times.map(({ weekday, startTime }) => `${weekday} ${startTime}`)).toEqual([
      'wednesday 15:30',
      'wednesday 19:00',
    ]);
  });

  it('gives the next slot the first’s Place and room when the first is removed', () => {
    const left = withoutSlot(
      draft(
        slot({ days: [0], start: '13:00', end: '14:30', place: P302, room: '118호' }),
        slot({ days: [2], start: '15:30', end: '16:45', same: true }),
      ),
      0,
    );

    expect(left.slots).toEqual([slot({ days: [2], start: '15:30', end: '16:45', place: P302, room: '118호' })]);
  });
});

describe('ready to save', () => {
  it('is ready when every slot has a day and right hours', () => {
    expect(
      isReady(
        draft(slot({ days: [0], start: '13:00', end: '14:30' }), slot({ days: [2], start: '15:30', end: '16:45' })),
      ),
    ).toBe(true);
    expect(isReady(draft(slot({ days: [0], start: '13:00', end: '14:30' }), slot({ days: [2] })))).toBe(false);
  });

  it('is not ready while two slots cross on a day they share, as the main server refuses', () => {
    const crossing = draft(
      slot({ days: [0], start: '13:00', end: '14:30' }),
      slot({ days: [0], start: '14:00', end: '15:00' }),
    );
    const touching = draft(
      slot({ days: [0], start: '13:00', end: '14:00' }),
      slot({ days: [0], start: '14:00', end: '15:00' }),
    );

    expect(slotCrossesAnother(crossing, 1)).toBe(true);
    expect(isReady(crossing)).toBe(false);
    expect(slotCrossesAnother(touching, 1)).toBe(false);
    expect(isReady(touching)).toBe(true);
  });

  it('is ready with two slots on one day whose hours do not cross (P06 ticket 11a)', () => {
    const apart = draft(
      slot({ days: [2], start: '15:30', end: '16:45' }),
      slot({ days: [2], start: '19:00', end: '20:45' }),
    );

    expect(slotCrossesAnother(apart, 0)).toBe(false);
    expect(isReady(apart)).toBe(true);
  });
});
