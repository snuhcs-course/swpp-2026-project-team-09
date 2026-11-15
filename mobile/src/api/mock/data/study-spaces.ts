/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { StudyBuilding } from '@/api/study-types';
import type { Place } from '@/api/types';

// The 공부공간 layer as the main server serves it (`seed/study-spaces.json`), for a User of 국어국문학과 with no 소속:
// a building whose spaces are all usable (중앙도서관, 인문대 신양학술정보관), a mixed one (경영학도서관), one whose
// spaces are all restricted (제1공학관), and 관정관 with its seat sectors, as the catalogue gives them.

function place(number: string, name: string, latitude: number, longitude: number): Place {
  return { id: `place-${number}`, number, name, latitude, longitude };
}

function sector(
  id: string,
  name: string,
  { floor, roomNo, sectorNo }: { floor: number; roomNo: number; sectorNo: number },
  width: number,
): LibrarySpace {
  return {
    id,
    name,
    floor,
    placeNumber: '62-1',
    unit: 'seat',
    roomNo,
    sectorNo,
    seatNos: [],
    mapImage: { width, height: 1198 },
    hours: { open: '07:00', close: '23:00' },
    minMinutes: 30,
    maxMinutes: 360,
    stepMinutes: 30,
  };
}

// 관정관's seat sectors a User with no 소속 may book: every reading room but the 대학원 열람실.
export const KWANJEONG_SECTORS: LibrarySpace[] = [
  sector('7F-7A-zone1-notebook', '7A 열람실 1 구역(노트북존)', { floor: 7, roomNo: 172, sectorNo: 17201 }, 1190),
  sector('7F-7A-zone2', '7A 열람실 2 구역', { floor: 7, roomNo: 172, sectorNo: 17202 }, 2529),
  sector('7F-notebook-171', '노트북존', { floor: 7, roomNo: 171, sectorNo: 17101 }, 1987),
  sector('7F-7B-notebook', '7B 노트북존', { floor: 7, roomNo: 173, sectorNo: 17301 }, 1190),
  sector('8F-8A-zone1-quiet', '8A 열람실 1 구역(QUIET ZONE)', { floor: 8, roomNo: 182, sectorNo: 18201 }, 1190),
  sector('8F-8A-zone2-notebook', '8A 열람실 2 구역(노트북존)', { floor: 8, roomNo: 182, sectorNo: 18202 }, 2467),
  sector('8F-notebook-181', '노트북 존', { floor: 8, roomNo: 181, sectorNo: 18101 }, 1987),
];

// Added for a 대학원생.
export const GRADUATE_SECTOR = sector(
  '8F-grad-reading-room',
  '대학원 열람실',
  { floor: 8, roomNo: 183, sectorNo: 18301 },
  1190,
);

export const STUDY_BUILDINGS: StudyBuilding[] = [
  {
    place: place('62', '중앙도서관 본관', 37.4594, 126.95199),
    name: '중앙도서관',
    usable: true,
    liveSeats: null,
    spaces: [
      {
        key: 'central-library',
        name: '중앙도서관',
        kind: 'library',
        hours:
          '3A열람실 24시간 · 3B열람실 07:00–23:00 · 정보검색실·자료실 평일 09:00–21:00 · 토 10:00–17:00 · 일 13:00–17:00',
        link: 'https://lib.snu.ac.kr/about/hour-directions/hours/central/',
        usable: true,
        restrictedTo: null,
      },
    ],
  },
  {
    place: place('62-1', '중앙도서관 관정관', 37.45903, 126.95247),
    name: '관정관',
    usable: true,
    liveSeats: { sectors: KWANJEONG_SECTORS },
    spaces: [
      {
        key: 'kwanjeong',
        name: '관정관',
        kind: 'library',
        hours: '7A·7B·8A열람실 07:00–23:00 · 8B열람실 대학원생 전용 07:00–23:00 · 그룹스터디룸·정보검색실 09:00–23:00',
        link: 'https://lib.snu.ac.kr/about/hour-directions/',
        usable: true,
        restrictedTo: null,
      },
    ],
  },
  {
    place: place('58', 'SK경영관', 37.46568, 126.95203),
    name: '경영학도서관',
    usable: true,
    liveSeats: null,
    spaces: [
      {
        key: 'business-reading-room',
        name: '열람실',
        kind: 'reading',
        hours: '07:00–23:00',
        link: 'https://cba.snu.ac.kr/campus/library',
        usable: false,
        restrictedTo: '경영대학',
      },
      {
        key: 'business-free-seats',
        name: '자유열람석',
        kind: 'reading',
        hours: '07:00–23:00',
        link: 'https://cba.snu.ac.kr/campus/library',
        usable: true,
        restrictedTo: null,
      },
      {
        key: 'business-group-rooms',
        name: '그룹스터디룸·세미나실',
        kind: 'group',
        hours: null,
        link: 'https://ssims.snu.ac.kr',
        usable: false,
        restrictedTo: '경영대학',
      },
    ],
  },
  {
    place: place('301', '제1공학관', 37.45016, 126.95259),
    name: '제1공학관',
    usable: false,
    liveSeats: null,
    spaces: [
      {
        key: 'ece-haedong',
        name: '해동학술정보실',
        kind: 'reading',
        hours: '24시간',
        link: 'https://cse.snu.ac.kr/ko/about/facilities',
        usable: false,
        restrictedTo: '전기·정보공학부·컴퓨터공학부',
      },
      {
        key: 'me-haedong-study-hall',
        name: '기계공학부 해동스터디홀',
        kind: 'reading',
        hours: null,
        link: 'https://me.snu.ac.kr/%EC%98%88%EC%95%BD-%EB%B0%8F-%EC%8B%A0%EC%B2%AD/%EA%B7%B8%EB%A3%B9%EC%8A%A4%ED%84%B0%EB%94%94%EB%A3%B8/',
        usable: false,
        restrictedTo: '기계공학부',
      },
    ],
  },
  {
    place: place('4', '신양인문학술정보관', 37.46089, 126.95326),
    name: '인문대 신양학술정보관',
    usable: true,
    liveSeats: null,
    spaces: [
      {
        key: 'humanities-sinyang-lounge',
        name: '1층 라운지',
        kind: 'lounge',
        hours: null,
        link: 'https://humanities.snu.ac.kr/community/notice?md=v&bbsidx=2205',
        usable: true,
        restrictedTo: null,
      },
    ],
  },
];
