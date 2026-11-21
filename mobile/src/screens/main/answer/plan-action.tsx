/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Button } from '@/design-system';
import { peopleOf } from '@/features/assistant/plan-input';
import type { ChatSheetControl } from '../chat-sheet';
import { onScreenOf, planShown } from './reply-words';

// The main button of the Plan on screen, beside the input: it says what it does.
export interface PlanAction {
  words: string;
  onPress: () => void;
  disabled: boolean;
}

// "만들고 초대 보내기" for a Plan with a Friend, as "이대로 초대" made it into a Quest and invited them; "일정에 넣기" for
// a meal's Plan alone, as "여기로" took it. None once the Plan is sent, while "여기면 어때?" is asked, or for a Plan
// whose card holds its own buttons (events, parties, a new recruiting Quest).
export function planActionOf(control: ChatSheetControl): PlanAction | null {
  const { answer: shown, invitation, howAbout, framed } = control;
  const { answer, plan } = shown;
  if (!framed || answer === null || plan === null || invitation.made !== null || howAbout.place !== null) {
    return null;
  }
  if (!planShown(control.chat.bubbles, onScreenOf(control))) {
    return null;
  }
  const { kind } = answer.input;
  const people = peopleOf(answer.input).length;
  // While a follow-up's reply is on its way the Plan on screen is about to be replaced.
  const disabled = shown.recalculating || invitation.sending || control.chat.waiting;
  if (kind !== 'new-quest' && people > 1) {
    return {
      words: invitation.sending ? '보내는 중이에요' : '만들고 초대 보내기',
      onPress: invitation.invite,
      disabled,
    };
  }
  return kind === 'meal' && people === 1 ? { words: '일정에 넣기', onPress: invitation.invite, disabled } : null;
}

export function PlanActionButton({ action }: { action: PlanAction }): ReactElement {
  return (
    <Button disabled={action.disabled} onPress={action.onPress}>
      {action.words}
    </Button>
  );
}
