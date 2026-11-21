/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReplyOffer } from '../dto/assistant-messages.dto.js';
import { type Presented } from '../feature.js';
import { busyEnd, clockOf } from '../free-time/free-time.js';
import { itemName } from '../free-time/tool-parts.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { proposalForModel, type QuestProposal, sentProposalOf } from '../proposal.js';
import { type FieldFailures } from './propose-quest-input.js';

// What proposeQuest answers of a Proposal it made: its values as the model reads them, and what of the asker's own day it
// overlaps. That is their Classes and the Sub Quests of the Quests they hold, over the 파티's first 30 minutes, as a Sub
// Quest with no end fills a day (busyEnd). Only the asker's day is read, never an invited Friend's.

const CLASHES_MAX = 3;

// Where the model reads it as it writes: the rules alone did not keep a search before the Proposal out of the reply. It
// names the search alone, so that the clashes are still said.
const NOTE = 'Never mention a search, nor 파티 found, not found or not fitting.';

export interface Clash {
  kind: 'class' | 'quest';
  // The course or the Quest's title, inside the delimiters for collected text.
  name: string;
  start: string;
  end: string;
}

async function clashesOf(days: Pick<UserDayService, 'itemsOn'>, userId: string, startsAt: string): Promise<Clash[]> {
  const start = new Date(startsAt);
  const end = busyEnd(start, null);
  const items = await days.itemsOn(userId, koreaDate(start));
  return items
    .filter((item) => item.start < end && start < item.end)
    .toSorted((one, other) => one.start.getTime() - other.start.getTime())
    .slice(0, CLASHES_MAX)
    .map((item) => ({
      kind: item.isClass ? 'class' : 'quest',
      name: itemName(item),
      start: clockOf(item.start),
      end: clockOf(item.end),
    }));
}

// The four Boards, which the app docks as chips under the question when the Board alone is missing: a press says it as
// the User's words.
const BOARD_OFFERS: readonly ReplyOffer[] = ['식사', '진로', '취미', '공연'].map((label) => ({
  kind: 'ask',
  label,
  text: `${label} 게시판으로 해 줘`,
}));

const BOARD_NOTE =
  'The app shows the four Boards as buttons under your question: ask which in one short question, without listing them.';

// The reply's offers with the Board chips, or without them.
function withBoards(presented: Presented, boards: boolean): void {
  const offers = [
    ...(presented.offers ?? []).filter((offer) => !BOARD_OFFERS.includes(offer)),
    ...(boards ? BOARD_OFFERS : []),
  ];
  if (offers.length > 0) {
    presented.offers = offers;
  } else {
    delete presented.offers;
  }
}

// What proposeQuest answers of a 파티 it refused: what is missing or wrong, by field, and, when the Board alone is, the
// four Boards as chips under the question.
export function refusedAnswer(fields: FieldFailures, presented: Presented): object {
  const boardOnly = Object.keys(fields).length === 1 && fields.board !== undefined;
  withBoards(presented, boardOnly);
  return { result: 'refused', fields, ...(boardOnly ? { note: BOARD_NOTE } : {}) };
}

export async function proposedAnswer(
  proposal: QuestProposal,
  userId: string,
  { days, presented }: { days: Pick<UserDayService, 'itemsOn'>; presented: Presented },
): Promise<object> {
  withBoards(presented, false);
  const clashes = await clashesOf(days, userId, proposal.startsAt);
  return {
    result: 'proposed',
    proposal: proposalForModel(sentProposalOf(proposal)),
    ...(clashes.length > 0 ? { clashes } : {}),
    note: NOTE,
  };
}
