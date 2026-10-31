/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import Link from 'next/link';
import type { ReactElement } from 'react';

import { type ListedGlobalEvent, mainServer, type Missing, type PublicationRoute } from '@/main-server';
import { asAdministrator } from '@/session';

import { NeedsAdministratorMark, PUBLICATION_ROUTES } from './events/publication';
import { StartTime } from './start-time';

const NEEDED: Record<Missing, string> = { startsAt: 'Start', position: 'Position' };

type Column = 'missing' | 'route';

function EventRow({ event, column }: { event: ListedGlobalEvent; column: Column }): ReactElement {
  return (
    <tr>
      <td className="font-medium">
        <Link href={`/events/${event.id}`} className="text-accent-strong hover:underline">
          {event.title}
        </Link>
        {event.needsAdministrator && <NeedsAdministratorMark />}
      </td>
      <td className="whitespace-nowrap">{event.startsAt !== null && <StartTime startsAt={event.startsAt} />}</td>
      <td>{event.place}</td>
      {column === 'missing' ? (
        <td className={event.missing.length === 0 ? 'text-zinc-500' : 'text-red-700'}>
          {event.missing.length === 0 ? 'Nothing' : event.missing.map((each) => NEEDED[each]).join(', ')}
        </td>
      ) : (
        <td>{event.publicationRoute === null ? '—' : PUBLICATION_ROUTES[event.publicationRoute]}</td>
      )}
    </tr>
  );
}

function EventTable({
  id,
  caption,
  events,
  empty,
  column,
  filter,
}: {
  id: string;
  caption: string;
  events: ListedGlobalEvent[];
  empty: string;
  column: Column;
  filter?: ReactElement;
}): ReactElement {
  return (
    <section className="space-y-3">
      <h2 id={id}>{caption}</h2>
      {filter}
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
                <th>{column === 'missing' ? 'Still needs' : 'Publication Route'}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} column={column} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const isRoute = (value: unknown): value is PublicationRoute =>
  typeof value === 'string' && Object.keys(PUBLICATION_ROUTES).includes(value);

// In the address, so that coming back from an event's page keeps it.
function RouteFilter({ current }: { current: PublicationRoute | undefined }): ReactElement {
  const choices: [string, string, boolean][] = [
    ['All', '/', current === undefined],
    ...Object.entries(PUBLICATION_ROUTES).map(([route, label]): [string, string, boolean] => [
      label,
      `/?route=${route}`,
      route === current,
    ]),
  ];
  return (
    <nav aria-label="Filter by Publication Route" className="flex flex-wrap gap-1 text-sm">
      {choices.map(([label, href, chosen]) => (
        <Link
          key={label}
          href={href}
          scroll={false}
          aria-current={chosen ? 'true' : undefined}
          className="rounded-md px-3 py-1 font-medium text-zinc-700 hover:bg-zinc-100 aria-[current=true]:bg-accent-soft aria-[current=true]:text-accent-strong"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default async function EventsPage({ searchParams }: PageProps<'/'>): Promise<ReactElement> {
  const { route: asked } = await searchParams;
  const route = isRoute(asked) ? asked : undefined;
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
      <EventTable id="drafts" caption="Drafts" events={drafts} empty="No Drafts are waiting." column="missing" />
      <EventTable
        id="published"
        caption="Published"
        events={route === undefined ? published : published.filter((each) => each.publicationRoute === route)}
        empty={
          route === undefined
            ? 'No published event is still to come.'
            : `No published event still to come has the route ${PUBLICATION_ROUTES[route]}.`
        }
        column="route"
        filter={<RouteFilter current={route} />}
      />
    </div>
  );
}
