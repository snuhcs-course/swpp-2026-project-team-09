/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { JoinPolicy } from '../../generated/prisma/client.js';
import { type AssistantReplyDto } from '../dto/assistant-messages.dto.js';
import { type NextLineTemplate } from './constants.js';
import { koreaMinutes } from './korea-day.js';

// What an answer leaves to ask next (P07 ticket 09): sentences from templates over the reply, the first the likeliest.
// The User sends a line as their own words, so text someone else wrote never goes into one: an event is named by its
// place among the cards, and its id goes with the line as the candidate the User chose.

export interface NextLine {
  template: NextLineTemplate;
  text: string;
  chosen: { kind: 'globalEvent'; id: string; words: string } | null;
}

type Answer = Pick<AssistantReplyDto, 'mapButtons' | 'cards' | 'proposal' | 'choices'>;

const MORE_PEOPLE = 6;
// A meal is proposed only with this long left before it, 12:00 or 18:00 as the Assistant reads 점심 and 저녁.
const LUNCH_LAST_MINUTE = 11 * 60 + 30;
const DINNER_LAST_MINUTE = 17 * 60 + 30;

function changeOf({ proposal }: Answer): NextLine | null {
  if (proposal === null) {
    return null;
  }
  const template = 'change_shown_proposal';
  // A later time would pass the event's start, which proposeQuest refuses.
  if (proposal.globalEvent === null) {
    return { template, text: '시간을 1시간 뒤로 미뤄줘', chosen: null };
  }
  const canGrow = proposal.joinPolicy !== JoinPolicy.closed && proposal.capacity < MORE_PEOPLE;
  return canGrow ? { template, text: `인원을 ${MORE_PEOPLE}명으로 늘려줘`, chosen: null } : null;
}

function partyForEvent({ cards }: Answer, now: Date): NextLine | null {
  const events = cards.flatMap((card) => (card.kind === 'globalEvent' ? [card.globalEvent] : []));
  const first = events[0];
  if (first?.startsAt === null || first === undefined || new Date(first.startsAt) <= now) {
    return null;
  }
  const words = events.length === 1 ? '이 행사' : '첫 번째 행사';
  return {
    template: 'party_for_shown_event',
    text: `${words} 같이 갈 사람 모집해줘`,
    chosen: { kind: 'globalEvent', id: first.id, words },
  };
}

function nextMeal(now: Date): string {
  const minutes = koreaMinutes(now);
  if (minutes < LUNCH_LAST_MINUTE) {
    return '오늘 점심';
  }
  return minutes < DINNER_LAST_MINUTE ? '오늘 저녁' : '내일 점심';
}

function partyAfterMenus({ mapButtons }: Answer, now: Date): NextLine | null {
  return mapButtons.includes('dining')
    ? { template: 'party_after_menus', text: `${nextMeal(now)} 같이 먹을 사람 모집해줘`, chosen: null }
    : null;
}

// The lines the answer leaves, the likeliest first. Chips ask the User something, so they leave none.
export function nextLinesOf(answer: Answer, now: Date): NextLine[] {
  if (answer.choices.length > 0) {
    return [];
  }
  return [changeOf(answer), partyForEvent(answer, now), partyAfterMenus(answer, now)].filter((line) => line !== null);
}
