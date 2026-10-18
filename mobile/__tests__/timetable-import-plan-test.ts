/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { lesson, read } from './support/timetable-import';
import { importPlan } from '@/features/timetable-ocr/import-plan';

// What an import makes of a reading: the main server's rules, the cut to 15 and the version's name (P13-04).

describe('the import plan', () => {
  it('sorts by day and start before cutting to 15, and keeps a room without a building', () => {
    const classes = [
      lesson('late', 'friday', '09:00', '10:00'),
      ...Array.from({ length: 15 }, (_, index) => lesson(`m${index}`, 'monday', `${10 + (index % 9)}:00`, '19:00')),
      {
        name: 'room',
        times: [{ weekday: 'monday' as const, start: '08:00', end: '09:00', room: '311', placeId: null }],
      },
    ];
    const plan = importPlan(read(' 아주 긴 시간표 이름이 스무 글자를 넘어가요 ', classes, 1), 3);

    expect(plan?.cut).toBe(true);
    expect(plan?.leftOut).toBe(1);
    expect(plan?.classes).toHaveLength(15);
    expect(plan?.classes[0]).toEqual({
      courseName: 'room',
      times: [{ weekday: 'monday', startTime: '08:00', endTime: '09:00', placeId: null, room: '311' }],
    });
    expect(plan?.classes.map(({ courseName }) => courseName)).not.toContain('late');
    expect(plan?.name).toBe('아주 긴 시간표 이름이 스무 글자를 넘어가요'.slice(0, 20));
  });

  it('checks the main server’s rules before the cut, so that a later valid class fills in', () => {
    const broken = Array.from({ length: 3 }, (_, index) => lesson('', 'monday', `0${index + 7}:00`, '09:00'));
    const valid = Array.from({ length: 15 }, (_, index) =>
      lesson(`v${index}`, 'tuesday', `${String(index + 8).padStart(2, '0')}:00`, '23:00'),
    );
    const plan = importPlan(read(null, [...broken, ...valid]), 1);

    expect(plan?.classes).toHaveLength(15);
    expect(plan?.cut).toBe(false);
    expect(plan?.leftOut).toBe(3);
  });

  it('names 새 시간표 N without a title, and plans nothing without classes', () => {
    expect(importPlan(read('   ', [lesson('a', 'monday', '09:00', '10:00')]), 3)?.name).toBe('새 시간표 4');
    expect(importPlan(read('x', []), 3)).toBeNull();
    expect(importPlan({ kind: 'none', reason: 'no-hours' }, 3)).toBeNull();
  });
});
