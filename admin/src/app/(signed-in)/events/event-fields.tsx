// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use client';

import { type ReactElement, type ReactNode, useState } from 'react';

import { kakaoJavaScriptKey } from '@/kakao-maps';
import type { Place } from '@/main-server';

import { POSSIBLY_WITHOUT_TIME } from '../start-time';
import { type Fields, placesMatching, type Problems } from './fields';
import { PositionMap } from './position-map';

export type Edit = (changed: Partial<Fields>) => void;

const LABEL = 'text-sm font-medium text-zinc-700';
const PROBLEM = 'text-sm text-red-700';

function Group({ label, children, problem }: { label: string; children: ReactNode; problem?: string }): ReactElement {
  return (
    <fieldset className="space-y-1">
      <legend className={LABEL}>{label}</legend>
      {children}
      {problem !== undefined && <p className={PROBLEM}>{problem}</p>}
    </fieldset>
  );
}

function Input(props: { label: string; name: keyof Fields; fields: Fields; edit: Edit; type?: string }): ReactElement {
  const { label, name, fields, edit, type = 'text' } = props;
  return (
    <input
      aria-label={label}
      type={type}
      step={type === 'number' ? 'any' : undefined}
      value={fields[name]}
      onChange={(change) => {
        edit({ [name]: change.target.value });
      }}
      className="input"
    />
  );
}

function TextFields({ fields, edit, problems }: { fields: Fields; edit: Edit; problems: Problems }): ReactElement {
  return (
    <>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={LABEL}>Title</span>
          <input
            value={fields.title}
            onChange={(change) => {
              edit({ title: change.target.value });
            }}
            className="input w-full"
          />
        </label>
        {problems.title !== undefined && <p className={PROBLEM}>{problems.title}</p>}
      </div>
      <label className="block space-y-1">
        <span className={LABEL}>Description</span>
        <textarea
          rows={6}
          value={fields.description}
          onChange={(change) => {
            edit({ description: change.target.value });
          }}
          className="input w-full"
        />
      </label>
    </>
  );
}

function TimeFields({ fields, edit, problems }: { fields: Fields; edit: Edit; problems: Problems }): ReactElement {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Group label="Start (Seoul)" problem={problems.start}>
        <div className="flex flex-wrap gap-2">
          <Input label="Start day" name="startDay" type="date" fields={fields} edit={edit} />
          <Input label="Start time" name="startTime" type="time" fields={fields} edit={edit} />
        </div>
        {fields.startTime === '00:00' && <p className="text-sm text-amber-700">{POSSIBLY_WITHOUT_TIME}</p>}
      </Group>
      <Group label="End (Seoul)" problem={problems.end}>
        <div className="flex flex-wrap gap-2">
          <Input label="End day" name="endDay" type="date" fields={fields} edit={edit} />
          <Input label="End time" name="endTime" type="time" fields={fields} edit={edit} />
        </div>
      </Group>
    </div>
  );
}

// Choosing a Place sets the place name and the position to the Place's; the name can then be edited.
function PlaceFields({ fields, edit, places }: { fields: Fields; edit: Edit; places: Place[] }): ReactElement {
  const [query, setQuery] = useState('');
  return (
    <Group label="Place">
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
      <ul className="divide-y divide-zinc-100">
        {placesMatching(places, query).map((place) => (
          <li key={place.id}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
              onClick={() => {
                edit({ place: place.name, latitude: String(place.latitude), longitude: String(place.longitude) });
                setQuery('');
              }}
            >
              {place.number === null ? place.name : `${place.number} ${place.name}`}
            </button>
          </li>
        ))}
      </ul>
      <Input label="Place name" name="place" fields={fields} edit={edit} />
    </Group>
  );
}

// A point is kept to 6 decimals, about 10 cm.
function rounded(degrees: number): string {
  return String(Number(degrees.toFixed(6)));
}

// On Kakao's map when the site has its key, else as two numbers.
function PositionFields({ fields, edit }: { fields: Fields; edit: Edit }): ReactElement {
  const onMap = kakaoJavaScriptKey() !== undefined;
  const set = fields.latitude !== '' && fields.longitude !== '';
  const clear = (
    <button
      type="button"
      className="button"
      onClick={() => {
        edit({ latitude: '', longitude: '' });
      }}
    >
      Clear the position
    </button>
  );
  if (!onMap) {
    return (
      <Group label="Position">
        <div className="flex flex-wrap items-center gap-2">
          <Input label="Latitude" name="latitude" type="number" fields={fields} edit={edit} />
          <Input label="Longitude" name="longitude" type="number" fields={fields} edit={edit} />
          {clear}
        </div>
      </Group>
    );
  }
  return (
    <Group label="Position">
      <p className="text-sm text-zinc-600">Point on the map to set the position. The place name stays as it is.</p>
      <PositionMap
        position={set ? { latitude: Number(fields.latitude), longitude: Number(fields.longitude) } : null}
        onPoint={({ latitude, longitude }) => {
          edit({ latitude: rounded(latitude), longitude: rounded(longitude) });
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <output aria-label="Position" className="text-sm">
          {set ? `${fields.latitude}, ${fields.longitude}` : 'No position'}
        </output>
        {clear}
      </div>
    </Group>
  );
}

// The fields of an event's form, shared by the event's page and the page for a new event.
export function EventFields(props: { fields: Fields; edit: Edit; problems: Problems; places: Place[] }): ReactElement {
  const { fields, edit, problems, places } = props;
  return (
    <>
      <TextFields fields={fields} edit={edit} problems={problems} />
      <TimeFields fields={fields} edit={edit} problems={problems} />
      <PlaceFields fields={fields} edit={edit} places={places} />
      <PositionFields fields={fields} edit={edit} />
    </>
  );
}
