/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use client';

import { type ReactElement, useState, useTransition } from 'react';

import type { AdminFriend, AdminUser } from '@/main-server';
import { formatInSeoul } from '@/seoul-time';

import { nameOf, usersMatching } from '../users-matching';
import { changeFriendship, type Outcome } from './actions';

type Run = (change: () => Promise<Outcome>) => void;

const named = (user: { id: string; name: string; email: string }): { id: string; name: string } => ({
  id: user.id,
  name: nameOf(user),
});

function FriendList(props: { user: AdminUser; friends: AdminFriend[]; run: Run; pending: boolean }): ReactElement {
  const { user, friends, run, pending } = props;
  if (friends.length === 0) {
    return <p className="text-sm text-zinc-500">No Friends yet.</p>;
  }
  return (
    <div className="card">
      <table className="data-table" aria-label="Friends">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Friend ID</th>
            <th>Since (Seoul)</th>
            <th>
              <span className="sr-only">친구 끊기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {friends.map((friend) => (
            <tr key={friend.id}>
              <td className="font-medium">{friend.name}</td>
              <td>{friend.email}</td>
              <td>{friend.department}</td>
              <td className="font-mono">{friend.friendId}</td>
              <td className="whitespace-nowrap">{formatInSeoul(friend.since)}</td>
              <td className="text-right">
                <button
                  type="button"
                  disabled={pending}
                  className="button button-danger"
                  onClick={() => {
                    const question = `End the friendship of ${nameOf(user)} and ${friend.name}? Location Sharing between the two stops at once, and the Meetups still proposed between them are withdrawn.`;
                    if (window.confirm(question)) {
                      run(() => changeFriendship('end', { user: named(user), other: named(friend) }));
                    }
                  }}
                >
                  친구 끊기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The onboarded Users who are not the User and not yet their Friends.
function NewFriend(props: { user: AdminUser; candidates: AdminUser[]; run: Run; pending: boolean }): ReactElement {
  const { user, candidates, run, pending } = props;
  const [query, setQuery] = useState('');
  return (
    <section aria-labelledby="new-friend" className="card space-y-3 p-4">
      <h2 id="new-friend">친구 맺기</h2>
      <input
        aria-label="Find a User to befriend"
        type="search"
        placeholder="Find a User by name, email, department or Friend ID"
        value={query}
        onChange={(change) => {
          setQuery(change.target.value);
        }}
        className="input w-full"
      />
      <ul aria-label="Users to befriend" className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
        {usersMatching(candidates, query).map((other) => (
          <li key={other.id}>
            <button
              type="button"
              disabled={pending}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
              onClick={() => {
                setQuery('');
                run(() => changeFriendship('make', { user: named(user), other: named(other) }));
              }}
            >
              {`${other.name} · ${other.email}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Friendships(props: { user: AdminUser; friends: AdminFriend[]; users: AdminUser[] }): ReactElement {
  const { user, friends, users } = props;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();
  const run: Run = (change) => {
    startTransition(async () => {
      setOutcome(await change());
    });
  };
  const friendIds = new Set(friends.map((friend) => friend.id));
  const candidates = users.filter((other) => other.onboarded && other.id !== user.id && !friendIds.has(other.id));
  return (
    <div className="space-y-6">
      {outcome !== null && !pending && (
        <p
          role="alert"
          className={`rounded-md border px-4 py-3 text-sm ${outcome.refused ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-zinc-200 bg-white text-zinc-800'}`}
        >
          {outcome.message}
        </p>
      )}
      <section className="space-y-3">
        <h2>Friends</h2>
        <FriendList user={user} friends={friends} run={run} pending={pending} />
      </section>
      <NewFriend user={user} candidates={candidates} run={run} pending={pending} />
    </div>
  );
}
