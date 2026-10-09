/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use client';

import { type ReactElement, useState, useTransition } from 'react';

import type { GlobalEvent, Place } from '@/main-server';

import { type Edit, EventFields } from '../event-fields';
import { changeOf, type Fields, fieldsOf, listed, neededToPublish, problemsOf } from '../fields';
import { changeEvent, loadCurrentVersion, type Refused } from './actions';

type Run = (change: () => Promise<Refused | null>) => void;

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
      <EventFields fields={fields} edit={edit} problems={problems} places={places} />
      <Controls event={event} fields={fields} run={run} pending={pending} />
    </div>
  );
}
