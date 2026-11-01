/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

'use client';

import { type ReactElement, useState, useTransition } from 'react';

import type { LinkedSession, SessionAttachment } from '@/main-server';

import { sourceLabel } from '../publication';
import { acknowledgeEvent, detachSession } from './actions';

const HOW_ATTACHED: Record<SessionAttachment, string> = {
  own: 'Its own post',
  rule: 'By a rule',
  ai: 'By the AI',
  administrator: 'By an Administrator',
};

// Takes the flag off the event, once an Administrator has looked at what set it.
export function AcknowledgeButton({ eventId }: { eventId: string }): ReactElement {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="button"
      onClick={() => {
        startTransition(() => acknowledgeEvent(eventId));
      }}
    >
      Mark as looked at
    </button>
  );
}

function LinkedSessionRow({
  session: { sessionId, number, source, key, address, attachedBy, reason, detachable },
  pending,
  detach,
}: {
  session: LinkedSession;
  pending: boolean;
  detach: (sessionId: string) => void;
}): ReactElement {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <a href={address} target="_blank" rel="noreferrer" className="font-medium text-accent-strong hover:underline">
          {sourceLabel(source)} {key}, session {number}
        </a>
        <p className="text-zinc-600">{HOW_ATTACHED[attachedBy]}</p>
        {reason !== null && <p className="break-words text-zinc-600">{reason}</p>}
      </div>
      {detachable && (
        <button
          type="button"
          disabled={pending}
          className="button"
          onClick={() => {
            detach(sessionId);
          }}
        >
          Detach
        </button>
      )}
    </li>
  );
}

// The Source Posts and sessions linked to an event. Detaching leaves the event, with its Quests, as it is.
export function SessionsPanel({ eventId, sessions }: { eventId: string; sessions: LinkedSession[] }): ReactElement {
  const [pending, startTransition] = useTransition();
  const [refusal, setRefusal] = useState<string | null>(null);
  const detach = (sessionId: string): void => {
    if (window.confirm('Detach this session? It becomes its own Draft again, and this event keeps its Quests.')) {
      startTransition(async () => {
        setRefusal(await detachSession(eventId, sessionId));
      });
    }
  };
  return (
    <section aria-labelledby="source-posts" className="card space-y-3 p-4">
      <h2 id="source-posts">Source Posts</h2>
      {refusal !== null && (
        <p role="alert" className="text-sm text-red-700">
          {refusal}
        </p>
      )}
      <ul className="space-y-3 text-sm">
        {sessions.map((session) => (
          <LinkedSessionRow key={session.sessionId} session={session} pending={pending} detach={detach} />
        ))}
      </ul>
    </section>
  );
}
