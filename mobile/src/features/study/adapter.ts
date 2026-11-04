/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { StudyBuilding, StudySpace } from '@/api/study-types';
import type { LatLng } from '@/api/types';
import { type CardView, cardId, type StudyRow } from '@/features/map/adapter';
import { seatState } from '@/library/cards/seats';
import { tappedSlot } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';
import { minutesOf } from '@/library/cards/times';
import type { LibrarySeat } from '@/library/replies';
import { shortTitle } from '@/features/map/short-name';

// The 공부공간 layer: one pin per building, its card listing its Study Spaces, and the pins merged while the whole
// campus is in view.

export const NO_HOURS = '운영 시간 확인 필요';
export const LIVE_SEATS_WORDS = '관정도서관 좌석 현황 보여줘';

// "경영대학 학생만 사용할 수 있어요"; for 대학원, "대학원생만 사용할 수 있어요".
export function refusalOf(restrictedTo: string): string {
  return restrictedTo === '대학원' ? '대학원생만 사용할 수 있어요' : `${restrictedTo} 학생만 사용할 수 있어요`;
}

function rowOf({ key, name, hours, link, usable, restrictedTo }: StudySpace): StudyRow {
  return {
    key,
    name,
    hours: hours ?? NO_HOURS,
    link,
    refusal: usable ? null : refusalOf(restrictedTo ?? '일부'),
  };
}

function studyCard({ place, name, usable, liveSeats, spaces }: StudyBuilding): CardView {
  const where = place.number === null ? place.name : `${place.number}동`;
  return {
    id: cardId.study(place.id),
    kind: 'study',
    mark: { type: 'place', place: 'library' },
    marker: {
      name: `공부공간 · ${name}${usable ? '' : ' · 사용할 수 없어요'}`,
      short: shortTitle(name),
      count: 0,
      minutesOld: null,
    },
    subLabel: `공부공간 · ${where}`,
    title: name,
    lines: [{ icon: 'pin', text: where }],
    primary:
      liveSeats === null ? { label: '길찾기', action: 'route' } : { label: '좌석 현황', action: 'library-seats' },
    secondary: null,
    position: { latitude: place.latitude, longitude: place.longitude },
    study: { rows: spaces.map((space) => rowOf(space)), sectors: liveSeats?.sectors ?? null },
    ...(usable ? {} : { muted: true }),
  };
}

export function toStudyCards(buildings: readonly StudyBuilding[]): CardView[] {
  return buildings.map((building) => studyCard(building));
}

// --- Merging while the whole campus is in view ---

// Two pins nearer than this, in points on the screen, overlap: a study pin's head is 34 wide.
export const OVERLAP_POINTS = 36;

// Where a position is drawn at a zoom, in points of the Web Mercator world 256 × 2^zoom wide.
function pointOf({ latitude, longitude }: LatLng, zoom: number): { x: number; y: number } {
  const world = 256 * 2 ** zoom;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

function apart(one: LatLng, other: LatLng, zoom: number): number {
  const a = pointOf(one, zoom);
  const b = pointOf(other, zoom);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function studyClusterId(first: CardView): string {
  return `study-cluster:${first.id}`;
}

function clusterCard(members: readonly CardView[]): CardView {
  const [first] = members;
  if (first === undefined) {
    throw new Error('A cluster has members');
  }
  const count = members.length;
  const position = {
    latitude: members.reduce((sum, { position: { latitude } }) => sum + latitude, 0) / count,
    longitude: members.reduce((sum, { position: { longitude } }) => sum + longitude, 0) / count,
  };
  return {
    id: studyClusterId(first),
    kind: 'study-cluster',
    mark: { type: 'place', place: 'library' },
    marker: { name: `공부공간 ${count}곳 묶음 · 눌러서 확대`, short: `공부공간 ${count}곳`, count, minutesOld: null },
    subLabel: `공부공간 ${count}곳`,
    title: `공부공간 ${count}곳`,
    lines: [],
    primary: null,
    secondary: null,
    position,
    cluster: members.map((member) => member.position),
  };
}

// Which study pins would overlap at this zoom: the ids of each set of two or more, in the cards' order. A building
// within a place's group keeps to the group. Without a zoom, none. The main screen keys its cards by these sets, so
// that a move of the camera that merges nothing new leaves the cards as they were.
export function studyMerges(cards: readonly CardView[], zoom: number | null): string[][] {
  if (zoom === null) {
    return [];
  }
  const seeds: CardView[][] = [];
  for (const card of cards) {
    if (card.kind === 'study' && card.within === undefined) {
      const near = seeds.find(
        ([seed]) => seed !== undefined && apart(seed.position, card.position, zoom) < OVERLAP_POINTS,
      );
      if (near === undefined) {
        seeds.push([card]);
      } else {
        near.push(card);
      }
    }
  }
  return seeds.filter((one) => one.length > 1).map((members) => members.map(({ id }) => id));
}

// The cards with each set of `studyMerges` merged: the cluster's card comes where its first building's would, and each
// building's card stays, within the cluster, so that it has no marker of its own. With no set, the same cards.
export function clusteredStudy(
  cards: readonly CardView[],
  merges: readonly (readonly string[])[],
): readonly CardView[] {
  if (merges.length === 0) {
    return cards;
  }
  const clusterOf = new Map<string, CardView[]>();
  for (const ids of merges) {
    const members = cards.filter(({ id }) => ids.includes(id));
    for (const member of members) {
      clusterOf.set(member.id, members);
    }
  }
  return cards.flatMap((card): CardView[] => {
    const members = clusterOf.get(card.id);
    if (members === undefined) {
      return [card];
    }
    const [first] = members;
    const within = { ...card, within: studyClusterId(first ?? card) };
    return first === card ? [clusterCard(members), within] : [within];
  });
}

// --- 관정관's seats ---

// The slot a seat sector is read for now, or null for one that books nothing more today.
export function slotNow(sector: LibrarySpace, now: Date): Slot | null {
  const slot = tappedSlot(sector, now, { start: null, minutes: null });
  return minutesOf(slot.start) + sector.minMinutes <= minutesOf(sector.hours.close) ? slot : null;
}

// The free and the total seats over the sectors' seat lists: free is STATUS 1 and USECNT 0, and STATUS 9, an
// accessible seat, which is not booked online, is not counted.
export function seatCount(lists: readonly (readonly LibrarySeat[])[]): { free: number; total: number } {
  const states = lists.flat().map((seat) => seatState(seat));
  const counted = states.filter((state) => state !== 'accessible');
  return { free: counted.filter((state) => state === 'free').length, total: counted.length };
}
