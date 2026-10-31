/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import Link from 'next/link';
import type { ReactElement } from 'react';

import { type CollectionStatus, mainServer, type UnsettledPost } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';
import { asAdministrator } from '@/session';

import { JUDGEMENT_TRIES } from '../events/publication';

const SOURCES: Record<string, string> = {
  coop_menus: 'Co-op menus',
  dormitory_menus: 'Dormitory menus',
  veterinary_menus: 'Veterinary college menus',
  shuttle_stops: 'Shuttle stops',
  shuttle_vehicles: 'Shuttle vehicles',
  snu_events: 'SNU events list',
  extra_snu: 'extra.snu programmes',
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
      <td>{status.lastSkippedPosts ?? '—'}</td>
    </tr>
  );
}

function stepOf({ stepFinished, stepFailure, stepFailedAt }: UnsettledPost): string {
  if (stepFailure !== null) {
    return stepFailedAt === null ? `Failed · ${stepFailure}` : `Failed ${formatInSeoul(stepFailedAt)} · ${stepFailure}`;
  }
  return stepFinished ? 'Finished' : 'Not finished';
}

function judgementOf({ judgementFailure, judgementAttempts }: UnsettledPost): string {
  if (judgementAttempts === 0) {
    return '—';
  }
  const tried = `Try ${judgementAttempts} of ${JUDGEMENT_TRIES}`;
  return judgementFailure === null ? tried : `${tried} · ${judgementFailure}`;
}

function UnsettledRow({ post }: { post: UnsettledPost }): ReactElement {
  return (
    <tr>
      <td className="font-medium">
        {SOURCES[post.source] ?? post.source} ·{' '}
        <a href={post.address} target="_blank" rel="noreferrer" className="text-accent-strong hover:underline">
          Post {post.key}
        </a>
      </td>
      <td>{stepOf(post)}</td>
      <td>{judgementOf(post)}</td>
      <td>
        {post.drafts.length === 0 ? (
          '—'
        ) : (
          <ul className="space-y-1">
            {post.drafts.map(({ id, title }) => (
              <li key={id}>
                <Link href={`/events/${id}`} className="text-accent-strong hover:underline">
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function UnsettledPosts({ posts }: { posts: UnsettledPost[] }): ReactElement {
  return (
    <section className="space-y-3">
      <h2 id="unsettled">Unsettled posts</h2>
      <p className="text-sm text-zinc-600">
        A Collection is recorded as a success whatever happens to its posts afterwards. These are the posts the
        publication step failed on or has not finished with, one it is reading now included, and those whose Judgement
        could not be made while a Draft waits.
      </p>
      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Every post is settled.</p>
      ) : (
        <div className="card">
          <table className="data-table" aria-labelledby="unsettled">
            <thead>
              <tr>
                <th>Post</th>
                <th>Step</th>
                <th>Judgement</th>
                <th>Drafts</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <UnsettledRow key={`${post.source}/${post.key}`} post={post} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function CollectionPage(): Promise<ReactElement> {
  const [statuses, unsettled] = await asAdministrator('/collection', (token) =>
    Promise.all([mainServer.listCollectionStatuses(token), mainServer.listUnsettledPosts(token)]),
  );
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1>Collection status</h1>
        <p className="text-sm text-zinc-600">
          Each Source with its last successful Collection and its last failure, in Seoul&apos;s time. A Source that
          failed since it last worked, or never worked, is marked in red. Skipped counts the posts its last Collection
          could not reach, for a sign-in or a waiting room, which is not a failure.
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
              <th>Skipped</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <StatusRow key={status.source} status={status} />
            ))}
          </tbody>
        </table>
      </div>
      <UnsettledPosts posts={unsettled} />
    </div>
  );
}
