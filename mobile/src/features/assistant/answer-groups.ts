/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { color, type LabelSide } from '@/design-system';

// The groups in the order their labels take sides, which is also the order of their symbols at one point but for the
// flags, which have none.
export type Group = 'flag' | 'pick' | 'person' | 'next' | 'candidate' | 'dropped';

export const SIDE_ORDER: Group[] = ['flag', 'pick', 'person', 'next', 'candidate', 'dropped'];
export const SYMBOL_ORDER: Group[] = ['person', 'pick', 'next', 'candidate', 'dropped'];
export const DRAW_ORDER: Group[] = ['pick', 'person', 'flag', 'next', 'candidate', 'dropped'];
export const OWN = new Set<Group>(['person', 'pick', 'next', 'flag']);

export const SIDES: Record<Group, LabelSide[]> = {
  flag: ['above', 'below', 'right', 'left'],
  pick: ['below', 'above'],
  person: ['right', 'left'],
  next: ['left', 'below', 'right', 'above'],
  candidate: ['left', 'right', 'below', 'above'],
  dropped: ['left', 'right', 'below', 'above'],
};

export const ROUTE_STYLES = {
  me: { color: color.snuBlue, width: 5 },
  friend: { color: color.friend, width: 4 },
  next: { color: color.borderStrong, width: 3 },
  shuttle: { color: color.svcShuttle, width: 4 },
  alt: { color: color.border, width: 2 },
} as const;
