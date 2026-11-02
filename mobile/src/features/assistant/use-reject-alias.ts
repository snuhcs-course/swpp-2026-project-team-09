/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { ResolvedBy } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { Bubbles, Chat } from './use-chat';

function sameReading(one: ResolvedBy, other: ResolvedBy): boolean {
  return one.kind === other.kind && one.words === other.words && one.id === other.id;
}

// 아니에요 of the conversation's bubbles: the line of that reading leaves its bubble once the main server took it.
export function useRejectAlias({ said, show }: Pick<Bubbles, 'said' | 'show'>): Chat['rejectAlias'] {
  return useCallback(
    async (bubbleId: number, reading: ResolvedBy): Promise<void> => {
      await apiClient.rejectAlias({ kind: reading.kind, words: reading.words, targetId: reading.id });
      show(
        said.current.map((bubble) =>
          bubble.id === bubbleId
            ? { ...bubble, resolvedBy: bubble.resolvedBy.filter((held) => !sameReading(held, reading)) }
            : bubble,
        ),
      );
    },
    [said, show],
  );
}
