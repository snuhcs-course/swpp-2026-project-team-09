/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use client';

import { type ReactElement, useState } from 'react';

import type { Place, PlaceOrigin } from '@/main-server';

import { placesMatching } from '../events/fields';
import { PlacesMap } from './places-map';

const ORIGINS: Record<PlaceOrigin, string> = {
  campus_map: 'SNU campus map',
  openstreetmap: 'OpenStreetMap',
  national_map: 'National map',
};

function nameOf(place: Place): string {
  return place.number === null ? place.name : `${place.number} ${place.name}`;
}

// The other Places that have this outline too.
function sharing(places: Place[], place: Place, ring: Place['outlines'][number]): Place[] {
  const key = JSON.stringify(ring);
  return places.filter((other) => other.id !== place.id && other.outlines.some((each) => JSON.stringify(each) === key));
}

function Search({ places, select }: { places: Place[]; select: (id: string) => void }): ReactElement {
  const [query, setQuery] = useState('');
  const found = placesMatching(places, query);
  return (
    <div className="space-y-1">
      <input
        aria-label="Find a Place"
        type="search"
        placeholder="Find a Place by name or number"
        value={query}
        onChange={(change) => {
          setQuery(change.target.value);
        }}
        className="input w-full"
      />
      {query.trim() !== '' && found.length === 0 && <p className="text-sm text-zinc-500">No Place matches.</p>}
      <ul aria-label="Found Places" className="divide-y divide-zinc-100">
        {found.map((place) => (
          <li key={place.id}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
              onClick={() => {
                select(place.id);
                setQuery('');
              }}
            >
              {nameOf(place)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Outlines({
  place,
  places,
  select,
}: {
  place: Place;
  places: Place[];
  select: (id: string) => void;
}): ReactElement {
  if (place.outlines.length === 0) {
    return <p className="text-sm text-zinc-600">No outline: the map shows it as a marker at its position.</p>;
  }
  return (
    <ol className="space-y-1 text-sm">
      {place.outlines.map((ring, index) => {
        const others = sharing(places, place, ring);
        return (
          // oxlint-disable-next-line react/no-array-index-key -- a stored outline has no id of its own
          <li key={index}>
            Outline {index + 1} · {ring.length} points
            {others.length > 0 && (
              <span>
                {' · also the outline of '}
                {others.map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    className="mr-2 text-accent-strong hover:underline"
                    onClick={() => {
                      select(other.id);
                    }}
                  >
                    {nameOf(other)}
                  </button>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PlaceRecord({
  place,
  places,
  select,
}: {
  place: Place;
  places: Place[];
  select: (id: string) => void;
}): ReactElement {
  const rows: [string, string][] = [
    ['Number', place.number ?? '—'],
    ['Name', place.name],
    ['Origin', ORIGINS[place.origin]],
    ['Position', `${place.latitude}, ${place.longitude}`],
  ];
  return (
    <section aria-labelledby="record" className="card space-y-3 p-4">
      <h2 id="record">{nameOf(place)}</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="text-sm font-medium text-zinc-500">Outlines</h3>
      <Outlines place={place} places={places} select={select} />
    </section>
  );
}

function Attribution(): ReactElement {
  return (
    <p className="text-xs text-zinc-500">
      Places from the SNU campus map. Outlines from{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
        © OpenStreetMap contributors
      </a>
      , under the ODbL, and from 국토지리정보원 (National Geographic Information Institute), 연속수치지형도 건물,
      through VWorld, under 공공누리 제1유형.
    </p>
  );
}

export function PlacesView({ places }: { places: Place[] }): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = places.find((place) => place.id === selectedId);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-2">
        <PlacesMap places={places} selectedId={selectedId} onSelect={setSelectedId} />
        <Attribution />
      </div>
      <div className="space-y-4">
        <Search places={places} select={setSelectedId} />
        {selected === undefined ? (
          <p className="text-sm text-zinc-600">Find a Place or click one on the map to see its record.</p>
        ) : (
          <PlaceRecord place={selected} places={places} select={setSelectedId} />
        )}
      </div>
    </div>
  );
}
