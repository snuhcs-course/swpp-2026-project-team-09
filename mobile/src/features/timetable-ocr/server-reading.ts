/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ServerTimetableReading } from '@/api/timetable-reading-types';
import type { Place } from '@/api/types';

import { buildingOf } from './building';
import type { ReadClass } from './classes';
import type { SkippedBlock } from './grid-geometry';
import type { LeftOut, Reading } from './read-timetable';

// P15-52: the main server's reading of a screenshot as the phone's reader gives one, so that the import treats both
// alike, with the blocks the phone's pixels found and did not send counted among what was left out. Each room, read as printed, is linked to the building whose number leads it (`buildingOf`); a room no
// building leads keeps its printed text and links to none.

export function readingFromServer(
  server: ServerTimetableReading,
  places: readonly Place[],
  skipped: readonly SkippedBlock[] = [],
): Reading {
  if (server.kind === 'none') {
    return { kind: 'none', reason: 'no-hours' };
  }
  const classes: ReadClass[] = server.classes.map((lesson) => ({
    name: lesson.name,
    times: lesson.times.map(({ weekday, start, end, room }) => {
      const link = room === null ? null : buildingOf(room, places);
      return { weekday, start, end, room: link === null ? room : link.room, placeId: link?.placeId ?? null };
    }),
  }));
  const leftOut: LeftOut[] = [
    ...server.leftOut.map(({ weekday, name, start, end, reason }): LeftOut => ({
      weekday,
      name,
      start,
      end,
      reason: reason === 'cut' ? 'end-uncertain' : 'unchecked',
    })),
    // What the phone's pixels found and did not send, counted as the phone's own reader counts it: only when the
    // server placed the blocks on the grid. On the whole picture's reading the model saw those blocks itself, and they
    // are in its own answer already; an answer that does not say counts nothing, so nothing is counted twice.
    ...(server.usedGrid === true ? skipped : []).map(({ reason }): LeftOut => ({
      weekday: null,
      name: '',
      start: null,
      end: null,
      reason,
    })),
  ];
  return { kind: 'read', title: server.title, classes, leftOut };
}
