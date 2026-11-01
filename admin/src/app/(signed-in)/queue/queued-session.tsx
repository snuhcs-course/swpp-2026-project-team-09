/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

'use client';

import Link from 'next/link';
import { type ReactElement, useState, useTransition } from 'react';

import type { GlobalEventState, QueueCandidate, QueuedSession, SessionHold } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';

import { sourceLabel } from '../events/publication';
import { decideSession, type QueueAction } from './actions';

const WHY_HELD: Record<SessionHold, string> = {
  link_not_one_to_one: 'Its post links another whose sessions do not match one to one.',
  several_matches: 'It matches several events, or the AI chose one event for several sessions.',
  ai_unsure: 'The AI is unsure.',
  ai_failed: 'The AI could not answer.',
  candidates_changed: 'The candidates changed after the AI answered.',
};

const NOT_LIVE: Partial<Record<GlobalEventState, string>> = {
  draft: 'Draft',
  cancelled: 'Cancelled',
  discarded: 'Discarded',
};

const startText = (startsAt: string | null): string => (startsAt === null ? 'No start' : formatInSeoul(startsAt));

function Candidates({
  candidates,
  pending,
  attach,
}: {
  candidates: QueueCandidate[];
  pending: boolean;
  attach: (globalEventId: string) => void;
}): ReactElement {
  return (
    <>
      <h2 className="text-sm font-medium text-zinc-500">Candidates</h2>
      {candidates.length === 0 ? (
        <p className="text-zinc-600">No event is a candidate now.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map(({ id, title, startsAt, place, state }) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/events/${id}`} className="font-medium hover:underline">
                  {title}
                </Link>
                <p className="text-zinc-600">
                  {startText(startsAt)} · {place ?? 'No place'}
                  {NOT_LIVE[state] === undefined ? '' : ` · ${NOT_LIVE[state]}`}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                className="button"
                aria-label={`Attach to ${title}`}
                onClick={() => {
                  attach(id);
                }}
              >
                Attach
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// One undecided session: attach it to a candidate, or publish its Draft as its own event. A Draft that needs more is
// filled in on its page, where it stays in the queue until it is published.
export function QueuedSessionCard({ session }: { session: QueuedSession }): ReactElement {
  const { sessionId, number, heldFor, reason, source, key, address, draft, candidates } = session;
  const [pending, startTransition] = useTransition();
  const [refusal, setRefusal] = useState<string | null>(null);
  const decide = (action: QueueAction): void => {
    startTransition(async () => {
      setRefusal(await decideSession(action));
    });
  };
  return (
    <li aria-label={draft.title} className="card space-y-3 p-4 text-sm">
      <div className="space-y-1">
        <Link href={`/events/${draft.id}`} className="font-medium text-accent-strong hover:underline">
          {draft.title}
        </Link>
        <p className="text-zinc-600">
          {startText(draft.startsAt)} · {draft.place ?? 'No place'} ·{' '}
          <a href={address} target="_blank" rel="noreferrer" className="hover:underline">
            {sourceLabel(source)} {key}, session {number}
          </a>
        </p>
        <p>{WHY_HELD[heldFor]}</p>
        {reason !== null && <p className="break-words text-zinc-600">{reason}</p>}
      </div>
      {refusal !== null && (
        <p role="alert" className="text-red-700">
          {refusal}
        </p>
      )}
      <Candidates
        candidates={candidates}
        pending={pending}
        attach={(globalEventId) => {
          decide({ kind: 'attach', sessionId, version: draft.version, globalEventId });
        }}
      />
      <button
        type="button"
        disabled={pending}
        className="button button-primary"
        onClick={() => {
          decide({ kind: 'publish', sessionId, version: draft.version });
        }}
      >
        Publish as its own event
      </button>
    </li>
  );
}
