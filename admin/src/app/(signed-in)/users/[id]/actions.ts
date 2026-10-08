'use server';

import { refresh } from 'next/cache';

import { mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

export interface Outcome {
  message: string;
  refused: boolean;
}

// The User whose page it is, and the other; the names are only for the message.
interface Pair {
  user: { id: string; name: string };
  other: { id: string; name: string };
}

const REFUSALS: Record<string, (a: string, b: string) => string> = {
  ALREADY_FRIENDS: (a, b) => `${a} and ${b} were already Friends.`,
  USER_NOT_ONBOARDED: (a, b) => `${a} and ${b} cannot be made Friends: one of them has not finished onboarding.`,
  USER_NOT_FOUND: (a, b) => `${a} and ${b} cannot be made Friends: one of them no longer exists.`,
  FRIEND_NOT_FOUND: (a, b) => `${a} and ${b} were no longer Friends.`,
};

// Makes the two Users Friends or ends their friendship. After a change and after a refusal alike, the page reads the
// lists again.
export async function changeFriendship(kind: 'make' | 'end', { user, other }: Pair): Promise<Outcome> {
  let outcome = {
    message: `${user.name} and ${other.name} ${kind === 'make' ? 'are now' : 'are no longer'} Friends.`,
    refused: false,
  };
  try {
    await asAdministrator(`/users/${user.id}`, (token) =>
      kind === 'make'
        ? mainServer.befriend(token, user.id, other.id)
        : mainServer.endFriendship(token, user.id, other.id),
    );
  } catch (error) {
    const refusal = error instanceof MainServerError ? REFUSALS[error.refusal.code ?? ''] : undefined;
    if (refusal === undefined) {
      throw error;
    }
    outcome = { message: refusal(user.name, other.name), refused: true };
  }
  refresh();
  return outcome;
}
