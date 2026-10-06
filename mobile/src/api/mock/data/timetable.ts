import type { Place, TimetableClass } from '@/api/types';

// The Places the mock's classes are held in, in the main server's order: by number, then those without one.
export const PLACES: Place[] = [
  { id: 'place-301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 },
  { id: 'place-302', number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 },
  { id: 'place-500', number: '500', name: '대학원연구동(2단계)', latitude: 37.45922, longitude: 126.94812 },
  { id: 'place-jahayeon', number: null, name: '자하연', latitude: 37.4607, longitude: 126.9521 },
];

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
