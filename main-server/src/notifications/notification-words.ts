/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../assistant/free-time/free-time.js';
import { withSubject } from '../assistant/gathering/answer-words.js';
import { type NotificationWords, type Told } from './notification.js';

const ANSWERS = { accepted: '수락했어요', declined: '못 온대요' } as const;

// A new match of a watched interest: the start in Korea and the Place, leaving out what is unknown.
function interestWords({
  subject,
  id,
  title,
  startsAt,
  placeLabel,
}: Told & { kind: 'interest-new' }): NotificationWords {
  const event = subject === 'event';
  return {
    title: event ? `${withSubject(title)} 떴어요` : `${title} 모집이 떴어요`,
    ahead: null,
    line: [startsAt === null ? null : clockOf(startsAt), placeLabel].filter((part) => part !== null).join(' '),
    card: { kind: event ? 'event' : 'party', id },
    about: null,
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
    };
  }
  return {
    title: `${withSubject(told.friendName)} ${ANSWERS[told.kind]}`,
    ahead: null,
    line: told.questTitle,
    card: { kind: 'party', id: told.questId },
    about: told.friendId,
  };
}
