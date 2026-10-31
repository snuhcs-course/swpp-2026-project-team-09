/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import Link from 'next/link';
import type { ReactElement } from 'react';

import type { JudgedSession, Judgement, Place } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';

import { JUDGEMENT_TRIES } from '../publication';

function outcomeOf({ outcome, failure, attempts, sessions }: Judgement): string {
  if (outcome === 'judged') {
    const passed = sessions.filter((session) => session.passed).length;
    return `The AI read ${sessions.length} session(s) in this post, and ${passed} passed every check.`;
  }
  if (outcome === 'no_event') {
    return 'The AI called this post no event, so the Judgement publishes nothing.';
  }
  if (outcome === 'failed') {
    const next =
      attempts < JUDGEMENT_TRIES
        ? 'A try is left for the next Collection of its Source, unless Judgements are off or an Administrator has changed an event of this post.'
        : 'It will not be tried again.';
    return `The Judgement could not be made: ${failure ?? 'no reason recorded'}. Try ${attempts} of ${JUDGEMENT_TRIES}. ${next}`;
  }
  return `No answer yet: try ${attempts} of ${JUDGEMENT_TRIES} is running, or was left by a server that stopped.`;
}

function ReadValue({ label, value, lines }: { label: string; value: string | null; lines: string[] }): ReactElement {
  return (
    <div className="contents">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 space-y-1">
        <p className="font-medium break-words">{value ?? '—'}</p>
        {lines.map((line, index) => (
          // A model can quote one line twice.
          <blockquote
            key={`${index}-${line}`}
            className="border-l-2 border-zinc-200 pl-2 text-zinc-600 whitespace-pre-wrap break-words"
          >
            {line}
          </blockquote>
        ))}
      </dd>
    </div>
  );
}

function placeName(placeId: string | null, places: Place[]): string | null {
  if (placeId === null) {
    return null;
  }
  const place = places.find(({ id }) => id === placeId);
  if (place === undefined) {
    return placeId;
  }
  return place.number === null ? place.name : `${place.number} ${place.name}`;
}

// The event a session belongs to. That says nothing of how it got there or of its state, which the event's page tells:
// it may have been published, attached to an existing event, or be a Draft waiting for an Administrator.
function SessionEvent({ eventId, globalEventId }: { eventId: string; globalEventId: string | null }): ReactElement {
  if (globalEventId === null) {
    return <span className="text-zinc-600">Not linked to an event</span>;
  }
  if (globalEventId === eventId) {
    return <span className="font-medium text-accent-strong">This event</span>;
  }
  return (
    <Link href={`/events/${globalEventId}`} className="text-accent-strong hover:underline">
      Another event
    </Link>
  );
}

function JudgedSessionCard({
  session,
  number,
  eventId,
  places,
}: {
  session: JudgedSession;
  number: number;
  eventId: string;
  places: Place[];
}): ReactElement {
  const { start, end, place, overPeriod, lines, placeId, checks, passed, globalEventId } = session;
  const heading = `judgement-session-${number}`;
  return (
    <section
      aria-labelledby={heading}
      className={`space-y-3 rounded-md border p-3 ${globalEventId === eventId ? 'border-accent-strong' : 'border-zinc-200'}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <h3 id={heading} className="font-medium">
          Session {number}
        </h3>
        <span className={passed ? 'text-accent-strong' : 'font-medium text-red-700'}>
          {passed ? 'Passed' : 'Failed'}
        </span>
        <SessionEvent eventId={eventId} globalEventId={globalEventId} />
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <ReadValue label="Start" value={start} lines={lines.start} />
        <ReadValue label="End" value={end} lines={lines.end} />
        <ReadValue label="Place" value={place} lines={lines.place} />
        <ReadValue label="Matched Place" value={placeName(placeId, places)} lines={[]} />
        <ReadValue label="Over a period" value={overPeriod ? 'Yes' : 'No'} lines={[]} />
      </dl>
      <ul aria-label={`Checks of session ${number}`} className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {checks.map(({ name, passed: ok }, index) => (
          <li key={`${index}-${name}`} className={ok ? 'text-zinc-600' : 'font-medium text-red-700'}>
            {name}: {ok ? 'passed' : 'failed'}
          </li>
        ))}
      </ul>
    </section>
  );
}

// The Judgement of the event's post, whichever of its sessions this event is. Times stay as the AI wrote them, without
// an offset, which formatInSeoul would misread, and perhaps no time at all, since one the checks could not read shows too.
export function JudgementPanel({
  judgement,
  eventId,
  places,
}: {
  judgement: Judgement;
  eventId: string;
  places: Place[];
}): ReactElement {
  const { outcome, modelId, judgedAt, sessions } = judgement;
  return (
    <section aria-labelledby="judgement" className="card space-y-3 p-4">
      <h2 id="judgement">Judgement</h2>
      <p className="text-sm">{outcomeOf(judgement)}</p>
      {outcome !== null && (
        <p className="text-sm text-zinc-600">
          Model {modelId ?? '—'} · {judgedAt === null ? '—' : formatInSeoul(judgedAt)}
        </p>
      )}
      {sessions.length > 0 && (
        <p className="text-sm text-zinc-600">Times are as the AI wrote them; it is asked for Seoul&apos;s time.</p>
      )}
      {sessions.map((session, index) => (
        <JudgedSessionCard key={index} session={session} number={index + 1} eventId={eventId} places={places} />
      ))}
    </section>
  );
}
