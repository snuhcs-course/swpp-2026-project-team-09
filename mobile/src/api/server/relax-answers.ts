/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RelaxOffer } from '@/api/relax-types';
import { field, isText, listOf } from './answers';

// The app's check of what a meal says when its conditions cannot be met (P02-14), each part left out by a main server
// before it.

function isRelaxOffer(value: unknown): value is RelaxOffer {
  if (!isText(field(value, 'label'))) {
    return false;
  }
  const kind = field(value, 'kind');
  return kind === 'without' ? isText(field(value, 'userId')) : kind === 'from' && isText(field(value, 'time'));
}

// A noPlan's buttons that each ease one condition.
export function hasRelax(value: unknown): boolean {
  const relax = field(value, 'relax');
  return relax === undefined || listOf(isRelaxOffer)(relax);
}

// A meal window's 지금.
export function hasNow(window: unknown): boolean {
  const now = field(window, 'now');
  return now === undefined || typeof now === 'boolean';
}
