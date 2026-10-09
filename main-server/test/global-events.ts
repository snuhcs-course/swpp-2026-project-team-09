// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #30
// Post numbers after `first`, one per call. Each test file takes numbers of its own, because the files share the
// database and a post is stored once.
export function postNumbersFrom(first: number): () => number {
  let next = first;
  return (): number => {
    next += 1;
    return next;
  };
}

// A post as the worker reads it, with `changes` applied: a time from the body's time line and a place in 132동.
export function collectedEvent(postNumber: number, changes: object = {}): Record<string, unknown> {
  return {
    postNumber,
    sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    title: '[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내',
    description: '- 일시: 2026. 10. 13.(화) 17:00\n- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)',
    start: '2026-10-13T17:00:00+09:00',
    end: null,
    readFrom: 'body',
    place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
    ...changes,
  };
}

// An events message of the worker, with `changes` applied.
export function eventsMessage(events: object[], changes: object = {}): object {
  return { source: 'snu_events', collectedAt: '2026-10-02T06:00:00+09:00', failureReason: null, events, ...changes };
}

// A time no stored message carries, so that a success recorded for a refused message would be seen.
const refusedAt = { collectedAt: '2026-10-31T06:00:00+09:00' };

// The post `valid`, then the post `other` with `changes`, so that storing nothing is seen.
function secondChanged(valid: number, other: number, changes: object): object {
  return eventsMessage([collectedEvent(valid), collectedEvent(other, changes)], refusedAt);
}

// The problem, the message for two posts of the test's own and what the answer names.
export const invalidEventsMessages: [string, (valid: number, other: number) => object, string][] = [
  [
    'a start that is neither a time nor a day',
    (valid, other) => secondChanged(valid, other, { start: '10. 13.(화) 17:00' }),
    'events.1.start: ',
  ],
  [
    'a time without its offset',
    (valid, other) => secondChanged(valid, other, { end: '2026-10-13T19:00:00' }),
    'events.1.end: ',
  ],
  [
    'a source other than the time line or the header',
    (valid, other) => secondChanged(valid, other, { readFrom: 'title' }),
    'events.1.readFrom: ',
  ],
  [
    'a source link that is not an https address',
    (valid, other) => secondChanged(valid, other, { sourceUrl: 'javascript:alert(1)' }),
    'events.1.sourceUrl: ',
  ],
  [
    'a post number that is not a number',
    (valid, other) => secondChanged(valid, other, { postNumber: String(other) }),
    'events.1.postNumber: ',
  ],
  [
    'a field the schema does not know',
    (valid, other) => secondChanged(valid, other, { poster: 'poster.jpg' }),
    'events.1: ',
  ],
  [
    'the same post twice',
    (valid) => eventsMessage([collectedEvent(valid), collectedEvent(valid)], refusedAt),
    'events: Each post must appear once',
  ],
  [
    'no word on whether the Collection finished',
    (valid) => eventsMessage([collectedEvent(valid)], { ...refusedAt, failureReason: undefined }),
    'failureReason: ',
  ],
  [
    'a Source that has no events',
    (valid) => eventsMessage([collectedEvent(valid)], { ...refusedAt, source: 'coop_menus' }),
    'source: ',
  ],
];

// Each place and the position of the Place it names. A name alone needs the university's name beside it.
export const placesNamingAPlace: [string, string, { latitude: number; longitude: number }][] = [
  // 종합운동장 has no number.
  ['by name', '서울대학교 종합운동장', { latitude: 37.464779176159, longitude: 126.95009153903 }],
  // 유전공학연구소 is 105동, and 유전공학연구소 신관 105-2동.
  [
    'by the longer of two names',
    '서울대학교 유전공학연구소 신관 2층',
    { latitude: 37.4540404461522, longitude: 126.95336213875 },
  ],
  // 자하연 is a place of its own, and 자하연식당 is 109동.
  ['by a whole name, not one inside it', '서울대 자하연식당 2층', { latitude: 37.46098, longitude: 126.95252 }],
  // OpenStreetMap names 901동 "901".
  [
    'by name, not by a name that is a number',
    '서울대학교 글로벌공학교육센터 강의실 901',
    { latitude: 37.4549, longitude: 126.95062 },
  ],
  // The campus map writes 중앙도서관 관정관, 62-1동.
  ['by name, whatever its spacing', '서울대학교 중앙도서관관정관 6층', { latitude: 37.45903, longitude: 126.95247 }],
  // The campus map writes SK경영관, 58동.
  ['by name, whatever the case', 'SNU sk경영관 B101호', { latitude: 37.46568, longitude: 126.95203 }],
  // 미술관, 151동.
  [
    "by name, with the university's name written onto it",
    '서울대학교미술관 2~3F 전시실',
    { latitude: 37.4665, longitude: 126.94969 },
  ],
  // The campus map writes 버들골 풍산마당, 100동.
  [
    'by name, with a dot between its words',
    '관악캠퍼스 버들골·풍산마당 등',
    { latitude: 37.4584786551623, longitude: 126.955227154786 },
  ],
  // 제2공학관, 302동.
  ["by its number, with the university's name", '서울대학교 302동 105호', { latitude: 37.44887, longitude: 126.95265 }],
  // Seven Places are named (관악사)학부 생활관, 919동 among them.
  [
    'by its number, beside a name it agrees with',
    '(관악사)학부 생활관 919동',
    { latitude: 37.46306, longitude: 126.95872 },
  ],
  // 140-2동 is 국제회의동, of the series 국제대학원 (140동) and 국제대학원2 (140-1동).
  [
    'by its number, beside the name of its series',
    '서울대학교 국제대학원(140-2동) 4층 국제회의실',
    { latitude: 37.46448, longitude: 126.95497 },
  ],
  // 규장각한국학연구원, 103동.
  [
    'in person, beside an online room',
    '서울대학교 규장각한국학연구원(103동) 444호 & Zoom 온라인 회의실',
    { latitude: 37.46226, longitude: 126.95028 },
  ],
];

// Each place that names no Place for certain, so that its event waits as a Draft.
export const placesNamingNoPlace: [string, string][] = [
  // Not 1동, 인문관1.
  ['a number that is part of a word, as in an address', '서울대학교 앞 봉천1동 주민센터'],
  // Not 박물관, 70동, nor 행정관, 60동.
  ['a name that ends a word', '서울대학교 국립중앙박물관 대강당'],
  ['a name that begins a word', '서울대학교 행정관리팀 사무실'],
  // Not 행정관, 60동, nor 1동.
  ['a building of another campus by name', '서울대학교 연건캠퍼스 의과대학 행정관'],
  ['a building of another campus by number', '서울대학교 연건캠퍼스 1동 강의실'],
  // Not 체육관, 71동: another university has one too.
  ["a name without the university's", '체육관 2층'],
  // Not 75동: a government complex numbers its buildings too.
  ["a number without the university's or its Place's name", '75동 1층 역사기록관'],
  ['another university', '연세대학교 학생회관(63동)'],
  ['an address in another district', '서울 은평구 학생회관(63동)'],
  ['a station named after the university', '서울대입구역 3번 출구 OO빌딩 2동'],
  ['a flat', '서울대학교 앞 OO아파트 101동'],
  ["the university's hospital", '서울대학교병원 체육관'],
  ["one of the university's schools", '서울대학교 사범대학 부설고등학교 체육관'],
  // 국제대학원 is 140동, and 국제대학원2 140-1동.
  ['the name of a series of Places', '서울대학교 국제대학원 국제회의실'],
  ['a name the list does not hold beside one it does', '서울대학교 종합운동장, 보조운동장'],
  ['a number the list does not hold beside one it does', '서울대학교 302동 및 999동'],
  ['two Places', '서울대학교 301동 및 302동'],
  // 학생회관 is 63동.
  ['a number and the name of another Place', '서울대학교 302동 학생회관'],
  ['a route', '학생회관(63동) 앞 → 관악산 정상'],
];
