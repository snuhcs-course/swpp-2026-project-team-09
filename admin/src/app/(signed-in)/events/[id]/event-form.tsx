'use client';

import { type ReactElement, type ReactNode, useState, useTransition } from 'react';

import type { GlobalEvent, Place } from '@/main-server';

import { POSSIBLY_WITHOUT_TIME } from '../../start-time';
import { changeEvent, loadCurrentVersion, type Refused } from './actions';
import {
  changeOf,
  type Fields,
  fieldsOf,
  listed,
  neededToPublish,
  placesMatching,
  type Problems,
  problemsOf,
} from './fields';

type Edit = (changed: Partial<Fields>) => void;
type Run = (change: () => Promise<Refused | null>) => void;

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

function RefusedMessage({ refused, run }: { refused: Refused; run: Run }): ReactElement {
  return (
    <div role="alert" className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <p className="text-amber-900">{refused.message}</p>
      {refused.reload && (
        <button
          type="button"
          className="button"
          onClick={() => {
            run(async () => {
              await loadCurrentVersion();
              return null;
            });
          }}
        >
          Load the current version
        </button>
      )}
    </div>
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

function PositionFields({ fields, edit }: { fields: Fields; edit: Edit }): ReactElement {
  return (
    <Group label="Position">
      <div className="flex flex-wrap items-center gap-2">
        <Input label="Latitude" name="latitude" type="number" fields={fields} edit={edit} />
        <Input label="Longitude" name="longitude" type="number" fields={fields} edit={edit} />
        <button
          type="button"
          className="button"
          onClick={() => {
            edit({ latitude: '', longitude: '' });
          }}
        >
          Clear the position
        </button>
      </div>
    </Group>
  );
}

// Discarding a Draft or cancelling a published event, after the person confirms.
function EndButton({ event, run, pending }: { event: GlobalEvent; run: Run; pending: boolean }): ReactElement {
  const draft = event.state === 'draft';
  const question = draft
    ? 'Discard this Draft? It will never be published.'
    : 'Cancel this event? Users and the Holders of its Quests will see it cancelled. This cannot be undone.';
  return (
    <button
      type="button"
      disabled={pending}
      className="button button-danger ml-auto"
      onClick={() => {
        if (window.confirm(question)) {
          run(() => changeEvent({ kind: draft ? 'discard' : 'cancel', id: event.id, version: event.version }));
        }
      }}
    >
      {draft ? 'Discard' : 'Cancel the event'}
    </button>
  );
}

interface ControlsProps {
  event: GlobalEvent;
  fields: Fields;
  run: Run;
  pending: boolean;
}

function Controls({ event, fields, run, pending }: ControlsProps): ReactElement {
  const draft = event.state === 'draft';
  const valid = Object.keys(problemsOf(fields)).length === 0;
  const needed = neededToPublish(fields);
  const send = (kind: 'save' | 'publish'): void => {
    run(() => changeEvent({ kind, id: event.id, version: event.version, change: changeOf(fields) }));
  };
  return (
    <div className="space-y-2 border-t border-zinc-200 pt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!valid || pending}
          className={draft ? 'button' : 'button button-primary'}
          onClick={() => {
            send('save');
          }}
        >
          Save
        </button>
        {draft && (
          <button
            type="button"
            disabled={!valid || needed.length > 0 || pending}
            className="button button-primary"
            onClick={() => {
              if (window.confirm('Publish this event? Users see it on their map at once.')) {
                send('publish');
              }
            }}
          >
            Publish
          </button>
        )}
        <EndButton event={event} run={run} pending={pending} />
      </div>
      {draft && needed.length > 0 && <p className="text-sm text-zinc-600">To publish, add {listed(needed)}.</p>}
      {!draft && <p className="text-sm text-zinc-600">Users see a saved change at once.</p>}
    </div>
  );
}

// The page gives it a key of the event's version, so that the form starts again from each version it loads.
export function EventForm({ event, places }: { event: GlobalEvent; places: Place[] }): ReactElement {
  const [fields, setFields] = useState(() => fieldsOf(event));
  const [refused, setRefused] = useState<Refused | null>(null);
  const [pending, startTransition] = useTransition();
  const problems = problemsOf(fields);
  const edit: Edit = (changed) => {
    setFields((previous) => ({ ...previous, ...changed }));
  };
  const run: Run = (change) => {
    startTransition(async () => {
      setRefused(await change());
    });
  };
  return (
    <div className="card space-y-5 p-4">
      {refused !== null && !pending && <RefusedMessage refused={refused} run={run} />}
      <TextFields fields={fields} edit={edit} problems={problems} />
      <TimeFields fields={fields} edit={edit} problems={problems} />
      <PlaceFields fields={fields} edit={edit} places={places} />
      <PositionFields fields={fields} edit={edit} />
      <Controls event={event} fields={fields} run={run} pending={pending} />
    </div>
  );
}
