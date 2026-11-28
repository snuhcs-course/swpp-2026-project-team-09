/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { IconName } from './icon';
import { color, kindTone } from './tokens';

export type MapPlaceKind = 'official' | 'private' | 'party' | 'quest' | 'dining' | 'library' | 'shuttle';

// The kind decides the colour and the icon, so that pins stay apart without colour. `name` is what a screen reader
// says for a pin without a label. A campus service's pin is drawn apart from the tags of the others. The colours are
// their kinds' (`kindTone`): a party and a Quest are the party's, and a 식당 the meal's.
const KINDS: Record<MapPlaceKind, { fill: string; icon: IconName; service: boolean; name: string }> = {
  official: { fill: kindTone.event.ink, icon: kindTone.event.icon, service: false, name: '공식 행사' },
  private: { fill: color.private, icon: 'lock', service: false, name: '내 일정' },
  party: { fill: kindTone.party.ink, icon: kindTone.party.icon, service: false, name: '파티' },
  quest: { fill: kindTone.party.ink, icon: 'flag', service: false, name: '퀘스트' },
  dining: { fill: kindTone.meal.ink, icon: kindTone.meal.icon, service: true, name: '식당' },
  library: { fill: kindTone.study.ink, icon: kindTone.study.icon, service: true, name: '공부공간' },
  shuttle: { fill: kindTone.shuttle.ink, icon: kindTone.shuttle.icon, service: true, name: '셔틀버스' },
};

// A kind's colour, icon and name, for a view that draws several kinds together.
export function placeKindLook(kind: MapPlaceKind): { fill: string; icon: IconName; service: boolean; name: string } {
  return KINDS[kind];
}
