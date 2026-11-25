/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';

type Kind = PlanInput['kind'];

// The name "＋ 같이" is read by, or null where it is left out.
const ADD: Record<Kind, string | null> = {
  meal: '같이 먹을 친구 추가',
  meet: '같이 만날 친구 추가',
  'new-quest': '초대할 친구 추가',
  events: null,
  quests: null,
};

export function addNameOf(kind: Kind): string | null {
  return ADD[kind];
}
