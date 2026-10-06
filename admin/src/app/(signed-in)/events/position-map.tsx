'use client';

import { type ReactElement, type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  CAMPUS_CENTER,
  type KakaoMap,
  type KakaoMaps,
  kakaoJavaScriptKey,
  loadKakaoMaps,
  type Marker,
  type Position,
} from '@/kakao-maps';

interface Loaded {
  maps: KakaoMaps;
  map: KakaoMap;
  marker: Marker;
}

// Loads Kakao's map into `container`, centred on the campus, and reports each point on it.
function useKakaoMap(
  container: RefObject<HTMLDivElement | null>,
  onPoint: (position: Position) => void,
): { loaded: Loaded | null; failed: boolean } {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const pointed = useEffectEvent(onPoint);

  useEffect(() => {
    const key = kakaoJavaScriptKey();
    let live = key !== undefined;
    if (key !== undefined) {
      loadKakaoMaps(key).then(
        (maps) => {
          if (!live || container.current === null) {
            return;
          }
          const center = new maps.LatLng(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude);
          const map = new maps.Map(container.current, { center, level: 4 });
          const marker = new maps.Marker({ position: center });
          maps.event.addListener(map, 'click', ({ latLng }) => {
            pointed({ latitude: latLng.getLat(), longitude: latLng.getLng() });
          });
          setLoaded({ maps, map, marker });
        },
        () => {
          setFailed(true);
        },
      );
    }
    return (): void => {
      live = false;
    };
  }, [container]);

  return { loaded, failed };
}

// Kakao's map with the event's position as a marker, or the campus without one. Pointing on the map reports the point.
export function PositionMap({
  position,
  onPoint,
}: {
  position: Position | null;
  onPoint: (position: Position) => void;
}): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const { loaded, failed } = useKakaoMap(container, onPoint);

  const latitude = position?.latitude;
  const longitude = position?.longitude;
  useEffect(() => {
    if (loaded === null) {
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      loaded.marker.setMap(null);
      return;
    }
    const at = new loaded.maps.LatLng(latitude, longitude);
    loaded.marker.setPosition(at);
    loaded.marker.setMap(loaded.map);
    loaded.map.panTo(at);
  }, [loaded, latitude, longitude]);

  return failed ? (
    <p className="text-sm text-red-700">The map could not be loaded. Check the Kakao JavaScript key and its domains.</p>
  ) : (
    <div ref={container} className="h-72 w-full rounded-md border border-zinc-200 bg-zinc-100" />
  );
}
