/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@/api/types';
import type { TutorialState } from '@/api/tutorial-types';
import type { CardView } from '@/features/map/adapter';
import { metresBetween } from '@/features/quests/walking-times';
import { type MapMarker, useMarkerImages } from '@/map';
import type { MainMap } from '../use-main-map';
import type { Selection } from '../use-selection';

// What 지도에서 보기 of a tutorial quest shows: the place's point and its words (`shownPlace`), and whether it is a
// Place of the seed, where the map may have a card, or a point such as the 행정관 셔틀 정류장, where it has none.
export interface TutorialPinTarget {
  position: LatLng;
  words: string;
  atPlace: boolean;
}

export const TUTORIAL_PIN_ID = 'tutorial-place-pin';

// Above every other marker, a selected one included.
const PIN_ORDER = 3;

// How far from the Place's point a card still stands at it: a card of a Place is drawn at the Place's point.
const AT_PLACE_METRES = 25;

const PIN_LOOK = [{ kind: 'tutorialPlace' }] as const;

// The card at the pin's Place, if the map has one: a place's card or a place group, never a person or a moving
// vehicle, and never one within a group, whose group's card stands for it. The nearest wins.
function cardAt(cards: readonly CardView[], target: TutorialPinTarget): CardView | null {
  if (!target.atPlace) {
    return null;
  }
  const near = cards
    .filter((card) => card.within === undefined && card.mark.type !== 'person' && card.glideMs === undefined)
    .map((card) => ({ card, metres: metresBetween(card.position, target.position) }))
    .filter(({ metres }) => metres <= AT_PLACE_METRES)
    .toSorted((one, other) => one.metres - other.metres);
  return near[0]?.card ?? null;
}

export interface TutorialPin {
  // The pin's marker, or none.
  markers: readonly MapMarker[];
  // 지도에서 보기: an open card closes, the map comes close to the point and the pin stands there, in place of the one
  // shown.
  showOnMap: (target: TutorialPinTarget) => void;
  // A press on the map's marker with this id: the pin's opens the card at its Place, if there is one, and is kept;
  // another goes to `select`.
  press: (id: string) => void;
}

interface PinDeps {
  cards: readonly CardView[];
  selection: Pick<Selection, 'selected' | 'select' | 'close'>;
  goTo: MainMap['goTo'];
  tutorialState: TutorialState | undefined;
}

// Removes the pin once another thing than the card at its Place is selected, or the tutorial is stopped.
function useRemoval(
  setTarget: (target: null) => void,
  {
    selectedId,
    ownId,
    tutorialState,
  }: { selectedId: string | null; ownId: string | null; tutorialState: TutorialState | undefined },
): void {
  useEffect(() => {
    if (selectedId !== null && selectedId !== ownId) {
      setTarget(null);
    }
  }, [selectedId, ownId]);
  useEffect(() => {
    if (tutorialState === 'stopped' || tutorialState === 'off') {
      setTarget(null);
    }
  }, [tutorialState]);
}

// The one tutorial place pin on the main map, with its words under it. Another 지도에서 보기 replaces it; selecting
// another thing than the card at its Place, or stopping the tutorial, removes it.
export function useTutorialPin({ cards, selection, goTo, tutorialState }: PinDeps): TutorialPin {
  const { select, close } = selection;
  const selectedId = selection.selected?.id ?? null;
  const [target, setTarget] = useState<TutorialPinTarget | null>(null);
  const [image] = useMarkerImages(PIN_LOOK);
  const own = target === null ? null : cardAt(cards, target);
  const ownId = own?.id ?? null;
  useRemoval(setTarget, { selectedId, ownId, tutorialState });
  const markers = useMemo(
    (): MapMarker[] =>
      target === null || image === undefined
        ? []
        : [
            {
              id: TUTORIAL_PIN_ID,
              name: target.words,
              position: target.position,
              image,
              text: target.words,
              order: PIN_ORDER,
            },
          ],
    [target, image],
  );
  const press = useCallback(
    (id: string) => {
      if (id !== TUTORIAL_PIN_ID) {
        select(id);
      } else if (ownId !== null) {
        select(ownId);
      }
    },
    [select, ownId],
  );
  const showOnMap = useCallback(
    (shown: TutorialPinTarget) => {
      close();
      setTarget(shown);
      goTo(shown.position, 'close');
    },
    [close, goTo],
  );
  return { markers, showOnMap, press };
}
