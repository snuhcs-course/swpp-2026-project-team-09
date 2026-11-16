/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { LookupAction } from '@/api/lookup-types';
import { useToast } from '@/design-system';
import type { Chat } from '@/features/assistant/use-chat';
import { useCampusPosition } from '@/features/assistant/use-tap-answer';

export type PlanAction = Extract<LookupAction, { kind: 'plan' }>;

export const NOT_ANSWERED = '답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요';

export interface PlanAsk {
  asking: boolean;
  // The label of the button whose answer is on its way.
  asked: string | null;
  ask: (action: PlanAction) => void;
}

// A `plan` button of a card asks the recalculation for its input, and its answer opens in the answer frame as a turn
// whose pill reads "{title} · {label}". One is asked at a time; the answer of a card that closed or gave way meanwhile
// is dropped.
export function usePlanAsk(addRecalculated: Chat['addRecalculated'], title: string): PlanAsk {
  const position = useCampusPosition();
  const showToast = useToast();
  const [asked, setAsked] = useState<string | null>(null);
  const asking = asked !== null;
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return (): void => {
      shown.current = false;
    };
  }, []);
  const ask = (action: PlanAction): void => {
    if (asking) {
      return;
    }
    setAsked(action.label);
    apiClient.recalculateAnswer(action.input, position).then(
      (answer) => {
        if (shown.current) {
          setAsked(null);
          addRecalculated(`${title} · ${action.label}`, answer);
        }
      },
      () => {
        if (shown.current) {
          setAsked(null);
          showToast(NOT_ANSWERED);
        }
      },
    );
  };
  return { asking, asked, ask };
}
