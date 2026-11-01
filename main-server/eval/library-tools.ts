/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { minutesOf, spaceIdOf, spaceIdsOf, startOf } from './readers.ts';
import { type Field, type ToolRule } from './tool-rules.ts';

// The normalisers' entries for the library and tutorial tools (P06 spec, "Assistant: the library and tutorial tools"),
// which eval/normalise.ts adds to its table. A space is read by its catalogue id, renamed from spaceId to space and
// spaceIds to spaces; dates as YYYY-MM-DD, starts and ends as HH:MM, lengths as minutes, and Friends and a Quest by seed
// name.

const day = { read: 'day' } as const;
const words = { read: 'words' } as const;
const ID = { read: 'id' } as const;
const MINUTES = { read: 'minutes' } as const;
const START = { read: 'start' } as const;
const SPACE = { as: 'space', read: 'space' } as const;

export const LIBRARY_TOOL_RULES: Record<string, ToolRule> = {
  findLibrarySpace: { role: 'resolver', fields: { spaceIds: { as: 'spaces', read: 'spaces' }, words } },
  findLibraryFreeSlots: { role: 'lookup', fields: { spaceId: SPACE, date: day, minutes: MINUTES } },
  proposeLibraryBooking: {
    role: 'proposer',
    fields: {
      spaceId: SPACE,
      date: day,
      start: START,
      minutes: MINUTES,
      end: START,
      seat: words,
      equipment: words,
      useDesc: words,
      friendIds: { as: 'friends', read: 'ids' },
      questId: { as: 'quest', ...ID },
    },
  },
  proposeLibraryCancel: { role: 'presenter', fields: { date: day, spaceId: SPACE, start: START } },
  proposeLibraryReturn: { role: 'presenter', fields: { spaceId: SPACE } },
  showLibrarySeats: { role: 'presenter', fields: { spaceId: SPACE, date: day, start: START, minutes: MINUTES } },
  showMyLibraryBookings: { role: 'presenter', fields: { from: day, to: day } },
  getTutorial: { role: 'lookup', fields: { questKey: words } },
};

// The library tools, whose refusals the scorer reads as a REFUSE (eval/score.ts).
export const LIBRARY_TOOLS: ReadonlySet<string> = new Set(
  Object.keys(LIBRARY_TOOL_RULES).filter((name) => name !== 'getTutorial'),
);

// Tools whose result carries no `result`: what it is read as when it answers a record. getTutorial answers the content
// and the User's status.
export const RESULTLESS: Readonly<Record<string, 'found'>> = { getTutorial: 'found' };

// The answers of the library tools per space: bookable online, used on site, not in scope, and only for graduate
// students.
export const LIBRARY_OUTCOMES = ['implemented', 'notOnline', 'unsupported', 'notEligible'] as const;

// How the library tools' own kinds of field are read.
export const LIBRARY_READERS: Record<
  Extract<Field, 'minutes' | 'start' | 'space' | 'spaces'>,
  (input: unknown) => unknown
> = {
  minutes: (input) => minutesOf(input),
  start: (input) => startOf(input),
  space: (input) => spaceIdOf(input),
  spaces: (input) => spaceIdsOf(input),
};

// Whether a call of a library tool refused: a space not in scope, used on site or not for the User, or a booking refused
// by its conditions. The scorer reads it as a REFUSE (eval/score.ts).
export function libraryRefused(tool: string, outcome: string): boolean {
  return LIBRARY_TOOLS.has(tool) && ['refused', 'notOnline', 'unsupported', 'notEligible'].includes(outcome);
}
