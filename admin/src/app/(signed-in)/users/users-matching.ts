/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { AdminUser } from '@/main-server';

// The Users whose name, email address, department or Friend ID holds the text, whatever the case of Latin letters.
export function usersMatching(users: AdminUser[], query: string): AdminUser[] {
  const wanted = query.trim().toLowerCase();
  return users.filter(({ name, email, department, friendId }) =>
    [name, email, department, friendId].some((field) => field.toLowerCase().includes(wanted)),
  );
}

// A User before onboarding has no name yet.
export function nameOf({ name, email }: { name: string; email: string }): string {
  return name === '' ? email : name;
}
