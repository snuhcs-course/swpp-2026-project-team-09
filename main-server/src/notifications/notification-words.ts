/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../assistant/free-time/free-time.js';
import { withSubject } from '../assistant/gathering/answer-words.js';
import { clockOfMinutes, minutesOfClock } from '../assistant/library/booking-rules.js';
import { type NotificationWords, type Told } from './notification.js';

const ANSWERS = { accepted: '수락했어요', declined: '못 온대요' } as const;

const WEEKDAYS = '일월화수목금토';

type Of<Kind extends Told['kind']> = Extract<Told, { kind: Kind }>;

function roomWords(told: Of<'room-declined'> | Of<'room-agreed'> | Of<'room-ending'>): NotificationWords {
  const card = { kind: 'party', id: told.questId };
  if (told.kind === 'room-declined') {
    const plan = told.moreNeeded > 0 ? `${String(told.moreNeeded)}명 더 필요해요` : '계획은 그대로예요';
    return {
      title: `${withSubject(told.friendName)} 못 온대요`,
      ahead: null,
      line: `${told.roomLabel} · ${plan}`,
      card,
      about: told.friendId,
    };
  }
  if (told.kind === 'room-agreed') {
    const weekday = WEEKDAYS[new Date(`${told.date}T00:00:00Z`).getUTCDay()] ?? '';
    const end = clockOfMinutes(minutesOfClock(told.start) + told.minutes);
    const line = `${weekday} ${told.start}–${end} ${told.roomLabel}`;
    return { title: '모두 동의했어요', ahead: null, line, card, about: null };
  }
  return {
    title: '10분 뒤 끝나요',
    ahead: `${told.end} 방 예약 끝`,
    line: `${told.roomLabel} · ${told.end}에 끝나요`,
    card,
    about: null,
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
    };
  }
  if (told.kind === 'accepted' || told.kind === 'declined') {
    return {
      title: `${withSubject(told.friendName)} ${ANSWERS[told.kind]}`,
      ahead: null,
      line: told.questTitle,
      card: { kind: 'party', id: told.questId },
      about: told.friendId,
    };
  }
  return roomWords(told);
}
