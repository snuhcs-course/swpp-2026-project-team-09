/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { FlagRole } from '@/api/scene-roles';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, color, type LabelSide } from '@/design-system';

// The groups in the order their labels take sides, which is also the order of their symbols at one point but for the
// flags, which have none.
export type Group = 'flag' | 'pick' | 'person' | 'next' | 'stop' | 'candidate' | 'dropped';

export const SIDE_ORDER: Group[] = ['flag', 'pick', 'person', 'next', 'stop', 'candidate', 'dropped'];
export const SYMBOL_ORDER: Group[] = ['person', 'pick', 'next', 'stop', 'candidate', 'dropped'];
export const DRAW_ORDER: Group[] = ['pick', 'person', 'flag', 'next', 'stop', 'candidate', 'dropped'];
// A shuttle stop is the way's own: the camera keeps the stop to walk to in view.
export const OWN = new Set<Group>(['person', 'pick', 'next', 'stop', 'flag']);

export const SIDES: Record<Group, LabelSide[]> = {
  flag: ['above', 'below', 'right', 'left'],
  pick: ['below', 'above'],
  person: ['right', 'left'],
  next: ['left', 'below', 'right', 'above'],
  stop: ['left', 'right', 'below', 'above'],
  candidate: ['left', 'right', 'below', 'above'],
  dropped: ['left', 'right', 'below', 'above'],
};

export const ROUTE_STYLES = {
  me: { color: color.snuBlue, width: 5 },
  friend: { color: color.friend, width: 4 },
  next: { color: color.borderStrong, width: 3 },
  shuttle: { color: color.svcShuttle, width: 4 },
  alt: { color: color.inkSubtle, width: 2 },
} as const;

// A place's flag away from the pick keeps the pick's tone.
export const FLAG_TONES: Record<FlagRole, AnswerLabel['tone']> = {
  place: 'pick',
  meeting: 'meeting',
  leave: 'leave',
  late: 'late',
  shuttle: 'shuttle',
};

// The destination, whose side the camera keeps when not every point fits: the pick, or for a way, which has none, its
// next item.
export function destinationOf(marks: readonly { group: Group; position: LatLng }[]): LatLng | null {
  const destination = marks.find(({ group }) => group === 'pick') ?? marks.find(({ group }) => group === 'next');
  return destination?.position ?? null;
}
