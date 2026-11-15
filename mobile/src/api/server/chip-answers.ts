/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ConditionChip } from '@/api/assistant-types';
import { field, isText, isTextOrNull } from './answers';

// The app's check of a condition chip of an answer or a Lookup, with the mark of one the server assumed (P02-13).

const KINDS: readonly ConditionChip['kind'][] = ['origin', 'from', 'until', 'person', 'area', 'what'];
const MARKS: readonly NonNullable<ConditionChip['mark']>[] = ['assumed', 'relaxed'];

export function isChip(value: unknown): value is ConditionChip {
  const kind = field(value, 'kind');
  const mark = field(value, 'mark');
  return (
    KINDS.some((one) => one === kind) &&
    isText(field(value, 'text')) &&
    isTextOrNull(field(value, 'userId')) &&
    (mark === undefined || MARKS.some((one) => one === mark))
  );
}
