/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { withSubject } from '../assistant/gathering/answer-words.js';
import { type NotificationWords, type Told } from './notification.js';

const ANSWERS: Record<Told['kind'], string> = { accepted: '수락했어요', declined: '못 온대요' };

export function wordsOf(told: Told): NotificationWords {
  return {
    title: `${withSubject(told.friendName)} ${ANSWERS[told.kind]}`,
    line: told.questTitle,
    card: { kind: 'party', id: told.questId },
    about: told.friendId,
  };
}
