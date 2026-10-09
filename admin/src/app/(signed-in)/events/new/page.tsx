/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import Link from 'next/link';
import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { NewEventForm } from './new-event-form';

export default async function NewEventPage(): Promise<ReactElement> {
  const places = await asAdministrator('/events/new', (token) => mainServer.listPlaces(token));
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Events
        </Link>
        <h1>New event</h1>
        <p className="text-sm text-zinc-600">
          Enter an event by hand, such as from an organizer&apos;s submission. It is created as a Draft, which you then
          publish on its page.
        </p>
      </header>
      <NewEventForm places={places} />
    </div>
  );
}
