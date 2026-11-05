/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { JoinPolicy } from '../generated/prisma/client.js';
import { type Card } from './feature.js';

// The Approval line (P12, CD-2): a sentence the server adds to a reply that shows an Approval Quest's card and does not
// say how such a Quest is entered, so that the User never takes a request for joining.

export const APPROVAL_LINE = {
  korean: '승인제 파티는 참여 신청 후 파티장이 수락하면 참여돼요.',
  english: 'A party that needs approval takes you in once you ask to join and its leader accepts.',
};

// The words that tell how an Approval Quest is entered. A reply holding two of them already says it.
const ENTRY_WORDS = ['승인', '수락', '신청'];

const HANGUL = /\p{Script=Hangul}/u;

// The reply's text with the line added, in the language of the User's last message, when a card shows an Approval
// Quest and the text holds fewer than two of the entry words; else the text as it is.
export function withApprovalLine(
  text: string,
  cards: readonly Card[],
  lastUserText: string,
): { text: string; added: boolean } {
  const approval = cards.some((card) => card.kind === 'quest' && card.quest.joinPolicy === JoinPolicy.approval);
  const told = ENTRY_WORDS.filter((word) => text.includes(word)).length >= 2;
  if (!approval || told) {
    return { text, added: false };
  }
  const line = HANGUL.test(lastUserText) ? APPROVAL_LINE.korean : APPROVAL_LINE.english;
  return { text: `${text}\n\n${line}`, added: true };
}
