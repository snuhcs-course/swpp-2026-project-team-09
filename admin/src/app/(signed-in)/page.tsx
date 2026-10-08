import Link from 'next/link';
import type { ReactElement } from 'react';

import { type ListedGlobalEvent, mainServer, type Missing } from '@/main-server';
import { asAdministrator } from '@/session';

import { StartTime } from './start-time';

const NEEDED: Record<Missing, string> = { startsAt: 'Start', position: 'Position' };

function EventRow({ event, showMissing }: { event: ListedGlobalEvent; showMissing: boolean }): ReactElement {
  return (
    <tr>
      <td className="font-medium">
        <Link href={`/events/${event.id}`} className="text-accent-strong hover:underline">
          {event.title}
        </Link>
      </td>
      <td className="whitespace-nowrap">{event.startsAt !== null && <StartTime startsAt={event.startsAt} />}</td>
      <td>{event.place}</td>
      {showMissing && (
        <td className={event.missing.length === 0 ? 'text-zinc-500' : 'text-red-700'}>
          {event.missing.length === 0 ? 'Nothing' : event.missing.map((each) => NEEDED[each]).join(', ')}
        </td>
      )}
    </tr>
  );
}

function EventTable({
  id,
  caption,
  events,
  empty,
  showMissing,
}: {
  id: string;
  caption: string;
  events: ListedGlobalEvent[];
  empty: string;
  showMissing: boolean;
}): ReactElement {
  return (
    <section className="space-y-3">
      <h2 id={id}>{caption}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="card">
          <table className="data-table" aria-labelledby={id}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Start (Seoul)</th>
                <th>Place</th>
                {showMissing && <th>Still needs</th>}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} showMissing={showMissing} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function EventsPage(): Promise<ReactElement> {
  const [drafts, published] = await asAdministrator('/', (token) =>
    Promise.all([mainServer.listGlobalEvents(token, 'draft'), mainServer.listGlobalEvents(token, 'published')]),
  );
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Events</h1>
          <Link href="/events/new" className="button button-primary">
            New event
          </Link>
        </div>
        <p className="text-sm text-zinc-600">
          Drafts wait for an Administrator to check and publish them, nearest start first. Published events that have
          not ended are below. Times are Seoul&apos;s.
        </p>
      </header>
      <EventTable id="drafts" caption="Drafts" events={drafts} empty="No Drafts are waiting." showMissing />
      <EventTable
        id="published"
        caption="Published"
        events={published}
        empty="No published event is still to come."
        showMissing={false}
      />
    </div>
  );
}
