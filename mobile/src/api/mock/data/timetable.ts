/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { TimetableClass } from '@/api/types';

// The `Profile` frame's four classes, in the order of their first time in the week.
export const CLASSES: TimetableClass[] = [
  {
    id: 'class-os',
    courseName: '운영체제',
    times: [
      { id: 'os-1', weekday: 'monday', startTime: '10:30', endTime: '12:00', placeId: 'place-301', room: null },
      { id: 'os-2', weekday: 'wednesday', startTime: '10:30', endTime: '12:00', placeId: 'place-301', room: null },
    ],
    overlaps: [],
  },
  {
    id: 'class-algorithms',
    courseName: '알고리즘',
    times: [
      { id: 'al-1', weekday: 'tuesday', startTime: '09:30', endTime: '11:00', placeId: 'place-302', room: '208호' },
      { id: 'al-2', weekday: 'thursday', startTime: '09:30', endTime: '11:00', placeId: 'place-302', room: '208호' },
    ],
    overlaps: [],
  },
  {
    id: 'class-statistics',
    courseName: '확률통계',
    times: [{ id: 'st-1', weekday: 'tuesday', startTime: '15:30', endTime: '17:00', placeId: 'place-500', room: null }],
    overlaps: [],
  },
  {
    id: 'class-data-structures',
    courseName: '자료구조',
    times: [
      { id: 'ds-1', weekday: 'wednesday', startTime: '14:00', endTime: '15:15', placeId: 'place-301', room: '118호' },
      { id: 'ds-2', weekday: 'friday', startTime: '14:00', endTime: '15:15', placeId: 'place-301', room: '118호' },
    ],
    overlaps: [],
  },
];
