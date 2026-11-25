/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import type { Draft } from './answer-groups';

// The quiet places of a meal answer's map (P04 ticket 70): dots without words, whose words show beside them once
// pressed. A place that cannot be done says the reason its row in the list gives; a closed place could say "오늘
// 쉬어요" the same way, by one more entry.

// The id of a dropped place's mark (`placeDraft` in `answer-marks.ts`).
export function droppedId(label: string): string {
  return `answer:dropped:${label}`;
}

// The words each quiet place shows once pressed, by its mark's id: a place dropped, its name and the reason the list
// gives for it ("두레미담 · 13분밖에 못 있어요").
export function quietWords({ dropped }: Pick<AnswerReply, 'dropped'>): ReadonlyMap<string, string> {
  return new Map(dropped.map(({ place, reason }) => [droppedId(place.label), `${place.label} · ${reason}`]));
}

// A meal answer's quiet places, and the one pressed, whose words show.
export interface Quiet {
  words: ReadonlyMap<string, string>;
  opened: string | null;
}

// A quiet place's mark: no words, or, once pressed, its words in a tag that is never left out. Its dot stays as it is.
function quietDraft(draft: Draft, { words, opened }: Quiet): Draft {
  const said = draft.id === opened ? words.get(draft.id) : undefined;
  return said === undefined ? { ...draft, title: null } : { ...draft, title: said, always: true };
}

// A scene's drafts with a meal answer's places that cannot be done made quiet; any other answer's as they are.
export function quieted({ meal = false, quiet }: { meal?: boolean; quiet?: Quiet }, drafts: Draft[]): Draft[] {
  if (!meal || quiet === undefined) {
    return drafts;
  }
  return drafts.map((draft) => (draft.group === 'dropped' ? quietDraft(draft, quiet) : draft));
}
