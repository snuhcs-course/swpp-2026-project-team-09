/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { StudyBuilding, StudySpace } from '@/api/study-types';
import { field, hasTexts, isCampusPlace, isNumber, isTextOrNull, listOf } from './answers';

// The checks of the main server's 공부공간 layer. A sector of 관정관 is checked for what the phone reads it by.

const KINDS: ReadonlySet<unknown> = new Set(['library', 'reading', 'lounge', 'pc', 'group']);

function isStudySpace(value: unknown): value is StudySpace {
  return (
    hasTexts(value, ['key', 'name']) &&
    KINDS.has(field(value, 'kind')) &&
    isTextOrNull(field(value, 'hours')) &&
    isTextOrNull(field(value, 'link')) &&
    typeof field(value, 'usable') === 'boolean' &&
    isTextOrNull(field(value, 'restrictedTo'))
  );
}

function isSector(value: unknown): boolean {
  const hours = field(value, 'hours');
  return (
    hasTexts(value, ['id', 'name']) &&
    ['roomNo', 'sectorNo', 'minMinutes'].every((name) => isNumber(field(value, name))) &&
    hasTexts(hours, ['open', 'close'])
  );
}

function isLiveSeats(value: unknown): boolean {
  return value === null || listOf((sector: unknown): sector is unknown => isSector(sector))(field(value, 'sectors'));
}

function isStudyBuilding(value: unknown): value is StudyBuilding {
  return (
    hasTexts(value, ['name']) &&
    isCampusPlace(field(value, 'place')) &&
    typeof field(value, 'usable') === 'boolean' &&
    isLiveSeats(field(value, 'liveSeats')) &&
    listOf(isStudySpace)(field(value, 'spaces'))
  );
}

export const isStudyBuildings = listOf(isStudyBuilding);
