/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place, Weekday } from '@/api/types';
import type { NativeOcrResult } from './native-ocr';

// The seam between the import (ticket 04) and the reading pipeline (ticket 02): what one image's OCR becomes. The
// pipeline replaces `readTimetable` below with its own, keeping this shape (P13 spec, "Reading pipeline", "Output").

export type OcrResult = NativeOcrResult;

export interface ReadTime {
  weekday: Weekday;
  // "10:00"
  start: string;
  end: string;
  // "311-1", the part after the building, or null with no building.
  room: string | null;
  placeId: string | null;
}

export interface ReadClass {
  name: string;
  times: ReadTime[];
}

export interface ReadTable {
  // The screenshot's title, which names the new version, or null.
  title: string | null;
  classes: ReadClass[];
}

// Pure: the same OCR and Places give the same classes on Android and iOS. What is uncertain is left out.
export type ReadTimetable = (ocr: OcrResult, places: readonly Place[]) => ReadTable;

// Until ticket 02's pipeline is merged, nothing is read, so the import says `시간표를 찾지 못했어요`.
export const readTimetable: ReadTimetable = () => ({ title: null, classes: [] });
