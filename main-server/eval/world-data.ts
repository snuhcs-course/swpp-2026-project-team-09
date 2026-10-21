/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// What the benchmark's fixed world holds (eval/world.ts seeds it), by seed name. The cases refer to these names, so the
// data and the cases change together.

// The User every case asks as.
export const ASKER = { name: '김하늘', department: '컴퓨터공학부' };

// The asker's Friends by seed name. Two hold 민수, and two are both named 박서준, told apart only by their departments.
export const FRIENDS: Record<string, { name: string; department: string }> = {
  이민수: { name: '이민수', department: '경제학부' },
  김민수: { name: '김민수', department: '기계공학부' },
  김지은: { name: '김지은', department: '컴퓨터공학부' },
  '박서준 (경영학과)': { name: '박서준', department: '경영학과' },
  '박서준 (물리천문학부)': { name: '박서준', department: '물리천문학부' },
};

// The Places of the shared seed the cases name, by seed name: 학생회관 is 63동, 제1공학관 is 301동.
export const PLACES: Record<string, { name: string; number: string }> = {
  학생회관: { name: '학생회관', number: '63' },
  제1공학관: { name: '제1공학관', number: '301' },
};

const line = (meal: string, name: string, price: number): object => ({
  meal,
  text: `${name} : ${price.toLocaleString('en-US')}원`,
  kind: 'dish',
  name,
  price,
});

// 자하연식당 serves no breakfast and nothing on 10-22's dinner; 학생회관식당 serves every meal of both days.
export const MENUS = [
  {
    date: '2026-10-21',
    restaurants: [
      {
        name: '학생회관식당',
        lines: [line('breakfast', '김치볶음밥', 2000), line('lunch', '제육볶음', 6000), line('dinner', '돈까스', 5500)],
      },
      { name: '자하연식당', lines: [line('lunch', '비빔밥', 6500), line('dinner', '순두부찌개', 6000)] },
    ],
  },
  {
    date: '2026-10-22',
    restaurants: [
      {
        name: '학생회관식당',
        lines: [
          line('breakfast', '토스트', 2000),
          line('lunch', '닭갈비덮밥', 6000),
          line('dinner', '카레라이스', 5000),
        ],
      },
      { name: '자하연식당', lines: [line('lunch', '김치찌개', 6500)] },
    ],
  },
];

export const at = (koreaTime: string): Date => new Date(`${koreaTime}+09:00`);

// The published Global Events by seed name, their title. None takes place on 2026-10-23, the day of the "no data" cases.
export const GLOBAL_EVENTS: Record<string, { description: string; startsAt: string; endsAt: string; place: string }> = {
  // Ended the day before the run.
  '취업 박람회': {
    description: '기업 30곳이 참여하는 가을 취업 박람회입니다.',
    startsAt: '2026-10-20T13:00:00',
    endsAt: '2026-10-20T17:00:00',
    place: '학생회관(63동) 라운지',
  },
  // Through today: an exhibition still on.
  '미술대학 졸업 전시': {
    description: '미술대학 졸업 작품 전시회입니다. 회화, 조소, 디자인 작품을 전시합니다.',
    startsAt: '2026-10-20T10:00:00',
    endsAt: '2026-10-22T18:00:00',
    place: '서울대학교미술관(151동) 전시실',
  },
  'AI 시대의 진로 특강': {
    description: '인공지능 시대의 진로를 주제로 한 초청 강연입니다. 연사: 졸업생 개발자.',
    startsAt: '2026-10-21T18:00:00',
    endsAt: '2026-10-21T20:00:00',
    place: '제1공학관(301동) 118호',
  },
  '가을 재즈 콘서트': {
    description: '교내 재즈 동아리의 가을 정기 공연입니다.',
    startsAt: '2026-10-22T19:00:00',
    endsAt: '2026-10-22T21:00:00',
    place: '문화관(73동) 중강당',
  },
  '관악 가을 축제': {
    description: '이틀 동안 열리는 가을 축제입니다. 푸드트럭과 동아리 부스가 열립니다.',
    startsAt: '2026-10-24T12:00:00',
    endsAt: '2026-10-25T22:00:00',
    place: '버들골 풍산마당',
  },
  // A second title holding 축제, so that the words 축제 name two events.
  '축제 개막 공연': {
    description: '관악 가을 축제의 개막 무대입니다. 초청 가수 공연이 있습니다.',
    startsAt: '2026-10-24T18:00:00',
    endsAt: '2026-10-24T20:00:00',
    place: '버들골 풍산마당 특설무대',
  },
  '총장배 농구 대회': {
    description: '학과 대항 농구 대회입니다. 누구나 응원하러 올 수 있습니다.',
    startsAt: '2026-10-25T10:00:00',
    endsAt: '2026-10-25T17:00:00',
    place: '종합운동장',
  },
};

// A 파티 of the User's own Board, led by someone who is no Friend of the asker: its title is its seed name.
export interface QuestSeed {
  board: 'meal' | 'career' | 'hobby' | 'show';
  joinPolicy: 'open' | 'approval';
  capacity: number;
  description: string;
  // Its one meeting, in Korea; one before the run's clock has ended, and the Boards leave it out.
  startsAt?: string;
  // Where it meets: a Place of PLACES, or words alone.
  place?: { seed: string } | { label: string };
  // Going to this Global Event, at its start.
  globalEvent?: string;
  // Joined by another User to its capacity.
  full?: boolean;
}

export const QUESTS: Record<string, QuestSeed> = {
  '저녁 농구 한 판': {
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 6,
    description: '농구 같이 하실 분 구해요. 실력 상관없어요.',
    startsAt: '2026-10-22T19:00:00',
    place: { label: '종합운동장 농구장' },
  },
  '주말 배드민턴': {
    board: 'hobby',
    joinPolicy: 'approval',
    capacity: 4,
    description: '토요일 오전 배드민턴 복식 칠 분 모집합니다. 운동 좋아하시는 분 환영!',
    startsAt: '2026-10-24T10:00:00',
    place: { label: '포스코스포츠센터 체육관' },
  },
  '아침 러닝 크루': {
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 2,
    description: '아침에 캠퍼스 한 바퀴 같이 뛰어요.',
    startsAt: '2026-10-22T07:00:00',
    place: { label: '정문' },
    full: true,
  },
  '보드게임 모임': {
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 5,
    description: '보드게임 카페에서 같이 놀아요.',
    startsAt: '2026-10-24T19:00:00',
    place: { label: '녹두거리 보드게임 카페' },
  },
  '내일 점심 학식 같이': {
    board: 'meal',
    joinPolicy: 'open',
    capacity: 4,
    description: '학생회관식당에서 같이 점심 먹어요.',
    startsAt: '2026-10-22T12:00:00',
    place: { seed: '학생회관' },
  },
  '오늘 저녁 고기 먹을 사람': {
    board: 'meal',
    joinPolicy: 'open',
    capacity: 4,
    description: '녹두에서 삼겹살 먹어요.',
    startsAt: '2026-10-21T18:30:00',
    place: { label: '녹두거리' },
  },
  // Ended the day before the run.
  '어제 점심 번개': {
    board: 'meal',
    joinPolicy: 'open',
    capacity: 3,
    description: '어제 점심 같이 먹을 사람.',
    startsAt: '2026-10-20T12:00:00',
    place: { seed: '학생회관' },
  },
  '알고리즘 스터디': {
    board: 'career',
    joinPolicy: 'approval',
    capacity: 5,
    description: '코딩 테스트 대비 알고리즘 스터디입니다. 매주 토요일 저녁에 모여요.',
    startsAt: '2026-10-24T20:00:00',
    place: { seed: '제1공학관' },
  },
  '토익 스터디': {
    board: 'career',
    joinPolicy: 'open',
    capacity: 4,
    description: '토익 900점 목표 스터디원 구합니다.',
    startsAt: '2026-10-26T19:00:00',
    place: { label: '중앙도서관 스터디룸' },
  },
  '재즈 콘서트 같이 가요': {
    board: 'show',
    joinPolicy: 'open',
    capacity: 4,
    description: '재즈 좋아하시는 분 같이 들으러 가요.',
    globalEvent: '가을 재즈 콘서트',
  },
  '축제 같이 즐겨요': {
    board: 'show',
    joinPolicy: 'open',
    capacity: 6,
    description: '축제 푸드트럭 돌면서 같이 놀아요.',
    globalEvent: '관악 가을 축제',
  },
};

// The two vehicles the operator reports, at 정문 and at 301동 on the route page's drawing (test/shuttle.ts).
export const VEHICLES = [
  { carId: '4522', x: 157, y: 40 },
  { carId: '4531', x: 157, y: 398 },
];

// Collected just before the run's clock, so that the answer reads as now.
export const VEHICLES_COLLECTED_AT = '2026-10-21T14:04:45+09:00';
