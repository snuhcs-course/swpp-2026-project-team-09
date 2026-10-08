'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import type { AdminUser } from '@/main-server';

import { usersMatching } from './users-matching';

export function UserList({ users }: { users: AdminUser[] }): ReactElement {
  const [query, setQuery] = useState('');
  const shown = usersMatching(users, query);
  return (
    <section className="space-y-3">
      <input
        aria-label="Find a User"
        type="search"
        placeholder="Find a User by name, email, department or Friend ID"
        value={query}
        onChange={(change) => {
          setQuery(change.target.value);
        }}
        className="input w-full max-w-md"
      />
      <div className="card">
        <table className="data-table" aria-label="Users">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Friend ID</th>
              <th>Friends</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">
                  <Link href={`/users/${user.id}`} className="text-accent-strong hover:underline">
                    {user.onboarded ? user.name : 'Before onboarding'}
                  </Link>
                </td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td className="font-mono">{user.friendId}</td>
                <td>{user.friendCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="text-sm text-zinc-500">No User matches.</p>}
    </section>
  );
}
