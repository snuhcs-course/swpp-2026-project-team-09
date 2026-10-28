/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TaughtAlias } from '@/api/alias-types';
import type { ResolvedBy } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { answer } from './answer';
import { frameTime } from './data/frame';

// The words the User taught the mock Assistant, kept in memory while the app runs: 중도 for 중앙도서관, which the
// mock Assistant reads it as, and 민준 for the mocks' 김민준. 중앙도서관 is not among the mocks' Places.

export const CENTRAL_LIBRARY = { id: 'place-62', name: '중앙도서관' } as const;

const FIRST_ALIASES: readonly TaughtAlias[] = [
  {
    id: 'alias-jungdo',
    kind: 'place',
    words: '중도',
    target: { id: CENTRAL_LIBRARY.id, label: CENTRAL_LIBRARY.name },
    uses: 3,
    lastUsedAt: frameTime('12:10'),
  },
  {
    id: 'alias-minjun',
    kind: 'friend',
    words: '민준',
    target: { id: 'f1', label: '김민준' },
    uses: 1,
    lastUsedAt: '2026-09-28T03:00:00.000Z',
  },
];

let aliases: readonly TaughtAlias[] = FIRST_ALIASES;

// For the tests: a new start of the app.
export function resetMockAliases(): void {
  aliases = FIRST_ALIASES;
}

// How the mock Assistant reads a Place's words through the User's alias, while the User keeps it.
export function readThroughAlias(words: string): ResolvedBy | null {
  const alias = aliases.find((held) => held.kind === 'place' && held.words === words);
  if (alias === undefined) {
    return null;
  }
  const { kind, target } = alias;
  return { kind, words, id: target.id, label: target.label, source: 'personal' };
}

function latestFirst(a: TaughtAlias, b: TaughtAlias): number {
  return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
}

type AliasMock = Pick<ApiClient, 'listAliases' | 'deleteAlias' | 'rejectAlias'>;

export const mockAliases: AliasMock = {
  listAliases: () => answer('listAliases', () => aliases.toSorted(latestFirst), []),
  deleteAlias: async (aliasId) => {
    await answer('deleteAlias', () => {
      if (!aliases.some(({ id }) => id === aliasId)) {
        throw new ApiError(404, 'ALIAS_NOT_FOUND');
      }
      aliases = aliases.filter(({ id }) => id !== aliasId);
    });
  },
  rejectAlias: async ({ kind, words, targetId }) => {
    await answer('rejectAlias', () => {
      aliases = aliases.filter((held) => held.kind !== kind || held.words !== words || held.target.id !== targetId);
    });
  },
};
