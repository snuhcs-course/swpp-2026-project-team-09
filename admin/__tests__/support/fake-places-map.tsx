/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';

import type { Place } from '@/main-server';

// Stands in for Kakao's map of the Places: it lists what it was handed, and a click on an entry is a click on the map.
export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): ReactElement {
  return (
    <ul aria-label="On the map">
      {places.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            aria-pressed={place.id === selectedId}
            onClick={() => {
              onSelect(place.id);
            }}
          >
            {`Map: ${place.number ?? place.name} · ${place.outlines.length} outlines`}
          </button>
        </li>
      ))}
    </ul>
  );
}
