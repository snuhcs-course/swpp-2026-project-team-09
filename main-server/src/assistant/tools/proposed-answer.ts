/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { busyEnd, clockOf } from '../free-time/free-time.js';
import { itemName } from '../free-time/tool-parts.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { proposalForModel, type QuestProposal, sentProposalOf } from '../proposal.js';

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

export async function proposedAnswer(
  proposal: QuestProposal,
  userId: string,
  days: Pick<UserDayService, 'itemsOn'>,
): Promise<object> {
  const clashes = await clashesOf(days, userId, proposal.startsAt);
  return {
    result: 'proposed',
    proposal: proposalForModel(sentProposalOf(proposal)),
    ...(clashes.length > 0 ? { clashes } : {}),
    note: NOTE,
  };
}
