/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TaughtAlias } from '@/api/alias-types';
import type { ResolvedBy } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { field, hasTexts, isNothing, isNumber, listOf } from './answers';
import { call } from './http';

// The operations of the words the User taught the Assistant: the list, a deletion, and 아니에요 under an answer.

const KINDS = new Set<unknown>(['place', 'friend', 'globalEvent'] satisfies ResolvedBy['kind'][]);
const SOURCES = new Set<unknown>(['personal', 'global', 'curated'] satisfies ResolvedBy['source'][]);

export function isResolvedBy(value: unknown): value is ResolvedBy {
  return (
    KINDS.has(field(value, 'kind')) && SOURCES.has(field(value, 'source')) && hasTexts(value, ['words', 'id', 'label'])
  );
}

function isTaughtAlias(value: unknown): value is TaughtAlias {
  return (
    KINDS.has(field(value, 'kind')) &&
    hasTexts(value, ['id', 'words', 'lastUsedAt']) &&
    hasTexts(field(value, 'target'), ['id', 'label']) &&
    isNumber(field(value, 'uses'))
  );
}

export function isTaughtAliases(value: unknown): value is { aliases: TaughtAlias[] } {
  return listOf(isTaughtAlias)(field(value, 'aliases'));
}

export const aliasClient: Pick<ApiClient, 'listAliases' | 'deleteAlias' | 'rejectAlias'> = {
  listAliases: async () => (await call('GET', '/assistant/aliases', isTaughtAliases)).aliases,
  deleteAlias: async (aliasId) => {
    await call('DELETE', `/assistant/aliases/${encodeURIComponent(aliasId)}`, isNothing);
  },
  rejectAlias: async (rejection) => {
    await call('POST', '/assistant/aliases/reject', isNothing, { body: rejection });
  },
};
