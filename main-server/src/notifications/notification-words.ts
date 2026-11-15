/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../assistant/free-time/free-time.js';
import { withCopula, withSubject } from '../assistant/gathering/answer-words.js';
import { type NotificationWords, type Told } from './notification.js';

const ANSWERS = { accepted: '수락했어요', declined: '못 온대요' } as const;

// The push's body of a new match: the line as a sentence, or why it rang when neither the start nor the Place is known.
function interestBody(time: string | null, placeLabel: string | null): string {
  if (placeLabel !== null) {
    return `${withCopula(time === null ? placeLabel : `${time} ${placeLabel}`)}.`;
  }
  return time === null ? '맡겨 둔 관심에 맞아요.' : `${time}에 시작해요.`;
}

// A new match of a watched interest: the start in Korea and the Place, leaving out what is unknown. It rings once.
function interestWords({
  subject,
  id,
  title,
  startsAt,
  placeLabel,
}: Told & { kind: 'interest-new' }): NotificationWords {
  const event = subject === 'event';
  const time = startsAt === null ? null : clockOf(startsAt);
  return {
    title: event ? `${withSubject(title)} 떴어요` : `${title} 모집이 떴어요`,
    ahead: null,
    line: [time, placeLabel].filter((part) => part !== null).join(' '),
    card: { kind: event ? 'event' : 'party', id },
    about: null,
    rings: true,
    body: interestBody(time, placeLabel),
  };
}

// `at` is the Notification's time.
export function wordsOf(told: Told, at: Date): NotificationWords {
  if (told.kind === 'interest-new') {
    return interestWords(told);
  }
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
