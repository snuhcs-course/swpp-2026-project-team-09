/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ServerTimetableReading } from '@/api/timetable-reading-types';
import type { Place } from '@/api/types';

import { buildingOf } from './building';
import type { ReadClass } from './classes';
import type { LeftOut, Reading } from './read-timetable';

// P15-52: the main server's reading of a screenshot as the phone's reader gives one, so that the import treats both
// alike. Each room, read as printed, is linked to the building whose number leads it (`buildingOf`); a room no
// building leads keeps its printed text and links to none.

export function readingFromServer(server: ServerTimetableReading, places: readonly Place[]): Reading {
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
  const leftOut: LeftOut[] = server.leftOut.map(({ weekday, name, start, end, reason }) => ({
    weekday,
    name,
    start,
    end,
    reason: reason === 'cut' ? 'end-uncertain' : 'unchecked',
  }));
  return { kind: 'read', title: server.title, classes, leftOut };
}
