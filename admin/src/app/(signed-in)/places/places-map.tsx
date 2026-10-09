// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use client';

import { type ReactElement, useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  type KakaoMap,
  type KakaoMaps,
  kakaoJavaScriptKey,
  type LoadedMap,
  type Polygon,
  useKakaoMap,
} from '@/kakao-maps';
import type { Place } from '@/main-server';

const OUTLINE = { strokeColor: '#4f46e5', strokeWeight: 1, fillColor: '#6366f1', fillOpacity: 0.2, zIndex: 1 };
const SELECTED = { strokeColor: '#b91c1c', strokeWeight: 3, fillColor: '#ef4444', fillOpacity: 0.45, zIndex: 2 };
const LABEL = 'rounded bg-white/90 px-1 text-[11px] font-medium text-zinc-800 shadow-sm';
const SELECTED_LABEL = 'rounded bg-red-700 px-1 text-[11px] font-medium text-white shadow-sm';

interface Drawn {
  polygons: Map<string, Polygon[]>;
  labels: Map<string, HTMLElement>;
}

function labelOf(place: Place, onClick: () => void): HTMLElement {
  const label = document.createElement('button');
  label.type = 'button';
  label.textContent = place.number ?? place.name;
  label.className = LABEL;
  label.addEventListener('click', onClick);
  return label;
}

// An outline that several Places share is drawn once, and a click on it selects the first of them.
function draw(maps: KakaoMaps, map: KakaoMap, places: Place[], select: (id: string) => void): Drawn {
  const drawn: Drawn = { polygons: new Map(), labels: new Map() };
  const byRing = new Map<string, Polygon>();
  for (const place of places) {
    const own = place.outlines.map((ring) => {
      const key = JSON.stringify(ring);
      const known = byRing.get(key);
      if (known !== undefined) {
        return known;
      }
      const path = ring.map(({ latitude, longitude }) => new maps.LatLng(latitude, longitude));
      const polygon = new maps.Polygon({ path, ...OUTLINE });
      polygon.setMap(map);
      maps.event.addListener(polygon, 'click', () => {
        select(place.id);
      });
      byRing.set(key, polygon);
      return polygon;
    });
    drawn.polygons.set(place.id, own);
    const position = new maps.LatLng(place.latitude, place.longitude);
    if (place.outlines.length === 0) {
      const marker = new maps.Marker({ position, title: place.name });
      marker.setMap(map);
      maps.event.addListener(marker, 'click', () => {
        select(place.id);
      });
    }
    const label = labelOf(place, () => {
      select(place.id);
    });
    new maps.CustomOverlay({ position, content: label, yAnchor: 0 }).setMap(map);
    drawn.labels.set(place.id, label);
  }
  return drawn;
}

// Highlights the selected Place and moves the map to it, until another is selected.
function useHighlight(loaded: LoadedMap | null, drawn: Drawn | null, place: Place | undefined): void {
  useEffect(() => {
    const polygons = place === undefined ? [] : (drawn?.polygons.get(place.id) ?? []);
    const label = place === undefined ? undefined : drawn?.labels.get(place.id);
    for (const polygon of polygons) {
      polygon.setOptions(SELECTED);
    }
    label?.setAttribute('class', SELECTED_LABEL);
    if (loaded !== null && place !== undefined) {
      loaded.map.panTo(new loaded.maps.LatLng(place.latitude, place.longitude));
    }
    return (): void => {
      for (const polygon of polygons) {
        polygon.setOptions(OUTLINE);
      }
      label?.setAttribute('class', LABEL);
    };
  }, [loaded, drawn, place]);
}

// Kakao's map of the campus with every Place: its outlines, or a marker without one, and its number or name. A click
// on a Place reports it; the selected Place is highlighted and the map moves to it.
export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const { loaded, failed } = useKakaoMap(container, 5);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const select = useEffectEvent(onSelect);

  useEffect(() => {
    if (loaded === null) {
      return;
    }
    const { maps, map } = loaded;
    map.addControl(new maps.MapTypeControl(), maps.ControlPosition.TOPRIGHT);
    setDrawn(
      draw(maps, map, places, (id) => {
        select(id);
      }),
    );
  }, [loaded, places]);

  useHighlight(
    loaded,
    drawn,
    places.find((place) => place.id === selectedId),
  );

  if (kakaoJavaScriptKey() === undefined) {
    return <p className="text-sm text-zinc-600">Set NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY to see the map.</p>;
  }
  return failed ? (
    <p className="text-sm text-red-700">The map could not be loaded. Check the Kakao JavaScript key and its domains.</p>
  ) : (
    <div ref={container} className="h-[32rem] w-full rounded-md border border-zinc-200 bg-zinc-100" />
  );
}
