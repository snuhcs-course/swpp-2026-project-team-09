/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { QueuedSessionCard } from './queued-session';

export default async function QueuePage(): Promise<ReactElement> {
  const sessions = await asAdministrator('/queue', (token) => mainServer.listSameEventQueue(token));
  return (
    <div className="space-y-6">
      <h1>Same-event queue</h1>
      <p className="text-sm text-zinc-600">
        New posts the system could not decide about. Users see none of them until you attach them or publish them.
      </p>
      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-600">No session is waiting.</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <QueuedSessionCard key={session.sessionId} session={session} />
          ))}
        </ul>
      )}
    </div>
  );
}
