/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { PlacesView } from './places-view';

export default async function PlacesPage(): Promise<ReactElement> {
  const places = await asAdministrator('/places', (token) => mainServer.listPlaces(token));
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1>Places</h1>
        <p className="text-sm text-zinc-600">
          Every Place as the seed placed and outlined it. A wrong Place or outline is corrected in the main
          server&apos;s seed files.
        </p>
      </header>
      <PlacesView places={places} />
    </div>
  );
}
