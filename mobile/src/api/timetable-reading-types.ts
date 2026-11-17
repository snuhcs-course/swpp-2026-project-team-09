/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Weekday } from './types';

// The main server's reading of a timetable screenshot (P15-52, `POST /timetable/readings`), as
// `main-server/src/timetable-reading/reading-checks.ts` fixes it. Rooms come as printed; the app links them to
// buildings.

// What the phone found on the picture from its pixels alone, sent with it (`gridGeometry`): the AI then reads the
// labels and each block's text and rough times, and the server places the blocks.
export interface SentGrid {
  columns: number;
  blocks: {
    column: number;
    top: number;
    bottom: number;
    colour: [number, number, number] | null;
    fades: boolean;
  }[];
}

export interface ServerReadTime {
  weekday: Weekday;
  // "13:00".
  start: string;
  end: string;
  // "302-311-1", or null.
  room: string | null;
}

export interface ServerReadClass {
  name: string;
  times: ServerReadTime[];
}

export interface ServerLeftOut {
  weekday: Weekday | null;
  name: string;
  start: string | null;
  end: string | null;
  reason: string;
}

export type ServerTimetableReading =
  { kind: 'read'; title: string | null; classes: ServerReadClass[]; leftOut: ServerLeftOut[] } | { kind: 'none' };
