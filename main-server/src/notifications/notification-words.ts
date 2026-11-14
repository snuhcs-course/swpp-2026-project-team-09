/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../assistant/free-time/free-time.js';
import { withSubject } from '../assistant/gathering/answer-words.js';
import { koreaDate } from '../assistant/korea-time.js';
import { clockOfMinutes, minutesOfClock } from '../assistant/library/booking-rules.js';
import { monthDayWords, weekdayWord } from '../assistant/library/study-room.js';
import { type NotificationWords, type Told } from './notification.js';

const ANSWERS = { accepted: '수락했어요', declined: '못 온대요' } as const;

type Of<Kind extends Told['kind']> = Extract<Told, { kind: Kind }>;

// "목 15:30–18:30".
function timesWords({ date, start, minutes }: { date: string; start: string; minutes: number }): string {
  return `${weekdayWord(date)} ${start}–${clockOfMinutes(minutesOfClock(start) + minutes)}`;
}

// A room request's Notifications ring, with the line as the push's body.
function roomWords(told: Of<'room-declined'> | Of<'room-agreed'> | Of<'room-ending'>): NotificationWords {
  const card = { kind: 'party', id: told.questId };
  if (told.kind === 'room-declined') {
    const plan = told.moreNeeded > 0 ? `${String(told.moreNeeded)}명 더 필요해요` : '계획은 그대로예요';
    const line = `${told.roomLabel} · ${plan}`;
    return {
      title: `${withSubject(told.friendName)} 못 온대요`,
      ahead: null,
      line,
      card,
      about: told.friendId,
      rings: true,
      body: `${line}.`,
    };
  }
  if (told.kind === 'room-agreed') {
    const line = `${timesWords(told)} ${told.roomLabel}`;
    return {
      title: '모두 동의했어요',
      ahead: null,
      line,
      card,
      about: null,
      rings: true,
      body: `${line}, 이제 예약할 수 있어요.`,
    };
  }
  const line = `${told.roomLabel} · ${told.end}에 끝나요`;
  return {
    title: '10분 뒤 끝나요',
    ahead: `${told.end} 방 예약 끝`,
    line,
    card,
    about: null,
    rings: true,
    body: `${line}.`,
  };
}

// `at` is the Notification's time.
export function wordsOf(told: Told, at: Date): NotificationWords {
  if (told.kind === 'leave-by') {
    return {
      title: '지금 나서요',
      ahead: `${clockOf(at)} 나설 시각`,
      line: `${told.placeLabel}까지 걸어서 ${String(told.walkMinutes)}분`,
      card: { kind: 'party', id: told.questId },
      about: null,
      rings: true,
      body: `${told.placeLabel}까지 걸어서 ${String(told.walkMinutes)}분이에요.`,
    };
  }
  if (told.kind === 'room-window') {
    return {
      title: '예약 창이 열렸어요',
      ahead: `${monthDayWords(koreaDate(at))} ${clockOf(at)} 예약 창 열림`,
      line: `${timesWords(told)} 스터디`,
      card: { kind: 'party', id: told.questId },
      about: null,
      rings: true,
      body: `${timesWords(told)} 스터디를 이제 예약할 수 있어요.`,
    };
  }
  if (told.kind === 'accepted' || told.kind === 'declined') {
    return {
      title: `${withSubject(told.friendName)} ${ANSWERS[told.kind]}`,
      ahead: null,
      line: told.questTitle,
      card: { kind: 'party', id: told.questId },
      about: told.friendId,
      rings: false,
      body: null,
    };
  }
  return roomWords(told);
}
