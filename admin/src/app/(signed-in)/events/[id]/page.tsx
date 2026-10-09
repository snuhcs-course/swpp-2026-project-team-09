// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { type GlobalEvent, type GlobalEventState, mainServer, MainServerError } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';
import { asAdministrator } from '@/session';

import { StartTime } from '../../start-time';
import { EventForm } from './event-form';

const STATES: Record<GlobalEventState, { label: string; look: string }> = {
  draft: { label: 'Draft', look: 'bg-amber-50 text-amber-800' },
  published: { label: 'Published', look: 'bg-accent-soft text-accent-strong' },
  cancelled: { label: 'Cancelled', look: 'bg-red-50 text-red-700' },
  discarded: { label: 'Discarded', look: 'bg-zinc-100 text-zinc-600' },
};

async function read(token: string, id: string): Promise<GlobalEvent> {
  try {
    return await mainServer.readGlobalEvent(token, id);
  } catch (error) {
    // 400 is an id that is not a UUID, which names no event either.
    if (error instanceof MainServerError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }
}

function Source({ event }: { event: GlobalEvent }): ReactElement {
  return (
    <section aria-labelledby="source" className="card space-y-3 self-start p-4">
      <h2 id="source">Source</h2>
      {event.sourceUrl === null ? (
        <p className="text-sm text-zinc-600">Entered by hand, without a source post.</p>
      ) : (
        <div className="space-y-1 text-sm">
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent-strong hover:underline"
          >
            Open the post on the events list
          </a>
          {event.postNumber !== null && <p className="text-zinc-600">Post number {event.postNumber}</p>}
        </div>
      )}
      <h3 className="text-sm font-medium text-zinc-500">Text as stored</h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
    </section>
  );
}

// A cancelled or a discarded event, which nothing changes any more.
function Stored({ event }: { event: GlobalEvent }): ReactElement {
  const rows: [string, ReactElement | string | null][] = [
    ['Start', event.startsAt === null ? null : <StartTime startsAt={event.startsAt} />],
    ['End', event.endsAt === null ? null : formatInSeoul(event.endsAt)],
    ['Place name', event.place],
    ['Position', event.latitude === null ? null : `${event.latitude}, ${event.longitude}`],
  ];
  return (
    <dl className="card grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 self-start p-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-500">{label}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function EventPage({ params }: PageProps<'/events/[id]'>): Promise<ReactElement> {
  const { id } = await params;
  const [event, places] = await asAdministrator(`/events/${id}`, (token) =>
    Promise.all([read(token, id), mainServer.listPlaces(token)]),
  );
  const state = STATES[event.state];
  const editable = event.state === 'draft' || event.state === 'published';
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Events
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1>{event.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${state.look}`}>{state.label}</span>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Source event={event} />
        {editable ? <EventForm key={event.version} event={event} places={places} /> : <Stored event={event} />}
      </div>
    </div>
  );
}
