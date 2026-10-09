/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Place } from '@/api/types';

function place(number: string, name: string, latitude: number, longitude: number): Place {
  return { id: `place-${number}`, number, name, latitude, longitude };
}

// The Places of the mock's classes and restaurants, at the campus map's points, in the main server's order: by number,
// then those without one.
export const PLACES: Place[] = [
  place('63', '학생회관', 37.45932, 126.95058),
  place('74', '예술복합연구동', 37.46193, 126.95312),
  place('75-1', '제3학생식당', 37.45647, 126.94851),
  place('85', '수의과대학', 37.46744, 126.95365),
  place('109', '자하연식당', 37.46098, 126.95252),
  place('113', '동원생활관', 37.46504, 126.95175),
  place('301', '제1공학관', 37.45016, 126.95259),
  place('302', '제2공학관', 37.44887, 126.95265),
  place('500', '대학원연구동(2단계)', 37.45922, 126.94812),
  place('901', '901', 37.4619595, 126.9577853),
  place('919', '(관악사)학부 생활관', 37.46306, 126.95872),
  { id: 'place-jahayeon', number: null, name: '자하연', latitude: 37.4607, longitude: 126.9521 },
];
