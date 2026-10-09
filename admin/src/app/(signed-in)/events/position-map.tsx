// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use client';

import { type ReactElement, useEffect, useEffectEvent, useRef, useState } from 'react';

import { type Marker, type Position, useKakaoMap } from '@/kakao-maps';

// Kakao's map with the event's position as a marker, or the campus without one. Pointing on the map reports the point.
export function PositionMap({
  position,
  onPoint,
}: {
  position: Position | null;
  onPoint: (position: Position) => void;
}): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const { loaded, failed } = useKakaoMap(container, 4);
  const [marker, setMarker] = useState<Marker | null>(null);
  const pointed = useEffectEvent(onPoint);

  useEffect(() => {
    if (loaded === null) {
      return;
    }
    const { maps, map } = loaded;
    setMarker(new maps.Marker({ position: new maps.LatLng(0, 0) }));
    maps.event.addListener(map, 'click', ({ latLng }) => {
      pointed({ latitude: latLng.getLat(), longitude: latLng.getLng() });
    });
  }, [loaded]);

  const latitude = position?.latitude;
  const longitude = position?.longitude;
  useEffect(() => {
    if (loaded === null || marker === null) {
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      marker.setMap(null);
      return;
    }
    const at = new loaded.maps.LatLng(latitude, longitude);
    marker.setPosition(at);
    marker.setMap(loaded.map);
    loaded.map.panTo(at);
  }, [loaded, marker, latitude, longitude]);

  return failed ? (
    <p className="text-sm text-red-700">The map could not be loaded. Check the Kakao JavaScript key and its domains.</p>
  ) : (
    <div ref={container} className="h-72 w-full rounded-md border border-zinc-200 bg-zinc-100" />
  );
}
