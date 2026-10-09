/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { AdminFriend, AdminUser } from '@/main-server';

import { refused } from './fake-global-events';

// The main server's rules for Users and friendships that the fake main server keeps.

interface Friendship {
  between: [string, string];
  since: string;
}

const onboardedFirst = (a: AdminUser, b: AdminUser): number =>
  Number(!a.onboarded) - Number(!b.onboarded) || a.name.localeCompare(b.name, 'ko') || (a.email < b.email ? -1 : 1);

export class FakeUsers {
  private users: AdminUser[] = [];
  private friendships: Friendship[] = [];

  reset(): void {
    this.users = [];
    this.friendships = [];
  }

  has(...users: (Pick<AdminUser, 'name' | 'email'> & Partial<AdminUser>)[]): AdminUser[] {
    const stored = users.map((user): AdminUser =>
      Object.assign(
        {
          id: crypto.randomUUID(),
          department: '컴퓨터공학부',
          friendId: '',
          onboarded: user.name !== '',
          friendCount: 0,
        },
        user,
      ),
    );
    this.users.push(...stored);
    return stored;
  }

  // Between Users stored with has(), outside the routes, as another Administrator or the Users themselves would.
  makeFriends(a: string, b: string, since = '2026-10-01T03:00:00.000Z'): void {
    this.friendships.push({ between: [a, b], since });
  }

  endFriends(a: string, b: string): void {
    this.friendships = this.friendships.filter((each) => !this.joins(each, a, b));
  }

  remove(id: string): void {
    this.users = this.users.filter((each) => each.id !== id);
  }

  list(): AdminUser[] {
    return this.users
      .map((user) => ({ ...user, friendCount: this.friendsOf(user.id).length }))
      .toSorted(onboardedFirst);
  }

  friendsOf(id: string): AdminFriend[] {
    this.found(id);
    return this.friendships
      .filter(({ between }) => between.includes(id))
      .map(({ between, since }) => {
        const { name, email, department, friendId } = this.found(between[0] === id ? between[1] : between[0]);
        return { id: between[0] === id ? between[1] : between[0], name, email, department, friendId, since };
      })
      .toSorted((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  befriend(a: string, b: string): void {
    if (a === b) {
      throw refused(400, { code: 'SAME_USER' });
    }
    if (![this.found(a), this.found(b)].every((user) => user.onboarded)) {
      throw refused(409, { code: 'USER_NOT_ONBOARDED' });
    }
    if (this.friendships.some((each) => this.joins(each, a, b))) {
      throw refused(409, { code: 'ALREADY_FRIENDS' });
    }
    this.makeFriends(a, b, new Date().toISOString());
  }

  end(a: string, b: string): void {
    if (!this.friendships.some((each) => this.joins(each, a, b))) {
      throw refused(404, { code: 'FRIEND_NOT_FOUND' });
    }
    this.endFriends(a, b);
  }

  private joins({ between }: Friendship, a: string, b: string): boolean {
    return between.includes(a) && between.includes(b);
  }

  private found(id: string): AdminUser {
    const user = this.users.find((each) => each.id === id);
    if (user === undefined) {
      throw refused(404, { code: 'USER_NOT_FOUND' });
    }
    return user;
  }
}
