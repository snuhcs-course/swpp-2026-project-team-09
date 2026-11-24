/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { AnswerReply, ConditionChip } from '@/api/assistant-types';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import { ConditionChips } from './condition-chips';
import type { Corrections } from './use-corrections';

interface PlanChipsProps {
  answer: AnswerReply;
  fix: Corrections;
  chips: ConditionChip[];
  addName: string | null;
  corner: { words: string; icon: null; onPress: () => void } | null;
  busy: boolean;
  onProfile: ((userId: string) => void) | null;
}

// The condition chips over a Plan's card, or under a meal card's words (`MealBody`, P04 ticket 54).
export function PlanChips({ answer, fix, chips, addName, corner, busy, onProfile }: PlanChipsProps): ReactElement {
  return (
    <ConditionChips
      adding={fix.adding}
      addName={addName}
      chips={chips}
      corner={corner}
      disabled={busy}
      fixed={bandIsFixed(answer.input.kind)}
      friendIds={fix.friendIds}
      onAdd={fix.toggleAdding}
      onOrigin={fix.chooseOrigin}
      onProfile={onProfile}
      onRemove={fix.remove}
      onUntil={fix.focusUntil}
    />
  );
}
