// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { type AdminFriend, mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

import { nameOf } from '../users-matching';
import { Friendships } from './friendships';

async function friendsOf(token: string, id: string): Promise<AdminFriend[]> {
  try {
    return await mainServer.listFriendsOf(token, id);
  } catch (error) {
    // 400 is an id that is not a UUID, which names no User either.
    if (error instanceof MainServerError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }
}

export default async function UserPage({ params }: PageProps<'/users/[id]'>): Promise<ReactElement> {
  const { id } = await params;
  const [users, friends] = await asAdministrator(`/users/${id}`, (token) =>
    Promise.all([mainServer.listUsers(token), friendsOf(token, id)]),
  );
  const user = users.find((each) => each.id === id);
  if (user === undefined) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/users" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Users
        </Link>
        <h1>{nameOf(user)}</h1>
        <p className="text-sm text-zinc-600">
          {[user.email, user.department, user.friendId].filter((each) => each !== '').join(' · ')}
          {!user.onboarded && ' · Before onboarding'}
        </p>
      </header>
      <Friendships user={user} friends={friends} users={users} />
    </div>
  );
}
