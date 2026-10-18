/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// The messages the User sent in a room's 파티 채팅, by Quest id, for each signed-in User apart. The main server keeps
// no conversation yet, so the phone keeps them and nobody else sees them (P06 spec, Mocks).

export interface KeptMessage {
  id: string;
  words: string;
  sentAt: string;
}

function keyOf(owner: string): string {
  return `snunow.party-chat.${owner}`;
}

function isMessage(value: unknown): value is KeptMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'words' in value &&
    typeof value.words === 'string' &&
    'sentAt' in value &&
    typeof value.sentAt === 'string'
  );
}

async function readAll(owner: string): Promise<Partial<Record<string, KeptMessage[]>>> {
  const stored = await AsyncStorage.getItem(keyOf(owner));
  if (stored === null) {
    return {};
  }
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).map(([questId, messages]) => [
        questId,
        Array.isArray(messages) ? messages.filter((message) => isMessage(message)) : [],
      ]),
    );
  } catch {
    return {};
  }
}

// What the User sent in the Quest's room, the oldest first; nothing for a User who is not signed in ('').
export async function readPartyChat(owner: string, questId: string): Promise<KeptMessage[]> {
  if (owner === '') {
    return [];
  }
  return (await readAll(owner))[questId] ?? [];
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Adds a message after the others. Nothing is kept for a User who is not signed in ('').
export function keepPartyMessage(owner: string, questId: string, message: KeptMessage): Promise<void> {
  if (owner === '') {
    return Promise.resolve();
  }
  const written = lastChange.then(async () => {
    const all = await readAll(owner);
    await AsyncStorage.setItem(keyOf(owner), JSON.stringify({ ...all, [questId]: [...(all[questId] ?? []), message] }));
  });
  lastChange = written.catch(() => null);
  return written;
}
