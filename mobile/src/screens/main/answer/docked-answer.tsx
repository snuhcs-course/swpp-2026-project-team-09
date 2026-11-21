/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { turnsOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ChatSheetControl } from '../chat-sheet';
import { DockChip } from './dock-chips';
import { Words } from './reply-words';
import type { BandFocus } from './use-corrections';

interface DockedAnswerProps {
  control: ChatSheetControl;
  bubble: ChatBubble;
  focus: BandFocus;
  onClose: () => void;
  // Raises the card, with the earlier turns open when `earlier` is true.
  onRaise: (earlier: boolean) => void;
}

// The docked card's content: the Plan's chips' row, which ends with "지난 답 N개" while the conversation has turns
// before this one and with the answer's note when it has one; each raises the card with what it names.
export function DockedAnswer({ control, bubble, focus, onClose, onRaise }: DockedAnswerProps): ReactElement {
  const earlier = turnsOf(control.chat.bubbles).length - 1;
  const note = control.answer.answer?.note ?? null;
  const chips = (
    <>
      {earlier > 0 ? (
        <DockChip
          onPress={() => {
            onRaise(true);
          }}
          words={`지난 답 ${String(earlier)}개`}
        />
      ) : null}
      {note === null ? null : (
        <DockChip
          onPress={() => {
            onRaise(false);
          }}
          words={note}
        />
      )}
    </>
  );
  return (
    <Words
      addRecalculated={control.chat.addRecalculated}
      bubble={bubble}
      dock={chips}
      focus={focus}
      howAbout={control.howAbout}
      invitation={control.invitation}
      lookup={control.lookup}
      onAsk={control.chat.send}
      onClose={onClose}
      room={null}
      shown={control.answer}
    />
  );
}
