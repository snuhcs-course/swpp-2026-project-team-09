/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';

// The library cards the mock Assistant shows until the main server's library tools land (P06 ticket 07): in the
// shape of the `library` card the spec fixes, filled from the catalogue (`references/kwanjeong-spaces.yaml`).

export const READING_ROOM: LibrarySpace = {
  id: '7F-7A-zone2',
  name: '7A 열람실 2 구역',
  floor: 7,
  placeNumber: '62-1',
  unit: 'seat',
  roomNo: 172,
  sectorNo: 17202,
  seatNos: [],
  mapImage: { width: 2529, height: 1198 },
  hours: { open: '07:00', close: '23:00' },
  minMinutes: 30,
  maxMinutes: 360,
  stepMinutes: 30,
};

export const GROUP_ROOM: LibrarySpace = {
  id: '4F-group-6',
  name: '그룹스터디룸 6인실',
  floor: 4,
  placeNumber: '62-1',
  unit: 'room',
  roomNo: 141,
  sectorNo: 14103,
  seatNos: [],
  mapImage: null,
  hours: { open: '09:00', close: '23:00' },
  minMinutes: 30,
  maxMinutes: 180,
  stepMinutes: 30,
};

export const STUDIO: LibrarySpace = {
  id: '6F-studio',
  name: '창의미디어스페이스',
  floor: 6,
  placeNumber: '62-1',
  unit: 'room',
  roomNo: 162,
  sectorNo: 16201,
  seatNos: [],
  mapImage: null,
  hours: { open: '09:00', close: '17:00' },
  minMinutes: 30,
  maxMinutes: 180,
  stepMinutes: 30,
};

export const SEAT_NOTES = [
  '예약한 뒤 30분 안에 좌석배정기(키오스크)에서 확인해야 해요.',
  '한 달에 5번 확인하지 않거나 반납하지 않으면 10일 동안 예약할 수 없어요.',
];

export const ROOM_NOTES = [
  '예약 시간 1시간 안에 입실하지 않으면 취소돼요.',
  '7일 안에 3번 입실하지 않으면 3일 동안 예약할 수 없어요.',
];

export const STUDIO_NOTES = ['예약 시간에 6층 안내데스크에 신분증을 맡기고 열쇠를 받아 주세요.'];

export const STUDIO_PLEDGE =
  '퇴실 시 기기 고장, PC 비정상 프로그램 설치 등의 문제 발생 시 변상 및 원상 복구 규정에 대해 동의하며, 민, 형사상의 모든 책임을 본인이 집니다.';

const EMPTY: Omit<LibraryCardData, 'key' | 'action'> = {
  space: null,
  date: null,
  start: null,
  minutes: null,
  seat: null,
  useDesc: null,
  useDescOptions: [],
  pledge: null,
  companions: [],
  questId: null,
  notes: [],
  until: null,
  target: null,
};

export function libraryCard(
  key: string,
  action: LibraryCardData['action'],
  given: Partial<LibraryCardData> = {},
): LibraryCardData {
  return { ...EMPTY, key, action, ...given };
}
