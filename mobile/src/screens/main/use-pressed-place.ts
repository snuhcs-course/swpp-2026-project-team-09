/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { apiClient } from '@/api/client';
import type { Place } from '@/api/types';
import {
  atPoint,
  type MapCamera,
  type MapMarker,
  type MarkerLook,
  type Point,
  type Size,
  useMarkerImages,
} from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import { placeWords } from './my-card';
import type { Selection } from './use-selection';
import { SELECTED_ORDER } from './use-things';
import { type MapTap, useMapTap } from './tutorial/use-map-tap';

// A press on a building of the everyday map, found in JavaScript until a native release tells one (row 6's decision
// P1): a tap that no mark's press keeps, turned into a position by the camera at rest and the view's size, and the
// Place `GET /places/at` finds there.

// What watches the View around the map: its touches, and its size.
export type MapTouches = MapTap['touches'] & { onLayout: (event: LayoutChangeEvent) => void };

export interface PressedPlace {
  touches: MapTouches;
  // A press on a mark or a face, which keeps the tap it came with from counting.
  keep: () => void;
  // The pressed Place, marked as an answer marks its pick, under the card.
  markers: readonly MapMarker[];
}

const MARK_ID = 'pressed-place';
const MARK_LOOK: readonly MarkerLook[] = [
  { kind: 'answer', symbol: { type: 'dot', role: 'pick', number: null }, label: null },
];

function ignore(): void {
  // A point the main server could not answer for is no press.
}

// The touch's page point is its point in the map: the main screen has no header, and the map starts at the screen's
// top left, under the status bar. Until the View is laid out it counts as large as the window, as the plain ground
// does. The answer to a tap is dropped once another tap or a mark's press came, or presses are no longer taken.
function usePlaceTap(
  camera: MapCamera | null,
  active: boolean,
  onPlace: (place: Place) => void,
): Pick<PressedPlace, 'touches' | 'keep'> {
  const screenSize = useWindowDimensions();
  const [laidOut, setLaidOut] = useState<Size | null>(null);
  const size = laidOut ?? { width: screenSize.width, height: screenSize.height };
  const presses = useRef(0);
  const live = useRef({ camera, size, active, onPlace });
  useEffect(() => {
    live.current = { camera, size, active, onPlace };
  });
  const onTap = useCallback((point: Point) => {
    const now = live.current;
    if (now.camera === null) {
      return;
    }
    presses.current += 1;
    const asked = presses.current;
    apiClient.findPlaceAt(atPoint(point, now.camera, now.size)).then(({ place }) => {
      if (place !== null && asked === presses.current && live.current.active) {
        live.current.onPlace(place);
      }
    }, ignore);
  }, []);
  const tap = useMapTap(onTap, active);
  const { keep: keepTap } = tap;
  const keep = useCallback(() => {
    presses.current += 1;
    keepTap();
  }, [keepTap]);
  const onLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setLaidOut({ width: layout.width, height: layout.height });
  }, []);
  return { touches: { ...tap.touches, onLayout }, keep };
}

function usePlaceMark(place: Place | null): readonly MapMarker[] {
  const [image] = useMarkerImages(MARK_LOOK);
  return useMemo(
    (): MapMarker[] =>
      place === null || image === undefined
        ? []
        : [
            {
              id: MARK_ID,
              name: placeWords(place),
              position: { latitude: place.latitude, longitude: place.longitude },
              image,
              order: SELECTED_ORDER,
              passive: true,
            },
          ],
    [place, image],
  );
}

// The building press while `active`, which selects the Place it finds; the selected Place's mark; and the Place as
// what was tapped in every request while its card is open.
export function usePressedPlace(
  camera: MapCamera | null,
  { place, selectPlace }: Pick<Selection, 'place' | 'selectPlace'>,
  setTapped: ChatSheetControl['setTapped'],
  active: boolean,
): PressedPlace {
  const press = usePlaceTap(camera, active, selectPlace);
  const placeId = place?.id ?? null;
  useEffect(() => {
    setTapped(placeId === null ? null : { kind: 'place', placeId });
  }, [setTapped, placeId]);
  return { ...press, markers: usePlaceMark(place) };
}

// The touches of the tutorial pin's tap and of the building press, together on the View around the map.
export function bothTouches(pin: MapTap['touches'], { touches }: PressedPlace): MapTouches {
  return {
    onTouchStart: (event) => {
      pin.onTouchStart(event);
      touches.onTouchStart(event);
    },
    onTouchEnd: (event) => {
      pin.onTouchEnd(event);
      touches.onTouchEnd(event);
    },
    onTouchCancel: () => {
      pin.onTouchCancel();
      touches.onTouchCancel();
    },
    onLayout: touches.onLayout,
  };
}
