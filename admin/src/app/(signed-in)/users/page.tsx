// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { UserList } from './user-list';

export default async function UsersPage(): Promise<ReactElement> {
  const users = await asAdministrator('/users', (token) => mainServer.listUsers(token));
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1>Users</h1>
        <p className="text-sm text-zinc-600">
          Every User of the app. Open one to see their Friends, and to make or end a friendship, such as for a demo.
        </p>
      </header>
      <UserList users={users} />
    </div>
  );
}
