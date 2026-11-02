/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The shape of the normalisers' table (eval/normalise.ts): what a tool is in a run and how each of its fields is read.

// A tool's place in a run. A lookup reads data, a presenter adds it to the reply, a resolver turns the User's words
// into candidates and the proposer checks a 파티 and proposes it.
export type ToolRole = 'lookup' | 'presenter' | 'resolver' | 'proposer';

// How a field is read. day: a calendar day in Korea. moment: the day and HH:MM in Korea. clock: HH:MM in Korea. item: an
// item's seed name, or else a clock time. window: two clock times. words: trimmed text. words[]: a list of them, matched
// when it holds every word expected. board: a Board's name. id and ids: seed names, a list matched when it is the same
// set. minutes: a length in whole minutes. start: HH:MM, also from HHMM. space: a catalogue id of the 관정 catalogue, and
// spaces a set of them. value: as it is.
export type Field =
  | 'day'
  | 'moment'
  | 'clock'
  | 'item'
  | 'window'
  | 'words'
  | 'words[]'
  | 'board'
  | 'id'
  | 'ids'
  | 'minutes'
  | 'start'
  | 'space'
  | 'spaces'
  | 'value';

// A field as the scorer names it: renamed from an id field, such as placeId to place.
export interface FieldRule {
  as?: string;
  read: Field;
}

export interface ToolRule {
  role: ToolRole;
  fields: Record<string, FieldRule>;
}
