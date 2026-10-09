/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';

import { type CollectionStatus, mainServer } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';
import { asAdministrator } from '@/session';

const SOURCES: Record<string, string> = {
  coop_menus: 'Co-op menus',
  dormitory_menus: 'Dormitory menus',
  veterinary_menus: 'Veterinary college menus',
  shuttle_stops: 'Shuttle stops',
  shuttle_vehicles: 'Shuttle vehicles',
  snu_events: 'SNU events list',
};

function stateOf({ lastSucceededAt, lastFailedAt }: CollectionStatus): { label: string; broken: boolean } {
  if (lastSucceededAt === null) {
    return { label: lastFailedAt === null ? 'Never collected' : 'Never succeeded', broken: true };
  }
  if (lastFailedAt !== null && Date.parse(lastFailedAt) > Date.parse(lastSucceededAt)) {
    return { label: 'Failed since the last success', broken: true };
  }
  return { label: 'Working', broken: false };
}

function StatusRow({ status }: { status: CollectionStatus }): ReactElement {
  const { label, broken } = stateOf(status);
  return (
    <tr>
      <td className="font-medium">{SOURCES[status.source] ?? status.source}</td>
      <td className={broken ? 'font-medium text-red-700' : 'text-zinc-600'}>{label}</td>
      <td className="whitespace-nowrap">
        {status.lastSucceededAt === null ? '—' : formatInSeoul(status.lastSucceededAt)}
      </td>
      <td>
        {status.lastFailedAt === null
          ? '—'
          : `${formatInSeoul(status.lastFailedAt)} · ${status.lastFailureReason ?? 'no reason recorded'}`}
      </td>
    </tr>
  );
}

export default async function CollectionPage(): Promise<ReactElement> {
  const statuses = await asAdministrator('/collection', (token) => mainServer.listCollectionStatuses(token));
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1>Collection status</h1>
        <p className="text-sm text-zinc-600">
          Each Source with its last successful Collection and its last failure, in Seoul&apos;s time. A Source that
          failed since it last worked, or never worked, is marked in red.
        </p>
      </header>
      <div className="card">
        <table className="data-table" aria-label="Sources">
          <thead>
            <tr>
              <th>Source</th>
              <th>Status</th>
              <th>Last success</th>
              <th>Last failure</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <StatusRow key={status.source} status={status} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
