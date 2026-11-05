/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import { useDiningCards } from '@/features/dining/use-dining';
import type { CardView } from '@/features/map/adapter';
import { groupedByPlace } from '@/features/map/place-groups';
import { useMapCards } from '@/features/map/use-map-cards';
import { type ShuttleLayer, useShuttle } from '@/features/shuttle/use-shuttle';
import { clusteredStudy, studyMerges } from '@/features/study/adapter';
import { useStudyCards } from '@/features/study/use-study';
import type { ChatSheetControl } from './chat-sheet';
import { type LayerStack, useLayerStack } from './layers';
import { ROUTE_PADDING } from './layout';
import type { MainMap } from './use-main-map';
import type { Selection } from './use-selection';

const NO_CARDS: readonly CardView[] = [];

// The zoom at which overlapping study pins merge: the camera's while the whole campus is in view, else none.
function overviewZoom(map: MainMap): number | null {
  return map.detail === 'overview' ? (map.camera?.zoom ?? map.fitZoom) : null;
}

// The map's cards, and the 식당, shuttle and 공부공간 layers' while they are on, with the things at one place
// grouped: a layer turned off takes its things out of the groups. While the whole campus is in view, study pins that
// would overlap merge. `ready` once the map's own cards are known.
function useCards(
  layers: { dining: boolean; study: boolean },
  shuttle: ShuttleLayer,
  zoom: number | null,
): { cards: readonly CardView[]; ready: boolean } {
  const { data } = useMapCards();
  const mapCards = data ?? NO_CARDS;
  const diningCards = useDiningCards(layers.dining);
  const studyCards = useStudyCards(layers.study);
  const grouped = useMemo(
    () => groupedByPlace([...mapCards, ...diningCards, ...studyCards, ...shuttle.cards]),
    [mapCards, diningCards, studyCards, shuttle.cards],
  );
  // Keyed by what merges, not by the zoom: a camera that moves, as a press on a list's row makes it, keeps the same
  // cards unless the merged pins change. A selection waiting for the cards (`selectOrWait`) waits for new cards.
  const merges = studyMerges(grouped, zoom);
  const mergesKey = JSON.stringify(merges);
  // `mergesKey` stands for `merges`, which is new each render.
  const cards = useMemo(() => clusteredStudy(grouped, merges), [grouped, mergesKey]);
  return { cards, ready: data !== undefined };
}

// A press on the map: merged study pins come into view, and anything else is selected.
export function pressOnMap(cards: readonly CardView[], map: MainMap, selection: Selection): (id: string) => void {
  return (id) => {
    const cluster = cards.find((card) => card.id === id)?.cluster;
    if (cluster === undefined) {
      selection.select(id);
    } else {
      map.fitTo(cluster, ROUTE_PADDING);
    }
  };
}

// Opens the chat and sends the words, as the User would.
export function askAssistant(chat: ChatSheetControl): (words: string) => void {
  return (words) => {
    chat.open();
    chat.chat.send(words);
  };
}

export interface MainLayers {
  stack: LayerStack;
  shuttle: ShuttleLayer;
  cards: readonly CardView[];
  ready: boolean;
}

// The 편의기능 stack and what its layers put on the map, with the map's own cards. The chat's sheet, which turns a
// layer on from a map button and which a card's button may ask, is the main screen's, since it opens from the card
// that is selected.
export function useMainLayers(inFront: boolean, map: MainMap): MainLayers {
  const stack = useLayerStack(inFront);
  const shuttle = useShuttle(stack.layers.shuttle);
  const { cards, ready } = useCards(stack.layers, shuttle, overviewZoom(map));
  return { stack, shuttle, cards, ready };
}
