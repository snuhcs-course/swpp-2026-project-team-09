/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, LibraryCardData } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { dayAfter, nextStart } from '@/library/cards/times';
import {
  GROUP_ROOM,
  libraryCard,
  READING_ROOM,
  ROOM_NOTES,
  SEAT_NOTES,
  STUDIO,
  STUDIO_NOTES,
  STUDIO_PLEDGE,
} from './data/library';

// The mock Assistant's answers about 관정도서관, until the main server's library tools land (P06 ticket 07): the
// cards it would show, in the spec's `library` shape. A time in the words ("17시", "17:00") is the start, else the
// next 30 minutes.

const LIBRARY_WORDS = ['관정', '도서관', '열람실', '스터디룸', '스튜디오', '내 예약', '반납'];
const USE_DESC = ['강의', '과제', '동아리활동', '연구', '취업', '기타'];
const MEDIA_USE_DESC = ['강의', '과제', '동아리활동', '연구', '취업', '콘텐츠제작', '녹음', '기타'];

const SHOWN = '카드에서 확인해 주세요. 예약하기를 누르기 전에는 아무것도 예약하지 않아요.';

function startIn(words: string): string {
  const clock = /(\d{1,2})(?::(\d{2})|시)/u.exec(words);
  if (clock === null) {
    return nextStart(now());
  }
  return `${(clock[1] ?? '0').padStart(2, '0')}:${clock[2] ?? '00'}`;
}

function cardFor(words: string): LibraryCardData {
  const date = koreaDateKey(now());
  const start = startIn(words);
  const hhmm = start.replace(':', '');
  if (words.includes('취소')) {
    return libraryCard('cancel:-:-:-', 'cancel', { target: {} });
  }
  if (words.includes('반납')) {
    return libraryCard('return:-', 'return', { target: {} });
  }
  if (words.includes('내 예약')) {
    return libraryCard(`myBookings:${dayAfter(date, -7)}:${dayAfter(date, 3)}`, 'myBookings', {
      date: dayAfter(date, -7),
      until: dayAfter(date, 3),
    });
  }
  if (words.includes('현황') || words.includes('자리 있')) {
    return libraryCard(`seats:${READING_ROOM.id}:${date}`, 'seats', { space: READING_ROOM, notes: SEAT_NOTES });
  }
  if (words.includes('스튜디오')) {
    const key = `book:${STUDIO.id}:${date}:${hhmm}:60`;
    return libraryCard(key, 'book', {
      space: STUDIO,
      date,
      start,
      minutes: 60,
      useDescOptions: MEDIA_USE_DESC,
      pledge: STUDIO_PLEDGE,
      notes: STUDIO_NOTES,
    });
  }
  if (words.includes('스터디룸')) {
    const key = `book:${GROUP_ROOM.id}:${date}:${hhmm}:60`;
    return libraryCard(key, 'book', {
      space: GROUP_ROOM,
      date,
      start,
      minutes: 60,
      useDescOptions: USE_DESC,
      notes: ROOM_NOTES,
    });
  }
  const key = `book:${READING_ROOM.id}:${date}:${hhmm}:60`;
  return libraryCard(key, 'book', { space: READING_ROOM, date, start, minutes: 60, notes: SEAT_NOTES });
}

export function isLibraryAsk(words: string): boolean {
  return LIBRARY_WORDS.some((word) => words.includes(word));
}

export function libraryReply(words: string): AssistantReply {
  const card = cardFor(words);
  const text = card.action === 'book' ? SHOWN : '카드에서 확인해 주세요.';
  return { text, mapButtons: [], cards: [{ kind: 'library', library: card }], proposal: null, choices: [] };
}
