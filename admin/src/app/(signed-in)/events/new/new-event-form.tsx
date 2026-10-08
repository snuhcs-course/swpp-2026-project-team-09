'use client';

import { type ReactElement, useState, useTransition } from 'react';

import type { Place } from '@/main-server';

import { type Edit, EventFields } from '../event-fields';
import { changeOf, type Fields, problemsOf } from '../fields';
import { createEvent } from './actions';

const EMPTY: Fields = {
  title: '',
  description: '',
  startDay: '',
  startTime: '',
  endDay: '',
  endTime: '',
  place: '',
  latitude: '',
  longitude: '',
};

export function NewEventForm({ places }: { places: Place[] }): ReactElement {
  const [fields, setFields] = useState(EMPTY);
  // The key of the last confirmation, kept for a retry until the form changes.
  const [key, setKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const problems = problemsOf(fields);
  const edit: Edit = (changed) => {
    setFields((previous) => ({ ...previous, ...changed }));
    setKey(null);
  };
  const create = (): void => {
    const attempt = key ?? crypto.randomUUID();
    setKey(attempt);
    startTransition(async () => {
      setMessage(await createEvent(attempt, changeOf(fields)));
    });
  };
  return (
    <div className="card space-y-5 p-4">
      {message !== null && !pending && (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </p>
      )}
      <EventFields fields={fields} edit={edit} problems={problems} places={places} />
      <div className="border-t border-zinc-200 pt-4">
        <button
          type="button"
          disabled={Object.keys(problems).length > 0 || pending}
          className="button button-primary"
          onClick={create}
        >
          Create the Draft
        </button>
      </div>
    </div>
  );
}
