/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Position } from '@/api/types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';

// The app's check of GET /positions: each position at its level, with the Place nearest the Friend and the walk to it
// when the main server knows them.

const POSITION_LEVELS = new Set<unknown>([undefined, 'building', 'exact']);

function isPosition(value: unknown): value is Position {
  const [placeId, nearPlace, walkMinutes] = ['placeId', 'nearPlace', 'walkMinutes'].map((name) => field(value, name));
  return (
    hasTexts(value, ['userId', 'measuredAt']) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude')) &&
    POSITION_LEVELS.has(field(value, 'level')) &&
    (placeId === undefined || isText(placeId)) &&
    (nearPlace === undefined || isTextOrNull(nearPlace)) &&
    (walkMinutes === undefined || walkMinutes === null || isNumber(walkMinutes))
  );
}

export const isPositions = listOf(isPosition);
