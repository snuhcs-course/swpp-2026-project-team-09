/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Plan, type PlanStudy, type StudySpot } from '../../src/assistant/dto/answer.dto.js';

// A whole study answer (P10 ticket 02), as P10 ticket 03 will make it: "공부할 자리 있어?" on Wednesday 2026-11-04 at
// 19:10, the User at 301동 with nothing after it that day, so each stay runs to the space's closing, or three hours when
// its hours are not known. The app session builds its mock from it. The known-open buildings first, the longest stay
// first: 법학도서관 (to 01:00), 공대 신양학술정보관 (24 hours in term), 관정관 (bookable, to 23:00); then 인문대
// 신양학술정보관, whose hours are not known. 경영학도서관's 열람실 is dropped as the 경영대학's; 사회과학도서관 has been
// closed since 18:00.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const DAY = '2026-11-04';
const at = (clock: string): string => `${DAY}T${clock}:00+09:00`;

const point = (placeId: string, label: string, latitude: number, longitude: number): Plan['place'] => ({
  placeId,
  label,
  latitude,
  longitude,
});

const ORIGIN = point('6f1b2c3d-0000-4000-8000-000000000301', '301동', 37.4501, 126.9524);
const SINYANG_ENG = point('6f1b2c3d-0000-4000-8000-000000000441', '공대 신양학술정보관', 37.4504, 126.9529);
const KWANJEONG = point('6f1b2c3d-0000-4000-8000-000000000621', '관정관', 37.4594, 126.9502);
const LAW = point('6f1b2c3d-0000-4000-8000-000000000072', '법학도서관', 37.4615, 126.9512);
const SINYANG_HUM = point('6f1b2c3d-0000-4000-8000-000000000004', '인문대 신양학술정보관', 37.4601, 126.9531);

const spot = (
  key: string,
  name: string,
  kind: StudySpot['kind'],
  hours: string | null,
  closesAt: string | null,
): StudySpot => ({
  key,
  name,
  kind,
  hours,
  open: hours === null ? 'unknown' : 'open',
  closesAt,
});

interface Building {
  place: Plan['place'];
  walk: number;
  // The stay's end, Korea time with the offset.
  endAt: string;
  study: PlanStudy;
  lines: Plan['lines'];
}

// A Plan of one building: the User's arrival after the walk, the stay to its end, the first the pick and the others
// numbered candidates, as the list and the map number them.
function planOf({ place, walk, endAt, study, lines }: Building, number: number): Plan {
  const arrival = at(`19:${String(10 + walk).padStart(2, '0')}`);
  return {
    id: place.label,
    title: `${place.label}에서 공부`,
    place,
    startAt: arrival,
    endAt,
    togetherMinutes: Math.round((Date.parse(endAt) - Date.parse(arrival)) / 60_000),
    meeting: null,
    parts: [
      {
        userId: ME,
        name: '나',
        me: true,
        origin: { place: ORIGIN, basis: 'location' },
        leaveAt: at('19:10'),
        walkMinutes: walk,
        leaveBy: null,
        next: null,
      },
    ],
    subQuests: [],
    lines,
    basis: study.spaces.map(({ name, hours }) => `${name}: ${hours ?? '여는 시간 정보 없음'}`),
    scene: {
      people: [],
      places: [{ place, role: number === 1 ? 'pick' : 'candidate', tag: place.label }],
      routes: [{ userId: ME, role: 'me', from: ORIGIN, to: place, minutes: walk }],
      flags: [],
    },
    band: {
      range: { startAt: at('19:00'), endAt },
      now: at('19:10'),
      lanes: [],
      startAt: arrival,
      endAt,
      text: `${arrival.slice(11, 16)}–${endAt.slice(11, 16)}`,
    },
    study,
  };
}

const BUILDINGS: Building[] = [
  {
    place: LAW,
    walk: 16,
    endAt: '2026-11-05T01:00:00+09:00',
    lines: [
      [
        { text: '열람실', strong: true },
        { text: ' · 01:00까지', strong: false },
      ],
    ],
    study: { spaces: [spot('law-reading', '열람실', 'reading', '06:00–01:00', '01:00')], book: null, liveSeats: null },
  },
  {
    place: SINYANG_ENG,
    walk: 2,
    endAt: '2026-11-05T00:00:00+09:00',
    lines: [
      [
        { text: '3층 자유열람실', strong: true },
        { text: ' · 학기 중 24시간', strong: false },
      ],
    ],
    study: {
      spaces: [spot('sinyang-eng-free', '3층 자유열람실', 'reading', '학기 중 24시간 · 방학 08:00–24:00', '24:00')],
      book: null,
      liveSeats: null,
    },
  },
  {
    place: KWANJEONG,
    walk: 14,
    endAt: at('23:00'),
    lines: [
      [
        { text: '7층 열람실', strong: true },
        { text: ' · 23:00까지', strong: false },
      ],
    ],
    study: {
      spaces: [spot('kwanjeong', '관정관', 'reading', '7A·7B·8A열람실 07:00–23:00', '23:00')],
      book: { spaceId: '7F-7A-zone2' },
      liveSeats: 'kwanjeong',
    },
  },
  {
    place: SINYANG_HUM,
    walk: 15,
    endAt: at('22:25'),
    lines: [[{ text: '1층 라운지', strong: true }], [{ text: '여는 시간을 몰라요', strong: false }]],
    study: { spaces: [spot('sinyang-hum-lounge', '1층 라운지', 'lounge', null, null)], book: null, liveSeats: null },
  },
];

export const STUDY_ANSWER: AnswerReply = {
  input: {
    kind: 'study',
    date: DAY,
    what: 'any',
    people: [{ userId: ME, constraints: [] }],
    window: { from: null, until: null },
    area: null,
  },
  chips: [
    { kind: 'origin', text: '301동에서', userId: null },
    { kind: 'what', text: '공부할 곳', userId: null },
  ],
  plans: BUILDINGS.map((building, index) => planOf(building, index + 1)),
  dropped: [
    {
      place: point('6f1b2c3d-0000-4000-8000-000000000058', '경영학도서관', 37.4621, 126.9476),
      reason: '경영대학 학생만 쓸 수 있어요',
    },
  ],
  closed: [
    {
      place: point('6f1b2c3d-0000-4000-8000-000000000016', '사회과학도서관', 37.4622, 126.9499),
      notices: ['오늘 18:00에 닫았어요'],
    },
  ],
  noPlan: null,
  choosable: true,
};
